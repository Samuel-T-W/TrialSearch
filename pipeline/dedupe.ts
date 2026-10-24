// dedupe.ts = semantic dedupe of question checks (plan 6.2).
//
// compile.ts leaves question checks with a provisional id "pending:<text>" (or a
// seed bank id when the text already matched). Here we:
//   1. collect every distinct pending question text,
//   2. exact-dedupe by normalized text,
//   3. optionally ask the LLM, in batches of 50, to merge paraphrases,
//   4. build the final Question[] (QUESTION_BANK seeds + new ones),
//   5. rewrite every check's questionId to the stable bank id.
//
// Fallback (no LLM / LLM fails): one bank entry per distinct normalized text.
import { z } from "zod";
import type { CompiledTrial, LocalizedText, Question } from "../shared/schema";
import { QUESTION_BANK } from "../shared/vocab";
import { Llm } from "./llm";

const PENDING = "pending:";

export function normalizeQ(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Pull the plain English question text off a pending check. */
function pendingText(check: CompiledTrial["checks"][number]): string | undefined {
  const qid = (check.params as { questionId?: string }).questionId;
  if (typeof qid !== "string" || !qid.startsWith(PENDING)) return undefined;
  return qid.slice(PENDING.length);
}

const MergeOut = z.object({
  // groups[i] = array of input indices that are the same question.
  groups: z.array(z.array(z.number().int().nonnegative())),
});

const MERGE_SYSTEM = `You group yes/no patient-eligibility questions that mean the same thing. Output ONLY JSON: {"groups": [[0,4],[1],[2,3], ...]} where each inner array lists the indices of questions that are paraphrases of each other. Every input index must appear in exactly one group.`;

async function llmMerge(llm: Llm, texts: string[]): Promise<number[][]> {
  const groups: number[][] = [];
  for (let start = 0; start < texts.length; start += 50) {
    const batch = texts.slice(start, start + 50);
    const user = `Group these questions by meaning:\n${batch.map((t, i) => `${i}: ${t}`).join("\n")}`;
    try {
      const out = await llm.callJson({ system: MERGE_SYSTEM, user, schema: MergeOut, cacheInput: batch.join("|") });
      const seen = new Set<number>();
      for (const g of out.groups) {
        const valid = g.filter((i) => i >= 0 && i < batch.length && !seen.has(i));
        for (const i of valid) seen.add(i);
        if (valid.length) groups.push(valid.map((i) => i + start));
      }
      // Any index the model dropped becomes its own group.
      for (let i = 0; i < batch.length; i++) if (!seen.has(i)) groups.push([i + start]);
    } catch {
      // Batch failed: each question stands alone.
      for (let i = 0; i < batch.length; i++) groups.push([i + start]);
    }
  }
  return groups;
}

export interface DedupeDeps {
  llm?: Llm;
  /** false = exact-text dedupe only (the fallback path, and the default in tests). */
  useLlm?: boolean;
}

export interface DedupeResult {
  trials: CompiledTrial[];
  questions: Question[];
}

/**
 * Dedupe pending question checks and rewrite their ids. Pure over its inputs;
 * returns new trial objects and the merged question bank.
 */
export async function dedupeQuestions(
  trials: CompiledTrial[],
  deps: DedupeDeps = {},
): Promise<DedupeResult> {
  // 1. Gather distinct pending texts, keyed by normalized form.
  const byNorm = new Map<string, { text: string; plain: LocalizedText }>();
  for (const t of trials) {
    for (const c of t.checks) {
      const txt = pendingText(c);
      if (txt === undefined) continue;
      const key = normalizeQ(txt);
      if (!byNorm.has(key)) byNorm.set(key, { text: txt, plain: c.plain });
    }
  }
  const distinct = [...byNorm.values()];

  // 2/3. Optionally merge paraphrases with the LLM; else each distinct text is its own group.
  let groups: number[][];
  if (deps.useLlm && distinct.length > 0) {
    const llm = deps.llm ?? new Llm();
    groups = await llmMerge(llm, distinct.map((d) => d.text));
  } else {
    groups = distinct.map((_, i) => [i]);
  }

  // 4. Build the question bank: seeds first, then one id per merged group.
  const questions: Question[] = QUESTION_BANK.map((q) => ({ ...q }));
  // normalized pending text -> assigned bank id
  const assign = new Map<string, string>();
  let n = 1;
  for (const group of groups) {
    const members = group.map((i) => distinct[i]);
    const rep = members[0];
    // Reuse a seed id if the representative text matches one.
    const seed = QUESTION_BANK.find((q) => normalizeQ(q.text.en) === normalizeQ(rep.text));
    const id = seed ? seed.id : `q_auto_${n++}`;
    if (!seed) {
      const text: LocalizedText = { en: rep.plain.en || rep.text };
      for (const [k, v] of Object.entries(rep.plain)) if (k !== "en" && v) (text as any)[k] = v;
      questions.push({ id, text });
    }
    for (const m of members) assign.set(normalizeQ(m.text), id);
  }

  // 5. Rewrite every pending questionId to its assigned bank id.
  const rewritten = trials.map((t) => ({
    ...t,
    checks: t.checks.map((c) => {
      const txt = pendingText(c);
      if (txt === undefined) return c;
      const id = assign.get(normalizeQ(txt));
      return { ...c, params: { ...c.params, questionId: id ?? (c.params as any).questionId } };
    }),
  }));

  return { trials: rewritten, questions };
}
