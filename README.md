# TrialSearch

Find recruiting clinical trials in Massachusetts you could plausibly join.
Plain language, six languages, and your answers never leave your phone.

Hackachusetts 2026, Healthcare & biotech, challenge H5.

## Try it live

Live app: [trial-search-web.vercel.app](https://trial-search-web.vercel.app/)

No login, no account, no setup:

1. Open the live link above on your phone or laptop.
2. Pick one of the demo profiles on the landing screen (for example a 58-year-old
   in Springfield with type 2 diabetes). Each profile is a persona you step into;
   nothing you do is sent anywhere.
3. You land on the feed: trials you could plausibly join, newest-fit first. Tap a
   card to open its detail panel and see each eligibility rule in plain language,
   marked met / unknown / rules you out.
4. Answer a question or two in the panel, press **Save**, and watch the trial move
   between **Matches** and **Not a fit** with the reason shown.

The whole thing runs in the browser. The server ships the same full data bundle to
everyone, so it never learns which trials matter to you.

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
npm test                     # matcher + pipeline (vitest), incl. property tests
npm --prefix web run test:e2e   # UI flow + network audit (Playwright)
```

The matcher is covered two ways: example-based tests in
`web/src/matcher/matcher.test.ts`, and **property-based tests** in
`web/src/matcher/matcher.properties.test.ts` (fast-check) that generate hundreds
of random patient profiles and assert the matcher's invariants hold for all of
them -- a trial is never both a match and a not-a-fit, hard filters are never
violated, and an unanswered question never becomes a verdict. The Playwright
network audit asserts the running app makes no outbound profile calls.

## How Kiro was used

Kiro drove the development of this project, and the artifacts it produced live in
`.kiro/`:

- **Steering docs** (`.kiro/steering/`) give Kiro always-on context about the
  project: `product.md` (the core privacy and plain-language promises),
  `tech.md` (the TypeScript / Vite / vitest stack and the build commands), and
  `structure.md` (the repo layout and the boundary that the matcher stays pure
  and the pipeline is the only code allowed to touch an LLM or the network).
  These keep every change consistent with the product's non-negotiables.

- **Spec-driven development** (`.kiro/specs/matcher-property-tests/`): one small
  feature was built end to end through a Kiro spec -- `requirements.md`
  (EARS-style acceptance criteria for the matcher's invariants), `design.md`
  (the fast-check generator and property design), and `tasks.md` (the
  implementation checklist). The spec produced real, passing code:
  `web/src/matcher/matcher.properties.test.ts`.

- **Property-based tests**: following the spec, we added fast-check property
  tests over the device matcher. Instead of a handful of examples, they generate
  hundreds of random but schema-valid patient profiles and assert the matcher's
  promises hold for all of them: matches and not-a-fit never overlap, age/sex/
  distance hard filters are never violated, a confirmed exclusion is never a
  match, an unanswered question never resolves to a verdict, and the matcher is
  deterministic. These run under `npm test`.

- **An agent hook** (`.kiro/hooks/matcher-tests.kiro.hook`): on save of any file
  under `web/src/matcher/` or the shared contracts in `shared/`, Kiro runs the
  matcher suite (example-based and property-based) and reports any broken
  invariant with the minimal counterexample fast-check found -- so a change that
  breaks a core promise is caught before it is committed.

## Data sources

- ClinicalTrials.gov API v2, U.S. National Library of Medicine.
- U.S. Census Bureau ZCTA gazetteer (ZIP centroids).
- Every trial screen links to its official record. The app never replaces it.

This is not medical advice. The study team decides who can join.
