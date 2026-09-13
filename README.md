# Log Scanner

Static TypeScript/Vite app for WotR logs. Processing runs in a browser worker.

## Run

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Open the printed HTTP URL and choose WotR.

## Tests

`npm test` requires the private logs in `logs/WotR/`, `logs/RT/`, and `logs/DH/`.

Every registered game/log-type signature is checked against every log, including wrong-game and wrong-log-type cases.

For each issue rule, add a `GameId/RuleCode` entry in `tests/expectations.ts`, mapping each applicable log path (e.g. `WotR/Player.log`) to `true` or `false` after reviewing it. Tests require explicit labels for every applicable log and at least one positive and negative example per supported log type. Missing labels fail.

## Blup

Game signatures, issue rules, solutions, and the Discord link are configured in `src/games/wotr.ts`.

`WOTR-E001` detects a NullReferenceException followed within its stack trace by a frame containing `<0xADDRESS + 0x00000>`. It supports Player.log and GameLogFull. New rule/solution text is in `src/locales/en.ts`
