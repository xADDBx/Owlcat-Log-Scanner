import type { LogLine } from './types';

export const MAX_LINE_LENGTH = 64 * 1024;

// Retain only a prefix even if a corrupt file contains a gigabyte-long line.
// CR, LF and CRLF are handled across arbitrary decoder chunk boundaries.
export class LineReader {
  private pending = '';
  private truncated = false;
  private afterCR = false;
  private number = 0;

  constructor(private readonly onLine: (line: LogLine) => void) {}

  push(text: string): void {
    const endings = /\r\n|[\r\n]/g;
    let start = 0;
    if (this.afterCR && text.length) {
      if (text[0] === '\n') start = 1;
      this.afterCR = false;
    }
    endings.lastIndex = start;
    for (let match = endings.exec(text); match; match = endings.exec(text)) {
      this.append(text.slice(start, match.index));
      this.emit();
      start = endings.lastIndex;
      this.afterCR = match[0] === '\r' && start === text.length;
    }
    this.append(text.slice(start));
  }

  finish(): void {
    if (this.pending.length || this.truncated) this.emit();
  }

  private append(text: string): void {
    const remaining = MAX_LINE_LENGTH - this.pending.length;
    if (text.length > remaining) this.truncated = true;
    this.pending += text.slice(0, remaining);
  }

  private emit(): void {
    this.onLine({ number: ++this.number, text: this.pending, truncated: this.truncated });
    this.pending = '';
    this.truncated = false;
  }
}
