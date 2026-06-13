"use client";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import Confetti from "@/components/Confetti";
import { sm2, nextReviewText } from "@/lib/sm2";
import { getTrack, subjectColor, type Track } from "@/lib/tracks";
import { loadUser, loadList, saveList } from "@/lib/storage";
import type { ReviewCard, SM2Grade } from "@/lib/types";

const CARDS_KEY = "darb_cards";

const GRADE_COLORS = ["#EF4444", "#EF4444", "#F59E0B", "#F59E0B", "#10B981", "#10B981"];
const GRADE_LABELS = ["ما أعرف", "غلط", "صعب", "متوسط", "سهل", "سهل جداً"];

type Mode = "list" | "session";

export default function ReviewPage() {
  const [track, setTrack] = useState<Track | null>(null);
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [sessionCards, setSessionCards] = useState<ReviewCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  /* إضافة بطاقة */
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    const t = getTrack(loadUser()?.track);
    setTrack(t);
    setNewSubject(t.subjects[0]?.name ?? "");
    setCards(loadList<ReviewCard>(CARDS_KEY));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveList(CARDS_KEY, cards);
  }, [cards, loaded]);

  const colorOf = (subj: string) => (track ? subjectColor(track, subj) : "var(--accent)");
  const subjects = track?.subjects.map((s) => s.name) ?? [];

  const dueCards = cards.filter((c) => c.dueDate <= Date.now());
  const upcomingCards = cards.filter((c) => c.dueDate > Date.now());

  const addCard = () => {
    if (!newQ.trim() || !newA.trim()) return;
    setCards((p) => [{
      id: Date.now().toString(),
      question: newQ.trim(), answer: newA.trim(), subject: newSubject,
      interval: 1, repetitions: 0, easeFactor: 2.5,
      dueDate: Date.now(), createdAt: Date.now(),
    }, ...p]);
    setNewQ(""); setNewA(""); setShowAdd(false);
  };

  const startSession = () => {
    const due = cards.filter((c) => c.dueDate <= Date.now());
    if (due.length === 0) return;
    setSessionCards(due);
    setCurrentIdx(0);
    setShowAnswer(false);
    setSessionDone(false);
    setReviewed(0);
    setCorrectCount(0);
    setMode("session");
  };

  const gradeCard = (grade: SM2Grade) => {
    const card = sessionCards[currentIdx];
    const result = sm2(card, grade);
    setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, ...result } : c));
    setReviewed((p) => p + 1);
    if (grade >= 3) setCorrectCount((p) => p + 1);
    if (currentIdx + 1 >= sessionCards.length) {
      setSessionDone(true);
    } else {
      setCurrentIdx((p) => p + 1);
      setShowAnswer(false);
    }
  };

  /* ── عرض الجلسة ── */
  if (mode === "session") {
    if (sessionDone) {
      const accuracy = reviewed > 0 ? Math.round((correctCount / reviewed) * 100) : 0;
      const great = accuracy >= 80;
      const circumference = 2 * Math.PI * 36;
      const dash = (accuracy / 100) * circumference;
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center px-6 pb-nav relative z-[1]">
          {great && <Confetti count={24} />}
          <div className="text-center">
            {/* دائرة الدقة */}
            <div className="relative inline-flex mb-5">
              <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                <circle cx="48" cy="48" r="36" fill="none" stroke="var(--border)" strokeWidth="7" />
                <circle cx="48" cy="48" r="36" fill="none"
                  stroke={great ? "#10B981" : accuracy >= 50 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  style={{ transition: "stroke-dasharray 1s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono-nums font-black text-2xl text-[var(--text)]">{accuracy}%</span>
              </span>
            </div>
            <h2 className="font-black text-3xl text-[var(--text)] mb-2">
              {great ? "ممتاز!" : accuracy >= 50 ? "كويس!" : "تحتاج تراجع أكثر"}
            </h2>
            <p className="text-base text-[var(--text-muted)] mb-1">
              {correctCount} صح من {reviewed} بطاقة
            </p>
            <p className="text-sm text-[var(--success)] mb-10">المراجعة القادمة محسوبة تلقائياً</p>
            <button
              onClick={() => setMode("list")}
              className="w-full max-w-xs py-5 rounded-2xl font-black text-lg min-h-[60px] glow-blue"
              style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}
            >
              العودة للقائمة
            </button>
          </div>
          <BottomNav />
        </div>
      );
    }

    const card = sessionCards[currentIdx];
    const color = colorOf(card.subject);

    return (
      <div className="min-h-dvh flex flex-col pb-nav relative z-[1]">
        <div className="page-header">
          <button onClick={() => setMode("list")} className="text-base text-[var(--text-muted)] font-semibold min-h-[44px]">
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
                className="w-full py-4 rounded-2xl font-black text-base min-h-[56px]"
                style={{ background: "transparent", border: `1.5px solid ${color}`, color: color }}
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
                    className="py-4 rounded-2xl font-black text-base transition active:scale-95 min-h-[58px]"
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

  /* ── عرض القائمة ── */
  return (
    <div className="min-h-dvh pb-nav relative z-[1]">
      <PageGuide pageKey="review" steps={[
        { title: "بنك المراجعة", desc: "هنا تحفظ المعلومات اللي تبي ترسخ — قوانين، تعاريف، معادلات — على شكل بطاقات سؤال وجواب." },
        { title: "النظام يحسب عنك", desc: "نستخدم خوارزمية SM-2 العلمية: كل ما قيّمت بطاقة (سهلة أو صعبة)، النظام يحدد متى تراجعها المرة الجاية بالضبط." },
        { title: "راجع المستحق فقط", desc: "ما تحتاج تراجع كل شيء كل يوم — بس البطاقات اللي عليها علامة (مستحق الآن). خمس دقائق يومياً تكفي." },
      ]} />
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg" style={{ color: "var(--text)" }}>بنك المراجعة</h1>
          <span className="dome-chip text-[17px] font-bold" style={{ color: "var(--text-dim)" }}>SM-2</span>
        </div>
      </Dome>
      <div className="h-5" />

      {/* الإحصاءات */}
      <div className="px-5 mb-6 rise rise-1">
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: dueCards.length,      label: "مستحق الآن", color: "var(--danger)" },
            { val: upcomingCards.length, label: "قادم",        color: "var(--gold)" },
            { val: cards.length,         label: "الإجمالي",    color: "var(--success)" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="font-mono-nums font-black text-4xl" style={{ color: s.color }}>{s.val}</p>
              <p className="text-sm text-[var(--text-muted)] mt-2 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* بدء المراجعة */}
      {dueCards.length > 0 && (
        <div className="px-5 mb-6 rise rise-2">
          <button
            onClick={startSession}
            className="w-full py-5 rounded-2xl font-black text-xl transition glow-blue min-h-[62px]"
            style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}
          >
            ابدأ المراجعة ({dueCards.length} بطاقة)
          </button>
        </div>
      )}

      {/* إضافة بطاقة */}
      <div className="px-5 mb-6 rise rise-3">
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)}
            className="w-full py-5 rounded-2xl text-lg font-bold text-[var(--text-dim)] transition min-h-[60px]"
            style={{ background: "var(--surface)", border: "1.5px dashed var(--border)" }}>
            + أضف بطاقة جديدة
          </button>
        ) : (
          <div className="rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1.5px solid color-mix(in srgb, var(--accent) 35%, transparent)" }}>
            <p className="font-bold text-base text-[var(--accent-light)]">بطاقة مراجعة جديدة</p>

            <textarea value={newQ} onChange={(e) => setNewQ(e.target.value)} rows={2}
              placeholder="السؤال..."
              className="w-full rounded-2xl px-4 py-3 text-base text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

            <textarea value={newA} onChange={(e) => setNewA(e.target.value)} rows={2}
              placeholder="الإجابة..."
              className="w-full rounded-2xl px-4 py-3 text-base text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

            <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
              className="rounded-2xl px-4 py-3.5 text-base text-[var(--text)] outline-none min-h-[52px]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              {subjects.map((s) => <option key={s}>{s}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={addCard}
                className="py-4 rounded-2xl font-bold text-base transition min-h-[54px] glow-blue"
                style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                أضف البطاقة
              </button>
              <button onClick={() => setShowAdd(false)}
                className="py-4 rounded-2xl text-base font-medium text-[var(--text-muted)] transition min-h-[54px]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

      {/* مستحقة الآن */}
      {dueCards.length > 0 && (
        <div className="px-5 mb-6 rise rise-4">
          <h3 className="font-black text-lg text-[var(--text)] mb-4">مستحقة الآن</h3>
          <div className="flex flex-col gap-4">
            {dueCards.map((card) => {
              const color = colorOf(card.subject);
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

      {/* قادم */}
      {upcomingCards.length > 0 && (
        <div className="px-5 mb-6 rise rise-5">
          <h3 className="font-black text-lg text-[var(--text-dim)] mb-4">قادم</h3>
          <div className="flex flex-col gap-4">
            {upcomingCards.map((card) => {
              const color = colorOf(card.subject);
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

      {loaded && cards.length === 0 && (
        <div className="text-center py-12 px-6">
          <p className="text-xl font-black text-[var(--text)] mb-2">بنك المراجعة فاضي</p>
          <p className="text-base text-[var(--text-muted)]">أضف أول بطاقة، والنظام يحسب لك متى تراجعها تلقائياً.</p>
        </div>
      )}

      {loaded && cards.length > 0 && dueCards.length === 0 && (
        <div className="text-center py-10 px-6">
          <p className="text-xl font-black text-[var(--success)] mb-2">أحسنت! لا مراجعات مستحقة</p>
          <p className="text-base text-[var(--text-muted)]">{upcomingCards.length} بطاقة قادمة لاحقاً</p>
        </div>
      )}

      {/* معلومة */}
      <div className="px-5 pb-6">
        <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 3%, transparent)), var(--surface)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
          <p className="text-sm text-[var(--text-dim)] leading-relaxed">
            <strong className="text-[var(--text)]">Ebbinghaus 1885:</strong> نسيان 80% خلال 24 ساعة بدون مراجعة.
            المراجعة الموزعة = تفوق 200% على المذاكرة التقليدية.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
