import { describe, expect, it } from "vitest";
import fixture from "../../../data/fixtures/compiled.sample.json";
import type { CompiledTrial, Profile } from "../../../shared/schema";
import { createMatcher, type TrialResult, type ZipTable } from "../matcher";
import { addFeed, answer, archive, buildBoard, feedItems, newSession, openQuestions, register, removeFeed, restore, settledBy, verdictOf } from "./board";

const trials = fixture.trials as unknown as CompiledTrial[];
const zips: ZipTable = { "01109": [42.1185, -72.5486] };
const m = createMatcher({ trials }, zips);
const profile: Profile = {
  age: 58, sex: "MALE", zip: "01109", maxMiles: 200, conditionIds: ["t2d", "heart_failure"],
  meds: [{ medClassId: "metformin" }], answers: {}, lang: "en",
};
const PREG = { q_pancreatitis: false, q_mtc_family: false, q_pregnant: false }; // settles the weekly-shot study
const T2D = "NCT09900001"; // needs q_pancreatitis, q_mtc_family, q_pregnant
const LIFESTYLE = "NCT09900002"; // needs q_heart_attack_6m (shared with the heart-failure trial)
const HF = "NCT09900003";
const withAnswers = (a: Profile["answers"]) => newSession({ ...profile, answers: a });
const board = (s = newSession(profile)) => buildBoard(m.match(s.profile), s);
const where = (b: ReturnType<typeof board>, id: string) => (Object.keys(b) as (keyof typeof b)[]).find((t) => b[t].some((i) => i.result.trial.nctId === id));
const result = (id: string, p = profile): TrialResult => [...m.match(p).matches, ...m.match(p).notAFit].find((r) => r.trial.nctId === id)!;

describe("verdictOf", () => {
  it("is unsure while an answerable question is open, listing it once", () => {
    expect(verdictOf(result(T2D))).toBe("unsure");
    expect(openQuestions(result(T2D))).toEqual(["q_pancreatitis", "q_mtc_family", "q_pregnant"]);
  });

  it("is qualified when only clinician or low-confidence checks remain unknown", () => {
    const r = result(T2D, { ...profile, answers: PREG });
    expect(r.checks.some((c) => c.status === "unknown" && !c.answerable)).toBe(true);
    expect(verdictOf(r)).toBe("qualified");
  });

  it("is not_qualified when any check is not met", () => {
    expect(verdictOf(result(T2D, { ...profile, answers: { q_pancreatitis: true } }))).toBe("not_qualified");
  });
});

describe("buildBoard placement", () => {
  it("puts unsure in feed, qualified in qualified, not_qualified in archive with a tag", () => {
    const b = board(withAnswers({ ...PREG, q_heart_attack_6m: true }));
    expect(where(b, T2D)).toBe("qualified");
    expect(where(b, HF)).toBe("archive");
    expect(b.archive.find((i) => i.result.trial.nctId === HF)?.tag).toBe("not_qualified");
    expect(where(board(), T2D)).toBe("feed");
    expect(board().feed[0].tag).toBeUndefined();
  });

  it("registered drops to archive, marked interest sent, when an answer rules the user out", () => {
    const s = register(newSession(profile), T2D);
    expect(where(board(s), T2D)).toBe("registered");
    expect(board(s).registered[0].interestSent).toBeUndefined();
    const flipped = answer(s, "q_pancreatitis", true);
    expect(where(board(flipped), T2D)).toBe("archive");
    expect(board(flipped).archive.find((i) => i.result.trial.nctId === T2D)).toMatchObject({
      tag: "not_qualified",
      interestSent: true,
    });
  });

  it("archived beats registered beats verdict, and marks registered trials interest sent", () => {
    const s = archive(register(register(newSession(profile), LIFESTYLE), T2D), T2D);
    const b = board(s);
    expect(b.archive[0]).toMatchObject({ tab: "archive", tag: "unsure", interestSent: true });
    expect(b.archive[0].result.trial.nctId).toBe(T2D);
    expect(b.registered.map((i) => i.result.trial.nctId)).toEqual([LIFESTYLE]);
    expect(board(archive(newSession(profile), HF)).archive[0].tag).toBe("unsure");
    expect(board(archive(newSession(profile), HF)).archive[0].interestSent).toBeUndefined();
  });

  it("orders registered by registration and hand-archived (newest first) before automatic", () => {
    const s = archive(archive(register(register(newSession(profile), HF), T2D), LIFESTYLE), T2D);
    const b = board(s);
    expect(b.registered.map((i) => i.result.trial.nctId)).toEqual([HF]);
    expect(b.archive.slice(0, 2).map((i) => i.result.trial.nctId)).toEqual([T2D, LIFESTYLE]);
  });
});

describe("settledBy and feeds", () => {
  it("one shared answer settles other trials", () => {
    const s = newSession(profile);
    const settled = settledBy(board(s), board(answer(s, "q_heart_attack_6m", true)));
    expect(settled.sort()).toEqual([HF, LIFESTYLE].sort());
    expect(settledBy(board(s), board(s))).toEqual([]);
  });

  it("feedItems filters by condition", () => {
    const b = board();
    expect(feedItems(b, { id: "all", conditionId: null })).toEqual(b.feed);
    const hf = feedItems(b, { id: "heart_failure", conditionId: "heart_failure" });
    expect(hf.map((i) => i.result.trial.nctId)).toEqual([HF]);
  });
});

describe("updaters", () => {
  it("return new sessions, never mutate, and keep the invariants", () => {
    const s = newSession(profile);
    const frozen = JSON.stringify(s);
    const s2 = removeFeed(addFeed(restore(archive(register(answer(s, "q_pregnant", false), T2D), T2D), "x"), "t2d"), "all");
    expect(JSON.stringify(s)).toBe(frozen);
    expect(s2.profile.answers.q_pregnant).toBe(false);
    expect(s2.feeds.map((f) => f.id)).toEqual(["all", "t2d"]);
    expect(register(s2, T2D).registered).toEqual([T2D]);
    expect(addFeed(s2, "t2d").feeds).toHaveLength(2);
    expect(restore(s2, T2D).archived).toEqual([]);
    expect(restore(s2, T2D).registered).toEqual([T2D]);
    expect(removeFeed(s2, "t2d").feeds.map((f) => f.id)).toEqual(["all"]);
  });
});
