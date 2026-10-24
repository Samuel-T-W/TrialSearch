import type { Lang, Profile } from "@shared/schema";
import { CONDITIONS, MED_CLASSES } from "@shared/vocab";
import { useStrings } from "../i18n";
import { Autocomplete, type Option } from "../components/Autocomplete";

const conditionOptions: Option[] = CONDITIONS.map((c) => ({
  id: c.id,
  label: c.label,
  terms: c.synonyms,
}));
const medOptions: Option[] = MED_CLASSES.map((m) => ({ id: m.id, label: m.label, terms: m.brands }));

// "How long" chips map to a representative day count for withinDays checks.
const DURATIONS: { key: string; days: number | undefined }[] = [
  { key: "lt3m", days: 45 },
  { key: "3to12m", days: 200 },
  { key: "gt1y", days: 500 },
  { key: "unknown", days: undefined },
];

function labelFor(kind: "cond" | "med", id: string): string {
  if (kind === "cond") return CONDITIONS.find((c) => c.id === id)?.label ?? id;
  return MED_CLASSES.find((m) => m.id === id)?.label ?? id;
}

export function Intake({
  lang,
  profile,
  onChange,
  onSubmit,
  onBack,
}: {
  lang: Lang;
  profile: Profile;
  onChange: (p: Profile) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const t = useStrings(lang);
  const zipValid = /^\d{5}$/.test(profile.zip);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    onChange({ ...profile, [key]: value });
  }

  function addCondition(id: string) {
    if (!profile.conditionIds.includes(id))
      set("conditionIds", [...profile.conditionIds, id]);
  }
  function addMed(id: string) {
    if (!profile.meds.some((m) => m.medClassId === id))
      set("meds", [...profile.meds, { medClassId: id }]);
  }
  function setMedDuration(id: string, days: number | undefined) {
    set(
      "meds",
      profile.meds.map((m) => (m.medClassId === id ? { ...m, sinceDays: days } : m)),
    );
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <header>
        <button className="btn-ghost -ml-2 px-2 py-1 text-sm" onClick={onBack}>
          ← {t("back")}
        </button>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("intake.title")}</h1>
        <p className="text-sm text-slate-600">{t("intake.subtitle")}</p>
      </header>

      {/* Age */}
      <div>
        <label className="field-label" htmlFor="age">
          {t("intake.age")}
        </label>
        <input
          id="age"
          className="input"
          type="number"
          inputMode="numeric"
          min={0}
          max={120}
          value={profile.age}
          data-testid="age"
          onChange={(e) => set("age", Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
        />
      </div>

      {/* Sex */}
      <div>
        <span className="field-label">{t("intake.sex")}</span>
        <div className="grid grid-cols-3 gap-2">
          {(["MALE", "FEMALE", "OTHER"] as const).map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`sex-${s}`}
              aria-pressed={profile.sex === s}
              onClick={() => set("sex", s)}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold ${
                profile.sex === s
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {t(s === "MALE" ? "intake.sexMale" : s === "FEMALE" ? "intake.sexFemale" : "intake.sexOther")}
            </button>
          ))}
        </div>
      </div>

      {/* ZIP */}
      <div>
        <label className="field-label" htmlFor="zip">
          {t("intake.zip")}
        </label>
        <input
          id="zip"
          className="input"
          type="text"
          inputMode="numeric"
          maxLength={5}
          autoComplete="off"
          placeholder="01109"
          value={profile.zip}
          data-testid="zip"
          onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
        />
        <p className={`mt-1 text-xs ${profile.zip && !zipValid ? "text-red-600" : "text-slate-500"}`}>
          {profile.zip && !zipValid ? t("intake.zipInvalid") : t("intake.zipHint")}
        </p>
      </div>

      {/* Distance */}
      <div>
        <label className="field-label" htmlFor="distance">
          {t("intake.distance")} — <span className="text-brand-dark">{profile.maxMiles} {t("intake.miles")}</span>
        </label>
        <input
          id="distance"
          className="w-full accent-brand"
          type="range"
          min={5}
          max={200}
          step={5}
          value={profile.maxMiles}
          data-testid="distance"
          onChange={(e) => set("maxMiles", Number(e.target.value))}
        />
      </div>

      {/* Conditions */}
      <div>
        <span className="field-label">{t("intake.conditions")}</span>
        <Autocomplete
          options={conditionOptions}
          excludeIds={profile.conditionIds}
          placeholder={t("intake.conditionsHint")}
          onPick={addCondition}
          testId="condition-input"
        />
        <div className="mt-2 flex flex-wrap gap-2" data-testid="condition-chips">
          {profile.conditionIds.length === 0 && (
            <span className="text-sm text-slate-400">{t("intake.noConditions")}</span>
          )}
          {profile.conditionIds.map((id) => (
            <span key={id} className="chip">
              {labelFor("cond", id)}
              <button
                className="ml-1 text-brand-dark/70 hover:text-brand-dark"
                aria-label={t("intake.remove")}
                onClick={() => set("conditionIds", profile.conditionIds.filter((x) => x !== id))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Medications */}
      <div>
        <span className="field-label">{t("intake.meds")}</span>
        <Autocomplete
          options={medOptions}
          excludeIds={profile.meds.map((m) => m.medClassId)}
          placeholder={t("intake.medsHint")}
          onPick={addMed}
          testId="med-input"
        />
        <div className="mt-2 flex flex-col gap-2" data-testid="med-chips">
          {profile.meds.length === 0 && (
            <span className="text-sm text-slate-400">{t("intake.noMeds")}</span>
          )}
          {profile.meds.map((m) => (
            <div key={m.medClassId} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{labelFor("med", m.medClassId)}</span>
                <button
                  className="text-sm text-slate-500 hover:text-red-600"
                  onClick={() => set("meds", profile.meds.filter((x) => x.medClassId !== m.medClassId))}
                >
                  {t("intake.remove")}
                </button>
              </div>
              <div className="mt-2">
                <span className="mb-1 block text-xs text-slate-500">{t("intake.howLong")}</span>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      aria-pressed={m.sinceDays === d.days}
                      onClick={() => setMedDuration(m.medClassId, d.days)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        m.sinceDays === d.days
                          ? "bg-brand text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t(`intake.duration.${d.key}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Healthy volunteer */}
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-brand"
          checked={!!profile.healthyVolunteer}
          data-testid="healthy-volunteer"
          onChange={(e) => set("healthyVolunteer", e.target.checked)}
        />
        <span className="text-sm text-slate-700">{t("intake.healthyVolunteer")}</span>
      </label>

      <button
        type="button"
        className="btn-primary w-full text-lg disabled:opacity-50"
        data-testid="see-results"
        disabled={!zipValid}
        onClick={onSubmit}
      >
        {t("seeResults")}
      </button>
    </div>
  );
}
