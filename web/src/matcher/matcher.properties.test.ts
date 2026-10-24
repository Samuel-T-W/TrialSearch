// Property-based tests for the matcher (.kiro/specs/matcher-property-tests).
// We assert invariants that must hold for EVERY valid profile, not just the
// hand-picked examples in matcher.test.ts. fast-check generates random profiles,
// and on failure shrinks to a minimal counterexample and prints the seed.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import fixture from "../../../data/fixtures/compiled.sample.json";
import { Profile as ProfileSchema } from "../../../shared/schema";
import type { CompiledTrial, Profile } from "../../../shared/schema";
import { createMatcher, haversineMiles, type ZipTable } from "./index";

const trials = fixture.trials as unknown as CompiledTrial[];

// Known ZIPs (distance is defined) plus one unknown ZIP to exercise the empty path.
const zips: ZipTable = {
  "01109": [42.1185, -72.5486], // Springfield
  "02115": [42.3428, -71.0927], // Boston
  "01201": [42.4493, -73.2539], // Pittsfield
};
const KNOWN_ZIPS = Object.keys(zips);
const ZIP_ARB = fc.constantFrom(...KNOWN_ZIPS, "99999");

// Vocabulary present in the fixtures, so generated profiles hit real checks.
const CONDITIONS = ["t1d", "t2d", "obesity", "prediabetes", "heart_failure", "breast_cancer", "depression", "copd"];
const MED_CLASSES = ["insulin", "metformin", "glp1", "immunotherapy", "antipsychotic"];
const QUESTIONS = [
  "q_pregnant", "q_pancreatitis", "q_mtc_family", "q_walk_6min",
  "q_heart_attack_6m", "q_other_trial_30d", "q_suicidal_thoughts", "q_smartphone",
];

const m = createMatcher({ trials }, zips);

/** A fast-check arbitrary that yields schema-valid Profiles. */
const profileArb: fc.Arbitrary<Profile> = fc
  .record({
    age: fc.integer({ min: 0, max: 120 }),
    sex: fc.constantFrom("MALE", "FEMALE", "OTHER"),
    zip: ZIP_ARB,
    maxMiles: fc.integer({ min: 1, max: 300 }),
    conditionIds: fc.uniqueArray(fc.constantFrom(...CONDITIONS), { maxLength: 4 }),
    meds: fc.array(
      fc.record({
        medClassId: fc.constantFrom(...MED_CLASSES),
        sinceDays: fc.option(fc.integer({ min: 0, max: 2000 }), { nil: undefined }),
      }),
      { maxLength: 4 },
    ),
    answers: fc.dictionary(fc.constantFrom(...QUESTIONS), fc.constantFrom<boolean | "unsure">(true, false, "unsure")),
    lang: fc.constantFrom("en", "es", "pt", "ht", "zh", "vi"),
    healthyVolunteer: fc.option(fc.boolean(), { nil: undefined }),
  })
  // Re-parse through zod so only valid profiles reach the matcher.
  .map((p) => ProfileSchema.parse(p) as Profile);

describe("matcher properties", () => {
  it("matches and notAFit never share a trial (req 1)", () => {
    fc.assert(
      fc.property(profileArb, (p) => {
        const out = m.match(p);
        const matchIds = new Set(out.matches.map((r) => r.trial.nctId));
        for (const r of out.notAFit) expect(matchIds.has(r.trial.nctId)).toBe(false);
        // No trial appears twice within a list either.
        expect(new Set(matchIds).size).toBe(out.matches.length);
      }),
      { numRuns: 200 },
    );
  });

  it("every match respects age, sex and distance hard filters (req 2)", () => {
    fc.assert(
      fc.property(profileArb, (p) => {
        const out = m.match(p);
        const home = zips[p.zip];
        for (const r of out.matches) {
          const t = r.trial;
          if (t.ageMin !== undefined) expect(p.age).toBeGreaterThanOrEqual(t.ageMin);
          if (t.ageMax !== undefined) expect(p.age).toBeLessThanOrEqual(t.ageMax);
          if (t.sex !== "ALL" && p.sex !== "OTHER") expect(p.sex).toBe(t.sex);
          // home must exist for any match, and nearest site must be within range.
          expect(home).toBeDefined();
          const nearest = Math.min(...t.sites.map((s) => haversineMiles(home[0], home[1], s.lat, s.lon)));
          expect(nearest).toBeLessThanOrEqual(p.maxMiles);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("a match has no confirmed exclusion; a not-a-fit does (req 3)", () => {
    fc.assert(
      fc.property(profileArb, (p) => {
        const out = m.match(p);
        for (const r of out.matches) expect(r.excludedBy).toBeUndefined();
        for (const r of out.notAFit) expect(r.excludedBy).toBeDefined();
      }),
      { numRuns: 200 },
    );
  });

  it("with no answers, no question check becomes a verdict (req 4)", () => {
    fc.assert(
      fc.property(profileArb, (p) => {
        const out = m.match({ ...p, answers: {} });
        for (const r of [...out.matches, ...out.notAFit]) {
          for (const c of r.checks) {
            if (c.check.kind === "question") expect(c.status).toBe("unknown");
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("is deterministic for a fixed profile (req 5)", () => {
    fc.assert(
      fc.property(profileArb, (p) => {
        const a = m.match(p);
        const b = m.match(p);
        const shape = (o: typeof a) => ({
          matches: o.matches.map((r) => [r.trial.nctId, r.distanceMiles, r.answerableUnknown]),
          notAFit: o.notAFit.map((r) => [r.trial.nctId, r.excludedBy?.check.id]),
          nextQuestions: o.nextQuestions,
        });
        expect(shape(a)).toEqual(shape(b));
      }),
      { numRuns: 200 },
    );
  });
});
