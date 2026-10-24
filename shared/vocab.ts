// Canonical vocabulary shared by the compiler (LLM maps onto these ids) and the intake UI.
import type { LocalizedText, Question } from "./schema";

export type Condition = { id: string; label: string; synonyms: string[]; demo?: boolean };
export type MedClass = { id: string; label: string; brands: string[] };

const c = (id: string, label: string, synonyms: string[] = [], demo = false): Condition => ({ id, label, synonyms, demo });

export const CONDITIONS: Condition[] = [
  // 10 demo conditions (plan 6.3)
  c("t2d", "Type 2 diabetes", ["type 2 diabetes mellitus", "T2DM", "adult-onset diabetes", "diabetes type 2"], true),
  c("breast_cancer", "Breast cancer", ["breast carcinoma", "breast neoplasm", "HER2-positive breast cancer", "triple negative breast cancer"], true),
  c("prostate_cancer", "Prostate cancer", ["prostate adenocarcinoma", "prostate neoplasm", "CRPC"], true),
  c("heart_failure", "Heart failure", ["congestive heart failure", "CHF", "HFrEF", "HFpEF", "cardiac failure"], true),
  c("depression", "Depression", ["major depressive disorder", "MDD", "depressive disorder", "treatment-resistant depression"], true),
  c("asthma", "Asthma", ["bronchial asthma", "allergic asthma", "severe asthma"], true),
  c("obesity", "Obesity", ["overweight", "morbid obesity", "high BMI"], true),
  c("alzheimers", "Alzheimer's disease", ["Alzheimer disease", "AD dementia", "early Alzheimer's"], true),
  c("hiv", "HIV", ["HIV infection", "HIV-1", "human immunodeficiency virus", "AIDS"], true),
  c("copd", "COPD", ["chronic obstructive pulmonary disease", "emphysema", "chronic bronchitis"], true),
  // Other common conditions
  c("t1d", "Type 1 diabetes", ["type 1 diabetes mellitus", "T1DM", "juvenile diabetes"]),
  c("prediabetes", "Prediabetes", ["impaired glucose tolerance", "impaired fasting glucose"]),
  c("hypertension", "High blood pressure", ["hypertension", "HTN", "elevated blood pressure"]),
  c("hyperlipidemia", "High cholesterol", ["hyperlipidemia", "hypercholesterolemia", "dyslipidemia"]),
  c("cad", "Coronary artery disease", ["CAD", "coronary heart disease", "ischemic heart disease"]),
  c("mi", "Heart attack", ["myocardial infarction", "MI", "acute coronary syndrome"]),
  c("afib", "Atrial fibrillation", ["AFib", "AF", "atrial flutter"]),
  c("stroke", "Stroke", ["cerebrovascular accident", "CVA", "ischemic stroke", "TIA"]),
  c("ckd", "Chronic kidney disease", ["CKD", "renal insufficiency", "kidney failure", "ESRD"]),
  c("nafld", "Fatty liver disease", ["NAFLD", "NASH", "MASLD", "MASH", "steatohepatitis"]),
  c("cirrhosis", "Cirrhosis", ["liver cirrhosis", "hepatic cirrhosis"]),
  c("hepatitis_b", "Hepatitis B", ["HBV", "chronic hepatitis B"]),
  c("hepatitis_c", "Hepatitis C", ["HCV", "chronic hepatitis C"]),
  c("lung_cancer", "Lung cancer", ["NSCLC", "non-small cell lung cancer", "SCLC", "lung carcinoma"]),
  c("colorectal_cancer", "Colorectal cancer", ["colon cancer", "rectal cancer", "CRC"]),
  c("pancreatic_cancer", "Pancreatic cancer", ["pancreatic adenocarcinoma", "PDAC"]),
  c("ovarian_cancer", "Ovarian cancer", ["ovarian carcinoma", "fallopian tube cancer"]),
  c("cervical_cancer", "Cervical cancer", ["cervical carcinoma"]),
  c("endometrial_cancer", "Uterine cancer", ["endometrial cancer", "uterine carcinoma"]),
  c("bladder_cancer", "Bladder cancer", ["urothelial carcinoma", "bladder carcinoma"]),
  c("kidney_cancer", "Kidney cancer", ["renal cell carcinoma", "RCC"]),
  c("melanoma", "Melanoma", ["cutaneous melanoma", "skin melanoma"]),
  c("skin_cancer", "Skin cancer (non-melanoma)", ["basal cell carcinoma", "squamous cell carcinoma of the skin"]),
  c("head_neck_cancer", "Head and neck cancer", ["oral cancer", "throat cancer", "HNSCC"]),
  c("brain_tumor", "Brain tumor", ["glioblastoma", "glioma", "GBM"]),
  c("leukemia", "Leukemia", ["AML", "ALL", "CLL", "CML", "acute myeloid leukemia"]),
  c("lymphoma", "Lymphoma", ["non-Hodgkin lymphoma", "Hodgkin lymphoma", "DLBCL"]),
  c("myeloma", "Multiple myeloma", ["myeloma", "plasma cell myeloma"]),
  c("liver_cancer", "Liver cancer", ["hepatocellular carcinoma", "HCC"]),
  c("stomach_cancer", "Stomach cancer", ["gastric cancer", "gastroesophageal cancer"]),
  c("esophageal_cancer", "Esophageal cancer", ["esophageal carcinoma"]),
  c("thyroid_cancer", "Thyroid cancer", ["papillary thyroid cancer"]),
  c("solid_tumor", "Advanced solid tumor", ["solid tumors", "metastatic cancer", "advanced cancer"]),
  c("anxiety", "Anxiety", ["generalized anxiety disorder", "GAD", "panic disorder", "social anxiety"]),
  c("bipolar", "Bipolar disorder", ["bipolar I", "bipolar II", "manic depression"]),
  c("schizophrenia", "Schizophrenia", ["schizoaffective disorder", "psychosis"]),
  c("ptsd", "PTSD", ["post-traumatic stress disorder"]),
  c("adhd", "ADHD", ["attention deficit hyperactivity disorder", "ADD"]),
  c("autism", "Autism", ["autism spectrum disorder", "ASD"]),
  c("insomnia", "Insomnia", ["sleep disorder", "trouble sleeping"]),
  c("sleep_apnea", "Sleep apnea", ["obstructive sleep apnea", "OSA"]),
  c("aud", "Alcohol use disorder", ["alcoholism", "alcohol dependence"]),
  c("oud", "Opioid use disorder", ["opioid addiction", "opioid dependence"]),
  c("smoking", "Smoking / nicotine use", ["tobacco use disorder", "nicotine dependence", "smoking cessation"]),
  c("parkinsons", "Parkinson's disease", ["Parkinson disease", "PD"]),
  c("ms", "Multiple sclerosis", ["MS", "relapsing multiple sclerosis"]),
  c("als", "ALS", ["amyotrophic lateral sclerosis", "Lou Gehrig's disease", "motor neuron disease"]),
  c("epilepsy", "Epilepsy", ["seizure disorder", "seizures"]),
  c("migraine", "Migraine", ["chronic migraine", "headache"]),
  c("mci", "Mild memory problems", ["mild cognitive impairment", "MCI"]),
  c("dementia", "Dementia", ["frontotemporal dementia", "Lewy body dementia", "vascular dementia"]),
  c("chronic_pain", "Chronic pain", ["chronic low back pain", "neuropathic pain", "fibromyalgia"]),
  c("osteoarthritis", "Osteoarthritis", ["OA", "knee osteoarthritis", "degenerative joint disease"]),
  c("rheumatoid_arthritis", "Rheumatoid arthritis", ["RA"]),
  c("lupus", "Lupus", ["systemic lupus erythematosus", "SLE"]),
  c("psoriasis", "Psoriasis", ["plaque psoriasis", "psoriatic arthritis"]),
  c("eczema", "Eczema", ["atopic dermatitis"]),
  c("crohns", "Crohn's disease", ["Crohn disease"]),
  c("ulcerative_colitis", "Ulcerative colitis", ["UC"]),
  c("ibs", "Irritable bowel syndrome", ["IBS"]),
  c("celiac", "Celiac disease", ["coeliac disease", "gluten enteropathy"]),
  c("osteoporosis", "Osteoporosis", ["low bone density", "osteopenia"]),
  c("sickle_cell", "Sickle cell disease", ["sickle cell anemia", "SCD"]),
  c("cystic_fibrosis", "Cystic fibrosis", ["CF"]),
  c("pulmonary_fibrosis", "Pulmonary fibrosis", ["IPF", "idiopathic pulmonary fibrosis", "interstitial lung disease"]),
  c("covid", "COVID-19", ["SARS-CoV-2", "long COVID", "post-COVID condition"]),
  c("influenza", "Flu", ["influenza"]),
  c("rsv", "RSV", ["respiratory syncytial virus"]),
  c("pregnancy", "Pregnancy", ["pregnant", "prenatal", "postpartum"]),
  c("endometriosis", "Endometriosis", []),
  c("pcos", "PCOS", ["polycystic ovary syndrome"]),
  c("infertility", "Infertility", ["subfertility"]),
  c("glaucoma", "Glaucoma", ["open-angle glaucoma"]),
  c("amd", "Macular degeneration", ["age-related macular degeneration", "AMD", "wet AMD"]),
];

const m = (id: string, label: string, brands: string[] = []): MedClass => ({ id, label, brands });

export const MED_CLASSES: MedClass[] = [
  m("metformin", "Metformin", ["Glucophage", "Glumetza", "Fortamet"]),
  m("insulin", "Insulin", ["Lantus", "Humalog", "Novolog", "Levemir", "Tresiba", "Basaglar"]),
  m("glp1", "GLP-1 medicine", ["Ozempic", "Wegovy", "Trulicity", "Victoza", "Mounjaro", "Zepbound", "Saxenda", "Rybelsus"]),
  m("sglt2", "SGLT2 inhibitor", ["Jardiance", "Farxiga", "Invokana", "Steglatro"]),
  m("dpp4", "DPP-4 inhibitor", ["Januvia", "Tradjenta", "Onglyza"]),
  m("sulfonylurea", "Sulfonylurea", ["glipizide", "glyburide", "glimepiride", "Amaryl"]),
  m("statin", "Statin", ["Lipitor", "Crestor", "Zocor", "Pravachol", "atorvastatin", "rosuvastatin"]),
  m("anticoagulant", "Blood thinner", ["Eliquis", "Xarelto", "warfarin", "Coumadin", "Pradaxa"]),
  m("antiplatelet", "Antiplatelet", ["aspirin", "Plavix", "clopidogrel", "Brilinta"]),
  m("ace_arb", "ACE inhibitor or ARB", ["lisinopril", "losartan", "valsartan", "Entresto"]),
  m("beta_blocker", "Beta blocker", ["metoprolol", "carvedilol", "atenolol"]),
  m("diuretic", "Water pill", ["furosemide", "Lasix", "hydrochlorothiazide", "spironolactone"]),
  m("ccb", "Calcium channel blocker", ["amlodipine", "Norvasc", "diltiazem"]),
  m("chemotherapy", "Chemotherapy", ["cisplatin", "carboplatin", "paclitaxel", "doxorubicin"]),
  m("immunotherapy", "Cancer immunotherapy", ["Keytruda", "Opdivo", "Tecentriq", "Yervoy"]),
  m("targeted_cancer", "Targeted cancer drug", ["Herceptin", "Tagrisso", "Ibrance", "Verzenio"]),
  m("hormone_therapy_cancer", "Hormone therapy for cancer", ["tamoxifen", "letrozole", "anastrozole", "Lupron", "enzalutamide"]),
  m("systemic_steroid", "Steroid pills or shots", ["prednisone", "dexamethasone", "methylprednisolone", "Medrol"]),
  m("inhaled_steroid", "Steroid inhaler", ["Flovent", "Pulmicort", "Symbicort", "Advair", "Breo"]),
  m("bronchodilator", "Rescue or long-acting inhaler", ["albuterol", "ProAir", "Spiriva", "tiotropium"]),
  m("biologic_asthma", "Biologic for asthma or allergy", ["Dupixent", "Xolair", "Nucala", "Fasenra", "Tezspire"]),
  m("ssri", "SSRI antidepressant", ["Zoloft", "Prozac", "Lexapro", "Celexa", "Paxil"]),
  m("snri", "SNRI antidepressant", ["Effexor", "Cymbalta", "Pristiq"]),
  m("other_antidepressant", "Other antidepressant", ["Wellbutrin", "bupropion", "mirtazapine", "trazodone"]),
  m("antipsychotic", "Antipsychotic", ["Abilify", "Seroquel", "Risperdal", "Zyprexa"]),
  m("benzodiazepine", "Benzodiazepine", ["Xanax", "Ativan", "Klonopin", "Valium"]),
  m("stimulant", "ADHD stimulant", ["Adderall", "Ritalin", "Vyvanse", "Concerta"]),
  m("opioid", "Opioid pain medicine", ["oxycodone", "hydrocodone", "morphine", "tramadol"]),
  m("opioid_treatment", "Opioid use treatment", ["Suboxone", "buprenorphine", "methadone", "Vivitrol"]),
  m("nsaid", "NSAID pain reliever", ["ibuprofen", "Advil", "naproxen", "Aleve", "Celebrex"]),
  m("antiretroviral", "HIV medicine", ["Biktarvy", "Genvoya", "Descovy", "Truvada", "Dovato"]),
  m("prep", "HIV PrEP", ["Truvada for PrEP", "Descovy for PrEP", "Apretude"]),
  m("immunosuppressant", "Immune-suppressing drug", ["methotrexate", "tacrolimus", "cyclosporine", "mycophenolate"]),
  m("biologic_autoimmune", "Biologic for autoimmune disease", ["Humira", "Enbrel", "Remicade", "Stelara", "Skyrizi"]),
  m("thyroid", "Thyroid hormone", ["levothyroxine", "Synthroid"]),
  m("hormonal_contraceptive", "Birth control", ["the pill", "IUD (hormonal)", "Nexplanon", "Depo-Provera"]),
  m("hrt", "Hormone replacement", ["estradiol", "Premarin", "testosterone"]),
  m("anti_amyloid", "Anti-amyloid Alzheimer's drug", ["Leqembi", "Kisunla", "lecanemab", "donanemab"]),
  m("cholinesterase", "Memory medicine", ["donepezil", "Aricept", "rivastigmine", "galantamine", "memantine"]),
  m("antiepileptic", "Seizure medicine", ["Keppra", "Lamictal", "Depakote", "Topamax"]),
  m("ppi", "Acid reducer (PPI)", ["omeprazole", "Prilosec", "Nexium", "pantoprazole"]),
  m("bisphosphonate", "Bone-strengthening drug", ["Fosamax", "alendronate", "Prolia", "Boniva"]),
];

/** Question bank. Seeded by hand; pipeline/dedupe.ts extends it for live data. */
const q = (id: string, en: string, es: string): Question => ({ id, text: { en, es } as LocalizedText });

export const QUESTION_BANK: Question[] = [
  q("q_pregnant", "Are you pregnant, breastfeeding, or planning to get pregnant soon?", "¿Está embarazada, amamantando o planea quedar embarazada pronto?"),
  q("q_pancreatitis", "Have you ever had pancreatitis (a swollen, painful pancreas)?", "¿Ha tenido alguna vez pancreatitis (páncreas inflamado y doloroso)?"),
  q("q_cancer_5y", "Have you been treated for any cancer in the last 5 years?", "¿Ha recibido tratamiento para algún cáncer en los últimos 5 años?"),
  q("q_heart_attack_6m", "Have you had a heart attack or stroke in the last 6 months?", "¿Ha tenido un ataque al corazón o un derrame cerebral en los últimos 6 meses?"),
  q("q_other_trial_30d", "Have you been in another drug study in the last 30 days?", "¿Ha participado en otro estudio de medicamentos en los últimos 30 días?"),
  q("q_mtc_family", "Has anyone in your family had medullary thyroid cancer or MEN2?", "¿Alguien en su familia ha tenido cáncer medular de tiroides o MEN2?"),
  q("q_smoker", "Do you smoke cigarettes now?", "¿Fuma cigarrillos actualmente?"),
  q("q_study_partner", "Do you have a family member or friend who can come to visits with you?", "¿Tiene un familiar o amigo que pueda acompañarle a las visitas?"),
  q("q_mri_ok", "Can you safely have an MRI scan (no metal implants or pacemaker)?", "¿Puede hacerse una resonancia magnética de forma segura (sin implantes metálicos ni marcapasos)?"),
  q("q_suicidal_thoughts", "In the last year, have you had thoughts of ending your life?", "En el último año, ¿ha tenido pensamientos de quitarse la vida?"),
  q("q_er_asthma_12m", "Have you gone to the ER or hospital for asthma in the last 12 months?", "¿Ha ido a urgencias o al hospital por asma en los últimos 12 meses?"),
  q("q_walk_6min", "Can you walk on your own for 6 minutes?", "¿Puede caminar solo/a durante 6 minutos?"),
  q("q_smartphone", "Do you have a smartphone with internet?", "¿Tiene un teléfono inteligente con internet?"),
];

export const DEMO_CONDITION_IDS = CONDITIONS.filter((x) => x.demo).map((x) => x.id);

/** A patient with the key condition also has the listed broader ones. */
const SOLID_CANCERS = [
  "breast_cancer", "prostate_cancer", "lung_cancer", "colorectal_cancer", "pancreatic_cancer", "ovarian_cancer",
  "cervical_cancer", "endometrial_cancer", "bladder_cancer", "kidney_cancer", "melanoma", "head_neck_cancer",
  "brain_tumor", "liver_cancer", "stomach_cancer", "esophageal_cancer", "thyroid_cancer",
];
export const CONDITION_IMPLIES: Record<string, string[]> = Object.fromEntries(SOLID_CANCERS.map((id) => [id, ["solid_tumor"]]));

/** Profile conditions plus everything they imply. */
export function expandConditions(ids: string[]): string[] {
  const out = new Set(ids);
  for (const id of ids) for (const p of CONDITION_IMPLIES[id] ?? []) out.add(p);
  return [...out];
}

export function conditionById(id: string) {
  return CONDITIONS.find((x) => x.id === id);
}
export function medClassById(id: string) {
  return MED_CLASSES.find((x) => x.id === id);
}
