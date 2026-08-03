"use client";
/* ═══════════ موادُّ الطالب لربط ورقة الدفتر بها ═══════════
   لا قائمةَ مواد جديدة: نجمع ما يعرفه المنتجُ عنه أصلاً — موادُّ منهجه المدرسيّ
   وموادُّ اختباراته في مساري — بلا تكرار. */
import { useState } from "react";
import { loadUser, ensureWorkspace } from "@/lib/storage";
import { subjectsFor } from "@/lib/curriculum";
import { readAllExams } from "@/lib/roadmap/nowRead";

export function readSubjectNames(): string[] {
  try {
    const u = loadUser();
    if (!u) return [];
    const out = new Set<string>(subjectsFor(u.academicTrack, u.grade, u.academicTerm));
    const ws = ensureWorkspace(u).workspace;
    if (ws) for (const e of readAllExams(ws)) for (const s of e.subjects) out.add(s.name);
    return [...out];
  } catch { return []; }
}

/** تُقرأ مرّةً عند التركيب — قائمةٌ لا تتغيّر أثناء تحرير ورقة. */
export function useSubjectNames(): string[] {
  const [names] = useState<string[]>(() => (typeof window === "undefined" ? [] : readSubjectNames()));
  return names;
}
