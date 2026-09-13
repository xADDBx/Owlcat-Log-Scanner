import type { Detection, GameDefinition, Solution } from '../core/types';
import { en } from '../locales/en';
import { relativeJumpOverflow } from './wotr/relative-jump';
import { oldHarmonyVersion } from './wotr/old-harmony';
import { saveParsingError } from './wotr/save-parsing';
import { modConflict, modConflicts } from './wotr/mod-conflicts';

export const detections: readonly Detection[] = [{
  code: 'WOTR-E001',
  aliases: ['MonoModRelJumpOverflow'],
  ...en.wotr.relativeJumpOverflow,
  severity: 'error',
  solutionCodes: ['WOTR-S001', 'WOTR-S002', 'WOTR-S003'],
  kind: 'parser',
  create: relativeJumpOverflow,
}, {
  code: 'WOTR-E002',
  aliases: ['OldHarmonyVersion'],
  ...en.wotr.oldHarmony,
  severity: 'error',
  solutionCodes: ['WOTR-S004', 'WOTR-S005', 'WOTR-S006'],
  kind: 'parser',
  create: oldHarmonyVersion,
}, {
  code: 'WOTR-E003',
  aliases: ['SaveParsingError.MalformedSaveData'],
  ...en.wotr.malformedSave,
  severity: 'error',
  solutionCodes: [],
  kind: 'parser',
  create: () => saveParsingError(/\bJsonReaderException:/),
}, {
  code: 'WOTR-E004',
  aliases: ['SaveParsingError.MissingBlueprintGuid'],
  ...en.wotr.missingSaveBlueprint,
  severity: 'error',
  solutionCodes: ['WOTR-S007'],
  kind: 'parser',
  create: () => saveParsingError(/\bJsonSerializationException: Failed to load blueprint by guid [\da-f]{32}\b/i),
}, {
  code: 'WOTR-E005',
  aliases: ['CrashToDesktop'],
  ...en.wotr.crashToDesktop,
  severity: 'error',
  solutionCodes: ['WOTR-S008'],
  kind: 'regex',
  pattern: /^=+ OUTPUTTING STACK TRACE =+$/,
}, ...modConflicts.map((conflict): Detection => ({
  code: conflict.code,
  aliases: ['IncompatibleMods'],
  ...en.wotr.modConflict,
  severity: 'error',
  solutionCodes: [conflict.solutionCode],
  kind: 'parser',
  create: () => modConflict(conflict),
}))];

export const solutions: readonly Solution[] = [
  {
    code: 'WOTR-S001',
    ...en.wotr.specialHarmony,
    url: 'https://discord.com/channels/645948717400064030/815735034514112512/1532870342689685604',
  },
  {
    code: 'WOTR-S002',
    ...en.wotr.bottomUpAslr,
    url: 'https://learn.microsoft.com/en-us/defender-endpoint/customize-exploit-protection',
  },
  { code: 'WOTR-S003', ...en.wotr.protonVersion },
  { code: 'WOTR-S004', ...en.wotr.replaceHarmony },
  {
    code: 'WOTR-S005',
    ...en.wotr.downgradeUmm,
    url: 'https://www.nexusmods.com/site/mods/21?tab=files',
  },
  { code: 'WOTR-S006', ...en.wotr.doorstop },
  {
    code: 'WOTR-S007',
    ...en.wotr.restoreSaveMods,
    url: 'https://alterasc.github.io/#raw-list-of-blueprints-for-troubleshooting',
  },
  {
    code: 'WOTR-S008',
    ...en.wotr.verifyGameFiles,
    url: 'https://help.steampowered.com/en/faqs/view/0C48-FCBD-DA71-93EB',
  },
  ...modConflicts.map(conflict => ({
    code: conflict.solutionCode,
    name: en.wotr.removeConflictingMod(...conflict.mods),
  })),
];

export const wotr: GameDefinition = {
  id: 'WotR',
  name: 'Pathfinder: Wrath of the Righteous',
  logDirectories: [
    {
      ...en.logPaths.windows,
      path: '%USERPROFILE%\\AppData\\LocalLow\\Owlcat Games\\Pathfinder Wrath Of The Righteous\\',
    },
    {
      ...en.logPaths.linux,
      path: '~/.local/share/Steam/steamapps/compatdata/1184370/pfx/drive_c/users/steamuser/AppData/LocalLow/Owlcat Games/Pathfinder Wrath Of The Righteous/',
    },
    {
      ...en.logPaths.mac,
      path: '~/Library/Logs/Owlcat Games/Pathfinder Wrath Of The Righteous/',
    },
    {
      ...en.logPaths.macGameLogFull,
      path: '~/Library/Application Support/Owlcat Games/Pathfinder Wrath Of The Righteous/',
    },
  ],
  logTypes: [
    {
      id: 'player',
      name: 'Player.log',
      fileNames: ['Player.log', 'Player-prev.log'],
      signatures: [{
        scope: 'first-line',
        pattern: /^Mono path\[0\]\s*=.*[/\\](?:Wrath_Data[/\\]|Wrath\.app[/\\]Contents[/\\]Resources[/\\]Data[/\\])Managed(?:[/\\])?['"]/i,
      }],
    },
    {
      id: 'game-log-full',
      name: 'GameLogFull',
      fileNames: ['GameLogFull', 'GameLogFull.txt', 'GameLogFull.log'],
      signatures: [{ scope: 'any-line', pattern: /Requested: dungeons_areshkagal_prologue\.worldtex, loading/ }],
    },
  ],
  detections,
  solutions,
  support: {
    label: 'Owlcat Discord · #mod-user-general',
    url: 'https://discord.com/channels/645948717400064030/815735034514112512',
  },
};
