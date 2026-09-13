import type { LogLine, LogType } from './types';

export function matchesLogType(line: LogLine, type: LogType): boolean {
  return type.signatures.some(({ scope, pattern }) => {
    if (scope === 'first-line' && line.number !== 1) return false;
    pattern.lastIndex = 0;
    return pattern.test(line.text);
  });
}
