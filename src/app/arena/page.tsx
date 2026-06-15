"use client";
import { useState, useEffect, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import Confetti from "@/components/Confetti";
import { loadUser, addSilver } from "@/lib/storage";
import { currentUser } from "@/lib/cloud";
import { getTrack, type TrackId } from "@/lib/tracks";

/* المنافس التدريبي: اسم + طير عشوائي، يجاوب بنفسه */
const BOT_NAMES = ["سعود", "نورة", "فهد", "ريم", "خالد", "لمى", "تركي", "العنود"];
const WIN_SILVER = 15;

/* بنك أسئلة اختيار من متعدد لكل مسار */
interface Question {
  q: string;
  options: string[];
  correct: number; // فهرس الإجابة الصحيحة
  subject: string;
}

const QUESTION_BANK: Record<TrackId, Question[]> = {
  تحصيلي: [
    { q: "ما قانون نيوتن الأول؟", options: ["القصور الذاتي", "الفعل ورد الفعل", "التسارع يتناسب مع القوة", "الجذب الكوني"], correct: 0, subject: "فيزياء" },
    { q: "ما ناتج: log₂(8) ؟", options: ["2", "3", "4", "8"], correct: 1, subject: "رياضيات" },
    { q: "ما رمز الكالسيوم في الجدول الدوري؟", options: ["Ca", "C", "Cl", "K"], correct: 0, subject: "كيمياء" },
    { q: "ما العضو المسؤول عن تنقية الدم؟", options: ["الكبد", "الكلى", "الرئتان", "القلب"], correct: 1, subject: "أحياء" },
  ],
  قدرات: [
    { q: "أكمل: قلم : كتابة — مقص : ؟", options: ["قص", "ورق", "حديد", "يد"], correct: 0, subject: "لفظي" },
    { q: "العدد التالي: 3، 6، 12، 24، ...؟", options: ["36", "48", "30", "60"], correct: 1, subject: "كمي" },
    { q: "ضد كلمة «السخاء»؟", options: ["الكرم", "الجود", "البخل", "العطاء"], correct: 2, subject: "لفظي" },
    { q: "لو كان 40% من عدد يساوي 80، فالعدد؟", options: ["160", "200", "320", "120"], correct: 1, subject: "كمي" },
  ],
  CPC: [
    { q: "Synonym of «rapid»:", options: ["slow", "fast", "heavy", "late"], correct: 1, subject: "إنجليزي" },
    { q: "ما ناتج: ‎(2x + 3)(x − 1)‎ ؟", options: ["2x² + x − 3", "2x² − x − 3", "2x² + 5x − 3", "2x² − 3"], correct: 0, subject: "رياضيات" },
    { q: "She ____ to work every day.", options: ["go", "goes", "going", "gone"], correct: 1, subject: "إنجليزي" },
    { q: "مساحة دائرة نصف قطرها 7؟ (π ≈ 22/7)", options: ["44", "154", "49", "22"], correct: 1, subject: "رياضيات" },
  ],
  "تحصيلي مبكر": [
    { q: "ما وحدة قياس القوة؟", options: ["جول", "نيوتن", "واط", "باسكال"], correct: 1, subject: "فيزياء" },
    { q: "ما ناتج: ‎(x + 2)² ؟", options: ["x² + 4", "x² + 4x + 4", "x² + 2x + 4", "x² + 4x + 2"], correct: 1, subject: "رياضيات" },
    { q: "ما الرقم الذري للهيدروجين؟", options: ["1", "2", "8", "0"], correct: 0, subject: "كيمياء" },
    { q: "أين تحدث عملية البناء الضوئي؟", options: ["الميتوكوندريا", "البلاستيدات الخضراء", "النواة", "الغشاء"], correct: 1, subject: "أحياء" },
  ],
  ايلتس: [
    { q: "The results ____ surprising.", options: ["was", "were", "is", "be"], correct: 1, subject: "كتابة" },
    { q: "«in a nutshell» means:", options: ["بالتفصيل", "باختصار", "بصعوبة", "فجأة"], correct: 1, subject: "قراءة" },
    { q: "Synonym of «significant»:", options: ["minor", "important", "strange", "quiet"], correct: 1, subject: "قراءة" },
    { q: "Task 2 essay: كم كلمة كحد أدنى؟", options: ["150", "200", "250", "300"], correct: 2, subject: "كتابة" },
  ],
  ستيب: [
    { q: "He ____ in Riyadh since 2019.", options: ["lives", "lived", "has lived", "living"], correct: 2, subject: "قواعد" },
    { q: "Antonym of «ancient»:", options: ["old", "modern", "huge", "rare"], correct: 1, subject: "قراءة" },
    { q: "If I ____ rich, I would travel.", options: ["am", "was", "were", "be"], correct: 2, subject: "قواعد" },
    { q: "The main idea is usually found in the:", options: ["conclusion", "topic sentence", "title", "last line"], correct: 1, subject: "قراءة" },
  ],
  توفل: [
    { q: "Synonym of «crucial»:", options: ["minor", "essential", "optional", "rare"], correct: 1, subject: "قراءة" },
    { q: "مدة قسم الاستماع في TOEFL iBT تقريباً؟", options: ["20 دقيقة", "36 دقيقة", "60 دقيقة", "10 دقائق"], correct: 1, subject: "استماع" },
    { q: "The professor insisted that the student ____ early.", options: ["arrives", "arrived", "arrive", "arriving"], correct: 2, subject: "قواعد" },
    { q: "Integrated Writing: تقرأ وتسمع ثم؟", options: ["تتكلم", "تكتب ملخصاً يربط المحاضرة بالنص", "ترسم", "تختار"], correct: 1, subject: "كتابة" },
  ],
  دوليقو: [
    { q: "اختر الكلمة الإنجليزية الحقيقية:", options: ["blicket", "bridge", "brold", "plon"], correct: 1, subject: "قراءة" },
    { q: "نتيجة اختبار Duolingo تصدر عادة خلال؟", options: ["ساعة", "48 ساعة", "أسبوع", "شهر"], correct: 1, subject: "قراءة" },
    { q: "She has been studying ____ three hours.", options: ["since", "for", "from", "at"], correct: 1, subject: "كتابة" },
    { q: "Describe the image: المطلوب؟", options: ["ترجمتها", "وصف الصورة بجملة كاملة صحيحة", "تجاهلها", "عدّها"], correct: 1, subject: "محادثة" },
  ],
  ITC: [
    { q: "Synonym of «efficient»:", options: ["lazy", "effective", "slow", "weak"], correct: 1, subject: "إنجليزي" },
    { q: "ما ناتج: 15% من 200؟", options: ["15", "30", "45", "20"], correct: 1, subject: "رياضيات" },
    { q: "أي الخيارات ليس نوع قاعدة بيانات؟", options: ["SQL", "HDMI", "Oracle", "MongoDB"], correct: 1, subject: "منطق" },
    { q: "He ____ the report before the deadline.", options: ["finish", "finishes", "finished", "finishing"], correct: 2, subject: "إنجليزي" },
  ],
};

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

  const [searchingPlayer, setSearchingPlayer] = useState(false);
  const [playerSearchDone, setPlayerSearchDone] = useState(false);
  const [foundPlayer, setFoundPlayer] = useState<{ name: string } | null>(null);

  const startGame = () => {
    setBot({ name: foundPlayer?.name ?? BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] });
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

  const findPlayer = async () => {
    setSearchingPlayer(true);
    setPlayerSearchDone(false);
    setFoundPlayer(null);

    try {
      const uid = currentUser()?.uid;

      // 1) جرّب مطابقة صديق حقيقي من قائمة الأصدقاء
      if (uid) {
        const fr = await fetch("/api/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "getFriends", uid }),
        });
        const frData = await fr.json() as { friends?: { name: string }[] };
        const friends = (frData.friends ?? []).filter((f) => f.name?.trim());
        if (friends.length > 0) {
          const pick = friends[Math.floor(Math.random() * friends.length)];
          setFoundPlayer({ name: pick.name });
          return;
        }
      }

      // 2) وإلا تحقّق من وجود طلاب متواجدين الآن
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "studiers" }),
      });
      const data = await res.json() as { count?: number };
      if ((data.count ?? 0) > 1) {
        const names = ["سعود", "نورة", "فهد", "ريم", "خالد"];
        setFoundPlayer({ name: names[Math.floor(Math.random() * names.length)] });
      }
    } catch {
      // خطأ شبكة — لا لاعبين
    } finally {
      setSearchingPlayer(false);
      setPlayerSearchDone(true);
    }
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

  if (gameState === "lobby") {
    return (
      <div className="min-h-dvh flex flex-col pb-nav relative z-[1]">
        <Dome compact>
          <div className="flex items-center justify-between">
            <h1 className="title-lg" style={{ color: "var(--text)" }}>الأرينا</h1>
            <span className="dome-chip text-[17px] font-bold" style={{ color: "var(--gold-light)" }}>1v1</span>
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
            الفوز = +{WIN_SILVER} Silver
          </p>

          {/* Player matching section */}
          <div className="glass rounded-2xl p-5 mb-4 w-full max-w-xs">
            <p className="font-black text-[17px] mb-3" style={{ color: "var(--text)" }}>ابحث عن منافس</p>

            {/* Find player button */}
            <button onClick={findPlayer} disabled={searchingPlayer}
              className="w-full py-3.5 rounded-xl font-bold text-[15px] mb-3 transition"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
              {searchingPlayer ? "جاري البحث..." : "ابحث عن لاعب 🔍"}
            </button>

            {/* Result */}
            {playerSearchDone && !foundPlayer && (
              <div className="rounded-xl px-4 py-3 text-center mb-3"
                style={{ background: "color-mix(in srgb, var(--text-muted) 8%, transparent)", border: "1px solid var(--border)" }}>
                <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>ما فيه لاعبين الحين</p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>العب ضد البوت في انتظار منافس</p>
              </div>
            )}

            {foundPlayer && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3 mb-3"
                style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1.5px solid var(--success)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
                  style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
                  {foundPlayer.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[14px]" style={{ color: "var(--text)" }}>{foundPlayer.name}</p>
                  <p className="text-[12px]" style={{ color: "var(--success)" }}>جاهز للتحدي</p>
                </div>
                <button onClick={startGame}
                  className="px-4 py-2 rounded-xl font-bold text-sm text-white"
                  style={{ background: "var(--success)" }}>
                  ابدأ
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4 w-full max-w-xs">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>أو</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Play against bot */}
          <p className="font-black text-[15px] mb-3 text-center" style={{ color: "var(--text-dim)" }}>العب ضد البوت</p>

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
            <p className="font-black text-lg mb-4" style={{ color: "var(--gold)" }}>+{WIN_SILVER} Silver</p>
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
        <BottomNav />
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

      <BottomNav />
    </div>
  );
}
