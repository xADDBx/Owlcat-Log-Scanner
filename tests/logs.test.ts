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
        assert.ok(entry.rule.logTypes.includes(fixture.type), `${key}: wrong-log-type expectation for ${path}`);
        assert.equal(typeof expected, 'boolean', `${key}/${path}: review and label true or false`);
      }
    }
  });
  if (!rules.length) test('Issue accuracy is untested: no diagnostic rules are implemented', { skip: true }, () => {});
  for (const { game, rule, key } of rules) {
    test(`${key}: every applicable log is reviewed, with positives and negatives per log type`, () => {
      const labels = expectedIssues[key];
      assert.ok(labels, `Missing expectations for ${key}`);
      for (const type of rule.logTypes) {
        const applicable = fixtures.filter(file => file.game === game.id && file.type === type);
        for (const file of applicable) assert.equal(typeof labels[file.path], 'boolean', `Review ${key} in ${file.path}`);
        assert.ok(applicable.some(file => labels[file.path] === true), `${key}/${type}: no positive example`);
        assert.ok(applicable.some(file => labels[file.path] === false), `${key}/${type}: no negative example`);
      }
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
        const applicable = game.detections.filter(rule => rule.logTypes.includes(fixture.type));
        assert.equal(report.rulesRun, applicable.length);
        const expected = applicable.filter(rule => {
          const key = `${game.id}/${rule.code}`;
          const label = expectedIssues[key]?.[fixture.path];
          assert.equal(typeof label, 'boolean', `Review ${key} in ${fixture.path}`);
          return label;
        }).map(rule => rule.code).sort();
        assert.deepEqual(report.findings.map(finding => finding.detectionCode).sort(), expected);
      });
    }
  }
});

test('MonoMod overflow counts the NullReference trace, not the unrelated inner-exception address', async () => {
  const game = games.find(game => game.id === 'WotR')!;
  const report = await scanLog(await openAsBlob(join(root, 'WotR/GameLogFull(162).txt')), 'GameLogFull.txt', game);
  const finding = report.findings.find(finding => finding.detectionCode === 'WOTR-E001');
  assert.equal(finding?.occurrences, 1);
  assert.match(finding.evidence[0]!.text, /BlueprintsCache\.Init/);
});
