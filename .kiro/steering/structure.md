---
inclusion: always
---

# TrialSearch -- Structure

## Top-level layout

| Path | Job |
|---|---|
| `shared/` | zod schemas (`schema.ts`) and vocabulary (`vocab.ts`) shared by pipeline and app |
| `pipeline/` | build-time pull, LLM compile, dedupe, translate, eval. Never runs in the app. |
| `data/store/` | the database: one compiled trial per file under `trials/`, plus `questions.json` |
| `data/fixtures/` | hand-written compiled trials, for tests only |
| `web/src/matcher/` | pure TS matcher, runs on the device, no React, no network |
| `web/src/i18n/` | per-language string bundles; `index.ts` resolves with English fallback |
| `web/src/journey/` | the patient-facing React UI (profile picker, feed, trial panel) |
| `web/` | Vite + React app, PWA, Playwright e2e + network audit |
| `docs/` | pitch, demo script, privacy, eval report, decisions |
| `.kiro/` | steering docs, specs, and hooks for Kiro |

## Boundaries that matter

- The **matcher** imports only from `shared/`. It must stay free of React and of
  any network or model call. All matching happens on the device.
- The **pipeline** is the only code allowed to touch the network or an LLM, and
  only at build time. The app ships a static bundle and fetches nothing else.
- **Schema is the single source of truth.** A data-shape change goes in
  `shared/schema.ts` and both sides follow; never edit one side's shape alone.

## Language rule

- `en` is always present. Other languages are optional per string and fall back
  to English at render time, with the fallback flagged in the UI so a reader
  knows the text is not in their language.
