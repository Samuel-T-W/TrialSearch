import { describe, expect, it } from "vitest";
import type { CompiledTrial } from "../shared/schema";
import { dedupeQuestions } from "./dedupe";

/** Minimal compiled trial carrying one pending question check. */
function trialWithQuestion(nctId: string, qtext: string): CompiledTrial {
  return {
    nctId,
    title: { en: "t" },
    summary: { en: "s" },
    phase: ["NA"],
    conditionIds: [],
    healthyVolunteers: false,
    sex: "ALL",
    sites: [{ facility: "f", city: "c", lat: 42, lon: -71 }],
    checks: [
      {
        id: `${nctId}#1`,
        polarity: "exclude",
        kind: "question",
        params: { questionId: `pending:${qtext}` },
        sourceText: qtext,
        plain: { en: qtext },
        confidence: "high",
      },
    ],
    flags: [],
    officialUrl: `https://clinicaltrials.gov/study/${nctId}`,
  };
}

describe("dedupeQuestions (exact-text, no LLM)", () => {
  it("merges identical questions across trials into one bank id", async () => {
    const q = "Have you been in another drug study in the last 30 days";
    const trials = [trialWithQuestion("NCT00000010", q), trialWithQuestion("NCT00000011", q)];
    const { trials: out } = await dedupeQuestions(trials, { useLlm: false });
    const id0 = (out[0].checks[0].params as any).questionId;
    const id1 = (out[1].checks[0].params as any).questionId;
    expect(id0).toBe(id1);
    expect(id0).not.toMatch(/^pending:/);
  });

  it("reuses a QUESTION_BANK seed id when the text matches a seed", async () => {
    // Matches q_other_trial_30d seed text verbatim.
    const seed = "Have you been in another drug study in the last 30 days?";
    const { trials: out, questions } = await dedupeQuestions([trialWithQuestion("NCT00000012", seed)], {
      useLlm: false,
    });
    const id = (out[0].checks[0].params as any).questionId;
    expect(id).toBe("q_other_trial_30d");
    // Seed is not duplicated into the bank.
    expect(questions.filter((x) => x.id === "q_other_trial_30d")).toHaveLength(1);
  });

  it("gives distinct questions distinct ids", async () => {
    const { trials: out } = await dedupeQuestions(
      [trialWithQuestion("NCT00000013", "Do you own a dog"), trialWithQuestion("NCT00000014", "Do you own a cat")],
      { useLlm: false },
    );
    expect((out[0].checks[0].params as any).questionId).not.toBe((out[1].checks[0].params as any).questionId);
  });
});
