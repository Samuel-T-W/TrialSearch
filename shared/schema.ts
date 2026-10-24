// Shared data contracts for TrialSearch (plan section 5).
// The pipeline and the web app both import from here, so they cannot drift apart.
import { z } from "zod";

export const LANGS = ["en", "es", "pt", "ht", "zh", "vi"] as const;
export const Lang = z.enum(LANGS);
export type Lang = z.infer<typeof Lang>;

/** Text in several languages. `en` is always required; others are optional. */
export const LocalizedText = z
  .object({ en: z.string().min(1) })
  .catchall(z.string())
  .refine((o) => Object.keys(o).every((k) => (LANGS as readonly string[]).includes(k)), {
    message: "unknown language key",
  });
export type LocalizedText = { en: string } & Partial<Record<Lang, string>>;

export const CheckKind = z.enum(["age", "sex", "condition", "medication", "question", "clinician", "unparsed"]);
export type CheckKind = z.infer<typeof CheckKind>;

export const Check = z.object({
  id: z.string().regex(/^NCT\d{8}#\d+$/),
  polarity: z.enum(["include", "exclude"]),
  kind: CheckKind,
  params: z.record(z.string(), z.unknown()),
  sourceText: z.string(),
  plain: LocalizedText,
  confidence: z.enum(["high", "low"]),
});
export type Check = z.infer<typeof Check> & { plain: LocalizedText };

/** Typed params per kind, for code that reads them. */
export type ConditionParams = { conditionIds: string[] };
export type MedicationParams = { medClassIds: string[]; withinDays?: number };
export type QuestionParams = { questionId: string };

export const Site = z.object({
  facility: z.string(),
  city: z.string(),
  zip: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
});
export type Site = z.infer<typeof Site>;

export const CompiledTrial = z.object({
  nctId: z.string().regex(/^NCT\d{8}$/),
  title: LocalizedText,
  summary: LocalizedText,
  phase: z.array(z.string()),
  conditionIds: z.array(z.string()),
  healthyVolunteers: z.boolean(),
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
  sex: z.enum(["ALL", "MALE", "FEMALE"]),
  sites: z.array(Site),
  contact: z
    .object({ name: z.string().optional(), phone: z.string().optional(), email: z.string().optional() })
    .optional(),
  checks: z.array(Check),
  flags: z.array(z.enum(["master_protocol", "criteria_missing"])),
  officialUrl: z.string().url(),
});
export type CompiledTrial = Omit<z.infer<typeof CompiledTrial>, "title" | "summary" | "checks"> & {
  title: LocalizedText;
  summary: LocalizedText;
  checks: Check[];
};

export const Question = z.object({
  id: z.string(),
  text: LocalizedText,
});
export type Question = z.infer<typeof Question> & { text: LocalizedText };

/** What ships to the browser: one file per language. */
export const Bundle = z.object({
  lang: Lang,
  generatedAt: z.string(),
  source: z.literal("live"),
  trials: z.array(CompiledTrial),
  questions: z.array(Question),
});
export type Bundle = Omit<z.infer<typeof Bundle>, "trials" | "questions"> & {
  trials: CompiledTrial[];
  questions: Question[];
};

export const Profile = z.object({
  age: z.number().int().min(0).max(120),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]),
  zip: z.string().regex(/^\d{5}$/),
  maxMiles: z.number().positive(),
  conditionIds: z.array(z.string()),
  meds: z.array(z.object({ medClassId: z.string(), sinceDays: z.number().optional() })),
  answers: z.record(z.string(), z.union([z.boolean(), z.literal("unsure")])),
  lang: Lang,
  healthyVolunteer: z.boolean().optional(),
});
export type Profile = z.infer<typeof Profile>;

/** Raw study as saved by pipeline/pull.ts (trimmed ClinicalTrials.gov v2 record). */
export const RawTrial = z.object({
  nctId: z.string(),
  briefTitle: z.string(),
  officialTitle: z.string().optional(),
  conditions: z.array(z.string()),
  phases: z.array(z.string()),
  briefSummary: z.string().optional(),
  eligibilityCriteria: z.string().optional(),
  minimumAge: z.string().optional(),
  maximumAge: z.string().optional(),
  sex: z.string().optional(),
  healthyVolunteers: z.boolean().optional(),
  locations: z.array(Site),
  contact: z
    .object({ name: z.string().optional(), phone: z.string().optional(), email: z.string().optional() })
    .optional(),
});
export type RawTrial = z.infer<typeof RawTrial>;

/** Pick the best text for a language, falling back to English. */
export function pickLang(t: LocalizedText, lang: Lang): { text: string; fallback: boolean } {
  const v = t[lang];
  if (v) return { text: v, fallback: false };
  return { text: t.en, fallback: lang !== "en" };
}
