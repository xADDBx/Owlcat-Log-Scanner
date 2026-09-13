import type { LineParser } from '../../core/types';

export const modConflicts = [{
  code: 'WOTR-E006',
  solutionCode: 'WOTR-S009',
  mods: ['FeatsProgressionOnePerLevel', '!!ModTimer'],
  // Observed with FeatsProgressionOnePerLevel 1.3.0 and !!ModTimer 1.4.0.
  // !!ModTimer runs the feats mod's static initializer before blueprints are ready.
  exception: /\bNullReferenceException:/,
  frame: /^\s*(?:at\s+)?FeatsProgressionOnePerLevel\.Main\+BlueprintsCache_Init_Patch\+<>c\.<Postfix>/,
}] as const;

export function modConflict(conflict: typeof modConflicts[number]): LineParser {
  let previousWasException = false;
  return {
    onLine({ text }) {
      const matched = previousWasException && conflict.frame.test(text);
      previousWasException = conflict.exception.test(text);
      return matched;
    },
  };
}
