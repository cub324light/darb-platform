"use client";
/* ─── قائمةٌ بسيطة قابلة للتحقّق (متطلبات/مشاريع) داخل صفحة المدرسة ───
   عنصرٌ + «تم» + حذف. تخزينٌ محلي بمفتاحٍ مستقل لكل قسم. عمداً بسيطة: الواجبات
   لها نظامها الكامل، وهذه للأشياء الخفيفة (آلة حاسبة/كتاب/ملف · مشروع...). */
import { useState, useSyncExternalStore } from "react";
import { loadList, saveList } from "@/lib/storage";

interface Item { id: string; text: string; done: boolean; }
const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);
const uid = () => `it_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export default function SchoolChecklist({ storageKey, title, icon, placeholder }: { storageKey: string; title: string; icon: string; placeholder: string }) {
  const mounted = useMounted();
  const [override, setOverride] = useState<Item[] | null>(null);
  const list = override ?? (mounted ? loadList<Item>(storageKey) : []);
  const commit = (next: Item[]) => { setOverride(next); saveList(storageKey, next); };
  const [text, setText] = useState("");

  const add = () => { if (!text.trim()) return; commit([...list, { id: uid(), text: text.trim(), done: false }]); setText(""); };
  const remaining = list.filter((i) => !i.done).length;

  return (
    <section className="ds-card ds-stack-tight">
      <div className="flex items-center gap-2">
        <h2 className="t-h3 flex-1" style={{ color: "var(--text)" }}>{icon} {title}</h2>
        {remaining > 0 && <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{remaining} متبقٍّ</span>}
      </div>
      <div className="flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder={placeholder} className="flex-1 min-w-0 rounded-lg px-3 py-2 t-caption outline-none"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
        <button onClick={add} disabled={!text.trim()} className="t-caption font-black px-3 py-2 rounded-lg transition active:scale-95 disabled:opacity-40" style={{ background: "var(--accent)", color: "#fff" }}>أضف</button>
      </div>
      {list.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {list.map((i) => (
            <div key={i.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: "var(--surface2)" }}>
              <button onClick={() => commit(list.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} aria-label="تم"
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[12px]"
                style={{ background: i.done ? "var(--success)" : "transparent", border: `1.5px solid ${i.done ? "var(--success)" : "var(--border)"}`, color: "#fff" }}>{i.done ? "✓" : ""}</button>
              <span className="t-body flex-1 min-w-0" style={{ color: i.done ? "var(--text-muted)" : "var(--text)", textDecoration: i.done ? "line-through" : "none" }}>{i.text}</span>
              <button onClick={() => commit(list.filter((x) => x.id !== i.id))} aria-label="حذف" className="flex-shrink-0 t-caption" style={{ color: "var(--text-muted)" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
