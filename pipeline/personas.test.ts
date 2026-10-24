// Persona tests: call the matcher in-process for each test patient and check
// the outcomes a person would expect. Uses the fixture so results are stable.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createMatcher, type ZipTable } from "../web/src/matcher/index";
import { loadFixtureTrials } from "./fixture";
import { PERSONAS } from "./personas";

const zips: ZipTable = JSON.parse(readFileSync(join(import.meta.dirname, "..", "web", "public", "data", "ma-zips.json"), "utf8"));
const matcher = createMatcher({ trials: loadFixtureTrials() }, zips);
const run = (id: string) => matcher.match(PERSONAS.find((p) => p.id === id)!.profile);
const ids = (rs: { trial: { nctId: string } }[]) => rs.map((r) => r.trial.nctId);

describe("persona outcomes (fixture trials)", () => {
  it("Maria: weekly-shot T2D trial matches, metformin duration confirmed", () => {
    const out = run("maria");
    const shot = out.matches.find((r) => r.trial.nctId === "NCT09900001");
    expect(shot).toBeDefined();
    expect(shot!.checks.find((c) => c.check.id === "NCT09900001#3")!.status).toBe("met");
  });

  it("James: the T1D trial that excludes type 2 diabetes is shown as not a fit", () => {
    const out = run("james");
    expect(ids(out.matches)).not.toContain("NCT07589608");
    expect(out.notAFit.find((r) => r.trial.nctId === "NCT07589608")?.excludedBy?.check.id).toBe("NCT07589608#3");
  });

  it("Dorothy: GLP-1 use rules her out of the weekly-shot trial", () => {
    const out = run("dorothy");
    expect(ids(out.matches)).not.toContain("NCT09900001");
    expect(out.notAFit.find((r) => r.trial.nctId === "NCT09900001")?.excludedBy?.check.id).toBe("NCT09900001#4");
  });

  it("Robert: heart failure trial in Boston (~36 mi) matches; insulin rules out the weekly shot", () => {
    const out = run("robert");
    expect(ids(out.matches)).toContain("NCT09900003");
    // Insulin excludes him from the weekly-shot T2D trial.
    expect(out.notAFit.find((r) => r.trial.nctId === "NCT09900001")?.excludedBy?.check.id).toBe("NCT09900001#4");
  });

  it("Linh: breast cancer trial in Boston matches a woman", () => {
    expect(ids(run("linh").matches)).toContain("NCT09900004");
  });

  it("Aisha: pregnancy and recent self-harm thoughts rule her out of the depression app", () => {
    const out = run("aisha");
    expect(ids(out.matches)).not.toContain("NCT09900005");
    expect(ids(out.notAFit)).toContain("NCT09900005");
  });

  it("Wei: COPD master-protocol trial matches with only the age rule", () => {
    const m = run("wei").matches.find((r) => r.trial.nctId === "NCT09900006");
    expect(m?.trial.flags).toContain("master_protocol");
  });

  it("Tom: healthy volunteer with no conditions only sees healthy-volunteer trials", () => {
    const out = run("tom");
    for (const r of [...out.matches, ...out.notAFit]) expect(r.trial.healthyVolunteers).toBe(true);
  });
});
