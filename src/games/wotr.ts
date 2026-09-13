import type { Detection, GameDefinition, Solution } from '../core/types';
import { en } from '../locales/en';
import { relativeJumpOverflow } from './wotr/relative-jump';

export const detections: readonly Detection[] = [{
  code: 'WOTR-E001',
  aliases: ['MonoModRelJumpOverflow'],
  ...en.wotr.relativeJumpOverflow,
  severity: 'error',
  logTypes: ['player', 'game-log-full'],
  solutionCodes: ['WOTR-S001', 'WOTR-S002', 'WOTR-S003'],
  kind: 'parser',
  create: relativeJumpOverflow,
}];

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
