import type { LineParser } from '../../core/types';

export function saveParsingError(error: RegExp): LineParser {
  let inException = false;
  return {
    onLine({ text }) {
      if (error.test(text)) inException = true;
      // Follow only this exception's stack; unrelated JSON errors aren't save errors.
      else if (!/^\s*(?:at\s+|\(wrapper\s|[\w.`+<>\[\]]+\s*\(|Rethrow as )/.test(text)) inException = false;

      if (inException && /\bKingmaker\.EntitySystem\.Persistence\.(?:ThreadedGameLoader|SaveManager)[.+]/.test(text)) {
        inException = false;
        return true;
      }
      return false;
    },
  };
}
