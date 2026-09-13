import type { LineParser, LogLine } from '../../core/types';

const frame = /^\s*(?:at\s+)?(?:\(wrapper [^)]+\)\s+)?(?:MonoMod\.Utils\.DynamicMethodDefinition\.)?([\w.`+<>\[\]]+)\s*\(/;

export function blueprintInitMod(text: string): string | undefined {
  const mod = frame.exec(text)?.[1]?.split('.')[0];
  return mod && !/^(?:Kingmaker|System|UnityEngine(?:Internal)?|Unity|Owlcat|MonoMod|HarmonyLib|BlueprintCore)$/.test(mod) ? mod : undefined;
}

export function blueprintsCacheInit(): LineParser {
  let inException = false;
  let covered = false;
  let previous: LogLine | undefined;
  let candidate: LogLine | undefined;

  function finish(): LogLine | false {
    const match = !covered && candidate;
    inException = covered = false;
    previous = candidate = undefined;
    return match || false;
  }

  return {
    onLine(line, earlierMatch = false) {
      const method = frame.exec(line.text)?.[1];
      const exception = !method && /\b\w*Exception:/.test(line.text);
      if (!method && /--- End of (?:inner exception )?stack trace/.test(line.text)) {
        covered ||= earlierMatch;
        return false;
      }
      if (exception || !method) {
        const match = finish();
        inException = exception;
        covered = earlierMatch;
        return match;
      }
      if (inException) {
        covered ||= earlierMatch;
        if (/^Kingmaker\.Blueprints\.JsonSystem\.BlueprintsCache\.Init(?:_Patch\d+)?$/.test(method)
          && previous && blueprintInitMod(previous.text)) candidate ??= previous;
        previous = line;
      }
      return false;
    },
    // Wait for the whole exception so a later, specific match can suppress this fallback.
    finish,
  };
}
