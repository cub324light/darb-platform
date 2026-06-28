"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PageFooter from "@/components/PageFooter";
import Dome from "@/components/Dome";
import Confetti from "@/components/Confetti";
import RankBadge from "@/components/RankBadge";
import OnlineMatch from "@/components/arena/OnlineMatch";
import { fetchMyRank } from "@/lib/arena/client";
import { QUESTION_BANK } from "@/lib/arena/questions";
import { loadUser, addSilver } from "@/lib/storage";
import { getTrack } from "@/lib/tracks";

/* المنافس التدريبي: اسم + طير عشوائي، يجاوب بنفسه */
const BOT_NAMES = ["سعود", "نورة", "فهد", "ريم", "خالد", "لمى", "تركي", "العنود"];
const WIN_SILVER = 15;

type GameState = "lobby" | "playing" | "result";

export default function ArenaPage() {
  const [questions, setQuestions] = useState(() => {
    const u = typeof window !== "undefined" ? loadUser() : null;
    const track = getTrack(u?.track);
    return [...QUESTION_BANK[track.id]].sort(() => Math.random() - 0.5);
  });
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [currentQ, setCurrentQ] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opScore, setOpScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [bot, setBot] = useState({ name: "سعود" });
  const [botFlash, setBotFlash] = useState(false);
  const [myName] = useState(() => {
    const u = typeof window !== "undefined" ? loadUser() : null;
    return u?.name ?? "أنت";
  });
  const rewardedRef = useRef(false);

  /* مباراة 1v1 حقيقية عبر الإنترنت — مكوّن مستقل يدير البحث/اللعب/النتيجة */
  const [online, setOnline] = useState(false);
  /* رتبة اللاعب الحالية (تُعرض في اللوبي) */
  const [myRp, setMyRp] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMyRank().then((r) => { if (alive) setMyRp(r.rp); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const startGame = () => {
    setBot({ name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] });
    rewardedRef.current = false;
    const u = loadUser();
    const track = getTrack(u?.track);
    const qs = [...QUESTION_BANK[track.id]].sort(() => Math.random() - 0.5);
    setQuestions(qs);
    setGameState("playing");
    setCurrentQ(0);
    setMyScore(0);
    setOpScore(0);
    setAnswered(false);
    setSelectedOption(null);
    setTimeLeft(15);
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setGameState("result");
    } else {
      setCurrentQ((p) => p + 1);
      setAnswered(false);
      setSelectedOption(null);
      setTimeLeft(15);
    }
  };

  /* العداد الحقيقي: ينقص كل ثانية — الصفر = ضاع السؤال */
  useEffect(() => {
    if (gameState !== "playing" || answered) return;
    const goNext = () => {
      if (currentQ + 1 >= questions.length) {
        setGameState("result");
      } else {
        setCurrentQ((p) => p + 1);
        setAnswered(false);
        setSelectedOption(null);
        setTimeLeft(15);
      }
    };
    const t = setTimeout(() => {
      if (timeLeft <= 1) {
        setTimeLeft(0);
        setAnswered(true);
        setTimeout(goNext, 1400);
      } else {
        setTimeLeft((s) => s - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [gameState, answered, timeLeft, currentQ, questions.length]);

  /* المنافس يجاوب بنفسه: بعد 3-9 ثوان، يصيب 55% */
  useEffect(() => {
    if (gameState !== "playing" || answered) return;
    const delay = 3000 + Math.random() * 6000;
    const t = setTimeout(() => {
      if (Math.random() < 0.55) {
        setOpScore((p) => p + 1);
        setBotFlash(true);
        setTimeout(() => setBotFlash(false), 900);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [gameState, currentQ, answered]);

  /* مكافأة الفوز — مرة وحدة لكل مباراة */
  useEffect(() => {
    if (gameState === "result" && myScore > opScore && !rewardedRef.current) {
      rewardedRef.current = true;
      addSilver(WIN_SILVER);
    }
  }, [gameState, myScore, opScore]);

  const selectOption = (index: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedOption(index);
    if (index === q.correct) setMyScore((p) => p + 1);
    setTimeout(nextQuestion, 1600);
  };

  const q = questions[currentQ];

  /* مباراة 1v1 حقيقية — مكوّن مستقل داخل هيكل الأرينا */
  if (online) {
    const track = getTrack(loadUser()?.track).id;
    return (
      <div className="min-h-dvh flex flex-col pb-nav relative z-[1]">
        <Dome compact>
          <div className="flex items-center gap-3">
            <button onClick={() => setOnline(false)} className="rounded-full p-1.5 transition active:scale-95" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <div className="flex items-center justify-between flex-1">
              <h1 className="title-lg grad-title">مباراة 1v1</h1>
              <span className="dome-chip text-[17px] font-bold" style={{ color: "var(--gold-light)" }}>⚔️</span>
            </div>
          </div>
        </Dome>
        <OnlineMatch track={track} onExit={() => { setOnline(false); fetchMyRank().then((r) => setMyRp(r.rp)).catch(() => {}); }} />
      </div>
    );
  }

  if (gameState === "lobby") {
    return (
      <div className="min-h-dvh flex flex-col pb-nav relative z-[1]">
        <Dome compact>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="rounded-full p-1.5 transition active:scale-95" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <div className="flex items-center justify-between flex-1">
              <h1 className="title-lg grad-title">الأرينا</h1>
              <span className="dome-chip text-[17px] font-bold" style={{ color: "var(--gold-light)" }}>1v1</span>
            </div>
          </div>
        </Dome>

        <div className="flex-1 flex flex-col items-center justify-center px-5 rise rise-1">
          <div className="flex items-center gap-6 mb-7">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white"
                style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
                {myName.charAt(0)}
              </div>
              <p className="text-sm font-black" style={{ color: "var(--accent-light)" }}>{myName}</p>
            </div>
            <p className="font-black text-3xl" style={{ color: "var(--gold)" }}>VS</p>
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white"
                style={{ background: "linear-gradient(135deg,#7f1d1d,#EF4444)" }}>
                ?
              </div>
              <p className="text-sm font-black" style={{ color: "var(--danger)" }}>منافس</p>
            </div>
          </div>
          <h2 className="font-black text-2xl text-[var(--text)] mb-2">تحدي 1v1</h2>
          <p className="text-base text-[var(--text-muted)] text-center mb-3 max-w-xs leading-relaxed">
            أسئلة سريعة من مسارك ضد منافس يجاوب بنفسه — اسبقه قبل ما ياخذ النقطة.
          </p>
          <p className="text-sm font-bold mb-8" style={{ color: "var(--gold)" }}>
            الفوز = +{WIN_SILVER} فضة
          </p>

          {/* رتبتي الحالية */}
          {myRp != null && (
            <div className="mb-4">
              <RankBadge rp={myRp} size="md" showRp />
            </div>
          )}

          {/* مباراة 1v1 حقيقية (مطابقة حسب الرتبة) */}
          <button
            onClick={() => setOnline(true)}
            className="w-full max-w-xs py-5 rounded-2xl font-black text-lg glow-gold transition min-h-[60px] mb-2"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}
          >
            ابدأ 1v1 ⚔️
          </button>
          <p className="text-[12px] mb-5 text-center" style={{ color: "var(--text-muted)" }}>
            مباراة حقيقية ضد لاعب من رتبتك — الفوز يرفع نقاطك (RP)
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4 w-full max-w-xs">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>أو</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Play against bot (تدريب — لا يؤثر على الرتبة) */}
          <p className="font-black text-[15px] mb-1 text-center" style={{ color: "var(--text-dim)" }}>تدرّب ضد البوت</p>
          <p className="text-[12px] mb-3 text-center" style={{ color: "var(--text-muted)" }}>لا يؤثر على رتبتك · الفوز +{WIN_SILVER} فضة</p>

          <button
            onClick={startGame}
            className="w-full max-w-xs py-4 rounded-2xl font-black text-base transition min-h-[56px]"
            style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid #F59E0B", color: "#F59E0B" }}
          >
            ابدأ التدريب
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "result") {
    const won = myScore > opScore;
    const draw = myScore === opScore;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 pb-nav relative z-[1]">
        {won && <Confetti />}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black text-white"
              style={{ background: won ? "linear-gradient(135deg,var(--accent-2),var(--accent-light))" : draw ? "linear-gradient(135deg,#92400e,#F59E0B)" : "linear-gradient(135deg,#7f1d1d,#EF4444)" }}>
              {won ? "🏆" : draw ? "🤝" : "💪"}
            </div>
          </div>
          <h2 className="font-black text-3xl text-[var(--text)] mb-1">
            {won ? "فزت!" : draw ? "تعادل!" : "المرة القادمة!"}
          </h2>
          {won && (
            <p className="font-black text-lg mb-4" style={{ color: "var(--gold)" }}>+{WIN_SILVER} فضة</p>
          )}
          {!won && <div className="mb-4" />}
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="font-mono-nums text-3xl font-black text-[var(--accent-light)]">{myScore}</p>
              <p className="text-xs text-[var(--text-muted)]">أنت</p>
            </div>
            <div className="text-center">
              <p className="font-mono-nums text-3xl font-black text-[var(--danger)]">{opScore}</p>
              <p className="text-xs text-[var(--text-muted)]">{bot.name}</p>
            </div>
          </div>
          <div className="space-y-2 max-w-xs w-full">
            <button onClick={startGame} className="w-full py-4 rounded-2xl font-bold min-h-[56px] glow-gold" style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid #F59E0B", color: "#F59E0B" }}>
              تحدي آخر
            </button>
            <button onClick={() => setGameState("lobby")} className="w-full py-3 text-base text-[var(--text-muted)] min-h-[48px]">
              العودة للأرينا
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col pb-nav relative z-[1]">
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
            {myName.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)]">{myName}</p>
            <p className="font-mono-nums text-xl font-black leading-none text-[var(--accent-light)]">{myScore}</p>
          </div>
        </div>
        <span className="font-mono-nums font-black text-[var(--text)]">
          {currentQ + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-2.5">
          <div className="text-left">
            <p className="text-xs font-bold text-[var(--text-muted)]">{bot.name}</p>
            <p className="font-mono-nums text-xl font-black leading-none text-[var(--danger)]">{opScore}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white flex-shrink-0 transition-all"
            style={{
              background: "linear-gradient(135deg,#7f1d1d,#EF4444)",
              boxShadow: botFlash ? "0 0 14px #EF4444" : "none",
              transform: botFlash ? "scale(1.12)" : "scale(1)",
            }}>
            {bot.name.charAt(0)}
          </div>
        </div>
      </div>
      {botFlash && (
        <p className="text-center text-xs font-bold fade-in" style={{ color: "var(--danger)" }}>
          {bot.name} جاوب صح — اسبقه!
        </p>
      )}

      <div className="px-5 flex-1 flex flex-col justify-center rise rise-1">
        <div className="glass rounded-3xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs px-2.5 py-1 rounded-full glass text-[var(--accent-light)]">{q.subject}</span>
            <span className="font-mono-nums font-black text-lg" style={{ color: timeLeft <= 5 ? "#EF4444" : "var(--gold)" }}>{timeLeft}s</span>
          </div>
          <p className="text-lg font-bold text-[var(--text)] leading-relaxed">{q.q}</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct;
            const isPicked = selectedOption === i;
            // ألوان بعد الإجابة: الصحيح أخضر، المختار الخاطئ أحمر
            let bg = "var(--surface)";
            let border = "var(--border)";
            let color = "var(--text)";
            if (answered) {
              if (isCorrect) {
                bg = "color-mix(in srgb, var(--success) 15%, var(--surface))";
                border = "var(--success)";
                color = "var(--success)";
              } else if (isPicked) {
                bg = "color-mix(in srgb, var(--danger) 15%, var(--surface))";
                border = "var(--danger)";
                color = "var(--danger)";
              }
            }
            return (
              <button
                key={i}
                onClick={() => selectOption(i)}
                disabled={answered}
                className="py-4 px-4 rounded-2xl font-bold text-base text-right transition active:scale-[0.98] disabled:cursor-default min-h-[56px] flex items-center justify-between gap-2"
                style={{ background: bg, border: `1.5px solid ${border}`, color }}
              >
                <span className="flex-1">{opt}</span>
                {answered && isCorrect && <span>✓</span>}
                {answered && isPicked && !isCorrect && <span>✕</span>}
              </button>
            );
          })}
        </div>
      </div>

      <PageFooter />
    </div>
  );
}
