"use client";
import { useState, useEffect, useMemo, startTransition } from "react";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { sm2, nextReviewText } from "@/lib/sm2";
import type { VaultError, SubjectId, SM2Grade, SM2Result } from "@/lib/types";

const VAULT_KEY  = "darb_vault";
const REVIEW_KEY = "darb_review";
const _NOW       = Date.now();

type SM2Store = Record<string, SM2Result>;

interface Card {
  id:          string;
  question:    string;
  note:        string;
  subject:     SubjectId;
  interval:    number;
  repetitions: number;
  easeFactor:  number;
  dueDate:     number;
  createdAt:   number;
}

const SUBJECT_COLORS: Record<SubjectId, string> = {
  فيزياء:  "#3B82F6",
  رياضيات: "#8B5CF6",
  كيمياء:  "#10B981",
  أحياء:   "#F59E0B",
};

const GRADE_COLORS = ["#EF4444", "#EF4444", "#F59E0B", "#F59E0B", "#10B981", "#10B981"];
const GRADE_LABELS = ["ما أعرف", "غلط", "صعب", "متوسط", "سهل", "سهل جداً"];

type Mode = "list" | "session";

function buildCards(errors: VaultError[], sm2Store: SM2Store): Card[] {
  return errors.map((e) => {
    const saved = sm2Store[e.id];
    return {
      id:          e.id,
      question:    e.question,
      note:        e.note,
      subject:     e.subject,
      interval:    saved?.interval    ?? 1,
      repetitions: saved?.repetitions ?? 0,
      easeFactor:  saved?.easeFactor  ?? 2.5,
      dueDate:     saved?.dueDate     ?? e.createdAt,
      createdAt:   e.createdAt,
    };
  });
}

export default function ReviewPage() {
  const [cards, setCards]               = useState<Card[]>([]);
  const [sm2Store, setSm2Store]         = useState<SM2Store>({});
  const [hydrated, setHydrated]         = useState(false);
  const [mode, setMode]                 = useState<Mode>("list");
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [showAnswer, setShowAnswer]     = useState(false);
  const [sessionDone, setSessionDone]   = useState(false);
  const [reviewed, setReviewed]         = useState(0);

  useEffect(() => {
    try {
      const errors: VaultError[] = JSON.parse(localStorage.getItem(VAULT_KEY) ?? "[]");
      const store: SM2Store      = JSON.parse(localStorage.getItem(REVIEW_KEY) ?? "{}");
      startTransition(() => {
        setSm2Store(store);
        setCards(buildCards(errors, store));
        setHydrated(true);
      });
    } catch {}
  }, []);

  const persistSm2 = (store: SM2Store) => {
    setSm2Store(store);
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(store)); } catch {}
  };

  const dueCards      = useMemo(() => cards.filter((c) => c.dueDate <= _NOW), [cards]);
  const upcomingCards = useMemo(() => cards.filter((c) => c.dueDate >  _NOW), [cards]);

  const startSession = () => {
    const due = cards.filter((c) => c.dueDate <= Date.now());
    if (!due.length) return;
    setSessionCards(due);
    setCurrentIdx(0);
    setShowAnswer(false);
    setSessionDone(false);
    setReviewed(0);
    setMode("session");
  };

  const gradeCard = (grade: SM2Grade) => {
    const card   = sessionCards[currentIdx];
    const result = sm2(card, grade);
    const newStore = { ...sm2Store, [card.id]: result };
    persistSm2(newStore);
    try {
      const errors: VaultError[] = JSON.parse(localStorage.getItem(VAULT_KEY) ?? "[]");
      setCards(buildCards(errors, newStore));
    } catch {}
    setReviewed((p) => p + 1);
    if (currentIdx + 1 >= sessionCards.length) {
      setSessionDone(true);
    } else {
      setCurrentIdx((p) => p + 1);
      setShowAnswer(false);
    }
  };

  /* ── Session done ── */
  if (mode === "session" && sessionDone) {
    return (
      <div className="min-h-dvh bg-[var(--bg)] flex flex-col items-center justify-center px-6"
        style={{ paddingBottom: "calc(var(--nav-h) + 24px)" }}>
        <div className="text-center anim-1">
          <p className="text-6xl mb-5">🎉</p>
          <h2 className="font-black text-3xl text-white mb-2">الجلسة منتهية</h2>
          <p className="text-base mb-1" style={{ color: "var(--text-muted)" }}>
            راجعت{" "}
            <span className="font-bold" style={{ color: "var(--success)" }}>{reviewed}</span>
            {" "}بطاقة
          </p>
          <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
            المراجعة القادمة محسوبة تلقائياً
          </p>
          <button onClick={() => setMode("list")} className="btn-primary"
            style={{ maxWidth: "280px", margin: "0 auto" }}>
            العودة للقائمة
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ── Session card ── */
  if (mode === "session") {
    const card  = sessionCards[currentIdx];
    const color = SUBJECT_COLORS[card.subject];
    return (
      <div className="min-h-dvh bg-[var(--bg)] flex flex-col"
        style={{ paddingBottom: "calc(var(--nav-h) + 16px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-3">
          <button onClick={() => setMode("list")}
            className="text-sm font-bold px-3 py-1.5 rounded-xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            ← خروج
          </button>
          <span className="font-mono-nums font-bold text-base text-white">
            {currentIdx + 1} / {sessionCards.length}
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--success)" }}>{reviewed} ✓</span>
        </div>

        {/* Progress bar */}
        <div className="px-5 mb-4">
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: (currentIdx / sessionCards.length) * 100 + "%", background: color }} />
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 px-5 flex flex-col">
          <div className="rounded-2xl p-6 mb-4 flex-1 flex flex-col justify-center"
            style={{ background: "var(--surface)", border: `1px solid ${color}22` }}>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full self-start mb-4"
              style={{ background: color + "16", color }}>
              {card.subject}
            </span>
            <p className="text-base font-bold text-white leading-relaxed mb-6">{card.question}</p>

            {showAnswer ? (
              <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>ملاحظتي:</p>
                {card.note ? (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>{card.note}</p>
                ) : (
                  <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                    لا توجد ملاحظة — قيّم حسب ذاكرتك
                  </p>
                )}
              </div>
            ) : (
              <button onClick={() => setShowAnswer(true)}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white"
                style={{ background: color }}>
                اظهر ملاحظتي
              </button>
            )}
          </div>

          {showAnswer && (
            <div className="mb-4">
              <p className="text-xs text-center mb-3" style={{ color: "var(--text-muted)" }}>كيف كانت؟</p>
              <div className="grid grid-cols-2 gap-2">
                {[0, 2, 3, 4].map((g) => (
                  <button key={g}
                    onClick={() => gradeCard(g as SM2Grade)}
                    className="py-3.5 rounded-xl font-black text-sm transition active:scale-95"
                    style={{
                      background: GRADE_COLORS[g] + "14",
                      border: `1px solid ${GRADE_COLORS[g]}30`,
                      color: GRADE_COLORS[g],
                    }}>
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
  if (!hydrated) return null;

  if (cards.length === 0) {
    return (
      <div className="min-h-dvh bg-[var(--bg)] flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingBottom: "calc(var(--nav-h) + 24px)" }}>
        <p className="text-5xl mb-4">🧠</p>
        <h2 className="font-black text-2xl text-white mb-2">بنك المراجعة فارغ</h2>
        <p className="text-sm mb-8 max-w-xs" style={{ color: "var(--text-muted)" }}>
          أضف أسئلة في الخزنة وستظهر هنا للمراجعة بنظام SM-2
        </p>
        <Link href="/vault" className="btn-gold" style={{ maxWidth: "240px" }}>
          اذهب للخزنة
        </Link>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page">

      {/* Header */}
      <div className="anim-1 flex items-center justify-between px-5 pt-12 pb-5">
        <div>
          <h1 className="font-black text-xl text-white">مراجعة</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Spaced Repetition · SM-2</p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          SM-2
        </span>
      </div>

      {/* Stats bar */}
      <div className="anim-2 px-5 mb-5">
        <div className="grid grid-cols-3 overflow-hidden rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {[
            { val: dueCards.length,      label: "مستحق",    color: "var(--danger)"  },
            { val: upcomingCards.length, label: "قادم",      color: "var(--gold)"    },
            { val: cards.length,         label: "الإجمالي",  color: "var(--success)" },
          ].map((s, i) => (
            <div key={s.label} className="flex flex-col items-center py-4"
              style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p className="font-mono-nums font-black text-2xl leading-none" style={{ color: s.color }}>{s.val}</p>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Start CTA */}
      {dueCards.length > 0 && (
        <div className="anim-3 px-5 mb-6">
          <button onClick={startSession} className="btn-primary">
            ابدأ المراجعة · {dueCards.length} بطاقة
          </button>
        </div>
      )}

      {/* Due cards list */}
      {dueCards.length > 0 && (
        <div className="px-5 mb-5 anim-3">
          <p className="font-bold text-sm text-white mb-3">مستحقة الآن</p>
          <div className="flex flex-col gap-3">
            {dueCards.map((card) => {
              const color = SUBJECT_COLORS[card.subject];
              return (
                <div key={card.id} className="rounded-xl p-4"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRight: `3px solid ${color}`,
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: "var(--danger)" }} />
                    <span className="text-xs font-bold" style={{ color }}>{card.subject}</span>
                    <span className="text-xs font-bold mr-auto" style={{ color: "var(--danger)" }}>الآن</span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">{card.question}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming cards list */}
      {upcomingCards.length > 0 && (
        <div className="px-5 mb-5 anim-4">
          <p className="font-bold text-sm mb-3" style={{ color: "var(--text-muted)" }}>قادم</p>
          <div className="flex flex-col gap-3">
            {upcomingCards.map((card) => {
              const color = SUBJECT_COLORS[card.subject];
              return (
                <div key={card.id} className="rounded-xl p-4 opacity-50"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-bold" style={{ color }}>{card.subject}</span>
                    <span className="text-xs mr-auto" style={{ color: "var(--text-muted)" }}>
                      {nextReviewText(card.dueDate)}
                    </span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">{card.question}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dueCards.length === 0 && (
        <div className="text-center py-12 px-6 anim-3">
          <p className="text-4xl mb-4">✅</p>
          <p className="font-black text-lg mb-1" style={{ color: "var(--success)" }}>
            أحسنت! لا مراجعات مستحقة
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {upcomingCards.length} بطاقة قادمة لاحقاً
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
