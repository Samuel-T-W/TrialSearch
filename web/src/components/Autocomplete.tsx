import { useMemo, useRef, useState } from "react";

export type Option = { id: string; label: string; terms: string[] };

export function Autocomplete({
  options,
  excludeIds,
  placeholder,
  onPick,
  testId,
}: {
  options: Option[];
  excludeIds: string[];
  placeholder: string;
  onPick: (id: string) => void;
  testId?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const ex = new Set(excludeIds);
    const scored: { opt: Option; score: number }[] = [];
    for (const opt of options) {
      if (ex.has(opt.id)) continue;
      const hay = [opt.label, ...opt.terms];
      let best = Infinity;
      for (const h of hay) {
        const idx = h.toLowerCase().indexOf(needle);
        if (idx >= 0) best = Math.min(best, idx);
      }
      if (best < Infinity) scored.push({ opt, score: best });
    }
    scored.sort((a, b) => a.score - b.score || a.opt.label.localeCompare(b.opt.label));
    return scored.slice(0, 8).map((s) => s.opt);
  }, [q, options, excludeIds]);

  function pick(opt: Option) {
    onPick(opt.id);
    setQ("");
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="input"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={q}
        placeholder={placeholder}
        data-testid={testId}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 && (
        <ul
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          role="listbox"
        >
          {matches.map((opt, i) => (
            <li key={opt.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`flex w-full flex-col items-start px-4 py-3 text-left text-base hover:bg-brand-light ${
                  i === active ? "bg-brand-light" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(opt);
                }}
              >
                <span className="font-medium text-slate-900">{opt.label}</span>
                {opt.terms.length > 0 && (
                  <span className="text-xs text-slate-500">{opt.terms.slice(0, 3).join(", ")}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
