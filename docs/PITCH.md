# TrialSearch - Pitch

## One line

Find Massachusetts clinical trials you could join, explained in your language, without your health data ever leaving your phone.

## Slides

1. **Problem.** 3,144 trials are recruiting in Massachusetts right now. The listings are written for researchers. A "type 2 diabetes" search even returns a trial that excludes type 2 diabetes.
2. **Explainability.** Every match shows one plain line per rule: met, not met, or unknown, with the original text one tap away. English and Spanish everywhere; Portuguese, Haitian Creole, Chinese and Vietnamese for the demo conditions.
3. **Privacy by architecture.** The LLM reads only public trial text. Matching runs as JavaScript on the phone. Strict CSP, offline mode, and a test that fails on any network request after load.
4. **Accuracy, measured.** Criteria are compiled into structured checks by a semantic-operator pipeline (`sem_map` / `sem_filter`). We report accuracy on a hand-labeled set; anything uncertain becomes "ask the study team", never a guessed exclusion. See `EVAL_REPORT.md`.
5. **Who it helps.** Rural, limited-English, and environmental-justice communities. Next: zero-knowledge proofs for sharing eligibility with a site, and clinic kiosks.

## Devpost text

TrialSearch helps Massachusetts residents find recruiting clinical trials they may qualify for.
You enter age, sex, ZIP, conditions and medicines. The app shows nearby trials, one plain-language line per eligibility rule, and the few questions that would settle the most trials.
All matching happens on your device; the site is static and the LLM only ever reads public trial text at build time.
Built with TypeScript, zod, Vite, React, Tailwind, and the Anthropic API, using data from ClinicalTrials.gov and the U.S. Census.
This is not medical advice. The study team decides who can join.
