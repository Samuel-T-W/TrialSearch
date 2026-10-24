import { useEffect } from "react";
import type { Lang } from "@shared/schema";
import { useStrings } from "../i18n";
import type { ArchiveTag, Tab } from "./board";
import { Icon } from "./ui";

export type Move = { key: number; title: string; tab: Tab; tag?: ArchiveTag; others: number };

const tone: Record<Tab, string> = {
  feed: "bg-st-feed-bg text-st-feed",
  qualified: "bg-st-qualified-bg text-st-qualified",
  registered: "bg-st-registered-bg text-st-registered",
  archive: "bg-st-not-qualified-bg text-st-not-qualified",
};

/** Big confirmation that pops in after saving: where the trial went. Click or wait to dismiss. */
export function MoveToast({ move, lang, onDone }: { move: Move; lang: Lang; onDone: () => void }) {
  const t = useStrings(lang);
  useEffect(() => {
    const id = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(id);
  }, [move.key, onDone]);
  const icon = move.tab === "archive" ? "archive" : move.tab;
  return (
    <div
      className="move-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6"
      onClick={onDone}
      data-testid="move-toast"
    >
      <div
        role="status"
        aria-live="assertive"
        className="move-card w-full max-w-sm rounded-3xl border border-line bg-surface p-8 text-center shadow-2xl"
      >
        <span className={`move-icon mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full ${tone[move.tab]}`}>
          <Icon name={icon} className="h-10 w-10" />
        </span>
        <p className="font-display text-2xl">{t(`journey.moved.${move.tab}`)}</p>
        {move.tag && move.tag !== "registered" && (
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${tone[move.tab]}`}>
            {t(`journey.tags.${move.tag}`)}
          </span>
        )}
        <p className="mt-3 line-clamp-2 text-sm text-muted">{move.title}</p>
        {move.others > 0 && (
          <p className="mt-2 text-sm font-bold text-muted">
            {move.others === 1 ? t("journey.movedOthersOne") : t("journey.movedOthers", { count: move.others })}
          </p>
        )}
      </div>
    </div>
  );
}
