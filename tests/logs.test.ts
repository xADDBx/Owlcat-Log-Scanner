import assert from 'node:assert/strict';
import { createReadStream, openAsBlob } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { createInterface } from 'node:readline';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { matchesLogType } from '../src/core/identify';
import { scanLog, validateGame } from '../src/core/scan';
import { games } from '../src/games';
import { oldHarmonyVersion } from '../src/games/wotr/old-harmony';
import { expectedIssues } from './expectations';

const root = fileURLToPath(new URL('../logs/', import.meta.url));
const fixtures: { path: string; game: string; type: string; firstLine: string; matches: Set<string> }[] = [];

// Expected game/type comes from the manually sorted folders and log filenames,
// independently of the signatures being tested. Read the original bytes as-is.
for (const folder of await readdir(root, { withFileTypes: true })) {
  if (!folder.isDirectory() || folder.name.startsWith('.')) continue;
  for (const name of await readdir(join(root, folder.name))) {
    const type = /^Player.*\.log$/i.test(name) ? 'player'
      : /^GameLogFull.*\.(txt|log)$/i.test(name) ? 'game-log-full' : null;
    assert.ok(type, `Unlabelled fixture: ${folder.name}/${name}`);
    const fixture = { path: `${folder.name}/${name}`, game: folder.name, type, firstLine: '', matches: new Set<string>() };
    const lines = createInterface({ input: createReadStream(join(root, fixture.path), { encoding: 'utf8' }), crlfDelay: Infinity });
    let number = 0;
    for await (const text of lines) {
      number++;
      if (number === 1) fixture.firstLine = text;
      for (const game of games) {
        for (const logType of game.logTypes) {
          const key = `${game.id}/${logType.id}`;
          if (!fixture.matches.has(key) && matchesLogType({ number, text, truncated: false }, logType)) fixture.matches.add(key);
        }
      }
    }
    fixtures.push(fixture);
  }
}
assert.ok(fixtures.length, 'No private logs found. Populate logs/<game>/ before running npm test.');

describe('Corpus coverage', () => {
  for (const game of games) {
    test(`${game.id}: registered log types have positive and negative fixtures`, () => {
      validateGame(game);
      for (const type of game.logTypes) {
        assert.ok(fixtures.some(file => file.game === game.id && file.type === type.id), `No ${game.id}/${type.id} fixtures`);
        assert.ok(fixtures.some(file => file.game !== game.id && file.type === type.id), `No other-game ${type.id} fixtures`);
        assert.ok(fixtures.some(file => file.game === game.id && file.type !== type.id), `No other-log-type ${game.id} fixtures`);
      }
    });
  }
  test('WotR Player fixtures include macOS and Windows-style data paths', () => {
    const player = fixtures.filter(file => file.game === 'WotR' && file.type === 'player');
    assert.ok(player.some(file => file.firstLine.includes('Wrath.app/')), 'Missing macOS fixture');
    assert.ok(player.some(file => file.firstLine.includes('Wrath_Data/')), 'Missing Wrath_Data fixture');
  });
});

describe('Game and log-type identification', () => {
  for (const game of games) {
    for (const type of game.logTypes) {
      describe(`${game.id}/${type.id}`, () => {
        for (const fixture of fixtures) {
          const expected = fixture.game === game.id && fixture.type === type.id;
          test(`${expected ? 'accept' : 'reject'} ${fixture.path}`, () => {
            assert.equal(fixture.matches.has(`${game.id}/${type.id}`), expected);
          });
        }
      });
    }
  }
});

const rules = games.flatMap(game => game.detections.map(rule => ({ game, rule, key: `${game.id}/${rule.code}` })));

describe('Issue expectations', () => {
  test('expectations reference existing rules and applicable logs', () => {
    for (const [key, labels] of Object.entries(expectedIssues)) {
      const entry = rules.find(rule => rule.key === key);
      assert.ok(entry, `Unknown rule: ${key}`);
      for (const [path, expected] of Object.entries(labels)) {
        const fixture = fixtures.find(file => file.path === path);
        assert.ok(fixture, `Unknown fixture: ${path}`);
        assert.equal(fixture.game, entry.game.id, `${key}: wrong-game expectation for ${path}`);
        assert.ok(Number.isInteger(expected) && expected >= 0, `${key}/${path}: review and set the occurrence count`);
      }
    }
  });
  if (!rules.length) test('Issue accuracy is untested: no diagnostic rules are implemented', { skip: true }, () => {});
  for (const { game, key } of rules) {
    test(`${key}: every game log is reviewed, with positive and negative examples`, () => {
      const labels = expectedIssues[key];
      assert.ok(labels, `Missing expectations for ${key}`);
      const applicable = fixtures.filter(file => file.game === game.id);
      for (const file of applicable) assert.ok(Object.hasOwn(labels, file.path), `Review ${key} in ${file.path}`);
      assert.ok(applicable.some(file => labels[file.path]! > 0), `${key}: no positive example`);
      assert.ok(applicable.some(file => labels[file.path] === 0), `${key}: no negative example`);
    });
  }
});

describe('Complete scans and issue results', () => {
  for (const game of games) {
    for (const fixture of fixtures) {
      test(`${game.id}: ${fixture.path}`, async () => {
        const file = await openAsBlob(join(root, fixture.path));
        // This original RT log contains NUL-filled gaps; reading it must fail.
        if (fixture.path === 'RT/GameLogFull(192).txt') {
          await assert.rejects(scanLog(file, basename(fixture.path), game), /This looks like a binary file/);
          return;
        }
        const report = await scanLog(file, basename(fixture.path), game);
        if (fixture.game !== game.id) {
          assert.equal(report.logType, null);
          assert.deepEqual(report.matchedLogTypes, []);
          assert.equal(report.rulesRun, 0);
          assert.deepEqual(report.findings, []);
          return;
        }
        assert.equal(report.logType, fixture.type);
        assert.deepEqual(report.matchedLogTypes, [fixture.type]);
        assert.equal(report.bytesRead, file.size);
        assert.equal(report.rulesRun, game.detections.length);
        const expected = game.detections
          .map(rule => [rule.code, expectedIssues[`${game.id}/${rule.code}`]![fixture.path]] as const)
          .filter(([, count]) => count! > 0);
        assert.deepEqual(
          Object.fromEntries(report.findings.map(finding => [finding.detectionCode, finding.occurrences])),
          Object.fromEntries(expected),
        );
      });
    }
  }
});

// These reported cases and false-positive checks are absent from the private logs.
test('Harmony types and methods beyond the corpus examples', () => {
  const handler = 'System.Reflection.TargetInvocationException: Exception has been thrown by the target of an invocation. ---> System.TypeLoadException: Could not resolve type with token 01000029 (from typeref, class/assembly System.Runtime.CompilerServices.DefaultInterpolatedStringHandler, 0Harmony, Version=2.3.6.0, Culture=neutral, PublicKeyToken=null)';
  for (const [text, expected] of [
    [handler, true],
    ['MissingMethodException: Method not found: void HarmonyLib.Harmony.PatchCategory(string)', true],
    [handler.replace(', 0Harmony,', ', mscorlib,'), false],
    ['MissingMethodException: void SomeMod.Patch(HarmonyLib.Harmony)', false],
    ['MissingMethodException: HarmonyLib.CodeInstruction SomeMod.Build()', false],
    ['  at HarmonyLib.Harmony.PatchCategory(System.String category)', false],
  ] as const) {
    assert.equal(oldHarmonyVersion().onLine({ text, number: 1, truncated: false }), expected, text);
  }
});
