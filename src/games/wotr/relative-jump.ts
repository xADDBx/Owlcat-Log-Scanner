import type { LineParser } from '../../core/types';

export function relativeJumpOverflow(): LineParser {
  let inNullReference = false;

  return {
    onLine({ text }) {
      if (/\bNullReferenceException\s*:/.test(text)) {
        inNullReference = true;
        return false;
      }
      if (!inNullReference) return false;

      // Player frames start with "at"; GameLogFull can omit it.
      if (!/^\s*(?:at\s+|\(wrapper\s|[\w.`+<>]+\s*\()/.test(text)) {
        inNullReference = false;
        return false;
      }
      if (/<0x[\da-f]+\s*\+\s*0x00000>/i.test(text)) {
        inNullReference = false;
        return true;
      }
      return false;
    },
  };
}
