"use client";
/* ─── مذكرة الواجبات — نظامٌ كامل داخل صفحة المدرسة ───
   إضافةٌ في أقل من ٥ ثوانٍ (اكتب العنوان + Enter)، وخياراتٌ متقدّمة عند الحاجة
   (مادة/تسليم/أولوية/مرفق/تكرار/تذكير). ترتيبٌ تلقائي وتجميعٌ حسب التسليم، وزرّ «تم».
   المصدر الوحيد: lib/homework — لتقرأه Life Engine ودويرب. */
import { useState, useSyncExternalStore } from "react";
import {
  loadHomework, saveHomework, addHomework, toggleDone, removeHomework,
  groupHomework, type Homework, type HwPriority, type HwBucket,
} from "@/lib/homework";
import { localDayKey } from "@/lib/storage";

const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

const PRIORITY: { id: HwPriority; label: string; color: string }[] = [
  { id: "high", label: "مرتفع", color: "var(--danger)" },
  { id: "normal", label: "عادي", color: "var(--accent)" },
  { id: "low", label: "منخفض", color: "var(--text-muted)" },
];
const PRIORITY_COLOR: Record<HwPriority, string> = { high: "var(--danger)", normal: "var(--accent)", low: "var(--text-muted)" };
const BUCKET_TINT: Record<HwBucket, string> = {
  overdue: "var(--danger)", today: "var(--gold)", tomorrow: "var(--accent)", upcoming: "var(--text-muted)", done: "var(--success)",
};

const todayKey = () => localDayKey(new Date());
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localDayKey(d); };
const fmtDue = (due: string) => {
  const t = todayKey();
  if (due < t) return "متأخّر";
  if (due === t) return "اليوم";
  if (due === addDays(1)) return "غداً";
  return due;
};

export default function HomeworkPlanner() {
  const mounted = useMounted();
  const [override, setOverride] = useState<Homework[] | null>(null);
  const list = override ?? (mounted ? loadHomework() : []);
  const commit = (next: Homework[]) => { setOverride(next); saveHomework(next); };

  /* الإضافة السريعة */
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [due, setDue] = useState(todayKey());
  const [priority, setPriority] = useState<HwPriority>("normal");
  const [repeat, setRepeat] = useState(false);
  const [reminder, setReminder] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const add = () => {
    if (!title.trim()) return;
    commit(addHomework(list, { title, subject: subject || undefined, due, priority, repeat: repeat ? "daily" : "none", reminderLeadDays: reminder || undefined }));
    setTitle(""); setSubject(""); setDue(todayKey()); setPriority("normal"); setRepeat(false); setReminder(0); setExpanded(false);
  };

  const groups = mounted ? groupHomework(list) : [];
  const pending = list.filter((h) => !h.done).length;

  return (
    <section className="ds-card ds-stack-tight">
      <div className="flex items-center gap-2">
        <h2 className="t-h3 flex-1" style={{ color: "var(--text)" }}>📝 مذكرة الواجبات</h2>
        {pending > 0 && (
          <span className="t-caption font-black px-2.5 py-1 rounded-full font-mono-nums" style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}>{pending} بلا إنجاز</span>
        )}
      </div>

      {/* الإضافة السريعة — عنوان + Enter */}
      <div className="rounded-xl p-2.5 flex flex-col gap-2" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="أضف واجباً… (اكتب واضغط Enter)"
            className="flex-1 min-w-0 rounded-lg px-3 py-2.5 t-body outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            aria-label="عنوان الواجب" />
          <button onClick={add} disabled={!title.trim()}
            className="t-body font-black px-4 py-2.5 rounded-lg transition active:scale-95 flex-shrink-0 disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}>أضف</button>
        </div>

        {/* سطر سريع: التسليم + الأولوية + «المزيد» */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[["اليوم", todayKey()], ["غداً", addDays(1)], ["بعد غد", addDays(2)]].map(([lbl, key]) => (
            <button key={lbl} onClick={() => setDue(key)}
              className="t-caption font-bold px-2.5 py-1 rounded-lg transition"
              style={due === key
                ? { background: "var(--accent)", color: "#fff" }
                : { background: "var(--surface)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>{lbl}</button>
          ))}
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
            className="t-caption rounded-lg px-2 py-1 outline-none font-mono-nums"
            style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1px solid var(--border)" }} aria-label="تاريخ التسليم" />
          <span className="w-px h-4" style={{ background: "var(--border)" }} />
          {PRIORITY.map((p) => (
            <button key={p.id} onClick={() => setPriority(p.id)}
              className="t-caption font-bold px-2.5 py-1 rounded-lg transition"
              style={priority === p.id
                ? { background: `color-mix(in srgb, ${p.color} 18%, transparent)`, color: p.color, border: `1px solid ${p.color}` }
                : { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{p.label}</button>
          ))}
          <button onClick={() => setExpanded((v) => !v)} className="t-caption font-bold px-2 py-1 rounded-lg" style={{ color: "var(--accent-light)" }}>{expanded ? "أقل −" : "المزيد +"}</button>
        </div>

        {/* المزيد: مادة + تكرار + تذكير + مرفق */}
        {expanded && (
          <div className="flex flex-col gap-2 pt-1">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="المادة (اختياري)"
              className="rounded-lg px-3 py-2 t-caption outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
            <div className="flex items-center gap-2 flex-wrap">
              <label className="t-caption font-bold flex items-center gap-1.5" style={{ color: "var(--text-dim)" }}>
                <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> يتكرّر يومياً
              </label>
              <span className="w-px h-4" style={{ background: "var(--border)" }} />
              <span className="t-caption" style={{ color: "var(--text-muted)" }}>تذكير:</span>
              {[[0, "بلا"], [1, "يوم"], [2, "يومين"], [3, "٣ أيام"]].map(([v, lbl]) => (
                <button key={String(v)} onClick={() => setReminder(v as number)}
                  className="t-caption font-bold px-2 py-0.5 rounded-md transition"
                  style={reminder === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{lbl}</button>
              ))}
              <label className="t-caption font-bold px-2.5 py-1 rounded-lg cursor-pointer" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent-light)" }}>
                📎 إرفاق
                <input type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const r = new FileReader();
                    r.onload = () => { commit(addHomework(list, { title: title.trim() || f.name, subject: subject || undefined, due, priority, repeat: repeat ? "daily" : "none", reminderLeadDays: reminder || undefined, attachment: { name: f.name, dataUrl: String(r.result) } })); setTitle(""); setSubject(""); };
                    r.readAsDataURL(f);
                  }} />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* القائمة المجمّعة والمرتّبة تلقائياً */}
      {groups.length === 0 ? (
        <p className="t-caption text-center py-4" style={{ color: "var(--text-muted)" }}>لا واجبات بعد — أضف أول واجب في ثوانٍ.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g.bucket} className="flex flex-col gap-1.5">
              <p className="t-caption font-black px-0.5" style={{ color: BUCKET_TINT[g.bucket] }}>{g.label} · {g.items.length}</p>
              {g.items.map((h) => (
                <div key={h.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                  style={{ background: "var(--surface2)", borderInlineStart: `3px solid ${h.done ? "var(--success)" : PRIORITY_COLOR[h.priority]}` }}>
                  <button onClick={() => commit(toggleDone(list, h.id))} aria-label={h.done ? "إلغاء الإنجاز" : "تم"}
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition active:scale-90"
                    style={{ background: h.done ? "var(--success)" : "transparent", border: `1.5px solid ${h.done ? "var(--success)" : "var(--border)"}`, color: "#fff" }}>{h.done ? "✓" : ""}</button>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="t-body font-black" style={{ color: h.done ? "var(--text-muted)" : "var(--text)", textDecoration: h.done ? "line-through" : "none" }}>{h.title}</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {h.subject && <span className="t-caption" style={{ color: "var(--text-muted)" }}>{h.subject}</span>}
                      <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>· {fmtDue(h.due)}</span>
                      {h.repeat === "daily" && <span className="t-caption" style={{ color: "var(--text-muted)" }}>· 🔁 يومي</span>}
                      {h.reminderLeadDays ? <span className="t-caption" style={{ color: "var(--text-muted)" }}>· 🔔 {h.reminderLeadDays}ي</span> : null}
                      {h.attachment && <a href={h.attachment.dataUrl} target="_blank" rel="noreferrer" className="t-caption no-underline" style={{ color: "var(--accent-light)" }}>· 📎 مرفق</a>}
                    </span>
                  </div>
                  <button onClick={() => commit(removeHomework(list, h.id))} aria-label="حذف" className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center t-caption" style={{ color: "var(--text-muted)" }}>✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
