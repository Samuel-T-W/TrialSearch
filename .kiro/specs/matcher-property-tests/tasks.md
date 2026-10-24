# Tasks -- Property-based matcher invariants

- [x] 1. Add `fast-check` as a dev dependency in `web/package.json`.
- [x] 2. Create `web/src/matcher/matcher.properties.test.ts`.
  - [x] 2.1 Build a `profileArb` arbitrary that yields schema-valid `Profile`s,
        reusing fixture condition/med/question ids and the test `ZipTable`.
  - [x] 2.2 Parse each generated profile through the `Profile` zod schema; discard
        invalid draws.
- [x] 3. Property: `matches` and `notAFit` are disjoint by `nctId`.
  _Requirements: 1.1, 1.2_
- [x] 4. Property: every match respects age, sex, and distance hard filters.
  _Requirements: 2.1, 2.2, 2.3_
- [x] 5. Property: a match has no confirmed exclusion; a not-a-fit does.
  _Requirements: 3.1, 3.2_
- [x] 6. Property: with no answers, no question check resolves to a verdict.
  _Requirements: 4.1, 4.2_
- [x] 7. Property: the matcher is deterministic for a fixed profile.
  _Requirements: 5.1_
- [x] 8. Run `npm test` from the repo root and confirm all properties pass.
