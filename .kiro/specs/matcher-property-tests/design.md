# Design -- Property-based matcher invariants

## Overview

Add a vitest test file, `web/src/matcher/matcher.properties.test.ts`, that uses
[fast-check](https://github.com/dubzzz/fast-check) to generate random but valid
`Profile` values and assert the matcher's invariants hold for all of them. No
production code changes; this is test-only. `fast-check` is added as a dev
dependency in `web/package.json`.

## Generators (arbitraries)

The matcher's behavior is driven by the `Profile` shape and the fixture trials
in `data/fixtures/compiled.sample.json`. We reuse that fixture as the trial
universe so generated profiles exercise real compiled checks.

- `zipArb` -- one of the ZIPs in the test `ZipTable` (so distance is defined),
  plus a small chance of an unknown ZIP (to exercise the empty-result path).
- `profileArb` -- a record arbitrary producing a schema-valid `Profile`:
  - `age`: integer 0..120
  - `sex`: one of `MALE | FEMALE | OTHER`
  - `maxMiles`: positive number, biased toward 1..300
  - `conditionIds`: subset of the condition ids present in the fixtures
  - `meds`: array of `{ medClassId, sinceDays? }` drawn from fixture med classes
  - `answers`: record of known question ids to `true | false | "unsure"`
  - `lang`: one of the supported langs
  - `healthyVolunteer`: optional boolean

Each generated profile is parsed through `Profile` (zod) in the test to guarantee
validity before it reaches the matcher; invalid draws are discarded.

## Properties

1. **Disjoint lists** -- `matches` and `notAFit` share no `nctId`.
2. **Hard filters respected** -- for every trial in `matches`: age in range (if
   declared), sex allowed, nearest-site distance <= `maxMiles`.
3. **Match implies no exclusion** -- every `matches` entry has
   `excludedBy === undefined`; every `notAFit` entry has `excludedBy` set.
4. **Unknowns stay unknown** -- for a profile with empty `answers`, no
   question-kind check resolves to `met`/`not_met` via an answer.
5. **Determinism** -- running `match` twice on the same profile yields deeply
   equal output.

## Running and tuning

- Runs under the existing `npm test` (vitest) with no new script.
- `numRuns` set high enough to be meaningful but fast (default 200 per property).
- On failure, fast-check shrinks to a minimal counterexample and prints the seed,
  so a regression is reproducible.

## Out of scope

- No changes to matcher logic.
- No UI or pipeline tests here (covered by Playwright and pipeline vitest).
