"use client";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { loadUser } from "@/lib/storage";
import { getTrack, type TrackId } from "@/lib/tracks";

/* بنك أسئلة حقيقي لكل مسار */
const QUESTION_BANK: Record<TrackId, { q: string; a: string; subject: string }[]> = {
  تحصيلي: [
    { q: "ما قانون نيوتن الأول؟", a: "القصور الذاتي: جسم ساكن يبقى ساكناً ومتحرك يبقى متحركاً ما لم تؤثر عليه قوة", subject: "فيزياء" },
    { q: "ما ناتج: log₂(8) ؟", a: "3", subject: "رياضيات" },
    { q: "ما رمز الكالسيوم في الجدول الدوري؟", a: "Ca", subject: "كيمياء" },
    { q: "ما العضو المسؤول عن تنقية الدم في الجسم؟", a: "الكلى", subject: "أحياء" },
  ],
  قدرات: [
    { q: "أكمل: قلم : كتابة — مقص : ؟", a: "قص (علاقة الأداة بوظيفتها)", subject: "لفظي" },
    { q: "ما العدد التالي في المتتابعة: 3، 6، 12، 24، ...؟", a: "48 (كل عدد ضعف السابق)", subject: "كمي" },
    { q: "ضد كلمة «السخاء»؟", a: "البخل", subject: "لفظي" },
    { q: "لو كان 40% من عدد يساوي 80، فما العدد؟", a: "200", subject: "كمي" },
  ],
  CPC: [
    { q: "Choose the synonym of «rapid»:", a: "fast / quick", subject: "إنجليزي" },
    { q: "ما ناتج: ‎(2x + 3)(x − 1)‎ ؟", a: "2x² + x − 3", subject: "رياضيات" },
    { q: "Complete: She ____ to work every day. (go)", a: "goes", subject: "إنجليزي" },
    { q: "ما مساحة دائرة نصف قطرها 7؟ (π ≈ 22/7)", a: "154", subject: "رياضيات" },
  ],
};

type GameState = "lobby" | "playing" | "result";

export default function ArenaPage() {
  const [questions, setQuestions] = useState(QUESTION_BANK["تحصيلي"]);
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [currentQ, setCurrentQ] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opScore, setOpScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    const track = getTrack(loadUser()?.track);
    setQuestions(QUESTION_BANK[track.id]);
  }, []);

  const startGame = () => {
    setGameState("playing");
    setCurrentQ(0);
    setMyScore(0);
    setOpScore(0);
    setAnswered(false);
    setTimeLeft(15);
  };

  const answer = (correct: boolean) => {
    if (answered) return;
    setAnswered(true);
    if (correct) setMyScore((p) => p + 1);
    else setOpScore((p) => p + (Math.random() > 0.5 ? 1 : 0));

    setTimeout(() => {
      if (currentQ + 1 >= questions.length) {
        setGameState("result");
      } else {
        setCurrentQ((p) => p + 1);
        setAnswered(false);
        setTimeLeft(15);
      }
    }, 1000);
  };

  const q = questions[currentQ];

  if (gameState === "lobby") {
    return (
      <div className="min-h-dvh flex flex-col pb-nav relative z-[1]">
        <Dome compact>
          <div className="flex items-center justify-between">
            <h1 className="title-lg" style={{ color: "var(--text)" }}>الأرينا</h1>
            <span className="dome-chip text-[13px] font-bold" style={{ color: "var(--gold-light)" }}>1v1</span>
          </div>
        </Dome>

        <div className="flex-1 flex flex-col items-center justify-center px-5 rise rise-1">
          <div
            className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: "linear-gradient(0deg, rgba(245,158,11,0.1), rgba(245,158,11,0.1)), var(--surface)", border: "2px solid rgba(245,158,11,0.3)" }}
          />
          <h2 className="font-black text-2xl text-[var(--text)] mb-2">تحدي 1v1</h2>
          <p className="text-base text-[var(--text-muted)] text-center mb-8 max-w-xs leading-relaxed">
            أسئلة سريعة من مسارك ضد منافس تدريبي.
            التحدي الحقيقي ضد طلاب آخرين يفتح مع باقة شاهين.
          </p>

          <button
            onClick={startGame}
            className="w-full max-w-xs py-5 rounded-2xl font-black text-lg glow-gold transition min-h-[60px]"
            style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid #F59E0B", color: "#F59E0B" }}
          >
            ابدأ التحدي
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  if (gameState === "result") {
    const won = myScore > opScore;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 pb-nav relative z-[1]">
        <div className="text-center">
          <h2 className="font-black text-2xl text-[var(--text)] mb-2">
            {won ? "فزت!" : "المرة القادمة!"}
          </h2>
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="font-mono-nums text-3xl font-black text-[var(--accent-light)]">{myScore}</p>
              <p className="text-xs text-[var(--text-muted)]">أنت</p>
            </div>
            <div className="text-center">
              <p className="font-mono-nums text-3xl font-black text-[var(--danger)]">{opScore}</p>
              <p className="text-xs text-[var(--text-muted)]">المنافس</p>
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
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col pb-nav relative z-[1]">
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-muted)]">أنت</span>
          <span className="font-mono-nums text-xl font-black text-[var(--accent-light)]">{myScore}</span>
        </div>
        <span className="font-mono-nums font-black text-[var(--text)]">
          {currentQ + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono-nums text-xl font-black text-[var(--danger)]">{opScore}</span>
          <span className="text-sm font-bold text-[var(--text-muted)]">المنافس</span>
        </div>
      </div>

      <div className="px-5 flex-1 flex flex-col justify-center rise rise-1">
        <div className="glass rounded-3xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs px-2.5 py-1 rounded-full glass text-[var(--accent-light)]">{q.subject}</span>
            <span className="font-mono-nums font-black text-lg text-[var(--gold)]">{timeLeft}s</span>
          </div>
          <p className="text-lg font-bold text-[var(--text)] leading-relaxed">{q.q}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => answer(true)}
            disabled={answered}
            className="py-5 rounded-2xl font-bold text-base glass text-[var(--text)] transition active:scale-95 disabled:opacity-50 min-h-[60px]"
          >
            ✓ أعرفها
          </button>
          <button
            onClick={() => answer(false)}
            disabled={answered}
            className="py-5 rounded-2xl font-bold text-base glass text-[var(--text)] transition active:scale-95 disabled:opacity-50 min-h-[60px]"
          >
            ✕ ما أعرفها
          </button>
        </div>

        {answered && (
          <div className="mt-4 glass rounded-2xl p-4 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">الإجابة الصحيحة:</p>
            <p className="text-base font-bold text-[var(--success)]">{q.a}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
