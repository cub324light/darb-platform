"use client";
import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ERROR_CATEGORIES } from "@/lib/constants";
import type { VaultError, SubjectId } from "@/lib/types";

const SUBJECTS: SubjectId[] = ["فيزياء", "رياضيات", "كيمياء", "أحياء"];

const SUBJECT_COLORS: Record<SubjectId, string> = {
  فيزياء:  "#2563EB",
  رياضيات: "#8B5CF6",
  كيمياء:  "#10B981",
  أحياء:   "#F59E0B",
};

const FREE_LIMIT = 20;

const DEMO_ERRORS: VaultError[] = [
  {
    id: "1",
    question: "جسم كتلته 5 كجم يتحرك بتسارع 3 م/ث² — ما القوة المحركة؟",
    subject: "فيزياء",
    category: "خطأ حسابي",
    note: "نسيت ضرب الكتلة في التسارع وجمعتهم",
    createdAt: Date.now() - 86400000,
    reviewCount: 2,
  },
  {
    id: "2",
    question: "ما الجذر التربيعي لـ (-16)؟",
    subject: "رياضيات",
    category: "ما فهمت المفهوم",
    note: "ما أعرف أن الجذر لسالب = عدد تخيلي",
    createdAt: Date.now() - 172800000,
    reviewCount: 0,
  },
  {
    id: "3",
    question: "ما الصيغة التجريبية لمركب يحتوي 40% كربون، 6.7% هيدروجين، 53.3% أكسجين؟",
    subject: "كيمياء",
    category: "نسيت القانون",
    note: "نسيت خطوات حساب النسبة المئوية للتركيب",
    createdAt: Date.now() - 259200000,
    reviewCount: 1,
  },
];

export default function VaultPage() {
  const [errors, setErrors]         = useState<VaultError[]>(DEMO_ERRORS);
  const [showAdd, setShowAdd]       = useState(false);
  const [filterSubject, setFilterSubject] = useState<SubjectId | "الكل">("الكل");
  const [filterCat, setFilterCat]   = useState<string>("الكل");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newQ, setNewQ]             = useState("");
  const [newSubject, setNewSubject] = useState<SubjectId>("فيزياء");
  const [newCat, setNewCat]         = useState<string>(ERROR_CATEGORIES[0]);
  const [newNote, setNewNote]       = useState("");

  const isPlanFree = true;
  const atLimit    = isPlanFree && errors.length >= FREE_LIMIT;

  const filtered = errors.filter((e) => {
    if (filterSubject !== "الكل" && e.subject !== filterSubject) return false;
    if (filterCat     !== "الكل" && e.category !== filterCat)   return false;
    return true;
  });

  const addError = () => {
    if (!newQ.trim() || atLimit) return;
    setErrors((p) => [{
      id: Date.now().toString(), question: newQ.trim(),
      subject: newSubject, category: newCat,
      note: newNote.trim(), createdAt: Date.now(), reviewCount: 0,
    }, ...p]);
    setNewQ(""); setNewNote(""); setShowAdd(false);
  };

  const categoryCount = (cat: string) => errors.filter((e) => e.category === cat).length;

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="title-md text-[var(--text)]">خزنة الأخطاء 🔒</h1>
        <div className="stat-chip">
          <span className="font-mono-nums font-bold text-base text-[var(--gold)]">{errors.length}</span>
          {isPlanFree && <span className="body-sm">/{FREE_LIMIT}</span>}
        </div>
      </div>

      {/* ── Limit bar ── */}
      {isPlanFree && (
        <div className="px-5 mb-7">
          <div className="flex justify-between mb-2">
            <span className="body-sm">الاستخدام</span>
            <span className="body-sm">{errors.length} / {FREE_LIMIT}</span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: (errors.length / FREE_LIMIT) * 100 + "%",
                background: errors.length >= FREE_LIMIT - 5 ? "#EF4444" : "#F59E0B",
              }} />
          </div>
          {atLimit && (
            <p className="text-sm text-[var(--danger)] mt-2 text-center">
              وصلت الحد المجاني.{" "}
              <Link href="/pricing" className="text-[var(--blue-light)] underline font-semibold">رقّي لشاهين</Link>
            </p>
          )}
        </div>
      )}

      {/* ── Category pills ── */}
      <div className="px-5 mb-6">
        <p className="label mb-3">تصنيف الخطأ</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["الكل", ...ERROR_CATEGORIES].map((cat) => {
            const count = cat === "الكل" ? errors.length : categoryCount(cat);
            const active = filterCat === cat;
            return (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className="flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold transition"
                style={active
                  ? { background: "#F59E0B", color: "#0A0A0F" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
                {cat}{count > 0 && ` (${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Subject tabs ── */}
      <div className="px-5 mb-7">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["الكل", ...SUBJECTS] as (SubjectId | "الكل")[]).map((s) => {
            const active = filterSubject === s;
            const color = s === "الكل" ? "#64748B" : SUBJECT_COLORS[s as SubjectId];
            return (
              <button key={s} onClick={() => setFilterSubject(s)}
                className="flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-bold transition"
                style={active
                  ? { background: color, color: "#fff" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Cards list ── */}
      <div className="px-5 flex flex-col gap-5">

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔒</p>
            <p className="title-md text-[var(--text)] mb-2">الخزنة فارغة</p>
            <p className="body-sm">هذا جيد! استمر.</p>
          </div>
        )}

        {filtered.map((error) => {
          const color     = SUBJECT_COLORS[error.subject];
          const isExpanded = expandedId === error.id;
          const daysAgo   = Math.round((Date.now() - error.createdAt) / 86400000);

          return (
            <div key={error.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{ background: "var(--surface)", border: `1.5px solid ${isExpanded ? color + "50" : "var(--border)"}` }}>

              {/* Card header */}
              <div className="p-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : error.id)}>
                <div className="flex items-start gap-4">
                  {/* Color dot */}
                  <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0" style={{ background: color }} />

                  <div className="flex-1 min-w-0">
                    <p className="text-base text-[var(--text)] leading-relaxed mb-3">{error.question}</p>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-3 py-1 rounded-full"
                          style={{ background: color + "20", color }}>
                          {error.subject}
                        </span>
                        <span className="text-xs px-3 py-1 rounded-full"
                          style={{ background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
                          {error.category}
                        </span>
                        {error.reviewCount > 0 && (
                          <span className="text-xs text-[var(--success)] font-semibold">✓ راجعته {error.reviewCount}×</span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {daysAgo === 0 ? "اليوم" : `قبل ${daysAgo} يوم`}
                      </span>
                    </div>
                  </div>

                  <span className="text-[var(--text-muted)] text-sm mt-1">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[var(--border)]">
                  <div className="pt-4 flex flex-col gap-3">
                    {error.note && (
                      <div className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <p className="label mb-2">ملاحظتي</p>
                        <p className="text-sm text-[var(--text-dim)] leading-relaxed">{error.note}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setErrors((p) => p.map((e) => e.id === error.id ? { ...e, reviewCount: e.reviewCount + 1 } : e))}
                        className="py-3 rounded-2xl text-sm font-bold text-white transition"
                        style={{ background: color }}>
                        راجعته ✓
                      </button>
                      <button onClick={() => setErrors((p) => p.filter((e) => e.id !== error.id))}
                        className="py-3 rounded-2xl text-sm font-bold transition"
                        style={{ background: "var(--surface2)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add button / form ── */}
      {!atLimit && (
        <div className="px-5 py-5">
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)}
              className="w-full py-4 rounded-2xl text-base font-bold text-[var(--text-dim)] transition"
              style={{ background: "var(--surface)", border: "1.5px dashed var(--border)" }}>
              + أضف خطأً جديداً
            </button>
          ) : (
            <div className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1.5px solid rgba(245,158,11,0.35)" }}>
              <p className="font-bold text-base text-[var(--gold)]">خطأ جديد في الخزنة</p>

              <textarea value={newQ} onChange={(e) => setNewQ(e.target.value)} rows={3}
                placeholder="السؤال أو المفهوم الذي أخطأت فيه..."
                className="w-full rounded-2xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none transition-colors"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

              <div className="grid grid-cols-2 gap-3">
                <select value={newSubject} onChange={(e) => setNewSubject(e.target.value as SubjectId)}
                  className="rounded-2xl px-4 py-3 text-sm text-[var(--text)] outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={newCat} onChange={(e) => setNewCat(e.target.value)}
                  className="rounded-2xl px-4 py-3 text-sm text-[var(--text)] outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {ERROR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="ملاحظة: ليش غلطت؟ (اختياري)"
                className="rounded-2xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

              <div className="grid grid-cols-2 gap-3">
                <button onClick={addError}
                  className="py-3 rounded-2xl font-bold text-base transition"
                  style={{ background: "#F59E0B", color: "#0A0A0F" }}>
                  أضف للخزنة
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="py-3 rounded-2xl text-base font-medium text-[var(--text-muted)] transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
