import type { LineParser, LogLine } from '../../core/types';

export function saveParsingError(error: RegExp): LineParser {
  let exception: LogLine | undefined;
  return {
    onLine(line) {
      const { text } = line;
      if (error.test(text)) exception = line;
      // Follow only this exception's stack; unrelated JSON errors aren't save errors.
      else if (!/^\s*(?:at\s+|\(wrapper\s|[\w.`+<>\[\]]+\s*\(|Rethrow as )/.test(text)) exception = undefined;
      if (exception && /\bKingmaker\.EntitySystem\.Persistence\.(?:ThreadedGameLoader|SaveManager)[.+]/.test(text)) {
        const match = exception;
        exception = undefined;
        return match;
      }
      return false;
    },
  };
}
