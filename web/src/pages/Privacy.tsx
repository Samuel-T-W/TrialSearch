import { useEffect, useState } from "react";
import type { Lang, Profile } from "@shared/schema";
import { useStrings } from "../i18n";
import { deleteProfile, hasSavedProfile, loadProfile, saveProfile } from "../storage/profile";

export function Privacy({
  lang,
  profile,
  onBack,
  onLoadProfile,
}: {
  lang: Lang;
  profile: Profile;
  onBack: () => void;
  onLoadProfile: (p: Profile) => void;
}) {
  const t = useStrings(lang);
  const [hasSaved, setHasSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void hasSavedProfile().then(setHasSaved);
  }, []);

  async function onSave() {
    // Never logged, never transmitted: encrypted into IndexedDB only.
    await saveProfile(profile);
    setHasSaved(true);
    setToast(t("storage.savedToast"));
  }
  async function onRestore() {
    const p = await loadProfile();
    if (p) onLoadProfile(p);
  }
  async function onDelete() {
    await deleteProfile();
    setHasSaved(false);
    setToast(t("storage.deleted"));
  }

  const blocks: { title: string; body: string }[] = [
    { title: t("privacy.howTitle"), body: t("privacy.how") },
    { title: t("privacy.cspTitle"), body: t("privacy.csp") },
    { title: t("privacy.verifyTitle"), body: t("privacy.verify") },
  ];

  return (
    <div className="flex flex-col gap-5 px-5 py-6">
      <header>
        <button className="btn-ghost -ml-2 px-2 py-1 text-sm" onClick={onBack}>
          ← {t("back")}
        </button>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("privacy.title")}</h1>
        <p className="mt-1 text-base text-slate-700">{t("privacy.lead")}</p>
      </header>

      <div className="rounded-xl bg-brand-light/50 p-3 text-center font-mono text-xs text-brand-dark">
        phone ──download once──▶ app + public trial list
        <br />
        profile ──stays on device──▶ matcher ──▶ results
      </div>

      {blocks.map((b) => (
        <section key={b.title}>
          <h2 className="field-label">{b.title}</h2>
          <p className="text-sm text-slate-700">{b.body}</p>
        </section>
      ))}

      <p className="rounded-lg bg-slate-100 p-3 text-sm font-medium text-slate-700">
        {t("privacy.noTrackers")}
      </p>

      <section className="card">
        <h2 className="field-label">{t("privacy.storageTitle")}</h2>
        <p className="mb-3 text-sm text-slate-600">{t("privacy.storage")}</p>
        <div className="flex flex-col gap-2">
          {hasSaved ? (
            <>
              <span className="text-sm font-semibold text-brand-dark">🔒 {t("storage.saved")}</span>
              <button className="btn-secondary" onClick={onRestore}>
                {t("nav.intake")}
              </button>
              <button className="btn-secondary text-red-700" data-testid="delete-data" onClick={onDelete}>
                {t("storage.delete")}
              </button>
            </>
          ) : (
            <button className="btn-primary" data-testid="save-data" onClick={onSave}>
              {t("storage.save")}
            </button>
          )}
        </div>
        {toast && <p className="mt-2 text-sm text-green-700">{toast}</p>}
      </section>
    </div>
  );
}
