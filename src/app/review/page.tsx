"use client";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { sm2, nextReviewText } from "@/lib/sm2";
import type { ReviewCard, SubjectId, SM2Grade } from "@/lib/types";

const DEMO_CARDS: ReviewCard[] = [
  {
    id: "1",
    question: "ما قانون نيوتن الثاني للحركة؟",
    answer: "F = ma  (القوة = الكتلة × التسارع)",
    subject: "فيزياء",
    interval: 1, repetitions: 0, easeFactor: 2.5,
    dueDate: Date.now() - 100, createdAt: Date.now() - 86400000,
  },
  {
    id: "2",
    question: "ما تعريف التفاعل الكيميائي الطارد للحرارة؟",
    answer: "تفاعل يُطلق طاقة حرارية للبيئة المحيطة (ΔH سالب)",
    subject: "كيمياء",
    interval: 3, repetitions: 2, easeFactor: 2.3,
    dueDate: Date.now() - 500, createdAt: Date.now() - 172800000,
  },
  {
    id: "3",
    question: "ما الفرق بين الانقسام المتساوي والاختزالي؟",
    answer: "المتساوي: خليتان بنفس العدد الكروموسومي. الاختزالي: 4 خلايا بنصف العدد (التكاثر الجنسي).",
    subject: "أحياء",
    interval: 6, repetitions: 3, easeFactor: 2.7,
    dueDate: Date.now() + 86400000, createdAt: Date.now() - 259200000,
  },
  {
    id: "4",
    question: "ما قاعدة الجمع في حساب الاحتمالات؟",
    answer: "P(A ∪ B) = P(A) + P(B) - P(A ∩ B)",
    subject: "رياضيات",
    interval: 1, repetitions: 1, easeFactor: 2.1,
    dueDate: Date.now() - 200, createdAt: Date.now() - 345600000,
  },
];

const SUBJECT_COLORS: Record<SubjectId, string> = {
  فيزياء: "#2563EB",
  رياضيات: "#8B5CF6",
  كيمياء: "#10B981",
  أحياء: "#F59E0B",
};

const GRADE_COLORS = ["#EF4444", "#EF4444", "#F59E0B", "#F59E0B", "#10B981", "#10B981"];
const GRADE_LABELS = ["ما أعرف", "غلط", "صعب", "متوسط", "سهل", "سهل جداً"];

type Mode = "list" | "session";

export default function ReviewPage() {
  const [cards, setCards] = useState<ReviewCard[]>(DEMO_CARDS);
  const [mode, setMode] = useState<Mode>("list");
  const [sessionCards, setSessionCards] = useState<ReviewCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const dueCards = cards.filter((c) => c.dueDate <= Date.now());
  const upcomingCards = cards.filter((c) => c.dueDate > Date.now());

  const startSession = () => {
    const due = cards.filter((c) => c.dueDate <= Date.now());
    if (due.length === 0) return;
    setSessionCards(due);
    setCurrentIdx(0);
    setShowAnswer(false);
    setSessionDone(false);
    setReviewed(0);
    setMode("session");
  };

  const gradeCard = (grade: SM2Grade) => {
    const card = sessionCards[currentIdx];
    const result = sm2(card, grade);
    setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, ...result } : c));
    setReviewed((p) => p + 1);
    if (currentIdx + 1 >= sessionCards.length) {
      setSessionDone(true);
    } else {
      setCurrentIdx((p) => p + 1);
      setShowAnswer(false);
    }
  };

  /* ── Session view ── */
  if (mode === "session") {
    if (sessionDone) {
      return (
        <div className="min-h-dvh bg-[var(--bg)] flex flex-col items-center justify-center px-6 pb-nav">
          <div className="text-center">
            <p className="text-6xl mb-6">🎉</p>
            <h2 className="font-black text-3xl text-[var(--text)] mb-3">الجلسة منتهية!</h2>
            <p className="text-lg text-[var(--text-muted)] mb-2">راجعت {reviewed} بطاقة</p>
            <p className="text-base text-[var(--success)] mb-10">المراجعة القادمة محسوبة تلقائياً</p>
            <button
              onClick={() => setMode("list")}
              className="w-full max-w-xs py-5 rounded-2xl font-black text-white text-lg"
              style={{ background: "#2563EB" }}
            >
              العودة للقائمة
            </button>
          </div>
          <BottomNav />
        </div>
      );
    }

    const card = sessionCards[currentIdx];
    const color = SUBJECT_COLORS[card.subject];

    return (
      <div className="min-h-dvh bg-[var(--bg)] flex flex-col pb-nav">
        <div className="page-header">
          <button onClick={() => setMode("list")} className="text-base text-[var(--text-muted)] font-semibold">
            ← خروج
          </button>
          <span className="text-base font-bold text-[var(--text)]">
            {currentIdx + 1} / {sessionCards.length}
          </span>
          <span className="text-sm text-[var(--success)] font-bold">{reviewed} مراجَع</span>
        </div>

        <div className="px-5 mb-6">
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: (currentIdx / sessionCards.length) * 100 + "%", background: color }}
            />
          </div>
        </div>

        <div className="flex-1 px-5 flex flex-col">
          <div
            className="rounded-3xl p-7 mb-5 flex-1 flex flex-col justify-center"
            style={{ background: "var(--surface)", border: `2px solid ${color}33` }}
          >
            <span
              className="text-sm px-3 py-1.5 rounded-full font-bold self-start mb-5"
              style={{ background: color + "22", color }}
            >
              {card.subject}
            </span>
            <p className="text-lg font-bold text-[var(--text)] leading-relaxed mb-8">{card.question}</p>

            {showAnswer ? (
              <div className="border-t border-[var(--border)] pt-5">
                <p className="text-sm text-[var(--text-muted)] mb-3">الإجابة:</p>
                <p className="text-base text-[var(--text-dim)] leading-relaxed">{card.answer}</p>
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-4 rounded-2xl font-black text-base text-white"
                style={{ background: color }}
              >
                اظهر الإجابة
              </button>
            )}
          </div>

          {showAnswer && (
            <div className="mb-5">
              <p className="text-sm text-center text-[var(--text-muted)] mb-3">كيف كانت؟</p>
              <div className="grid grid-cols-2 gap-3">
                {[0, 2, 3, 4].map((g) => (
                  <button
                    key={g}
                    onClick={() => gradeCard(g as SM2Grade)}
                    className="py-4 rounded-2xl font-black text-base transition active:scale-95"
                    style={{
                      background: GRADE_COLORS[g] + "22",
                      border: `1.5px solid ${GRADE_COLORS[g]}44`,
                      color: GRADE_COLORS[g],
                    }}
                  >
                    {GRADE_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    );
  }

  /* ── List view ── */
  return (
    <div className="min-h-dvh bg-[var(--bg)] pb-nav">
      <div className="page-header">
        <h1 className="font-black text-xl text-[var(--text)]">بنك المراجعة 🧠</h1>
        <span className="text-sm text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-xl font-bold">SM-2</span>
      </div>

      {/* Stats */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: dueCards.length,      label: "مستحق الآن", color: "var(--danger)"  },
            { val: upcomingCards.length, label: "قادم",        color: "var(--gold)"   },
            { val: cards.length,         label: "الإجمالي",    color: "var(--success)" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="font-mono-nums font-black text-4xl" style={{ color: s.color }}>{s.val}</p>
              <p className="text-sm text-[var(--text-muted)] mt-2 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Start */}
      {dueCards.length > 0 && (
        <div className="px-5 mb-6">
          <button
            onClick={startSession}
            className="w-full py-5 rounded-2xl font-black text-white text-xl transition glow-blue"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #2563EB)" }}
          >
            ابدأ المراجعة ({dueCards.length} بطاقة)
          </button>
        </div>
      )}

      {/* Due cards */}
      {dueCards.length > 0 && (
        <div className="px-5 mb-6">
          <h3 className="font-black text-lg text-[var(--text)] mb-4">مستحقة الآن</h3>
          <div className="flex flex-col gap-4">
            {dueCards.map((card) => {
              const color = SUBJECT_COLORS[card.subject];
              return (
                <div key={card.id} className="rounded-2xl p-5"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#EF4444" }} />
                    <span className="text-sm font-black" style={{ color }}>{card.subject}</span>
                    <span className="text-sm font-bold text-[var(--danger)] mr-auto">الآن</span>
                  </div>
                  <p className="text-base font-semibold text-[var(--text)] leading-relaxed">{card.question}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingCards.length > 0 && (
        <div className="px-5 mb-6">
          <h3 className="font-black text-lg text-[var(--text-dim)] mb-4">قادم</h3>
          <div className="flex flex-col gap-4">
            {upcomingCards.map((card) => {
              const color = SUBJECT_COLORS[card.subject];
              return (
                <div key={card.id} className="rounded-2xl p-5 opacity-60"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-sm font-black" style={{ color }}>{card.subject}</span>
                    <span className="text-sm text-[var(--text-muted)] mr-auto">{nextReviewText(card.dueDate)}</span>
                  </div>
                  <p className="text-base font-semibold text-[var(--text)] leading-relaxed">{card.question}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dueCards.length === 0 && (
        <div className="text-center py-16 px-6">
          <p className="text-5xl mb-5">✅</p>
          <p className="text-xl font-black text-[var(--success)] mb-2">أحسنت! لا مراجعات مستحقة</p>
          <p className="text-base text-[var(--text-muted)]">{upcomingCards.length} بطاقة قادمة لاحقاً</p>
        </div>
      )}

      {/* Info — في الأسفل */}
      <div className="px-5 pb-6">
        <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(37,99,235,0.03))", border: "1px solid rgba(37,99,235,0.2)" }}>
          <p className="text-sm text-[var(--text-dim)] leading-relaxed">
            📊 <strong className="text-[var(--text)]">Ebbinghaus 1885:</strong> نسيان 80% خلال 24 ساعة بدون مراجعة.
            المراجعة الموزعة = تفوق 200% على المذاكرة التقليدية.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
