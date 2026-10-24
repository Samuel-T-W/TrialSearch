import { useEffect, useRef, type ReactNode } from "react";
import { LANGS, type Lang } from "@shared/schema";
import { LANG_NAMES, useStrings } from "../i18n";

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-bold tracking-tight text-brand">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-surface"
      >
        ✳
      </span>
      TrialSearch
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand"
    >
      {name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}

export function LanguagePicker({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  const t = useStrings(lang);
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm text-muted">
      <span className="sr-only">{t("journey.language")}</span>
      <select
        aria-label={t("journey.language")}
        className="min-w-0 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
        value={lang}
        onChange={(e) => onChange(e.target.value as Lang)}
      >
        {LANGS.map((value) => (
          <option key={value} value={value}>
            {LANG_NAMES[value]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    feed: (
      <>
        <path d="M4 6h16M4 12h16M4 18h10" />
        <circle cx="19" cy="18" r="1" />
      </>
    ),
    qualified: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    registered: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    archive: (
      <>
        <path d="M5 8v13h14V8M9 12h6" />
        <rect x="3" y="3" width="18" height="5" rx="1" />
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.feed}
    </svg>
  );
}

export function Modal({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = original;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed m-auto max-h-[90dvh] w-[calc(100%-24px)] max-w-xl overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-ink/40"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="font-display text-xl">{title}</h2>
        <button className="btn-ghost px-3" onClick={onClose} aria-label={closeLabel}>
          ✕
        </button>
      </header>
      {children}
    </dialog>
  );
}
