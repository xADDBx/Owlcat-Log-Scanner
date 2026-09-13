import type { LineParser, LogLine } from '../../core/types';

export function makingFriendsGuidError(): LineParser {
  let exception: LogLine | undefined;
  return {
    onLine(line) {
      const { text } = line;
      if (/\bFormatException: Unrecognized Guid format\b/.test(text)) exception = line;
      // Only attribute the error to this mod within the same exception stack.
      else if (!/^\s*(?:at\s+|\(wrapper\s|[\w.`+<>\[\]]+\s*\(|Rethrow as )/.test(text)) exception = undefined;
      if (exception && /^\s*(?:at\s+)?WOTR_MAKING_FRIENDS\./.test(text)) {
        const match = exception;
        exception = undefined;
        return match;
      }
      return false;
    },
  };
}
