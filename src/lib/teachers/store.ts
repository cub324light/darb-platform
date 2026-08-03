"use client";
/* ═══════════ مدرّسوك — طبقةُ القراءة والكتابة وحدها ═══════════
   بياناتُ المدرّسين في جهاز الطالب فقط: لا تُرسَل إلى خادمٍ ولا إلى نموذجِ ذكاء.
   وهي بياناتُ شخصٍ ثالث، فأقلُّ ما نفعله ألّا نتصرّف فيها.

   القراءةُ بـ`useSyncExternalStore` بلقطةٍ ثابتةِ المرجع — إعادةُ مصفوفةٍ جديدة
   كلَّ نداءٍ حلقةُ رسمٍ لا تنتهي. */
import { useSyncExternalStore } from "react";
import {
  addTeacher, updateTeacher, removeTeacher, addNote, removeNote,
  addTerm, removeTerm, rateTerm, addMoment, removeMoment,
  type AddResult, type Teacher,
} from "./teachers";

const KEY = "darb_teachers";
export const TEACHERS_CHANGED = "darb:teachersChanged";

let cache: Teacher[] | null = null;
let cacheRaw: string | null = null;

export function loadTeachers(): Teacher[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cacheRaw && cache) return cache;
    cacheRaw = raw;
    const parsed = raw ? (JSON.parse(raw) as Teacher[]) : [];
    /* ترحيلٌ صامت: النسخةُ الأولى كانت `subject`/`contact` مفردين، وبلا فصولٍ
       ولا مواقف. نحوّلها هنا فلا يفقد الطالبُ ما أدخله. */
    cache = Array.isArray(parsed) ? parsed.map((t) => {
      const legacy = t as Teacher & { subject?: string; contact?: string };
      return {
        ...t,
        subjects: Array.isArray(t.subjects) ? t.subjects : (legacy.subject ? [legacy.subject] : []),
        contacts: Array.isArray(t.contacts) ? t.contacts : (legacy.contact ? [legacy.contact] : []),
        notes: Array.isArray(t.notes) ? t.notes : [],
        terms: Array.isArray(t.terms) ? t.terms : [],
        moments: Array.isArray(t.moments) ? t.moments : [],
      };
    }) : [];
    return cache;
  } catch { cache = []; cacheRaw = null; return cache; }
}

function write(next: Teacher[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* تجاهل */ }
  cache = null; cacheRaw = null;
  try { window.dispatchEvent(new Event(TEACHERS_CHANGED)); } catch { /* تجاهل */ }
}

const newId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function createTeacher(i: { name: string; subjects?: string[]; contacts?: string[] }): AddResult {
  const r = addTeacher(loadTeachers(), { id: newId(), ...i, at: Date.now() });
  if (r.ok) write(r.teachers);
  return r;
}

export function editTeacher(id: string, patch: { name?: string; subjects?: string[]; contacts?: string[] }): void {
  write(updateTeacher(loadTeachers(), id, patch));
}

export function deleteTeacher(id: string): void {
  write(removeTeacher(loadTeachers(), id));
}

export function noteOnTeacher(teacherId: string, text: string): void {
  write(addNote(loadTeachers(), teacherId, { id: newId(), text, at: Date.now() }));
}

export function deleteTeacherNote(teacherId: string, noteId: string): void {
  write(removeNote(loadTeachers(), teacherId, noteId));
}

export function addTeacherTerm(teacherId: string, grade: string, term: string): void {
  write(addTerm(loadTeachers(), teacherId, { id: newId(), grade, term }));
}

export function deleteTeacherTerm(teacherId: string, termId: string): void {
  write(removeTerm(loadTeachers(), teacherId, termId));
}

export function rateTeacherTerm(teacherId: string, termId: string, rating: number | null): void {
  write(rateTerm(loadTeachers(), teacherId, termId, rating));
}

export function momentOnTeacher(teacherId: string, text: string): void {
  write(addMoment(loadTeachers(), teacherId, { id: newId(), text, at: Date.now() }));
}

export function deleteTeacherMoment(teacherId: string, momentId: string): void {
  write(removeMoment(loadTeachers(), teacherId, momentId));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(TEACHERS_CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(TEACHERS_CHANGED, cb);
    window.removeEventListener("storage", cb);
  };
};

const EMPTY: Teacher[] = [];

export function useTeachers(): Teacher[] {
  return useSyncExternalStore(subscribe, loadTeachers, () => EMPTY);
}
