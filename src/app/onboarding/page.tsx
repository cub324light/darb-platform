"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ExamTarget = "تحصيلي" | "قدرات" | "قدرات+تحصيلي" | "أرامكو" | "ابتعاث";

const EXAM_OPTIONS: { id: ExamTarget; icon: string; title: string; sub: string; color: string }[] = [
  { id: "تحصيلي",        icon: "📚", title: "التحصيلي",          sub: "كتاب ناصر عبدالكريم",     color: "#2563EB" },
  { id: "قدرات",         icon: "🧠", title: "القدرات",           sub: "كمي + لفظي (قياس)",       color: "#8B5CF6" },
  { id: "قدرات+تحصيلي", icon: "⚡", title: "القدرات + التحصيلي", sub: "الاثنين معاً",             color: "#F59E0B" },
  { id: "أرامكو",        icon: "🏭", title: "أرامكو CPC",        sub: "برنامج التعاون مع الجامعات", color: "#10B981" },
  { id: "ابتعاث",        icon: "✈️", title: "الابتعاث",           sub: "STEP / IELTS / CEFR",     color: "#EF4444" },
];

const BIRDS = [
  { id: "falcon",  emoji: "🦅", name: "الصقر",  desc: "مختصر وحاد — لا مجاملات",     color: "#2563EB", plan: "free" },
  { id: "raven",   emoji: "🐦‍⬛", name: "الغراب", desc: "ساخر لطيف — يحفزك بطريقته",  color: "#6366F1", plan: "shaheen" },
  { id: "peacock", emoji: "🦚", name: "الطاووس", desc: "تنافسي — يقارنك بالأفضل",     color: "#10B981", plan: "shaheen" },
  { id: "hoopoe",  emoji: "🦜", name: "الهدهد",  desc: "حكيم — يسألك قبل ما يجاوب",  color: "#8B5CF6", plan: "shaheen" },
  { id: "swan",    emoji: "🦢", name: "البجعة",  desc: "هادئة — صبر وثبات",          color: "#06B6D4", plan: "shaheen" },
  { id: "phoenix", emoji: "🔥", name: "الفينكس", desc: "أسطوري — للنخبة فقط",        color: "#F59E0B", plan: "anqa" },
];

const STEPS = ["مرحباً", "اسمك", "هدفك", "رفيقك", "جاهز"] as const;
const _NOW = Date.now();

const ONBOARDING_STARS = Array.from({ length: 30 }, () => ({
  width:    Math.random() * 2 + 1,
  height:   Math.random() * 2 + 1,
  left:     Math.random() * 100,
  top:      Math.random() * 80,
  opacity:  Math.random() * 0.4 + 0.1,
  duration: 2 + Math.random() * 4,
  delay:    Math.random() * 4,
}));

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [exam, setExam] = useState<ExamTarget | null>(null);
  const [bird, setBird] = useState("falcon");
  const [examDate, setExamDate] = useState("");
  const [leaving, setLeaving] = useState(false);

  const next = () => {
    setLeaving(true);
    setTimeout(() => { setStep((s) => s + 1); setLeaving(false); }, 200);
  };
  const back = () => {
    setLeaving(true);
    setTimeout(() => { setStep((s) => s - 1); setLeaving(false); }, 200);
  };

  const finish = () => {
    const userData = { name: name.trim() || "درب", exam, bird, examDate, onboarded: true };
    localStorage.setItem("darb_user", JSON.stringify(userData));
    router.push("/dashboard");
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-dvh bg-[var(--bg)] flex flex-col overflow-hidden">
      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {ONBOARDING_STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            width: s.width + "px", height: s.height + "px",
            left: s.left + "%", top: s.top + "%",
            opacity: s.opacity,
            animation: `twinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: s.delay + "s",
          }} />
        ))}
      </div>

      {/* Progress bar */}
      {step > 0 && step < STEPS.length - 1 && (
        <div className="fixed top-0 left-0 right-0 z-20 h-1 bg-[var(--border)]">
          <div
            className="h-full bg-[var(--blue)] transition-all duration-500 ease-out"
            style={{ width: progress + "%" }}
          />
        </div>
      )}

      {/* Content */}
      <div
        className={`relative z-10 flex-1 flex flex-col px-6 transition-all duration-200 ${leaving ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
      >

        {/* ─── Step 0: Welcome ─── */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            <div className="relative">
              <div className="text-8xl mb-2" style={{ filter: "drop-shadow(0 0 24px rgba(37,99,235,0.5))" }}>🦅</div>
              <div className="absolute -inset-4 rounded-full border-2 border-[var(--blue)]/20 animate-ping" style={{ animationDuration: "3s" }} />
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-base mb-2 font-medium">YOUR PATH TO EXCELLENCE</p>
              <h1 className="title-xl text-[var(--text)] mb-3">أهلاً بك في <span className="text-[var(--gold)]">درب</span></h1>
              <p className="body-lg max-w-xs mx-auto">
                المنصة التي تعاملك كأخ — مش بس تعلمك.
                <br />انضباط حقيقي، نتائج حقيقية.
              </p>
            </div>
            <div className="w-full max-w-xs flex flex-col gap-3 mt-4">
              <button className="btn-primary" onClick={next}>ابدأ رحلتي ←</button>
              <p className="text-[var(--text-muted)] text-sm">مجاناً بالكامل · بدون بطاقة بنكية</p>
            </div>
          </div>
        )}

        {/* ─── Step 1: Name ─── */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-center gap-8 max-w-xs mx-auto w-full">
            <div>
              <p className="label mb-3">الخطوة 1 من 3</p>
              <h2 className="title-lg text-[var(--text)] mb-2">ما اسمك؟</h2>
              <p className="body-sm">رفيقك سيناديك به في كل جلسة.</p>
            </div>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && name.trim() && next()}
                placeholder="مثال: فهد، سارة، خالد..."
                className="w-full bg-[var(--surface)] border-2 border-[var(--border)] focus:border-[var(--blue)] rounded-2xl px-5 py-4 text-[var(--text)] text-lg placeholder-[var(--text-muted)] outline-none transition-colors"
                maxLength={20}
              />
              <button className="btn-primary" onClick={next} disabled={!name.trim()}
                style={{ opacity: name.trim() ? 1 : 0.4 }}>
                التالي ←
              </button>
              <button className="btn-ghost" onClick={back}>← رجوع</button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Exam Target ─── */}
        {step === 2 && (
          <div className="flex-1 flex flex-col justify-center gap-6 w-full max-w-sm mx-auto">
            <div>
              <p className="label mb-3">الخطوة 2 من 3</p>
              <h2 className="title-lg text-[var(--text)] mb-2">
                إيش تستعد له{name.trim() ? `، ${name.trim()}` : ""}؟
              </h2>
              <p className="body-sm">المنصة ستُخصَّص بالكامل حسب هدفك.</p>
            </div>
            <div className="flex flex-col gap-3">
              {EXAM_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setExam(opt.id)}
                  className="w-full rounded-2xl p-4 text-right flex items-center gap-4 transition-all duration-200"
                  style={{
                    background: exam === opt.id ? opt.color + "22" : "var(--surface)",
                    border: `2px solid ${exam === opt.id ? opt.color : "var(--border)"}`,
                    transform: exam === opt.id ? "scale(1.01)" : "scale(1)",
                  }}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-base text-[var(--text)]">{opt.title}</p>
                    <p className="text-sm text-[var(--text-muted)]">{opt.sub}</p>
                  </div>
                  {exam === opt.id && (
                    <span className="text-xl" style={{ color: opt.color }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Optional date */}
            {exam && (
              <div className="scale-in">
                <p className="label mb-2">تاريخ الاختبار (اختياري)</p>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--blue)] transition-colors"
                />
              </div>
            )}

            <div className="flex flex-col gap-3 pb-6">
              <button className="btn-primary" onClick={next} disabled={!exam}
                style={{ opacity: exam ? 1 : 0.4 }}>
                التالي ←
              </button>
              <button className="btn-ghost" onClick={back}>← رجوع</button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Bird ─── */}
        {step === 3 && (
          <div className="flex-1 flex flex-col justify-center gap-6 w-full max-w-sm mx-auto">
            <div>
              <p className="label mb-3">الخطوة 3 من 3</p>
              <h2 className="title-lg text-[var(--text)] mb-2">اختر رفيقك</h2>
              <p className="body-sm">يرافقك في كل جلسة — يحتفل بانتصاراتك ويصمت عند إخفاقاتك.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BIRDS.map((b) => {
                const locked = b.plan !== "free";
                const selected = bird === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => !locked && setBird(b.id)}
                    className="rounded-2xl p-4 text-center transition-all duration-200 relative"
                    style={{
                      background: selected ? b.color + "20" : "var(--surface)",
                      border: `2px solid ${selected ? b.color : "var(--border)"}`,
                      opacity: locked ? 0.5 : 1,
                    }}
                  >
                    {locked && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: b.plan === "anqa" ? "#F59E0B22" : "#2563EB22", color: b.plan === "anqa" ? "#F59E0B" : "#3B82F6" }}>
                        {b.plan === "anqa" ? "عنقاء" : "شاهين"}
                      </span>
                    )}
                    <div className="text-4xl mb-2">{b.emoji}</div>
                    <p className="font-bold text-sm text-[var(--text)]">{b.name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-snug">{b.desc}</p>
                    {selected && <p className="text-xs font-bold mt-2" style={{ color: b.color }}>✓ مختار</p>}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 pb-6">
              <button className="btn-primary" onClick={next}>التالي ←</button>
              <button className="btn-ghost" onClick={back}>← رجوع</button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Ready ─── */}
        {step === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-xs mx-auto">
            <div className="text-7xl scale-in">
              {BIRDS.find((b) => b.id === bird)?.emoji ?? "🦅"}
            </div>
            <div>
              <h2 className="title-lg text-[var(--gold)] mb-3">
                جاهز{name.trim() ? `، ${name.trim()}` : ""}!
              </h2>
              <div className="card text-right space-y-3 mb-2">
                <div className="flex items-center justify-between">
                  <span className="body-sm">هدفك</span>
                  <span className="font-bold text-[var(--text)]">{exam}</span>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex items-center justify-between">
                  <span className="body-sm">رفيقك</span>
                  <span className="font-bold text-[var(--text)]">
                    {BIRDS.find((b) => b.id === bird)?.name} {BIRDS.find((b) => b.id === bird)?.emoji}
                  </span>
                </div>
                {examDate && (
                  <>
                    <div className="h-px bg-[var(--border)]" />
                    <div className="flex items-center justify-between">
                      <span className="body-sm">الاختبار</span>
                      <span className="font-bold text-[var(--text)]">
                        {Math.ceil((new Date(examDate).getTime() - _NOW) / 86400000)} يوم متبقي
                      </span>
                    </div>
                  </>
                )}
              </div>
              <p className="body-sm">
                {BIRDS.find((b) => b.id === bird)?.desc}
              </p>
            </div>
            <div className="w-full flex flex-col gap-3">
              <button className="btn-gold" onClick={finish}>يلا نبدأ ←</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
