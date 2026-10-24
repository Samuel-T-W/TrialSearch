import { Fragment, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { Lang, Question } from "@shared/schema";
import { TrialPanel } from "./TrialPanel";
import { DEFAULT_COLUMNS, useColumns } from "./useColumns";
import { useStrings } from "../i18n";
import type { Board, Session, Tab, Verdict } from "./board";
import { feedItems } from "./board";
import { FeedBar, feedName } from "./FeedBar";
import { TrialList } from "./TrialList";
import { Avatar, Icon, LanguagePicker, Modal, Wordmark } from "./ui";

const TABS: Tab[] = ["feed", "qualified", "registered", "archive"];

/**
 * Drag handle on a column edge (desktop only). Drag to resize, arrow keys nudge,
 * double-click resets. `at` and `onMove` use x in px from the layout's left edge.
 */
function Splitter({
  label,
  at,
  onMove,
  onReset,
}: {
  label: string;
  at: number;
  onMove: (x: number) => void;
  onReset: () => void;
}) {
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const left = el.parentElement!.getBoundingClientRect().left;
    el.setPointerCapture(e.pointerId);
    const move = (ev: globalThis.PointerEvent) => onMove(ev.clientX - left);
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 50 : 10;
    if (e.key === "ArrowLeft") onMove(at - step);
    else if (e.key === "ArrowRight") onMove(at + step);
    else return;
    e.preventDefault();
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(at)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
      style={{ left: at - 4 }}
      className="group absolute inset-y-0 z-10 hidden w-2 cursor-col-resize touch-none lg:block"
    >
      <span className="mx-auto block h-full w-0.5 transition-colors group-hover:bg-brand group-focus-visible:bg-brand group-active:bg-brand" />
    </div>
  );
}
export function Shell({
  session,
  name,
  lang,
  board,
  tab,
  feedId,
  openTrial,
  onTab,
  onFeed,
  onAddFeed,
  onRemoveFeed,
  onOpen,
  onCloseTrial,
  onLanguage,
  onLogout,
  onPrivacy,
  questions,
  onPreview,
  onSave,
  onRegister,
}: {
  session: Session;
  name: string;
  lang: Lang;
  board: Board;
  tab: Tab;
  feedId: string;
  openTrial: string | null;
  onTab: (tab: Tab) => void;
  onFeed: (id: string) => void;
  onAddFeed: (id: string) => void;
  onRemoveFeed: (id: string) => void;
  onOpen: (id: string) => void;
  onCloseTrial: () => void;
  onLanguage: (lang: Lang) => void;
  onLogout: () => void;
  onPrivacy: () => void;
  questions: Question[];
  onPreview: (nctId: string, answers: Record<string, boolean | "unsure">) => Verdict;
  onSave: (nctId: string, answers: Record<string, boolean | "unsure">) => void;
  onRegister: (nctId: string) => void;
}) {
  const t = useStrings(lang);
  const [menu, setMenu] = useState(false);
  // Shown once per login (Shell remounts on each login), until dismissed.
  const [notice, setNotice] = useState(true);
  const sessionNote = (
    <p className="flex items-start gap-2 rounded-xl bg-st-feed-bg p-3 text-sm font-bold text-st-feed">
      <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
      {t("journey.sessionNote")}
    </p>
  );
  const feed = session.feeds.find((f) => f.id === feedId) ?? session.feeds[0];
  const items = tab === "feed" ? feedItems(board, feed) : board[tab];
  const openItem = Object.values(board)
    .flat()
    .find((i) => i.result.trial.nctId === openTrial);
  const { cols, update } = useColumns();
  const feedProps = {
    session,
    board,
    lang,
    feedId,
    onSelect: onFeed,
    onAdd: onAddFeed,
    onRemove: onRemoveFeed,
  };
  const tabButton = (value: Tab, mobile = false) => (
    <button
      key={value}
      aria-current={tab === value ? "page" : undefined}
      onClick={() => onTab(value)}
      className={`flex ${mobile ? "min-w-0 flex-1 flex-col gap-1 px-1 py-2 text-xs" : "w-full gap-3 rounded-xl px-3 py-3 text-sm"} items-center ${tab === value ? "bg-brand-soft font-bold text-brand-ink" : "text-muted hover:bg-paper"}`}
    >
      <span className="relative">
        <Icon name={value} />
        {mobile && (
          <span
            aria-label={t("journey.trialCount", { count: board[value].length })}
            className="tab-count absolute -right-3 -top-2 rounded-full border border-line bg-surface px-1 text-[11px] text-ink"
          >
            {board[value].length}
          </span>
        )}
      </span>
      <span className={mobile ? "max-w-full truncate" : "flex-1 text-left"}>
        {t(`journey.tabs.${value}`)}
      </span>
      {!mobile && (
        <span
          className="tab-count text-xs"
          aria-label={t("journey.trialCount", { count: board[value].length })}
        >
          {board[value].length}
        </span>
      )}
    </button>
  );
  const options = (
    <>
      <LanguagePicker lang={lang} onChange={onLanguage} />
      <button
        className="btn-ghost justify-start px-3 text-sm"
        onClick={() => {
          setMenu(false);
          onPrivacy();
        }}
      >
        {t("journey.privacy")}
      </button>
      <button className="btn-ghost justify-start px-3 text-sm" onClick={onLogout}>
        {t("journey.logout")}
      </button>
    </>
  );
  return (
    <div
      className="lg:relative lg:grid lg:h-dvh lg:grid-cols-[var(--col-side)_var(--col-list)_minmax(0,1fr)] lg:overflow-hidden"
      style={{ "--col-side": `${cols.side}px`, "--col-list": `${cols.list}px` } as CSSProperties}
    >
      <Splitter
        label={t("journey.resizeSidebar")}
        at={cols.side}
        onMove={(x) => update({ side: x })}
        onReset={() => update({ side: DEFAULT_COLUMNS.side })}
      />
      <Splitter
        label={t("journey.resizeList")}
        at={cols.side + cols.list}
        onMove={(x) => update({ list: x - cols.side })}
        onReset={() => update({ list: DEFAULT_COLUMNS.list })}
      />
      <aside className="hidden flex-col overflow-y-auto border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="px-2">
          <Wordmark />
        </div>
        <div className="my-7 flex items-center gap-3 px-2">
          <Avatar name={name} />
          <div className="min-w-0">
            <p className="truncate font-bold">{name}</p>
            <p className="text-xs text-muted">
              {t("journey.patientMeta", { age: session.profile.age, miles: session.profile.maxMiles })}
            </p>
          </div>
        </div>
        <nav aria-label={t("journey.navigation")} className="space-y-1">
          {TABS.map((value) => (
            <Fragment key={value}>
              {tabButton(value)}
              {value === "feed" && tab === "feed" && <FeedBar {...feedProps} vertical />}
            </Fragment>
          ))}
        </nav>
        <div className="mt-5">{sessionNote}</div>
        <div className="mt-auto flex flex-col gap-1 border-t border-line px-2 pt-5">
          {options}
        </div>
      </aside>
      <main className="list-content flex min-w-0 flex-col lg:overflow-y-auto lg:border-r lg:border-line">
        <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <Avatar name={name} />
            <div>
              <p className="font-bold">{name.split(" ")[0]}</p>
              <p className="text-xs text-muted">{t("journey.yourTrials")}</p>
            </div>
          </div>
          <button
            className="rounded-xl border border-line px-4 text-lg"
            aria-label={t("journey.accountMenu")}
            onClick={() => setMenu(true)}
          >
            ···
          </button>
        </header>
        {tab === "feed" && (
          <div className="pt-2 lg:hidden">
            <FeedBar {...feedProps} />
          </div>
        )}
        <TrialList
          items={items}
          tab={tab}
          title={tab === "feed" ? feedName(feed, lang) : t(`journey.tabs.${tab}`)}
          lang={lang}
          openTrial={openTrial}
          onOpen={onOpen}
        />
      </main>
      <section
        aria-label={t("journey.trialPanel")}
        className={`${openTrial ? "fixed inset-0 z-30 flex" : "hidden"} min-w-0 flex-col overflow-y-auto bg-surface lg:static lg:z-auto lg:flex`}
      >
        {openTrial ? (
          <div className="mx-auto w-full max-w-2xl p-6 lg:p-10">
            <button className="btn-ghost mb-8 px-2" onClick={onCloseTrial}>
              ← {t("journey.backToList")}
            </button>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
              {t("journey.trialPanel")}
            </p>
            {openItem ? (
              <TrialPanel
                key={openItem.result.trial.nctId}
                item={openItem}
                lang={lang}
                questions={questions}
                answers={session.profile.answers}
                registered={session.registered.includes(openItem.result.trial.nctId)}
                preview={(answers) => onPreview(openItem.result.trial.nctId, answers)}
                onSave={(answers) => onSave(openItem.result.trial.nctId, answers)}
                onRegister={() => onRegister(openItem.result.trial.nctId)}
              />
            ) : (
              <h2 className="font-display text-2xl">{t("journey.trialUnavailable")}</h2>
            )}
          </div>
        ) : (
          <div className="m-auto max-w-sm px-8 py-12 text-center">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Icon name="feed" className="h-7 w-7" />
            </span>
            <h2 className="font-display text-2xl">{t("journey.pickTrial")}</h2>
            <p className="mt-4 text-sm text-muted">{t("journey.pickHint")}</p>
          </div>
        )}
      </section>
      <nav
        aria-label={t("journey.navigation")}
        className="bottom-tabs fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t border-line bg-surface px-2 pt-3 lg:hidden"
      >
        {TABS.map((value) => tabButton(value, true))}
      </nav>
      {notice && (
        <div
          role="status"
          data-testid="session-notice"
          className="fixed inset-x-4 top-4 z-40 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-st-feed bg-st-feed-bg p-4 text-st-feed shadow-lg"
        >
          <Icon name="info" className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t("journey.sessionNoteTitle")}</p>
            <p className="mt-1 text-sm">{t("journey.sessionNote")}</p>
          </div>
          <button
            className="shrink-0 rounded-lg border border-st-feed px-3 py-1 text-sm font-bold hover:bg-surface"
            onClick={() => setNotice(false)}
          >
            {t("journey.sessionNoteGotIt")}
          </button>
        </div>
      )}
      {menu && (
        <Modal
          title={t("journey.accountMenu")}
          closeLabel={t("journey.close")}
          onClose={() => setMenu(false)}
        >
          <div className="flex flex-col gap-3 p-5">
            {options}
            {sessionNote}
          </div>
        </Modal>
      )}
    </div>
  );
}
