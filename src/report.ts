import type { GameDefinition, ScanReport } from './core/types';
import { en } from './locales/en';

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K, text = '', className = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[index]}`;
}

export function setExternalLink(link: HTMLAnchorElement, url: string): void {
  if (new URL(url).protocol !== 'https:') throw new Error('Support and solution links must use HTTPS.');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
}

export function renderReport(
  summary: HTMLElement, findings: HTMLElement, report: ScanReport, game: GameDefinition,
): void {
  summary.replaceChildren();
  findings.replaceChildren();
  const logType = game.logTypes.find((type) => type.id === report.logType);
  summary.append(element('p', `${report.fileName} · ${logType?.name ?? 'Unrecognized log'} · ${formatBytes(report.bytesRead)}`, 'report-file'));
  if (!report.logType) {
    summary.append(element('p',
      report.matchedLogTypes.length > 1
        ? 'This file matches multiple log types. Choose an original, uncombined log.'
        : `Could not identify this as a ${game.id} log. Choose an original log or ask on Discord.`,
      'notice',
    ));
  } else if (report.fileNameLogType && report.fileNameLogType !== report.logType) {
    summary.append(element('p', 'The filename suggests a different log type. The scan used the type identified from the contents.', 'notice'));
  }
  if (report.truncatedLines) {
    summary.append(element('p',
      `${report.truncatedLines.toLocaleString()} unusually long line(s) were shortened to 65,536 characters for scanning. Matches beyond those prefixes may be missed.`,
      'notice',
    ));
  }
  if (!report.rulesRun) {
    const message = !game.detections.length
      ? 'No checks are installed yet. Ask on Discord.'
      : 'No checks ran for this log. Ask on Discord.';
    findings.append(element('p', message, 'result-message'));
  } else if (!report.findings.length) {
    findings.append(element('p', 'No known issues found. Still having trouble? Ask on Discord.', 'result-message'));
  }
  for (const finding of report.findings) {
    const rule = game.detections.find((candidate) => candidate.code === finding.detectionCode);
    if (!rule) continue;
    const card = element('article', '', `finding ${rule.severity}`);
    card.append(element('h3', rule.name));
    if (rule.solutionCodes.length) card.append(element('p', en.possibleFixes));
    const solutions = element('ul', '', 'solutions');
    for (const code of rule.solutionCodes) {
      const solution = game.solutions.find((candidate) => candidate.code === code);
      if (!solution) continue;
      const item = element('li');
      if (!solution.url || solution.urlLabel) item.append(`${solution.name} `);
      if (solution.url) {
        const link = element('a', solution.urlLabel ?? solution.name, 'text-link');
        setExternalLink(link, solution.url);
        item.append(link);
      }
      if (solution.description) item.append(` ${solution.description}`);
      solutions.append(item);
    }
    if (solutions.childElementCount) card.append(solutions, element('p', en.retry));
    else card.append(element('p', 'Ask on Discord for help with this issue.'));
    const details = element('details');
    details.append(element('summary', en.detectionDetails));
    details.append(element('p', `${rule.code} · ${rule.severity} · ${finding.occurrences.toLocaleString()} occurrence(s)`, 'muted'));
    details.append(element('p', rule.description));
    if (rule.aliases?.length) details.append(element('p', `Also known as: ${rule.aliases.join(', ')}`, 'muted'));
    for (const evidence of finding.evidence) {
      details.append(element('p', `Line ${evidence.number}${evidence.truncated ? ' · shortened' : ''}`, 'muted'));
      details.append(element('pre', evidence.text));
    }
    card.append(details);
    findings.append(card);
  }
}
