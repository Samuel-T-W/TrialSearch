# Pipeline decisions & fallbacks

Decisions and deviations for the offline data pipeline (`pipeline/`). Keep this
current when a fallback from the plan's section 13 is taken.

## Provider abstraction (`pipeline/llm.ts`)

- One wrapper, two providers behind a tiny `LlmProvider` interface (`complete()` only):
  - `anthropic` — default whenever `ANTHROPIC_API_KEY` is set. Model from `COMPILE_MODEL`
    (default `claude-haiku-5-5`), eval from `EVAL_MODEL` (default `claude-sonnet-5-5`).
  - `mock` — `LLM_PROVIDER=mock`, a deterministic responder (`pipeline/mock-responder.ts`).
    Used by tests and by the no-key end-to-end run.
- `callJson<T>()` asks for JSON, strips code fences / surrounding prose, zod-validates,
  and retries up to 3 times feeding the validation error back into the prompt.
- Successful calls are cached at `data/cache/llm/<sha256(model+system+user+input)>.json`
  (gitignored), so reruns are free. Bedrock swaps in by implementing `complete()` only.

## Pull (`pipeline/pull.ts`) — RAN

- ClinicalTrials.gov API v2, `query.locn=Massachusetts`, `filter.overallStatus=RECRUITING`,
  `pageSize=1000`, paginated by `nextPageToken`.
- Kept only locations with `state == "Massachusetts"` **and** a numeric `geoPoint`.
- Result: **3,144** MA trials -> `data/raw/trials.json` (gitignored), with a 50-trial
  `data/raw/sample.json` committed.
- Fallback if the API fails/rate-limits (not needed this run): use the portal starter
  zip for the trial list and fetch eligibility per NCT ID for the 10 demo conditions.

## ZIP centroids (`pipeline/zip-centroids.ts`) — RAN

- Source: current Census **national ZCTA gazetteer**
  (`2024_Gaz_zcta_national.zip`), unzipped in-process with Node `zlib` (no external tools).
- MA filter: 5-digit ZCTAs in `01000`–`02799`.
- Result: **539** ZIPs -> `web/public/data/ma-zips.json` as `{"01109":[lat,lon], ...}`,
  keys sorted for a stable diff. Committed.

## Compile (`pipeline/compile.ts`)

- `sem_map`, one LLM call per trial, prompt rules copied verbatim from plan 6.1.
- **Age and sex checks are generated in code** from the structured API fields
  (`minimumAge`/`maximumAge`/`sex`), never by the LLM. Ages parsed to whole years.
- Check ids are `${nctId}#${n}`, numbered from the structural checks first.
- Condition/medication checks keep only ids that exist in the vocab; anything else
  degrades to `unparsed` (`confidence: "low"`), per "never guess an exclusion".
- Medication params may carry `minDays` ("on X at least N days") and `withinDays`
  ("used X within N days").
- `see master protocol` / empty criteria -> `flags`, and **no LLM checks** emitted.
- Concurrency from `COMPILE_CONCURRENCY` (default 16). `COMPILE_SCOPE=demo` compiles
  only trials whose conditions hit the 10 demo conditions; `all` (default) does every trial.
- Question checks leave a provisional `questionId: "pending:<text>"` for dedupe to resolve
  (or a seed bank id when the plain text already matches a `QUESTION_BANK` entry).

## Dedupe (`pipeline/dedupe.ts`)

- Exact normalized-text dedupe first (lowercase, non-alphanumeric collapsed).
- Optional LLM merge of paraphrases in batches of 50 (`useLlm`), each group -> one bank id.
- Final `Question[]` = `QUESTION_BANK` seeds + one new `q_auto_N` per merged group.
- Rewrites every pending `questionId` to its stable bank id.
- Fallback (dedupe not converging / no LLM): exact-text dedupe only — the default path.

## Translate (`pipeline/translate.ts`)

- `en`/`es` come from compile. Fills `pt`, `ht`, `zh`, `vi` for trials whose conditions
  intersect the demo conditions, plus the whole question bank. Public text only.
- Fallback: leave a language missing; the app shows English with an "English only" tag.

## Eval (`pipeline/eval.ts`)

- Reads `data/labels/eval.jsonl` (format documented at the top of the file). Matches a
  labeled criterion to a compiled check by normalized `sourceText`.
- Reports per-criterion **kind accuracy**, **exclusion precision/recall** (separately,
  because a wrong exclusion hides a trial), and the share routed to `unparsed`/`clinician`.
- `EVAL_DRAFT=1` (needs a key) drafts labels from `sample.json` with `EVAL_MODEL`,
  independent of the compile output, for Samuel to spot-check.
- A tiny **hand-written** `data/labels/eval.jsonl` (3 trials, 10 criteria) ships so the
  report runs today against the mock. Replace/extend it with drafted + spot-checked labels
  once a key exists (plan wants ~40 trials / ~400 criteria).

## Run order (`pipeline/run.ts`)

- `pull` (skipped if `data/raw/trials.json` exists, unless `--fresh`) -> `compile` ->
  `dedupe` -> `translate` -> `writeBundles({source:'live'})` + `data/compiled/`.

## No-key operation

- Everything is built to work the moment a key exists: set `DATA_SOURCE=live` and
  `ANTHROPIC_API_KEY` in `.env`, then `npm run data`.
- Tested without a key via `LLM_PROVIDER=mock`. The end-to-end sanity run
  (`pipeline/e2e-check.ts`) compiles the 50-trial sample through the mock and writes
  bundles to `$KIROCREW_SCRATCH` so `web/public/data` stays on the committed fixture.
