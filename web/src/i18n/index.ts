import type { Lang } from "@shared/schema";
import en from "./en.json";
import es from "./es.json";
import pt from "./pt.json";
import ht from "./ht.json";
import zh from "./zh.json";
import vi from "./vi.json";

type Strings = typeof en;
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
// Other languages may lag behind English; missing keys fall back to English in `t`.
const bundles: Record<Lang, DeepPartial<Strings>> = { en, es, pt, ht, zh, vi };

/** Resolve a dot-path like "results.count" from the strings object. */
function resolve(obj: unknown, path: string): string {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur == null || typeof cur !== "object") return path;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return typeof cur === "string" ? cur : path;
}

/** Return a translator function for the given language. */
export function useStrings(lang: Lang) {
  const strings = bundles[lang] ?? bundles.en;
  return function t(path: string, vars?: Record<string, string | number>): string {
    let s = resolve(strings, path);
    if (s === path) s = resolve(bundles.en, path); // fallback to en
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(`{${k}}`, String(v));
      }
    }
    return s;
  };
}

/** Native language names for the picker. */
export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  ht: "Kreyòl ayisyen",
  zh: "中文",
  vi: "Tiếng Việt",
};
