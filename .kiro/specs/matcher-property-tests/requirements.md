# Requirements -- Property-based matcher invariants

## Introduction

The matcher (`web/src/matcher/index.ts`) decides which trials a patient sees and
which move to "not a fit". It runs on the device and is the heart of the product.
Today it is covered by example-based vitest tests. Examples prove specific cases;
they do not prove that the matcher's promises hold for *every* profile. This spec
adds property-based tests (fast-check) that assert the matcher's invariants over
thousands of randomly generated profiles, so a regression that breaks a core
promise is caught even when no one wrote the exact failing example.

## Requirements

### Requirement 1 -- No trial is both a match and a not-a-fit

**User story:** As a patient, I never see the same trial in two contradictory
places, so the result I read is coherent.

**Acceptance criteria**
1. WHEN the matcher runs on any valid profile THEN the sets of `matches` and
   `notAFit` SHALL be disjoint by `nctId`.
2. WHEN the matcher runs on any valid profile THEN every returned trial SHALL
   appear at most once across both lists.

### Requirement 2 -- Hard filters are never violated

**User story:** As a patient, a trial that rules me out by age, sex, or distance
is never shown as a match.

**Acceptance criteria**
1. WHEN a trial declares an age range THEN no profile outside that range SHALL
   see it in `matches`.
2. WHEN a trial is sex-restricted THEN no profile of the excluded sex SHALL see
   it in `matches`.
3. WHEN a trial's nearest site is farther than the profile's `maxMiles` THEN the
   trial SHALL NOT appear in `matches`.

### Requirement 3 -- A match has no confirmed exclusion

**User story:** As a patient, a trial I clearly do not qualify for does not sit
in my matches.

**Acceptance criteria**
1. WHEN a trial is in `matches` THEN it SHALL have no check whose status is a
   confirmed exclusion (`excludedBy` is undefined).
2. WHEN a trial has a confirmed exclusion THEN it SHALL appear in `notAFit` with
   `excludedBy` set.

### Requirement 4 -- Unknowns never become a verdict

**User story:** As a patient, the app never guesses me into or out of a trial on
information I did not give.

**Acceptance criteria**
1. WHEN a check's inputs are unknown THEN its status SHALL be `unknown`, never
   `met` or `not_met`.
2. WHEN a profile answers no questions THEN no question-based check SHALL change
   from `unknown` to a verdict.

### Requirement 5 -- Determinism

**User story:** As a developer, the same profile always yields the same result.

**Acceptance criteria**
1. WHEN the matcher runs twice on the same profile THEN the ordered `matches`,
   `notAFit`, and `nextQuestions` SHALL be identical.
