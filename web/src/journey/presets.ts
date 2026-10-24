import type { Profile } from "../../../shared/schema";
import type { Feed, Session } from "./board";

export type Preset = {
  id: string;
  name: string;
  about: string;
  city: string;
  profile: Profile;
  registered: string[];
  archived: string[];
  feeds: Feed[];
};

// All ids and answers refer to the production store (data/store/trials), never the fixture bundle.
// Each person has at most four related conditions. Clinician-only and low-confidence rules stay
// with the study team, so a trial with no open patient questions counts as Qualified.
const ALL: Feed = { id: "all", conditionId: null };
const feed = (conditionId: string): Feed => ({ id: conditionId, conditionId });

export const PRESETS: Preset[] = [
  {
    id: "maria",
    name: "María Rivera",
    about: "journey.about.maria",
    city: "Worcester",
    profile: {
      age: 57,
      sex: "FEMALE",
      zip: "01608",
      maxMiles: 75,
      lang: "es",
      conditionIds: ["t2d", "heart_failure", "copd", "anxiety"],
      meds: [
        { medClassId: "metformin", sinceDays: 1800 },
        { medClassId: "ssri", sinceDays: 500 },
        { medClassId: "ace_arb", sinceDays: 900 },
        { medClassId: "diuretic", sinceDays: 700 },
        { medClassId: "bronchodilator", sinceDays: 1200 },
      ],
      answers: { q_pancreatitis: false, q_mtc_family: false, q_cancer_5y: false, q_pregnant: false },
    },
    registered: ["NCT06846320"],
    archived: ["NCT07340320"],
    feeds: [ALL, feed("t2d"), feed("copd")],
  },
  {
    id: "elena",
    name: "Elena Brooks",
    about: "journey.about.elena",
    city: "Springfield",
    profile: {
      age: 44,
      sex: "FEMALE",
      zip: "01103",
      maxMiles: 100,
      lang: "en",
      conditionIds: ["t2d", "anxiety", "hiv", "copd"],
      meds: [
        { medClassId: "metformin", sinceDays: 400 },
        { medClassId: "ssri", sinceDays: 300 },
        { medClassId: "antiretroviral", sinceDays: 2100 },
        { medClassId: "bronchodilator", sinceDays: 600 },
      ],
      answers: { q_menopause_transition: true, q_hot_flashes: true, q_daily_diary: true, q_pregnant: false },
    },
    registered: ["NCT06856174"],
    archived: ["NCT06903897"],
    feeds: [ALL, feed("copd")],
  },
  {
    id: "ana",
    name: "Ana Carvalho",
    about: "journey.about.ana",
    city: "Framingham",
    profile: {
      age: 59,
      sex: "FEMALE",
      zip: "01702",
      maxMiles: 100,
      lang: "pt",
      conditionIds: ["t2d", "heart_failure", "copd", "hiv"],
      meds: [
        { medClassId: "metformin", sinceDays: 1100 },
        { medClassId: "antiretroviral", sinceDays: 2500 },
        { medClassId: "beta_blocker", sinceDays: 800 },
        { medClassId: "statin", sinceDays: 1000 },
      ],
      answers: {
        q_menopause_transition: true,
        q_hot_flashes: true,
        q_daily_diary: true,
        q_pregnant: false,
        q_silicone_adhesive_allergy: false,
        q_chest_skin_breakdown: false,
      },
    },
    registered: ["NCT05650541"],
    archived: ["NCT06856174"],
    feeds: [ALL, feed("t2d")],
  },
];

export function sessionFromPreset(p: Preset): Session {
  return structuredClone({
    profile: p.profile,
    registered: p.registered,
    archived: p.archived,
    feeds: p.feeds,
  });
}
