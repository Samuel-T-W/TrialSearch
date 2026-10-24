import { describe, expect, it } from "vitest";
import fixture from "../../../data/fixtures/compiled.sample.json";
import type { CompiledTrial, Profile } from "../../../shared/schema";
import { createMatcher, evaluateCheck, explain, haversineMiles, type ZipTable } from "./index";

const trials = fixture.trials as unknown as CompiledTrial[];
const zips: ZipTable = {
  "01109": [42.1185, -72.5486], // Springfield
  "02115": [42.3428, -71.0927], // Boston
  "01201": [42.4493, -73.2539], // Pittsfield
};

const base: Profile = {
  age: 58,
  sex: "MALE",
  zip: "01109",
  maxMiles: 25,
  conditionIds: ["t2d"],
  meds: [{ medClassId: "metformin" }],
  answers: {},
  lang: "es",
};

const m = createMatcher({ trials }, zips);
const ids = (rs: { trial: CompiledTrial }[]) => rs.map((r) => r.trial.nctId);

describe("haversine", () => {
  it("Springfield to Boston is about 80 miles", () => {
    const d = haversineMiles(42.1185, -72.5486, 42.3428, -71.0927);
    expect(d).toBeGreaterThan(70);
    expect(d).toBeLessThan(85);
  });
});

describe("hard filter", () => {
  it("only returns trials for the patient's conditions within distance", () => {
    const out = m.match(base);
    // Holyoke lifestyle study (8 mi) ranks before the weekly-shot study: fewer open questions.
    expect(ids(out.matches)).toEqual(["NCT09900002", "NCT09900001"]);
  });

  it("drops trials outside the distance limit", () => {
    const out = m.match({ ...base, zip: "02115", maxMiles: 5 });
    expect(ids(out.matches)).toEqual(["NCT09900001"]); // MGH is close; Holyoke/Lowell are not
    expect(m.match({ ...base, zip: "01201", maxMiles: 5 }).matches).toHaveLength(0);
  });

  it("drops trials outside the age range", () => {
    expect(ids(m.match({ ...base, age: 30 }).matches)).toEqual(["NCT09900002"]); // 21+ only
    expect(m.match({ ...base, age: 19 }).matches).toHaveLength(0);
  });

  it("drops women-only trials for male profiles", () => {
    const p: Profile = { ...base, zip: "02115", conditionIds: ["breast_cancer"] };
    expect(m.match(p).matches).toHaveLength(0);
    expect(ids(m.match({ ...p, sex: "FEMALE" }).matches)).toEqual(["NCT09900004"]);
  });

  it("includes healthy-volunteer trials only when opted in", () => {
    const p: Profile = { ...base, conditionIds: [], maxMiles: 100 };
    expect(m.match(p).matches).toHaveLength(0);
    expect(ids(m.match({ ...p, healthyVolunteer: true }).matches)).toContain("NCT09900002");
  });

  it("returns nothing for an unknown ZIP", () => {
    expect(m.match({ ...base, zip: "99999" }).matches).toHaveLength(0);
  });
});

describe("not a fit", () => {
  it("hides the T1D trial that excludes type 2 diabetes, with the reason", () => {
    const out = m.match({ ...base, maxMiles: 100 });
    expect(ids(out.matches)).not.toContain("NCT07589608");
    const hidden = out.notAFit.find((r) => r.trial.nctId === "NCT07589608");
    expect(hidden?.excludedBy?.check.id).toBe("NCT07589608#3");
  });

  it("a yes to an exclusion question moves the trial to not-a-fit", () => {
    const out = m.match({ ...base, answers: { q_pancreatitis: true } });
    expect(ids(out.matches)).not.toContain("NCT09900001");
    expect(out.notAFit.find((r) => r.trial.nctId === "NCT09900001")?.excludedBy?.check.id).toBe("NCT09900001#5");
  });
});

describe("check evaluation", () => {
  const t = trials.find((x) => x.nctId === "NCT09900001")!;
  const check = (n: number) => t.checks.find((c) => c.id === `NCT09900001#${n}`)!;

  it("question answers: no -> met, unsure -> unknown", () => {
    expect(evaluateCheck(check(5), { ...base, answers: { q_pancreatitis: false } }).status).toBe("met");
    expect(evaluateCheck(check(5), { ...base, answers: { q_pancreatitis: "unsure" } }).status).toBe("unknown");
  });

  it("clinician checks are always unknown", () => {
    expect(evaluateCheck(check(8), base).status).toBe("unknown");
  });

  it("minDays medication needs how-long information", () => {
    expect(evaluateCheck(check(3), base).status).toBe("unknown");
    expect(evaluateCheck(check(3), { ...base, meds: [{ medClassId: "metformin", sinceDays: 365 }] }).status).toBe("met");
    expect(evaluateCheck(check(3), { ...base, meds: [{ medClassId: "metformin", sinceDays: 30 }] }).status).toBe("not_met");
    expect(evaluateCheck(check(3), { ...base, meds: [] }).status).toBe("not_met");
  });

  it("excluded medication currently taken -> not met", () => {
    expect(evaluateCheck(check(4), { ...base, meds: [{ medClassId: "glp1" }] }).status).toBe("not_met");
    expect(evaluateCheck(check(4), base).status).toBe("met");
  });

  it("low-confidence checks are unknown and not answerable, never a hard exclude", () => {
    const hv = trials.find((x) => x.nctId === "NCT09900002")!;
    const low = hv.checks.find((c) => c.confidence === "low" && c.kind === "question")!;
    const r = evaluateCheck(low, { ...base, answers: { q_walk_6min: false } });
    expect(r.status).toBe("unknown");
    expect(r.answerable).toBe(false);
  });
});

describe("next questions", () => {
  it("ranks unanswered questions by how many trials they affect", () => {
    const out = m.match({ ...base, maxMiles: 100, healthyVolunteer: true });
    const qids = out.nextQuestions.map((q) => q.questionId);
    expect(qids).toContain("q_pancreatitis");
    expect(out.nextQuestions.find((q) => q.questionId === "q_heart_attack_6m")?.affects).toBe(1);
    expect(out.nextQuestions.length).toBeLessThanOrEqual(5);
  });

  it("answered questions drop out", () => {
    const out = m.match({ ...base, answers: { q_pancreatitis: false } });
    expect(out.nextQuestions.map((q) => q.questionId)).not.toContain("q_pancreatitis");
  });
});

describe("explain", () => {
  it("uses the patient's language and flags English fallback", () => {
    const r = m.match(base).matches.find((x) => x.trial.nctId === "NCT09900001")!;
    const es = explain(r, "es");
    expect(es[1].text).toBe("Tiene diabetes tipo 2.");
    expect(es.every((e) => !e.englishOnly)).toBe(true);
    const hv = m.match({ ...base, lang: "zh", healthyVolunteer: true, maxMiles: 100 }).matches.find(
      (x) => x.trial.nctId === "NCT09900002",
    )!;
    expect(explain(hv, "zh")[0].englishOnly).toBe(true);
  });
});

describe("performance", () => {
  it("matches 3,500 trials in under 100 ms", () => {
    const big: CompiledTrial[] = [];
    for (let i = 0; i < 500; i++) for (const t of trials) big.push({ ...t, nctId: `NCT${String(i).padStart(8, "0")}` });
    const bm = createMatcher({ trials: big }, zips);
    const p = { ...base, maxMiles: 200, healthyVolunteer: true, conditionIds: ["t2d", "heart_failure", "depression"] };
    bm.match(p); // warm up
    const t0 = performance.now();
    bm.match(p);
    expect(performance.now() - t0).toBeLessThan(100);
  });
});
