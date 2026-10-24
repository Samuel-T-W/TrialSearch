import { useCallback, useEffect, useState } from "react";

/** Desktop column widths for the three-pane layout, draggable and remembered across visits. */
export type Columns = { side: number; list: number };
export const DEFAULT_COLUMNS: Columns = { side: 260, list: 400 };
const KEY = "trialsearch.columns";
const SIDE = [200, 420] as const;
const LIST_MIN = 300;
const DETAIL_MIN = 320; // the details pane never shrinks below this

/** Keep both columns inside their limits for a given window width. */
export function clampColumns(c: Columns, viewport: number): Columns {
  const side = Math.min(SIDE[1], Math.max(SIDE[0], c.side));
  // Columns only exist at the lg breakpoint (1024px), so never squeeze for a narrower window.
  const listMax = Math.max(LIST_MIN, Math.max(viewport, 1024) - side - DETAIL_MIN);
  const list = Math.min(listMax, Math.max(LIST_MIN, c.list));
  return { side, list };
}

function load(): Columns {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && typeof v.side === "number" && typeof v.list === "number") return v;
  } catch {
    /* ignore bad saved value */
  }
  return DEFAULT_COLUMNS;
}

export function useColumns() {
  const [cols, setCols] = useState<Columns>(() => clampColumns(load(), window.innerWidth));

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(cols));
  }, [cols]);

  useEffect(() => {
    const onResize = () => setCols((c) => clampColumns(c, window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const update = useCallback(
    (next: Partial<Columns>) => setCols((c) => clampColumns({ ...c, ...next }, window.innerWidth)),
    [],
  );
  return { cols, update };
}
