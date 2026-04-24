"use client";
import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

const ARENA_QUESTIONS = [
  { q: "ما قانون نيوتن الأول؟", a: "القصور الذاتي: جسم ساكن يبقى ساكناً ومتحرك يبقى متحركاً ما لم تؤثر عليه قوة", subject: "فيزياء" },
  { q: "ما ناتج: log₂(8) ؟", a: "3", subject: "رياضيات" },
  { q: "ما رمز الكالسيوم في الجدول الدوري؟", a: "Ca", subject: "كيمياء" },
  { q: "ما العضو المسؤول عن تنقية الدم في الجسم؟", a: "الكلى", subject: "أحياء" },
];

type GameState = "lobby" | "playing" | "result";

export default function ArenaPage() {
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [currentQ, setCurrentQ] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opScore, setOpScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  const startGame = () => {
    setGameState("playing");
    setCurrentQ(0);
    setMyScore(0);
    setOpScore(0);
  };

  const answer = (correct: boolean) => {
    if (answered) return;
    setAnswered(true);
    if (correct) setMyScore((p) => p + 1);
    else setOpScore((p) => p + Math.random() > 0.5 ? 1 : 0);

    setTimeout(() => {
      if (currentQ + 1 >= ARENA_QUESTIONS.length) {
        setGameState("result");
      } else {
        setCurrentQ((p) => p + 1);
        setAnswered(false);
        setTimeLeft(15);
      }
    }, 1000);
  };

  const q = ARENA_QUESTIONS[currentQ];

  if (gameState === "lobby") {
    return (
      <div className="min-h-dvh bg-[var(--bg)] flex flex-col pb-nav">
        <div className="px-5 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-[var(--text-muted)]">← الرئيسية</Link>
          <h1 className="font-black text-[var(--text)]">الأرينا ⚔️</h1>
          <span className="text-xs text-[var(--gold)]">1v1</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div
            className="w-28 h-28 rounded-3xl flex items-center justify-center text-5xl mb-6"
            style={{ background: "rgba(245,158,11,0.1)", border: "2px solid rgba(245,158,11,0.3)" }}
          >
            ⚔️
          </div>
          <h2 className="font-black text-2xl text-[var(--text)] mb-2">تحدي 1v1</h2>
          <p className="text-sm text-[var(--text-muted)] text-center mb-8 max-w-xs">
            تنافس مع طالب آخر في أسئلة سريعة. الفائز يكسب Silver.
            المنافسة بالشرف — لا مراهنة.
          </p>

          {/* Leaderboard preview */}
          <div className="glass rounded-2xl p-4 w-full max-w-xs mb-6">
            <p className="text-xs text-[var(--text-muted)] mb-3 text-center">المتصدرون اليوم</p>
            {[
              { name: "الصقر ع.", region: "بقيق", score: 850 },
              { name: "الهدهد ر.", region: "الدمام", score: 720 },
              { name: "أنت", region: "—", score: 340, me: true },
            ].map((p, i) => (
              <div key={p.name} className={`flex items-center gap-3 py-2 ${p.me ? "opacity-60" : ""}`}>
                <span className="text-sm font-mono-nums text-[var(--text-muted)]">#{i + 1}</span>
                <span className="flex-1 text-xs text-[var(--text)]">{p.name}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{p.region}</span>
                <span className="font-mono-nums text-xs text-[var(--gold)]">{p.score} 🪙</span>
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            className="w-full max-w-xs py-4 rounded-2xl font-black text-[var(--bg)] text-lg glow-gold transition"
            style={{ background: "#F59E0B" }}
          >
            ابحث عن منافس
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  if (gameState === "result") {
    const won = myScore > opScore;
    return (
      <div className="min-h-dvh bg-[var(--bg)] flex flex-col items-center justify-center px-5 pb-nav">
        <div className="text-center">
          <p className="text-6xl mb-4">{won ? "🏆" : "💪"}</p>
          <h2 className="font-black text-2xl text-[var(--text)] mb-2">
            {won ? "فزت!" : "المرة القادمة!"}
          </h2>
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="font-mono-nums text-3xl font-black text-[var(--blue-light)]">{myScore}</p>
              <p className="text-xs text-[var(--text-muted)]">أنت</p>
            </div>
            <div className="text-center">
              <p className="font-mono-nums text-3xl font-black text-[var(--danger)]">{opScore}</p>
              <p className="text-xs text-[var(--text-muted)]">المنافس</p>
            </div>
          </div>
          {won && <p className="text-sm text-[var(--gold)] mb-6">+{myScore * 5} Silver 🪙</p>}
          <div className="space-y-2 max-w-xs w-full">
            <button onClick={startGame} className="w-full py-3 rounded-2xl font-bold text-[var(--bg)]" style={{ background: "#F59E0B" }}>
              تحدي آخر
            </button>
            <button onClick={() => setGameState("lobby")} className="w-full py-2 text-sm text-[var(--text-muted)]">
              العودة للأرينا
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--bg)] flex flex-col pb-nav">
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🦅</span>
          <span className="font-mono-nums text-xl font-black text-[var(--blue-light)]">{myScore}</span>
        </div>
        <span className="font-mono-nums font-black text-[var(--text)]">
          {currentQ + 1} / {ARENA_QUESTIONS.length}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono-nums text-xl font-black text-[var(--danger)]">{opScore}</span>
          <span className="text-lg">👤</span>
        </div>
      </div>

      <div className="px-5 flex-1 flex flex-col justify-center">
        <div className="glass rounded-3xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs px-2 py-1 rounded-full glass text-[var(--blue-light)]">{q.subject}</span>
            <span className="font-mono-nums font-black text-lg text-[var(--gold)]">{timeLeft}s</span>
          </div>
          <p className="text-base font-bold text-[var(--text)] leading-relaxed">{q.q}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => answer(true)}
            disabled={answered}
            className="py-4 rounded-2xl font-bold text-sm glass text-[var(--text)] transition active:scale-95 disabled:opacity-50"
          >
            ✓ صح
          </button>
          <button
            onClick={() => answer(false)}
            disabled={answered}
            className="py-4 rounded-2xl font-bold text-sm glass text-[var(--text)] transition active:scale-95 disabled:opacity-50"
          >
            ✕ خطأ
          </button>
        </div>

        {answered && (
          <div className="mt-4 glass rounded-2xl p-3 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">الإجابة الصحيحة:</p>
            <p className="text-sm font-bold text-[var(--success)]">{q.a}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
