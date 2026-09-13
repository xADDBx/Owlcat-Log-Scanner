export const en = {
  possibleFixes: 'Try one of these:',
  retry: 'Then try again.',
  detectionDetails: 'Detection details',
  logPaths: {
    windows: {
      label: 'Windows',
      hint: 'Paste into File Explorer’s address bar.',
    },
    linux: {
      label: 'Linux (Steam / Proton)',
      hint: 'Default Steam location. Other libraries or Flatpak installs may use a different Steam folder.',
    },
    mac: {
      label: 'macOS (Player.log)',
      hint: 'In Finder, press Shift+Command+G and paste this path.',
    },
    macGameLogFull: {
      label: 'macOS (GameLogFull.txt)',
      hint: 'In Finder, press Shift+Command+G and paste this path. If missing, check the “Log Directory” line in Player.log.',
    },
  },
  wotr: {
    relativeJumpOverflow: {
      name: 'MonoMod relative-jump overflow',
      description: 'A NullReferenceException has a stack frame with a native address and zero offset. This matches the known MonoMod relative-jump overflow pattern.',
    },
    specialHarmony: {
      name: 'Install the special Harmony build from Discord',
    },
    bottomUpAslr: {
      name: 'Windows only: enable Bottom-Up ASLR.',
      urlLabel: 'Microsoft docs',
    },
    protonVersion: {
      name: 'Linux only: try another Proton version in Steam.',
      description: 'May help.',
    },
    oldHarmony: {
      name: 'Old Harmony version',
      description: 'A mod needs a type or method missing from the loaded Harmony version.',
    },
    replaceHarmony: {
      name: 'Replace Wrath_Data\\Managed\\0Harmony.dll with the copy in Wrath_Data\\Managed\\UnityModManager\\.',
      description: 'On macOS, use Wrath.app/Contents/Resources/Data/Managed/ instead.',
    },
    downgradeUmm: {
      name: 'Downgrade UnityModManager.',
      urlLabel: 'Older UMM versions (Nexus Mods)',
    },
    doorstop: {
      name: 'In UnityModManager, uninstall Assembly and reinstall with Doorstop (if available).',
    },
    malformedSave: {
      name: 'Malformed save data',
      description: 'The game could not parse JSON while loading a save.',
    },
    missingSaveBlueprint: {
      name: 'Missing blueprint in save',
      description: 'The save references a blueprint that could not be loaded.',
    },
    restoreSaveMods: {
      name: 'Make sure all mods used by this save are still installed and enabled.',
      urlLabel: 'Mod blueprint database',
      description: 'Search all_blueprints.txt for the GUID above (Ctrl+F); a match may identify the mod.',
    },
    crashToDesktop: {
      name: 'Crash to desktop',
      description: 'The log contains a native crash report. The cause is not identified.',
    },
    verifyGameFiles: {
      name: 'Verify game files in your launcher.',
      urlLabel: 'Steam: verify game files',
    },
  },
};
