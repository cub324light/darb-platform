"use client";
/* ═══════════ ترتيبُ أقسام الصفحة — طبقةُ القراءة والكتابة ═══════════
   مفتاحٌ لكلّ صفحة: `darb_layout_<page>`. لا نجمع كلَّ الصفحات في مفتاحٍ واحد
   حتى لا يفسد ترتيبُ صفحةٍ بخطأٍ في أخرى.

   القراءةُ بـ`useSyncExternalStore` لا في مُهيّئ `useState` — وإلا انكسر الترطيب
   (React #418). واللقطةُ **ثابتةُ المرجع** ما لم يتغيّر المخزَّن: كائنٌ جديدٌ كلَّ
   نداءٍ يوقع المكوّن في حلقةٍ لا تنتهي (عطلٌ وقع في مخزن المحفظة فلا نعيده). */
import { useSyncExternalStore } from "react";
import { mergeLayout, defaultLayout, type SectionDef, type SectionState } from "./pageLayout";

export const LAYOUT_CHANGED = "darb:layoutChanged";

const keyOf = (page: string) => `darb_layout_${page}`;

/* ذاكرةٌ لكلّ صفحة: النصُّ الخام ⇐ اللقطةُ المبنيّة منه */
const cache = new Map<string, { raw: string | null; defsKey: string; value: SectionState[] }>();

const defsKeyOf = (defs: SectionDef[]) => defs.map((d) => `${d.id}${d.fixed ? "!" : ""}`).join("|");

export function loadLayout(page: string, defs: SectionDef[]): SectionState[] {
  const dk = defsKeyOf(defs);
  try {
    const raw = localStorage.getItem(keyOf(page));
    const hit = cache.get(page);
    if (hit && hit.raw === raw && hit.defsKey === dk) return hit.value;
    const stored = raw ? (JSON.parse(raw) as SectionState[]) : null;
    const value = mergeLayout(defs, Array.isArray(stored) ? stored : null);
    cache.set(page, { raw, defsKey: dk, value });
    return value;
  } catch {
    const value = defaultLayout(defs);
    cache.set(page, { raw: null, defsKey: dk, value });
    return value;
  }
}

export function saveLayout(page: string, layout: SectionState[]): void {
  try { localStorage.setItem(keyOf(page), JSON.stringify(layout)); } catch { /* تجاهل */ }
  cache.delete(page);
  try { window.dispatchEvent(new Event(LAYOUT_CHANGED)); } catch { /* تجاهل */ }
}

/** إرجاعُ الصفحة إلى ترتيبها الأصليّ — يمحو الرأيَ ولا يكتب رأياً جديداً. */
export function resetLayout(page: string): void {
  try { localStorage.removeItem(keyOf(page)); } catch { /* تجاهل */ }
  cache.delete(page);
  try { window.dispatchEvent(new Event(LAYOUT_CHANGED)); } catch { /* تجاهل */ }
}

/** كلُّ الصفحات المخصَّصة — يستعملها زرُّ «أعد كل الصفحات» في الإعدادات. */
export function resetAllLayouts(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("darb_layout_")) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch { /* تجاهل */ }
  cache.clear();
  try { window.dispatchEvent(new Event(LAYOUT_CHANGED)); } catch { /* تجاهل */ }
}

const subscribe = (cb: () => void) => {
  window.addEventListener(LAYOUT_CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LAYOUT_CHANGED, cb);
    window.removeEventListener("storage", cb);
  };
};

/* لقطةُ الخادم لا بدّ أن تكون ثابتةَ المرجع هي الأخرى — تُستدعى في الترطيب،
   وكائنٌ جديدٌ كلَّ نداءٍ يوقع المكوّن في الحلقة نفسِها. */
const serverCache = new Map<string, SectionState[]>();
function serverSnapshot(defs: SectionDef[]): SectionState[] {
  const dk = defsKeyOf(defs);
  let v = serverCache.get(dk);
  if (!v) { v = defaultLayout(defs); serverCache.set(dk, v); }
  return v;
}

export function useLayout(page: string, defs: SectionDef[]): SectionState[] {
  return useSyncExternalStore(
    subscribe,
    () => loadLayout(page, defs),
    () => serverSnapshot(defs),
  );
}
