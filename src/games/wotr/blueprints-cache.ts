import type { LineParser, LogLine } from '../../core/types';

const frame = /^\s*(?:at\s+)?(?:\(wrapper [^)]+\)\s+)?(?:MonoMod\.Utils\.DynamicMethodDefinition\.)?([\w.`+<>\[\]]+)\s*\(/;
const MAX_CONTEXT_LENGTH = 64 * 1024;

export function blueprintInitMod(text: string): string | undefined {
  const mod = frame.exec(text)?.[1]?.split('.')[0];
  return mod && !/^(?:Kingmaker|System|UnityEngine(?:Internal)?|Unity|Owlcat|MonoMod|HarmonyLib|BlueprintCore)$/.test(mod) ? mod : undefined;
}

export function blueprintsCacheInit(): LineParser {
  let inException = false;
  let covered = false;
  let previous: LogLine | undefined;
  let candidate: LogLine | undefined;
  let context = '';
  let contextTruncated = false;

  function append(line: LogLine): void {
    const text = context ? `${context}\n${line.text}` : line.text;
    contextTruncated ||= line.truncated || text.length > MAX_CONTEXT_LENGTH;
    context = text.slice(0, MAX_CONTEXT_LENGTH);
  }

  function finish(): LogLine | false {
    const match = !covered && candidate;
    inException = covered = false;
    previous = candidate = undefined;
    context = '';
    contextTruncated = false;
    return match || false;
  }

  return {
    onLine(line, earlierMatch = false) {
      const method = frame.exec(line.text)?.[1];
      const exception = !method && /\b\w*Exception:/.test(line.text);
      if (!method && /--- End of (?:inner exception )?stack trace/.test(line.text)) {
        covered ||= earlierMatch;
        if (inException && !candidate) {
          if (previous) append(previous);
          append(line);
          previous = undefined;
        }
        return false;
      }
      if (exception || !method) {
        const match = finish();
        inException = exception;
        covered = earlierMatch;
        if (exception) append(line);
        return match;
      }
      if (inException) {
        covered ||= earlierMatch;
        if (/^Kingmaker\.Blueprints\.JsonSystem\.BlueprintsCache\.Init(?:_Patch\d+)?$/.test(method)
          && previous && blueprintInitMod(previous.text)) candidate ??= {
          ...previous,
          context: contextTruncated ? `${context.slice(0, MAX_CONTEXT_LENGTH - 2)}\n…` : context,
          truncated: previous.truncated || contextTruncated,
        };
        if (previous && !candidate) append(previous);
        previous = line;
      }
      return false;
    },
    // Wait for the whole exception so a later, specific match can suppress this fallback.
    finish,
  };
}
