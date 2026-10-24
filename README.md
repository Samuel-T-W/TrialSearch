# TrialSearch

Find recruiting clinical trials in Massachusetts you could plausibly join.
Plain language, six languages, and your answers never leave your phone.

Hackachusetts 2026, Healthcare & biotech, challenge H5.

## Run it

```bash
npm install && npm --prefix web install
npm run dev          # builds data from the store, then starts the app on 127.0.0.1
```

## Where the trials live

`data/store/trials/<NCT ID>.json` is the database: one compiled trial per file, in the `CompiledTrial` shape from `shared/schema.ts`.
Add a trial by dropping a file there. Extra questions go in `data/store/questions.json`.

```bash
npm run store:check   # validate every store file
npm run data          # build web/public/data/trials.<lang>.json from the store
```

The build makes no LLM or API calls, and neither does the app.
Every phone downloads the same full bundle, so the server never learns which trials matter to a patient.

Optional: `npm run compile:store` pulls and compiles trials with an LLM (`DEEPSEEK_API_KEY` or `ANTHROPIC_API_KEY` in `.env`) and saves them into the store.

## Layout

| Path | Job |
|---|---|
| `shared/` | zod schemas and vocabulary shared by pipeline and app |
| `pipeline/` | build-time pull, LLM compile, dedupe, translate, eval |
| `data/fixtures/` | hand-written compiled trials, for tests only |
| `web/src/matcher/` | pure TS matcher, runs on the device |
| `web/` | Vite + React app, PWA, Playwright tests |
| `docs/` | pitch, demo script, privacy, eval report, decisions |

## Tests

```bash
npm test                     # matcher + pipeline (vitest)
npm --prefix web run test:e2e   # UI flow + network audit (Playwright)
```

## Data sources

- ClinicalTrials.gov API v2, U.S. National Library of Medicine.
- U.S. Census Bureau ZCTA gazetteer (ZIP centroids).
- Every trial screen links to its official record. The app never replaces it.

This is not medical advice. The study team decides who can join.
