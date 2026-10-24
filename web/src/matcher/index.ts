// Matcher: pure TypeScript, no React, no network (plan section 7).
// Runs entirely on the patient's device.
import type { Bundle, Check, CompiledTrial, Lang, Profile, Site } from "../../../shared/schema";
import { expandConditions } from "../../../shared/vocab";

export type Status = "met" | "not_met" | "unknown";

export type CheckResult = {
  check: Check;
  status: Status;
  /** True when the patient could settle this by answering a question. */
  answerable: boolean;
};

export type TrialResult = {
  trial: CompiledTrial;
  nearestSite: Site;
  distanceMiles: number;
  checks: CheckResult[];
  metCount: number;
  unknownCount: number;
  answerableUnknown: number;
  /** First rule that rules this trial out, if any. */
  excludedBy?: CheckResult;
};

export type NextQuestion = { questionId: string; affects: number };

export type MatchOutput = {
  matches: TrialResult[];
  notAFit: TrialResult[];
  nextQuestions: NextQuestion[];
};

export type ZipTable = Record<string, [number, number]>; // zip -> [lat, lon]

const EARTH_MILES = 3958.8;
export function haversineMiles(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h));
}

/** Is the rule's statement true for this profile? (before polarity) */
function ruleTruth(check: Check, p: Profile): boolean | "unknown" {
  if (check.confidence === "low") return "unknown";
  const params = check.params as Record<string, unknown>;
  switch (check.kind) {
    case "age": {
      const min = params.min as number | undefined;
      const max = params.max as number | undefined;
      return (min === undefined || p.age >= min) && (max === undefined || p.age <= max);
    }
    case "sex": {
      const sex = params.sex as string | undefined;
      if (!sex || sex === "ALL") return true;
      if (p.sex === "OTHER") return "unknown";
      return p.sex === sex;
    }
    case "condition": {
      const ids = (params.conditionIds as string[] | undefined) ?? [];
      return ids.some((id) => p.conditionIds.includes(id));
    }
    case "medication": {
      const ids = (params.medClassIds as string[] | undefined) ?? [];
      const taking = p.meds.filter((m) => ids.includes(m.medClassId));
      if (taking.length === 0) return false;
      // "on X for at least N days": needs to know how long.
      const minDays = params.minDays as number | undefined;
      if (minDays !== undefined) {
        if (taking.every((m) => m.sinceDays === undefined)) return "unknown";
        return taking.some((m) => (m.sinceDays ?? 0) >= minDays);
      }
      // "used X within N days": a current medicine always counts.
      return true;
    }
    case "question": {
      const a = p.answers[params.questionId as string];
      return a === true || a === false ? a : "unknown";
    }
    case "clinician":
    case "unparsed":
    default:
      return "unknown";
  }
}

export function evaluateCheck(check: Check, p: Profile): CheckResult {
  const truth = ruleTruth(check, p);
  const answerable = check.kind === "question" && check.confidence === "high";
  let status: Status;
  if (truth === "unknown") status = "unknown";
  else if (check.polarity === "include") status = truth ? "met" : "not_met";
  else status = truth ? "not_met" : "met";
  return { check, status, answerable };
}

function nearest(trial: CompiledTrial, lat: number, lon: number): { site: Site; miles: number } | null {
  let best: { site: Site; miles: number } | null = null;
  for (const s of trial.sites) {
    const miles = haversineMiles(lat, lon, s.lat, s.lon);
    if (!best || miles < best.miles) best = { site: s, miles };
  }
  return best;
}

export function createMatcher(bundle: Pick<Bundle, "trials">, zips: ZipTable) {
  // Index: conditionId -> trial indices, built once at load.
  const byCondition = new Map<string, number[]>();
  const healthy: number[] = [];
  bundle.trials.forEach((t, i) => {
    for (const id of t.conditionIds) {
      const list = byCondition.get(id) ?? [];
      list.push(i);
      byCondition.set(id, list);
    }
    if (t.healthyVolunteers) healthy.push(i);
  });

  function candidates(p: Profile): number[] {
    const set = new Set<number>();
    for (const id of p.conditionIds) for (const i of byCondition.get(id) ?? []) set.add(i);
    if (p.healthyVolunteer) for (const i of healthy) set.add(i);
    return [...set];
  }

  function match(input: Profile): MatchOutput {
    // "Breast cancer" also counts as "solid tumor", etc.
    const p: Profile = { ...input, conditionIds: expandConditions(input.conditionIds) };
    const home = zips[p.zip];
    const matches: TrialResult[] = [];
    const notAFit: TrialResult[] = [];

    for (const i of candidates(p)) {
      const trial = bundle.trials[i];
      // Hard filter: age, sex, distance. Failing these drops the trial silently.
      if (trial.ageMin !== undefined && p.age < trial.ageMin) continue;
      if (trial.ageMax !== undefined && p.age > trial.ageMax) continue;
      if (trial.sex !== "ALL" && p.sex !== "OTHER" && p.sex !== trial.sex) continue;
      const near = home ? nearest(trial, home[0], home[1]) : null;
      if (!near) continue;
      if (near.miles > p.maxMiles) continue;

      const checks = trial.checks.map((c) => evaluateCheck(c, p));
      // Prefer an explicit exclusion as the reason: it reads clearer to a patient.
      const excludedBy =
        checks.find((c) => c.status === "not_met" && c.check.polarity === "exclude") ??
        checks.find((c) => c.status === "not_met");
      const result: TrialResult = {
        trial,
        nearestSite: near.site,
        distanceMiles: near.miles,
        checks,
        metCount: checks.filter((c) => c.status === "met").length,
        unknownCount: checks.filter((c) => c.status === "unknown").length,
        answerableUnknown: checks.filter((c) => c.status === "unknown" && c.answerable).length,
        excludedBy,
      };
      (excludedBy ? notAFit : matches).push(result);
    }

    matches.sort((a, b) => a.answerableUnknown - b.answerableUnknown || a.distanceMiles - b.distanceMiles);
    notAFit.sort((a, b) => a.distanceMiles - b.distanceMiles);

    // Next questions: which unanswered question settles the most top trials?
    const counts = new Map<string, number>();
    for (const r of matches.slice(0, 25)) {
      const seen = new Set<string>();
      for (const c of r.checks) {
        if (c.status !== "unknown" || !c.answerable) continue;
        const qid = (c.check.params as { questionId: string }).questionId;
        if (seen.has(qid)) continue;
        seen.add(qid);
        counts.set(qid, (counts.get(qid) ?? 0) + 1);
      }
    }
    const nextQuestions = [...counts.entries()]
      .map(([questionId, affects]) => ({ questionId, affects }))
      .sort((a, b) => b.affects - a.affects || a.questionId.localeCompare(b.questionId))
      .slice(0, 5);

    return { matches, notAFit, nextQuestions };
  }

  return { match };
}

/** Ordered plain-language explanation for one trial. */
export function explain(r: TrialResult, lang: Lang) {
  return r.checks.map((c) => ({
    id: c.check.id,
    status: c.status,
    text: c.check.plain[lang] ?? c.check.plain.en,
    englishOnly: !c.check.plain[lang] && lang !== "en",
    sourceText: c.check.sourceText,
    kind: c.check.kind,
  }));
}
