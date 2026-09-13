export interface LogLine {
  number: number;
  text: string;
  truncated: boolean;
  // Optional bounded context preceding the matching line.
  context?: string;
}

export interface LogType {
  id: string;
  name: string;
  fileNames: readonly string[];
  signatures: readonly { scope: 'first-line' | 'any-line'; pattern: RegExp }[];
}

export interface Solution {
  code: string;
  name: string;
  aliases?: readonly string[];
  description?: string;
  url?: string;
  urlLabel?: string;
}

interface DetectionInfo {
  code: string;
  name: string | ((finding: Finding) => string);
  aliases?: readonly string[];
  description: string;
  severity: 'info' | 'warning' | 'error';
  solutionCodes: readonly string[];
  // Fallbacks run and appear after specific rules, regardless of registration order.
  fallback?: boolean;
}

export interface LineParser {
  // Return true or the relevant earlier line once per occurrence. Keep state bounded.
  // earlierMatch means a specific rule processed before this one matched the current line.
  onLine(line: LogLine, earlierMatch?: boolean): boolean | LogLine;
  // Optional end-of-file detection (e.g. a missing expected closing event).
  finish?(): boolean | LogLine;
}

export type Detection = DetectionInfo & (
  | { kind: 'regex'; pattern: RegExp }
  | { kind: 'parser'; create: () => LineParser }
);

export interface GameDefinition {
  id: string;
  name: string;
  logDirectories: readonly { label: string; path: string; hint: string }[];
  logTypes: readonly LogType[];
  detections: readonly Detection[];
  solutions: readonly Solution[];
  support: { label: string; url: string | null };
}

export interface Finding {
  detectionCode: string;
  occurrences: number;
  evidence: LogLine[];
}

export interface ScanProgress {
  bytesRead: number;
  totalBytes: number;
  linesRead: number;
}

export interface ScanReport extends ScanProgress {
  fileName: string;
  encoding: string;
  logType: string | null;
  fileNameLogType: string | null;
  matchedLogTypes: string[];
  rulesRun: number;
  truncatedLines: number;
  findings: Finding[];
  durationMs: number;
}

export type WorkerRequest = { type: 'scan'; gameId: string; file: File };
export type WorkerResponse =
  | { type: 'progress'; progress: ScanProgress }
  | { type: 'complete'; report: ScanReport }
  | { type: 'error'; message: string };
