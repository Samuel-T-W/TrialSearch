// Test patients for the match inspector and the persona tests.
// All made up. Each one exercises a different part of the matcher.
import type { Profile } from "../shared/schema";

export type Persona = { id: string; name: string; about: string; profile: Profile };

export const PERSONAS: Persona[] = [
  {
    id: "maria",
    name: "Maria Gonzalez",
    about: "Springfield. Type 2 diabetes for years, on metformin 2 years. Speaks Spanish.",
    profile: {
      age: 58, sex: "FEMALE", zip: "01109", maxMiles: 25, lang: "es",
      conditionIds: ["t2d"], meds: [{ medClassId: "metformin", sinceDays: 730 }],
      answers: { q_pancreatitis: false, q_mtc_family: false, q_pregnant: false },
    },
  },
  {
    id: "james",
    name: "James Carter",
    about: "Springfield. Type 2 diabetes, metformin (unsure how long). Will travel 100 miles.",
    profile: {
      age: 58, sex: "MALE", zip: "01109", maxMiles: 100, lang: "en",
      conditionIds: ["t2d"], meds: [{ medClassId: "metformin" }], answers: {},
    },
  },
  {
    id: "dorothy",
    name: "Dorothy Walsh",
    about: "Holyoke. Type 2 diabetes and obesity, already on a GLP-1 shot (Ozempic).",
    profile: {
      age: 72, sex: "FEMALE", zip: "01040", maxMiles: 40, lang: "en",
      conditionIds: ["t2d", "obesity"], meds: [{ medClassId: "glp1", sinceDays: 200 }, { medClassId: "metformin", sinceDays: 2000 }],
      answers: {},
    },
  },
  {
    id: "robert",
    name: "Robert Silva",
    about: "Worcester. Heart failure and type 2 diabetes, on insulin and heart pills. Speaks Portuguese.",
    profile: {
      age: 71, sex: "MALE", zip: "01608", maxMiles: 60, lang: "pt",
      conditionIds: ["heart_failure", "t2d"],
      meds: [{ medClassId: "insulin" }, { medClassId: "ace_arb" }, { medClassId: "beta_blocker" }, { medClassId: "diuretic" }],
      answers: { q_heart_attack_6m: false },
    },
  },
  {
    id: "linh",
    name: "Linh Nguyen",
    about: "Boston. Breast cancer, on hormone therapy. Speaks Vietnamese.",
    profile: {
      age: 47, sex: "FEMALE", zip: "02115", maxMiles: 20, lang: "vi",
      conditionIds: ["breast_cancer"], meds: [{ medClassId: "hormone_therapy_cancer", sinceDays: 120 }], answers: {},
    },
  },
  {
    id: "jean",
    name: "Jean-Baptiste Pierre",
    about: "Boston. Living with HIV and depression. Speaks Haitian Creole.",
    profile: {
      age: 34, sex: "MALE", zip: "02118", maxMiles: 30, lang: "ht",
      conditionIds: ["hiv", "depression"], meds: [{ medClassId: "antiretroviral" }, { medClassId: "ssri" }], answers: {},
    },
  },
  {
    id: "wei",
    name: "Wei Chen",
    about: "Lowell. COPD and asthma, uses a steroid inhaler. Speaks Chinese.",
    profile: {
      age: 66, sex: "FEMALE", zip: "01852", maxMiles: 50, lang: "zh",
      conditionIds: ["copd", "asthma"], meds: [{ medClassId: "inhaled_steroid" }, { medClassId: "bronchodilator" }], answers: {},
    },
  },
  {
    id: "aisha",
    name: "Aisha Johnson",
    about: "Springfield. Depression, on an SSRI. Pregnant. Has had thoughts of self-harm this year.",
    profile: {
      age: 29, sex: "FEMALE", zip: "01104", maxMiles: 100, lang: "en",
      conditionIds: ["depression"], meds: [{ medClassId: "ssri" }],
      answers: { q_pregnant: true, q_suicidal_thoughts: true },
    },
  },
  {
    id: "tom",
    name: "Tom Becker",
    about: "Pittsfield. No conditions. Wants to help as a healthy volunteer.",
    profile: {
      age: 45, sex: "MALE", zip: "01201", maxMiles: 100, lang: "en",
      conditionIds: [], meds: [], answers: {}, healthyVolunteer: true,
    },
  },
];
