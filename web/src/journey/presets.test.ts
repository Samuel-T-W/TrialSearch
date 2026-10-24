import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Profile } from "../../../shared/schema";
import { loadStore } from "../../../pipeline/store";
import { createMatcher, type ZipTable } from "../matcher";
import { buildBoard } from "./board";
import en from "../i18n/en.json";
import { PRESETS, sessionFromPreset } from "./presets";

const store = loadStore();
const zips: ZipTable = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../public/data/ma-zips.json"), "utf8"),
);
const matcher = createMatcher(store, zips);

describe("production journey presets", () => {
  it("copies a literal preset into an independent session", () => {
    const p = {
      id: "example",
      name: "Example Patient",
      about: "Example",
      city: "Boston",
      profile: {
        age: 50,
        sex: "FEMALE" as const,
        zip: "02108",
        maxMiles: 100,
        lang: "en" as const,
        conditionIds: ["t2d"],
        meds: [{ medClassId: "metformin", sinceDays: 90 }],
        answers: { q_pancreatitis: false },
      },
      registered: ["NCT07340320"],
      archived: ["NCT06903897"],
      feeds: [{ id: "all", conditionId: null }],
    };
    const session = sessionFromPreset(p);
    expect(session).toEqual({
      profile: {
        age: 50,
        sex: "FEMALE",
        zip: "02108",
        maxMiles: 100,
        lang: "en",
        conditionIds: ["t2d"],
        meds: [{ medClassId: "metformin", sinceDays: 90 }],
        answers: { q_pancreatitis: false },
      },
      registered: ["NCT07340320"],
      archived: ["NCT06903897"],
      feeds: [{ id: "all", conditionId: null }],
    });
    session.profile.meds[0].sinceDays = 1;
    session.profile.conditionIds.push("copd");
    session.profile.answers.q_pancreatitis = true;
    session.registered.length = 0;
    session.archived.length = 0;
    session.feeds[0].id = "changed";
    expect(p.profile.meds[0].sinceDays).toBe(90);
    expect(p.profile.conditionIds).toEqual(["t2d"]);
    expect(p.profile.answers).toEqual({ q_pancreatitis: false });
    expect(p.registered).toEqual(["NCT07340320"]);
    expect(p.archived).toEqual(["NCT06903897"]);
    expect(p.feeds).toEqual([{ id: "all", conditionId: null }]);
  });

  it("has exactly three valid patients in three languages and cities", () => {
    expect(store.errors).toEqual([]);
    expect(PRESETS).toHaveLength(3);
    expect(PRESETS.map((p) => p.profile.lang).sort()).toEqual(["en", "es", "pt"]);
    expect(new Set(PRESETS.map((p) => p.city)).size).toBe(3);
  });

  for (const p of PRESETS)
    it(`${p.name}: lived-in tabs use real, genuinely qualified trials`, () => {
      expect(Profile.safeParse(p.profile).success).toBe(true);
      expect(p.profile.conditionIds.length).toBeLessThanOrEqual(4);
      expect(p.profile.maxMiles).toBeLessThanOrEqual(100);
      expect((en.journey.about as Record<string, string>)[p.about.split(".").pop()!]).toBeTruthy();
      const session = sessionFromPreset(p);
      const board = buildBoard(matcher.match(session.profile), session);
      // These assert invariants the matcher guarantees for any valid store, not
      // exact counts against whatever trials happen to ship (which vary with the
      // store and would make the suite rot silently — see PR review).
      // A preset is "lived-in": at least one trial it registered interest in.
      expect(board.registered.length).toBeGreaterThanOrEqual(1);
      // Every registered trial is one the patient actually qualifies for.
      expect(board.registered.every((i) => i.verdict === "qualified")).toBe(true);
      // Feed trials are the ones still undecided: each must have an open question.
      expect(board.feed.every((i) => i.openQuestions.length > 0)).toBe(true);
      // A trial the patient qualifies for but archived by hand shows under Archive, tagged qualified.
      expect(
        board.archive.some((i) => i.tag === "qualified" && p.archived.includes(i.result.trial.nctId)),
      ).toBe(true);
      // Every id a preset references really exists in the store.
      expect([...p.registered, ...p.archived].every((id) => store.trials.some((t) => t.nctId === id))).toBe(
        true,
      );
      session.profile.answers.q_pancreatitis = true;
      expect(sessionFromPreset(p)).toEqual({
        profile: p.profile,
        registered: p.registered,
        archived: p.archived,
        feeds: p.feeds,
      });
    });
});
