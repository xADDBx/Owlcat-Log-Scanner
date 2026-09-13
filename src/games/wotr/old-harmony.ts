import type { LineParser } from '../../core/types';

export function oldHarmonyVersion(): LineParser {
  return {
    onLine({ text }) {
      // Types embedded in Harmony can live outside the HarmonyLib namespace.
      if (/\bTypeLoadException:\s*Could not resolve type\b[^()\r\n]*\(from typeref, class\/assembly [^,\r\n]+,\s*0Harmony,/.test(text)) return true;
      // Before the argument list, the final token is the declaring type + method.
      const method = text.match(/\bMissingMethodException:\s*(?:Method not found:\s*)?['"]?([^()\r\n]+)\(/)?.[1];
      return method !== undefined && /(?:^|\s)HarmonyLib\.[\w.`:+]+\s*$/.test(method);
    },
  };
}
