"use client";
import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { sm2, nextReviewText, gradeLabel } from "@/lib/sm2";
import type { ReviewCard, SubjectId, SM2Grade } from "@/lib/types";

const DEMO_CARDS: ReviewCard[] = [
  {
    id: "1",
    question: "ما قانون نيوتن الثاني للحركة؟",
    answer: "F = ma  (القوة = الكتلة × التسارع)",
    subject: "فيزياء",
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: Date.now() - 100,
    createdAt: Date.now() - 86400000,
  },
  {
    id: "2",
    question: "ما تعريف التفاعل الكيميائي الطارد للحرارة؟",
    answer: "تفاعل يُطلق طاقة حرارية للبيئة المحيطة (ΔH سالب)",
    subject: "كيمياء",
    interval: 3,
    repetitions: 2,
    easeFactor: 2.3,
    dueDate: Date.now() - 500,
    createdAt: Date.now() - 172800000,
  },
  {
    id: "3",
    question: "ما الفرق بين الانقسام المتساوي والاختزالي؟",
    answer: "المتساوي: خليتان بنفس العدد الكروموسومي. الاختزالي: 4 خلايا بنصف العدد (التكاثر الجنسي).",
    subject: "أحياء",
    interval: 6,
    repetitions: 3,
    easeFactor: 2.7,
    dueDate: Date.now() + 86400000,
    createdAt: Date.now() - 259200000,
  },
  {
    id: "4",
    question: "ما قاعدة الجمع في حساب الاحتمالات؟",
    answer: "P(A ∪ B) = P(A) + P(B) - P(A ∩ B)",
    subject: "رياضيات",
    interval: 1,
    repetitions: 1,
    easeFactor: 2.1,
    dueDate: Date.now() - 200,
    createdAt: Date.now() - 345600000,
  },
];

const SUBJECT_COLORS: Record<SubjectId, string> = {
  فيزياء: "#2563EB",
  رياضيات: "#8B5CF6",
  كيمياء: "#10B981",
  أحياء: "#F59E0B",
};

const GRADES: SM2Grade[] = [0, 1, 2, 3, 4, 5];
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
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, ...result } : c
      )
    );
    setReviewed((p) => p + 1);

    if (currentIdx + 1 >= sessionCards.length) {
      setSessionDone(true);
    } else {
      setCurrentIdx((p) => p + 1);
      setShowAnswer(false);
    }
  };

  if (mode === "session") {
    if (sessionDone) {
      return (
        <div className="min-h-dvh bg-[var(--bg)] flex flex-col items-center justify-center px-5 pb-nav">
          <div className="text-center">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="font-black text-2xl text-[var(--text)] mb-2">الجلسة منتهية!</h2>
            <p className="text-[var(--text-muted)] mb-2">راجعت {reviewed} بطاقة</p>
            <p className="text-sm text-[var(--success)] mb-8">المراجعة القادمة محسوبة تلقائياً</p>
            <button
              onClick={() => setMode("list")}
              className="w-full max-w-xs py-4 rounded-2xl font-bold text-white"
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
        <div className="px-5 py-4 flex items-center justify-between">
          <button onClick={() => setMode("list")} className="text-sm text-[var(--text-muted)]">
            ← خروج
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            {currentIdx + 1} / {sessionCards.length}
          </span>
          <span className="text-xs text-[var(--success)]">{reviewed} مراجَع</span>
        </div>

        {/* Progress bar */}
        <div className="px-5 mb-6">
          <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: (currentIdx / sessionCards.length) * 100 + "%", background: color }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 px-5 flex flex-col">
          <div
            className="glass rounded-3xl p-6 mb-4 flex-1 flex flex-col justify-center min-h-[200px]"
            style={{ borderColor: color + "33" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: color + "22", color }}
              >
                {card.subject}
              </span>
            </div>
            <p className="text-base font-bold text-[var(--text)] leading-relaxed mb-6">{card.question}</p>

            {showAnswer ? (
              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-xs text-[var(--text-muted)] mb-2">الإجابة:</p>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">{card.answer}</p>
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white"
                style={{ background: color }}
              >
                اظهر الإجابة
              </button>
            )}
          </div>

          {/* Grade buttons */}
          {showAnswer && (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-center text-[var(--text-muted)]">كيف كانت؟</p>
              <div className="grid grid-cols-3 gap-2">
                {[0, 2, 3, 4].map((g) => (
                  <button
                    key={g}
                    onClick={() => gradeCard(g as SM2Grade)}
                    className="py-3 rounded-2xl font-bold text-sm transition active:scale-95"
                    style={{
                      background: GRADE_COLORS[g] + "22",
                      border: `1px solid ${GRADE_COLORS[g]}44`,
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

  return (
    <div className="min-h-dvh bg-[var(--bg)] pb-nav">
      <div className="page-header">
        <h1 className="font-black text-lg text-[var(--text)]">بنك المراجعة 🧠</h1>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 rounded-xl">SM-2</span>
      </div>

      {/* Science card */}
      <div className="px-5 mb-4">
        <div
          className="rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(37,99,235,0.03))",
            border: "1px solid rgba(37,99,235,0.2)",
          }}
        >
          <p className="text-xs text-[var(--text-dim)] leading-relaxed">
            📊 <strong className="text-[var(--text)]">Ebbinghaus 1885:</strong> نسيان 80% خلال 24 ساعة بدون مراجعة.
            المراجعة الموزعة = تفوق 200% على المذاكرة التقليدية.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="glass rounded-2xl p-3 text-center">
            <p className="font-mono-nums font-black text-lg text-[var(--danger)]">{dueCards.length}</p>
            <p className="text-[10px] text-[var(--text-muted)]">مستحق الآن</p>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <p className="font-mono-nums font-black text-lg text-[var(--gold)]">{upcomingCards.length}</p>
            <p className="text-[10px] text-[var(--text-muted)]">قادم</p>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <p className="font-mono-nums font-black text-lg text-[var(--success)]">{cards.length}</p>
            <p className="text-[10px] text-[var(--text-muted)]">إجمالي</p>
          </div>
        </div>
      </div>

      {/* Start session */}
      {dueCards.length > 0 && (
        <div className="px-5 mb-4">
          <button
            onClick={startSession}
            className="w-full py-4 rounded-2xl font-black text-white text-base transition glow-blue"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #2563EB)" }}
          >
            ابدأ المراجعة ({dueCards.length} بطاقة)
          </button>
        </div>
      )}

      {/* Due cards */}
      {dueCards.length > 0 && (
        <div className="px-5 mb-4">
          <h3 className="font-bold text-sm text-[var(--text)] mb-3">مستحقة الآن</h3>
          <div className="space-y-2">
            {dueCards.map((card) => {
              const color = SUBJECT_COLORS[card.subject];
              return (
                <div key={card.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#EF4444" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text)] truncate">{card.question}</p>
                    <span className="text-[10px]" style={{ color }}>{card.subject}</span>
                  </div>
                  <span className="text-[10px] text-[var(--danger)]">الآن</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingCards.length > 0 && (
        <div className="px-5 mb-4">
          <h3 className="font-bold text-sm text-[var(--text-dim)] mb-3">قادم</h3>
          <div className="space-y-2">
            {upcomingCards.map((card) => {
              const color = SUBJECT_COLORS[card.subject];
              return (
                <div key={card.id} className="glass rounded-2xl p-3 flex items-center gap-3 opacity-60">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text)] truncate">{card.question}</p>
                    <span className="text-[10px]" style={{ color }}>{card.subject}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{nextReviewText(card.dueDate)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {dueCards.length === 0 && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm font-bold text-[var(--success)]">أحسنت! لا مراجعات مستحقة</p>
          <p className="text-xs mt-1 text-[var(--text-muted)]">راجع {upcomingCards.length} بطاقة قادمة لاحقاً</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
