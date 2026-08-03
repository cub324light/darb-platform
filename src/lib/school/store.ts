"use client";
/* ═══════════ اختباراتُ المدرسة — طبقةُ القراءة والكتابة وحدها ═══════════ */
import { useSyncExternalStore } from "react";
import { addExam, updateExam, removeExam, type AddResult, type SchoolExam } from "./exams";

const KEY = "darb_school_exams";
export const SCHOOL_EXAMS_CHANGED = "darb:schoolExamsChanged";

let cache: SchoolExam[] | null = null;
let cacheRaw: string | null = null;

export function loadSchoolExams(): SchoolExam[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cacheRaw && cache) return cache;
    cacheRaw = raw;
    const parsed = raw ? (JSON.parse(raw) as SchoolExam[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
    return cache;
  } catch { cache = []; cacheRaw = null; return cache; }
}

function write(next: SchoolExam[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* تجاهل */ }
  cache = null; cacheRaw = null;
  try { window.dispatchEvent(new Event(SCHOOL_EXAMS_CHANGED)); } catch { /* تجاهل */ }
}

const newId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function createSchoolExam(i: Omit<SchoolExam, "id" | "createdAt">): AddResult {
  const r = addExam(loadSchoolExams(), { id: newId(), at: Date.now(), ...i });
  if (r.ok) write(r.exams);
  return r;
}

export function editSchoolExam(id: string, patch: Partial<Omit<SchoolExam, "id" | "createdAt">>): void {
  write(updateExam(loadSchoolExams(), id, patch));
}

export function deleteSchoolExam(id: string): void {
  write(removeExam(loadSchoolExams(), id));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(SCHOOL_EXAMS_CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SCHOOL_EXAMS_CHANGED, cb);
    window.removeEventListener("storage", cb);
  };
};

const EMPTY: SchoolExam[] = [];

export function useSchoolExams(): SchoolExam[] {
  return useSyncExternalStore(subscribe, loadSchoolExams, () => EMPTY);
}
