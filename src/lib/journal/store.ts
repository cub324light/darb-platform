"use client";
/* ═══════════ دفترُ اليوم — طبقةُ القراءة والكتابة وحدها ═══════════
   القراءةُ بـ`useSyncExternalStore` لا في مُهيّئ `useState` — وإلا انكسر الترطيب
   (React #418)، وهو عطلٌ تكرّر في هذا المشروع فلا نعيده. */
import { useSyncExternalStore } from "react";
import { canSave, upsertNote, removeNote, togglePin, type JournalNote, type SaveCheck } from "./journal";

const KEY = "darb_journal";
export const JOURNAL_CHANGED = "darb:journalChanged";

let cache: JournalNote[] | null = null;
let cacheRaw: string | null = null;

/** لقطةٌ ثابتةُ المرجع ما لم يتغيّر المخزَّن — `useSyncExternalStore` يقارن
    بالمرجع، فإعادةُ مصفوفةٍ جديدةٍ كلَّ نداءٍ حلقةُ رسمٍ لا تنتهي. */
export function loadJournal(): JournalNote[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cacheRaw && cache) return cache;
    cacheRaw = raw;
    cache = raw ? (JSON.parse(raw) as JournalNote[]) : [];
    if (!Array.isArray(cache)) cache = [];
    return cache;
  } catch { cache = []; cacheRaw = null; return cache; }
}

function write(next: JournalNote[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* تجاهل */ }
  cache = null; cacheRaw = null;
  try { window.dispatchEvent(new Event(JOURNAL_CHANGED)); } catch { /* تجاهل */ }
}

/** حفظُ ورقة — يفحص السعةَ أوّلاً ويُعيد سببَ الرفض بدل أن يفشل صامتاً. */
export function saveNote(note: JournalNote): SaveCheck {
  const all = loadJournal();
  const check = canSave(all, note);
  if (!check.ok) return check;
  write(upsertNote(all, note));
  return check;
}

export function deleteNote(id: string): void {
  write(removeNote(loadJournal(), id));
}

export function pinNote(id: string): void {
  write(togglePin(loadJournal(), id));
}

export const newNoteId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const subscribe = (cb: () => void) => {
  window.addEventListener(JOURNAL_CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(JOURNAL_CHANGED, cb);
    window.removeEventListener("storage", cb);
  };
};

const EMPTY: JournalNote[] = [];

export function useJournal(): JournalNote[] {
  return useSyncExternalStore(subscribe, loadJournal, () => EMPTY);
}
