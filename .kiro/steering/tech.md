---
inclusion: always
---

# TrialSearch -- Tech & Commands

## Stack

- **Language:** TypeScript end to end, ES modules, Node >= 20.
- **Web app:** Vite + React, deployed as a PWA. Styling with Tailwind utility
  classes. Deployed on Vercel.
- **Shared contracts:** `shared/schema.ts` holds the zod schemas and types that
  both the pipeline and the app import, so they cannot drift apart. Change a data
  shape here, never in one side only.
- **Matcher:** `web/src/matcher/` is pure TypeScript -- no React, no network. It
  runs entirely on the device.
- **Pipeline:** `pipeline/` is build-time only: pull from ClinicalTrials.gov,
  LLM-compile eligibility into structured checks, dedupe, translate, eval.
- **Tests:** vitest for the matcher and pipeline; Playwright for the UI flow and
  a network audit that asserts the app makes no outbound profile calls.
- **Validation:** vitest with fast-check for property-based tests over the
  matcher (invariants, not just examples).

## Commands (run from repo root)

```bash
npm install && npm --prefix web install   # install deps (root + web)
npm run dev            # build data from the store, then start the app on 127.0.0.1
npm run build          # build data, then build the web app
npm test               # matcher + pipeline (vitest), includes property tests
npm run typecheck      # tsc, no emit
npm run store:check    # validate every file in data/store
npm run data           # build web/public/data/trials.<lang>.json from the store
npm --prefix web run test:e2e   # Playwright UI flow + network audit
```

## Data

- `data/store/trials/<NCT ID>.json` is the database: one compiled trial per
  file, in the `CompiledTrial` shape. Add a trial by dropping a file there.
- The build makes no network or LLM calls. `npm run compile:store` is the only
  path that calls an LLM, and it is a manual, build-time, opt-in step.

## Conventions

- Keep the matcher pure and framework-free.
- Localized text always has `en`; other languages are optional and fall back to
  English at render time, flagged as a fallback.
- Prefer small, reviewable commits.
