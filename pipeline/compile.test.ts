import { describe, expect, it } from "vitest";
import { CompiledTrial, type RawTrial } from "../shared/schema";
import { compileTrial, normalizeSex, parseAgeYears } from "./compile";
import { Llm, MockProvider } from "./llm";
import { mockResponder } from "./mock-responder";

const llm = () => new Llm(new MockProvider(mockResponder));

const t2dOnMetformin: RawTrial = {
  nctId: "NCT00000001",
  briefTitle: "A study for adults with type 2 diabetes on metformin",
  conditions: ["Type 2 Diabetes Mellitus"],
  phases: ["PHASE2"],
  briefSummary: "Tests a new medicine for type 2 diabetes.",
  eligibilityCriteria:
    "Inclusion Criteria:\n- Diagnosis of type 2 diabetes\n- On a stable dose of metformin for at least 3 months\n- HbA1c between 7.0% and 10.5%\n\nExclusion Criteria:\n- Pregnant or lactating",
  minimumAge: "18 Years",
  maximumAge: "75 Years",
  sex: "ALL",
  healthyVolunteers: false,
  locations: [{ facility: "Baystate", city: "Springfield", zip: "01199", lat: 42.121, lon: -72.6043 }],
};

const excludesT2d: RawTrial = {
  nctId: "NCT00000002",
  briefTitle: "An insulin pump study that excludes type 2 diabetes",
  conditions: ["Type 1 Diabetes"],
  phases: ["NA"],
  eligibilityCriteria:
    "Inclusion Criteria:\n- Clinical diagnosis of type 1 diabetes\n\nExclusion Criteria:\n- Diagnosis of type 2 diabetes",
  minimumAge: "18 Years",
  maximumAge: "80 Years",
  sex: "ALL",
  healthyVolunteers: false,
  locations: [{ facility: "Joslin", city: "Boston", zip: "02215", lat: 42.3381, lon: -71.1077 }],
};

const masterProtocol: RawTrial = {
  nctId: "NCT00000099",
  briefTitle: "A sub-study under a master protocol",
  conditions: ["Solid Tumor"],
  phases: ["PHASE1"],
  eligibilityCriteria: "Please see the master protocol for full eligibility criteria.",
  minimumAge: "18 Years",
  sex: "ALL",
  locations: [{ facility: "MGH", city: "Boston", zip: "02114", lat: 42.3626, lon: -71.0688 }],
};

describe("structured-field helpers", () => {
  it("parses ages", () => {
    expect(parseAgeYears("18 Years")).toBe(18);
    expect(parseAgeYears("6 Months")).toBe(0);
    expect(parseAgeYears(undefined)).toBeUndefined();
  });
  it("normalizes sex", () => {
    expect(normalizeSex("MALE")).toBe("MALE");
    expect(normalizeSex("all")).toBe("ALL");
    expect(normalizeSex(undefined)).toBe("ALL");
  });
});

describe("compileTrial (mock provider)", () => {
  it("compiles 3 trials into schema-valid CompiledTrials", async () => {
    const l = llm();
    for (const raw of [t2dOnMetformin, excludesT2d, masterProtocol]) {
      const c = await compileTrial(raw, { llm: l });
      expect(() => CompiledTrial.parse(c)).not.toThrow();
      // Every check id follows `${nctId}#${n}`.
      for (const chk of c.checks) expect(chk.id).toMatch(new RegExp(`^${raw.nctId}#\\d+$`));
    }
  });

  it("derives age and sex checks from structured fields, not the LLM", async () => {
    const c = await compileTrial(t2dOnMetformin, { llm: llm() });
    const age = c.checks.find((x) => x.kind === "age");
    expect(age).toBeDefined();
    expect(age!.params).toMatchObject({ min: 18, max: 75 });
    expect(c.ageMin).toBe(18);
    expect(c.ageMax).toBe(75);
  });

  it("maps a medication check with minDays", async () => {
    const c = await compileTrial(t2dOnMetformin, { llm: llm() });
    const med = c.checks.find((x) => x.kind === "medication");
    expect(med).toBeDefined();
    expect((med!.params as any).medClassIds).toContain("metformin");
    expect((med!.params as any).minDays).toBe(90);
  });

  it("captures an exclude-condition check for a trial that excludes type 2 diabetes", async () => {
    const c = await compileTrial(excludesT2d, { llm: llm() });
    const excl = c.checks.find((x) => x.kind === "condition" && x.polarity === "exclude");
    expect(excl).toBeDefined();
    expect((excl!.params as any).conditionIds).toContain("t2d");
  });

  it("flags a master-protocol trial and emits no LLM checks", async () => {
    const c = await compileTrial(masterProtocol, { llm: llm() });
    expect(c.flags).toContain("master_protocol");
    // Only the structural age check should be present (no LLM-derived checks).
    expect(c.checks.every((x) => x.kind === "age" || x.kind === "sex")).toBe(true);
  });
});
