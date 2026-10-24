# Demo script (3 minutes)

## 1. Problem (30 s)

Show a raw ClinicalTrials.gov listing.
"There are over 3,000 trials recruiting in Massachusetts. This is what a patient sees."
Search "type 2 diabetes" and point at NCT07589608: it excludes type 2 diabetes.

## 2. Explainability (60 s)

Persona: 58, man, Springfield (ZIP 01109), type 2 diabetes, on metformin, speaks Spanish.

1. Landing -> pick Español.
2. Intake: 58, Male, 01109, 25 miles, "Type 2 diabetes", "Metformin".
3. Results: point at the cards and "X of Y rules confirmed".
4. "Narrow it down": answer "pancreatitis? No". The list updates instantly.
5. Open the weekly-shot trial: ✅ ❌ ❓ rules in Spanish. Tap one to show the original text.
6. Widen to 100 miles: NCT07589608 now sits under "Not a fit", with the reason "You cannot join if you have type 2 diabetes."
7. Summary -> print the doctor sheet: "Ask: what is my latest HbA1c?"

## 3. Privacy (45 s)

Turn on airplane mode. Reload. Run the same search. It still works.
Show the green network-audit test and the CSP header.
"We never see your health data, because it never reaches us."

## 4. Accuracy (30 s)

Show the pipeline diagram and the table from `EVAL_REPORT.md`.
"Low-confidence rules fall back to 'ask the study team'. We never guess an exclusion."

## 5. Close (15 s)

Who it helps: rural, limited-English, EJ communities.
What is next: ZK eligibility proofs for sites, clinic kiosks.

## Before you present

- Run `npm run data` with your key so the demo uses real trials (`DATA_SOURCE=live`). On the fixture, counts are small and a "Demo data" banner shows.
- Load the site once on the demo phone before airplane mode.
