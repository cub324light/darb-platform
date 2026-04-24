"use client";
import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ERROR_CATEGORIES } from "@/lib/constants";
import type { VaultError, SubjectId } from "@/lib/types";

const SUBJECTS: SubjectId[] = ["فيزياء", "رياضيات", "كيمياء", "أحياء"];

const SUBJECT_COLORS: Record<SubjectId, string> = {
  فيزياء: "#2563EB",
  رياضيات: "#8B5CF6",
  كيمياء: "#10B981",
  أحياء: "#F59E0B",
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
  const [errors, setErrors] = useState<VaultError[]>(DEMO_ERRORS);
  const [showAdd, setShowAdd] = useState(false);
  const [filterSubject, setFilterSubject] = useState<SubjectId | "الكل">("الكل");
  const [filterCat, setFilterCat] = useState<string>("الكل");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newQ, setNewQ] = useState("");
  const [newSubject, setNewSubject] = useState<SubjectId>("فيزياء");
  const [newCat, setNewCat] = useState<string>(ERROR_CATEGORIES[0]);
  const [newNote, setNewNote] = useState("");

  const isPlanFree = true;
  const atLimit = isPlanFree && errors.length >= FREE_LIMIT;

  const filtered = errors.filter((e) => {
    if (filterSubject !== "الكل" && e.subject !== filterSubject) return false;
    if (filterCat !== "الكل" && e.category !== filterCat) return false;
    return true;
  });

  const addError = () => {
    if (!newQ.trim()) return;
    if (atLimit) return;

    const e: VaultError = {
      id: Date.now().toString(),
      question: newQ.trim(),
      subject: newSubject,
      category: newCat,
      note: newNote.trim(),
      createdAt: Date.now(),
      reviewCount: 0,
    };
    setErrors((p) => [e, ...p]);
    setNewQ("");
    setNewNote("");
    setShowAdd(false);
  };

  const deleteError = (id: string) => {
    setErrors((p) => p.filter((e) => e.id !== id));
  };

  const markReviewed = (id: string) => {
    setErrors((p) =>
      p.map((e) => (e.id === id ? { ...e, reviewCount: e.reviewCount + 1 } : e))
    );
  };

  const categoryCount = (cat: string) => errors.filter((e) => e.category === cat).length;

  return (
    <div className="min-h-dvh bg-[var(--bg)] pb-nav">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)] transition text-sm">
          ← الرئيسية
        </Link>
        <h1 className="font-black text-[var(--text)]">خزنة الأخطاء 🔒</h1>
        <div className="flex items-center gap-1.5">
          <span className="font-mono-nums text-sm text-[var(--gold)]">{errors.length}</span>
          {isPlanFree && <span className="text-[10px] text-[var(--text-muted)]">/{FREE_LIMIT}</span>}
        </div>
      </div>

      {/* Limit warning */}
      {isPlanFree && (
        <div className="px-5 mb-3">
          <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: (errors.length / FREE_LIMIT) * 100 + "%",
                background: errors.length >= FREE_LIMIT - 5 ? "#EF4444" : "#F59E0B",
              }}
            />
          </div>
          {atLimit && (
            <div className="mt-2 text-center">
              <span className="text-xs text-[var(--danger)]">وصلت الحد المجاني (20 سؤال). </span>
              <Link href="/pricing" className="text-xs text-[var(--blue-light)] underline">
                رقّي لشاهين
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Category stats */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["الكل", ...ERROR_CATEGORIES].map((cat) => {
            const count = cat === "الكل" ? errors.length : categoryCount(cat);
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  filterCat === cat
                    ? "bg-[var(--gold)] text-[var(--bg)]"
                    : "glass text-[var(--text-dim)]"
                }`}
              >
                {cat} {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject filter */}
      <div className="px-5 mb-4">
        <div className="flex gap-2">
          {(["الكل", ...SUBJECTS] as (SubjectId | "الكل")[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSubject(s)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition ${
                filterSubject === s ? "text-white" : "glass text-[var(--text-muted)]"
              }`}
              style={
                filterSubject === s
                  ? { background: s === "الكل" ? "#64748B" : SUBJECT_COLORS[s as SubjectId] }
                  : {}
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Errors list */}
      <div className="px-5 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <p className="text-4xl mb-3">🔒</p>
            <p className="text-sm">الخزنة فارغة — هذا جيد!</p>
          </div>
        )}

        {filtered.map((error) => {
          const color = SUBJECT_COLORS[error.subject];
          const isExpanded = expandedId === error.id;
          const daysAgo = Math.round((Date.now() - error.createdAt) / 86400000);

          return (
            <div
              key={error.id}
              className="glass rounded-2xl overflow-hidden transition"
              style={{ borderColor: color + "22" }}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : error.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] leading-relaxed">{error.question}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: color + "22", color }}
                      >
                        {error.subject}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full glass text-[var(--text-muted)]">
                        {error.category}
                      </span>
                      {error.reviewCount > 0 && (
                        <span className="text-[10px] text-[var(--success)]">✓ {error.reviewCount}×</span>
                      )}
                      <span className="text-[10px] text-[var(--text-muted)] mr-auto">
                        {daysAgo === 0 ? "اليوم" : `قبل ${daysAgo} يوم`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[var(--text-muted)] text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
                  {error.note && (
                    <div className="glass rounded-xl p-3">
                      <p className="text-[10px] text-[var(--text-muted)] mb-1">ملاحظتي:</p>
                      <p className="text-xs text-[var(--text-dim)]">{error.note}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => markReviewed(error.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition"
                      style={{ background: color }}
                    >
                      راجعته ✓
                    </button>
                    <button
                      onClick={() => deleteError(error.id)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--danger)] glass border border-[var(--danger)]/20"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add button */}
      {!atLimit && (
        <div className="px-5 pt-4 pb-2">
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-3 rounded-2xl font-bold text-sm text-[var(--text)] glass border border-dashed border-[var(--border)] hover:border-[var(--gold)]/50 transition"
            >
              + إضافة خطأ يدوي
            </button>
          ) : (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="font-bold text-sm text-[var(--gold)]">خطأ جديد في الخزنة</p>

              <textarea
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                placeholder="السؤال أو المفهوم الذي أخطأت فيه..."
                className="w-full bg-transparent border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--gold)]/50"
                rows={3}
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value as SubjectId)}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] focus:outline-none"
                >
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] focus:outline-none"
                >
                  {ERROR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="ملاحظة (اختياري): ليش غلطت؟"
                className="w-full bg-transparent border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)]/50"
              />

              <div className="flex gap-2">
                <button
                  onClick={addError}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[var(--bg)]"
                  style={{ background: "#F59E0B" }}
                >
                  أضف للخزنة
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] glass"
                >
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
