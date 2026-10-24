import type { Lang } from "@shared/schema";
import { useStrings } from "../i18n";
import { Disclaimer } from "../components/common";
import type { BoardItem, Tab } from "./board";
import { TrialCard } from "./TrialCard";
import { Icon } from "./ui";

export function TrialList({
  items,
  tab,
  title,
  lang,
  openTrial,
  onOpen,
}: {
  items: BoardItem[];
  tab: Tab;
  title: string;
  lang: Lang;
  openTrial: string | null;
  onOpen: (id: string) => void;
}) {
  const t = useStrings(lang);
  return (
    <>
      <header className="px-5 pb-4 pt-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">
          {t("journey.yourTrials")}
        </p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl">{title}</h1>
          <span
            className="tab-count rounded-full bg-surface px-3 py-1 text-sm text-muted"
            aria-label={t("journey.trialCount", { count: items.length })}
          >
            {items.length}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">{t(`journey.intro.${tab}`)}</p>
      </header>
      <div className="flex-1 space-y-3 px-4 pb-6">
        {items.map((item) => (
          <TrialCard
            key={item.result.trial.nctId}
            item={item}
            lang={lang}
            selected={openTrial === item.result.trial.nctId}
            onOpen={() => onOpen(item.result.trial.nctId)}
          />
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <Icon name={tab} className="mx-auto mb-4 h-8 w-8 text-muted" />
            <h2 className="font-display text-xl">{t("journey.emptyTitle")}</h2>
            <p className="mt-3 text-sm text-muted">{t(`journey.empty.${tab}`)}</p>
          </div>
        )}
      </div>
      <Disclaimer lang={lang} />
    </>
  );
}
