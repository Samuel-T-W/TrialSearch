import type { Lang } from "@shared/schema";
import { conditionById } from "@shared/vocab";
import { LANG_NAMES, useStrings } from "../i18n";
import type { ZipTable } from "../matcher";
import { createMatcher } from "../matcher";
import type { Bundle } from "@shared/schema";
import { buildBoard } from "./board";
import { PRESETS, sessionFromPreset, type Preset } from "./presets";
import { Avatar, LanguagePicker, Wordmark } from "./ui";

export function Login({
  lang,
  bundle,
  zips,
  onLanguage,
  onLogin,
  onCreate,
}: {
  lang: Lang;
  bundle: Bundle;
  zips: ZipTable;
  onLanguage: (lang: Lang) => void;
  onLogin: (preset: Preset) => void;
  onCreate?: () => void;
}) {
  const t = useStrings(lang);
  const matcher = createMatcher(bundle, zips);
  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
      <header className="flex items-center justify-between gap-3 border-b border-line py-5">
        <Wordmark />
        <LanguagePicker lang={lang} onChange={onLanguage} />
      </header>
      <main>
        <div className="max-w-2xl pb-8 pt-10 sm:pb-10 sm:pt-16">
          <p className="mb-3 text-sm font-bold tracking-wide text-brand">{t("journey.eyebrow")}</p>
          <h1 className="font-display text-[40px] leading-[1.08] sm:text-[52px]">{t("journey.welcome")}</h1>
          <p className="mt-4 text-lg text-muted">{t("journey.pitch")}</p>
        </div>
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <h2 className="text-sm font-bold text-muted">{t("journey.chooseProfile")}</h2>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PRESETS.map((preset) => {
            const session = sessionFromPreset(preset);
            const board = buildBoard(matcher.match(session.profile), session);
            return (
              <article key={preset.id} className="card flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={preset.name} />
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">{preset.name}</h3>
                    <p className="text-sm text-muted">
                      {preset.profile.age} · {preset.city} · {LANG_NAMES[preset.profile.lang]}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted">{t(preset.about)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {preset.profile.conditionIds.map((id) => (
                    <span className="chip" key={id}>
                      {conditionById(id)?.label ?? id}
                    </span>
                  ))}
                </div>
                <p className="mt-auto border-t border-line pt-4 text-sm tabular-nums text-muted">
                  {t("journey.snapshot", {
                    registered: board.registered.length,
                    qualified: board.qualified.length,
                    feed: board.feed.length,
                  })}
                </p>
                <button
                  className="btn-primary w-full"
                  aria-label={t("journey.loginAs", { name: preset.name })}
                  onClick={() => onLogin(preset)}
                >
                  {t("journey.login")} <span aria-hidden="true">→</span>
                </button>
              </article>
            );
          })}
          <article className="flex flex-col items-start justify-center gap-3 rounded-2xl border border-dashed border-line p-6 md:col-span-2 xl:col-span-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="font-display text-xl">{t("journey.create")}</h3>
              <p className="mt-1 text-sm text-muted">{t("journey.createHint")}</p>
            </div>
            <button className="btn-secondary shrink-0 text-muted" disabled={!onCreate} onClick={onCreate}>
              {t("journey.comingNext")}
            </button>
          </article>
        </div>
        <p className="mt-7 text-center text-sm text-muted">{t("journey.demoNote")}</p>
        <p className="mt-2 text-center text-xs text-muted">{t("journey.privateNote")}</p>
      </main>
    </div>
  );
}
