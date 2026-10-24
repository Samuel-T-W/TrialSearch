import type { Lang } from "@shared/schema";
import { LANGS } from "@shared/schema";
import { useStrings } from "../i18n";

export function Landing({
  lang,
  langNames,
  onPickLang,
  onStart,
  onPrivacy,
}: {
  lang: Lang;
  langNames: Record<Lang, string>;
  onPickLang: (l: Lang) => void;
  onStart: () => void;
  onPrivacy: () => void;
}) {
  const t = useStrings(lang);
  return (
    <div className="flex flex-col gap-6 px-5 py-8">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-dark">{t("appName")}</h1>
        <p className="mx-auto mt-3 max-w-md text-lg text-slate-700">{t("tagline")}</p>
      </header>

      <section>
        <p className="field-label text-center">{t("chooseLanguage")}</p>
        <div className="grid grid-cols-2 gap-3">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              data-testid={`lang-${l}`}
              aria-pressed={lang === l}
              onClick={() => onPickLang(l)}
              className={`rounded-xl border-2 px-4 py-4 text-lg font-semibold transition ${
                lang === l
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-slate-200 bg-white text-slate-800 hover:border-brand/50"
              }`}
            >
              {langNames[l]}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="rounded-full bg-brand-light px-4 py-3 text-center text-sm font-semibold text-brand-dark"
        onClick={onPrivacy}
      >
        🔒 {t("privacyBadge")}
      </button>

      <button type="button" className="btn-primary w-full text-lg" data-testid="start" onClick={onStart}>
        {t("start")}
      </button>
    </div>
  );
}
