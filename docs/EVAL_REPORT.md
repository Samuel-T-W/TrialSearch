# TrialSearch - Eval Report

Generated: 2026-10-24T17:40:42.208Z
Compile provider: `mock`

Accuracy of the semantic-operator compiler against a hand-labeled set. Exclusion
precision/recall is reported separately because a wrong exclusion hides a trial
from a patient who might qualify.

## Metrics

| Metric | Value |
|---|---|
| Labeled trials | 3 |
| Labeled criteria | 10 |
| Criteria matched to a check | 9 (1 unmatched) |
| Kind accuracy (on matched) | 100.0% (9/9) |
| Exclusion precision | 66.7% |
| Exclusion recall | 100.0% |
| Share routed to `unparsed` | 10.0% |
| Share routed to `clinician` | 10.0% |

Exclusion confusion: TP=2, FP=1, FN=0.

## Example failures

1. **NCT00000003** - "Able to attend all study visits"
   - expected `unparsed/include`, got `(no matching check)`

---
_Low-confidence or unparsed checks are treated as "ask the study team", never as a hard exclude._
