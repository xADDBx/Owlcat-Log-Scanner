import { LineReader } from './lines';
import { matchesLogType } from './identify';
import type { Finding, GameDefinition, LineParser, LogLine, ScanProgress, ScanReport } from './types';

export const CHUNK_SIZE = 256 * 1024;
export const MAX_EVIDENCE = 3;
export const MAX_EVIDENCE_LENGTH = 500;

export function validateGame(game: GameDefinition): void {
  for (const [label, codes] of [
    ['detection', game.detections.map((item) => item.code)],
    ['solution', game.solutions.map((item) => item.code)],
    ['log type', game.logTypes.map((item) => item.id)],
  ] as const) {
    if (codes.some((code) => !code.trim()) || new Set(codes).size !== codes.length) {
      throw new Error(`Invalid or duplicate ${label} code in ${game.id}.`);
    }
  }
  for (const detection of game.detections) {
    if (detection.solutionCodes.some((code) => !game.solutions.some((solution) => solution.code === code))) {
      throw new Error(`Unknown solution referenced by ${detection.code}.`);
    }
  }
}

export function identifyFileName(fileName: string, game: GameDefinition): string | null {
  return game.logTypes.find((type) => type.fileNames.some(
    (name) => name.toLowerCase() === fileName.toLowerCase(),
  ))?.id ?? null;
}

function createDecoder(bytes: Uint8Array): TextDecoder {
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
  return new TextDecoder(encoding, { fatal: true });
}

export async function scanLog(
  file: Blob,
  fileName: string,
  game: GameDefinition,
  onProgress: (progress: ScanProgress) => void = () => {},
): Promise<ScanReport> {
  if (!file.size) throw new Error('This file is empty. Choose a log from a session that had the issue.');
  validateGame(game);
  const started = performance.now();
  const fileNameLogType = identifyFileName(fileName, game);
  // A signature may appear at EOF. Run candidate rules from the start so an
  // earlier issue is not missed; only publish results for a recognized game log.
  const runners = game.detections.map((rule) => {
    let parser: LineParser;
    if (rule.kind === 'parser') {
      parser = rule.create();
    } else {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      parser = {
        onLine(line) {
          pattern.lastIndex = 0;
          return pattern.test(line.text);
        },
      };
    }
    return { rule, parser, failed: false };
  });
  const findings = new Map<string, Finding>();
  const matchedTypes = new Set<string>();
  let linesRead = 0;
  let truncatedLines = 0;
  let bytesRead = 0;
  let lastProgress = started;
  let decoder: TextDecoder | undefined;

  function record(code: string, line?: LogLine): void {
    let finding = findings.get(code);
    if (!finding) {
      finding = { detectionCode: code, occurrences: 0, evidence: [] };
      findings.set(code, finding);
    }
    finding.occurrences++;
    if (line && finding.evidence.length < MAX_EVIDENCE) {
      finding.evidence.push({
        number: line.number,
        text: line.text.slice(0, MAX_EVIDENCE_LENGTH),
        truncated: line.truncated || line.text.length > MAX_EVIDENCE_LENGTH,
      });
    }
  }

  const reader = new LineReader((line) => {
    linesRead++;
    if (line.truncated) truncatedLines++;
    for (const type of game.logTypes) {
      if (matchedTypes.has(type.id)) continue;
      if (matchesLogType(line, type)) matchedTypes.add(type.id);
    }
    for (const runner of runners) {
      if (runner.failed) continue;
      try {
        if (runner.parser.onLine(line)) record(runner.rule.code, line);
      } catch {
        runner.failed = true;
      }
    }
  });
  const progress = () => onProgress({ bytesRead, totalBytes: file.size, linesRead });
  function decode(bytes?: Uint8Array): void {
    let text: string;
    try {
      text = decoder!.decode(bytes, { stream: bytes !== undefined });
    } catch {
      throw new Error('Cannot decode this file. Choose a plain UTF-8 log, or UTF-16 with a byte-order mark.');
    }
    if (/[\u0000-\u0008\u000e-\u001a\u001c-\u001f]/u.test(text)) {
      throw new Error('This looks like a binary file. Extract archives and choose the plain-text log inside.');
    }
    reader.push(text);
  }

  progress();
  // Fixed-size slices provide streaming with an explicit allocation bound.
  // No full-file string/ArrayBuffer is created, even for files larger than 1 GB.
  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const bytes = new Uint8Array(await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer());
    decoder ??= createDecoder(bytes);
    decode(bytes);
    bytesRead += bytes.byteLength;
    if (performance.now() - lastProgress >= 100) {
      progress();
      lastProgress = performance.now();
    }
  }
  decode();
  reader.finish();
  const matchedLogTypes = [...matchedTypes];
  const logType = matchedLogTypes.length === 1 ? matchedLogTypes[0]! : null;
  const applicable = logType !== null ? runners : [];
  for (const { rule, parser, failed } of applicable) {
    if (failed) throw new Error(`Check ${rule.code} failed. The scan is incomplete; ask for help on Discord.`);
    try {
      if (parser.finish?.()) record(rule.code);
    } catch {
      throw new Error(`Check ${rule.code} failed at the end of the log. The scan is incomplete.`);
    }
  }
  progress();
  return {
    fileName, encoding: decoder!.encoding, logType, fileNameLogType, matchedLogTypes,
    rulesRun: applicable.length, truncatedLines,
    findings: applicable.flatMap(({ rule }) => findings.get(rule.code) ?? []),
    bytesRead, totalBytes: file.size, linesRead, durationMs: performance.now() - started,
  };
}
