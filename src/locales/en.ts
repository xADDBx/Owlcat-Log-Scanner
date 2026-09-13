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
      label: 'macOS',
      hint: 'In Finder, press Shift+Command+G and paste this path.',
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
  },
};
