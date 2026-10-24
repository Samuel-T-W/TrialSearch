---
inclusion: always
---

# TrialSearch -- Product

TrialSearch helps a patient in Massachusetts find recruiting clinical trials they
could plausibly join, in plain language, in their own language, without any of
their health answers leaving their device.

## Who it is for

- Patients and caregivers, not clinicians. The reading level is deliberately low.
- People who do not speak English as a first language. The UI and every trial's
  eligibility explanation ship translated.

## Core promises (do not break these)

1. **Privacy is the product.** The patient's profile (age, conditions, meds,
   ZIP, answers) never leaves the browser. The server ships the same full data
   bundle to everyone, so it cannot learn which trials matter to a patient.
   Any change that sends profile data to a server, or makes the bundle
   patient-specific, breaks the core promise and must be rejected.
2. **No live AI in the app.** All LLM work happens at build time in the
   pipeline. The running app does no model or network calls beyond fetching its
   own static bundle. Keep device inference out.
3. **Plain language.** Every eligibility rule has a pre-written plain-language
   explanation. Never show raw criteria text as the only explanation.
4. **We never decide eligibility.** The app surfaces what is known, unknown, and
   likely; the study team decides who can join. Every trial links to its
   official ClinicalTrials.gov record. This is not medical advice.

## What "a match" means

A trial is a *match* when no hard filter (age, sex, distance) rules it out and no
eligibility rule is a confirmed exclusion. A trial with an exclusion the patient
confirmed moves to *not a fit*, with the reason shown. Unknowns stay unknown --
we never guess a patient into or out of a trial.
