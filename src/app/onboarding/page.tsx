"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ExamTarget = "تحصيلي" | "قدرات" | "قدرات+تحصيلي" | "أرامكو" | "ابتعاث";

const EXAM_OPTIONS: { id: ExamTarget; title: string; sub: string; color: string }[] = [
  { id: "تحصيلي",        title: "التحصيلي",          sub: "كتاب ناصر عبدالكريم",      color: "#2563EB" },
  { id: "قدرات",         title: "القدرات",            sub: "كمي + لفظي (قياس)",        color: "#8B5CF6" },
  { id: "قدرات+تحصيلي", title: "القدرات + التحصيلي", sub: "الاثنين معاً",              color: "#F59E0B" },
  { id: "أرامكو",        title: "أرامكو CPC",         sub: "برنامج التعاون مع الجامعات", color: "#10B981" },
  { id: "ابتعاث",        title: "الابتعاث",           sub: "STEP / IELTS / CEFR",      color: "#EF4444" },
];

const BIRDS = [
  { id: "falcon",  emoji: "🦅", name: "الصقر",  desc: "مختصر وحاد",         color: "#2563EB", plan: "free"    },
  { id: "raven",   emoji: "🐦‍⬛", name: "الغراب", desc: "ساخر لطيف",          color: "#6366F1", plan: "shaheen" },
  { id: "peacock", emoji: "🦚", name: "الطاووس", desc: "تنافسي",             color: "#10B981", plan: "shaheen" },
  { id: "hoopoe",  emoji: "🦜", name: "الهدهد",  desc: "حكيم",               color: "#8B5CF6", plan: "shaheen" },
  { id: "swan",    emoji: "🦢", name: "البجعة",  desc: "هادئة وصبور",        color: "#06B6D4", plan: "shaheen" },
  { id: "phoenix", emoji: "🔥", name: "الفينكس", desc: "أسطوري — للنخبة",    color: "#F59E0B", plan: "anqa"    },
];

const _NOW = Date.now();

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]         = useState(0);
  const [name, setName]         = useState("");
  const [exam, setExam]         = useState<ExamTarget | null>(null);
  const [bird, setBird]         = useState("falcon");
  const [examDate, setExamDate] = useState("");
  const [leaving, setLeaving]   = useState(false);

  const next = () => {
    setLeaving(true);
    setTimeout(() => { setStep((s) => s + 1); setLeaving(false); }, 180);
  };
  const back = () => {
    setLeaving(true);
    setTimeout(() => { setStep((s) => s - 1); setLeaving(false); }, 180);
  };

  const finish = () => {
    const userData = { name: name.trim() || "درب", exam, bird, examDate, onboarded: true };
    localStorage.setItem("darb_user", JSON.stringify(userData));
    router.push("/dashboard");
  };

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-dvh bg-[var(--bg)] flex flex-col">

      {/* Progress bar */}
      {step > 0 && step < 4 && (
        <div className="fixed top-0 left-0 right-0 z-20 h-0.5 bg-[var(--border)]">
          <div className="h-full bg-[var(--teal)] transition-all duration-500" style={{ width: progress + "%" }} />
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 flex flex-col px-6 transition-all duration-180 ${leaving ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
            <div>
              <p className="font-mono-nums text-xs text-[var(--text-muted)] tracking-widest mb-6">DARB · درب</p>
              <h1 className="font-black text-4xl text-[var(--text)] mb-3 leading-tight">
                طريقك للتفوق<br />
                <span className="text-[var(--teal)]">يبدأ هنا</span>
              </h1>
              <p className="text-[var(--text-muted)] text-base max-w-xs mx-auto leading-relaxed">
                انضباط حقيقي. نتائج حقيقية.<br />بدون تدليل.
              </p>
            </div>
            <div className="w-full max-w-xs flex flex-col gap-3">
              <button className="btn-teal" onClick={next}>ابدأ رحلتي</button>
              <p className="text-[var(--text-muted)] text-xs">مجاناً بالكامل · بدون بطاقة بنكية</p>
            </div>
          </div>
        )}

        {/* ── Step 1: Name ── */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-center gap-8 max-w-xs mx-auto w-full">
            <div>
              <p className="label mb-2">1 من 3</p>
              <h2 className="title-lg text-[var(--text)] mb-1">ما اسمك؟</h2>
              <p className="body-sm">رفيقك سيناديك به في كل جلسة.</p>
            </div>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && name.trim() && next()}
                placeholder="اسمك..."
                className="w-full rounded-2xl px-5 py-4 text-[var(--text)] text-lg placeholder-[var(--text-muted)] outline-none transition-colors"
                style={{
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                }}
                maxLength={20}
              />
              <button className="btn-teal" onClick={next} disabled={!name.trim()}
                style={{ opacity: name.trim() ? 1 : 0.4 }}>
                التالي
              </button>
              <button className="btn-ghost" onClick={back}>← رجوع</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Exam Target ── */}
        {step === 2 && (
          <div className="flex-1 flex flex-col justify-center gap-5 w-full max-w-sm mx-auto">
            <div>
              <p className="label mb-2">2 من 3</p>
              <h2 className="title-lg text-[var(--text)] mb-1">
                إيش تستعد له{name.trim() ? `، ${name.trim()}` : ""}؟
              </h2>
              <p className="body-sm">المنصة ستُخصَّص حسب هدفك.</p>
            </div>
            <div className="flex flex-col gap-2">
              {EXAM_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => setExam(opt.id)}
                  className="w-full rounded-2xl p-4 text-right flex items-center gap-3 transition-all duration-150"
                  style={{
                    background: exam === opt.id ? opt.color + "18" : "var(--surface)",
                    border: `1.5px solid ${exam === opt.id ? opt.color : "var(--border)"}`,
                  }}>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-[var(--text)]">{opt.title}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{opt.sub}</p>
                  </div>
                  {exam === opt.id && (
                    <span className="text-lg font-black flex-shrink-0" style={{ color: opt.color }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {exam && (
              <div className="scale-in">
                <p className="label mb-2">تاريخ الاختبار (اختياري)</p>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-[var(--text)] outline-none transition-colors"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
                />
              </div>
            )}

            <div className="flex flex-col gap-2 pb-6">
              <button className="btn-teal" onClick={next} disabled={!exam}
                style={{ opacity: exam ? 1 : 0.4 }}>
                التالي
              </button>
              <button className="btn-ghost" onClick={back}>← رجوع</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Bird ── */}
        {step === 3 && (
          <div className="flex-1 flex flex-col justify-center gap-5 w-full max-w-sm mx-auto">
            <div>
              <p className="label mb-2">3 من 3</p>
              <h2 className="title-lg text-[var(--text)] mb-1">اختر رفيقك</h2>
              <p className="body-sm">يرافقك في كل جلسة ويحتفل بانتصاراتك.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BIRDS.map((b) => {
                const locked   = b.plan !== "free";
                const isSelected = bird === b.id;
                return (
                  <button key={b.id}
                    onClick={() => !locked && setBird(b.id)}
                    className="rounded-2xl p-4 text-center transition-all duration-150 relative"
                    style={{
                      background: isSelected ? b.color + "18" : "var(--surface)",
                      border: `1.5px solid ${isSelected ? b.color : "var(--border)"}`,
                      opacity: locked ? 0.45 : 1,
                    }}>
                    {locked && (
                      <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: b.plan === "anqa" ? "rgba(245,158,11,0.15)" : "rgba(37,99,235,0.15)",
                          color: b.plan === "anqa" ? "var(--gold)" : "var(--blue-light)",
                        }}>
                        {b.plan === "anqa" ? "عنقاء" : "شاهين"}
                      </span>
                    )}
                    <div className="text-3xl mb-2">{b.emoji}</div>
                    <p className="font-bold text-xs text-[var(--text)]">{b.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{b.desc}</p>
                    {isSelected && <p className="text-[11px] font-bold mt-1.5" style={{ color: b.color }}>✓ مختار</p>}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 pb-6">
              <button className="btn-teal" onClick={next}>التالي</button>
              <button className="btn-ghost" onClick={back}>← رجوع</button>
            </div>
          </div>
        )}

        {/* ── Step 4: Ready ── */}
        {step === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-xs mx-auto">
            <div className="text-6xl scale-in">
              {BIRDS.find((b) => b.id === bird)?.emoji ?? "🦅"}
            </div>
            <div className="w-full">
              <h2 className="title-lg text-[var(--teal)] mb-4">
                جاهز{name.trim() ? `، ${name.trim()}` : ""}!
              </h2>
              <div className="card text-right flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">هدفك</span>
                  <span className="font-bold text-sm text-[var(--text)]">{exam}</span>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">رفيقك</span>
                  <span className="font-bold text-sm text-[var(--text)]">
                    {BIRDS.find((b) => b.id === bird)?.name} {BIRDS.find((b) => b.id === bird)?.emoji}
                  </span>
                </div>
                {examDate && (
                  <>
                    <div className="h-px bg-[var(--border)]" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">الاختبار</span>
                      <span className="font-bold text-sm text-[var(--gold)]">
                        {Math.ceil((new Date(examDate).getTime() - _NOW) / 86400000)} يوم متبقي
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="w-full flex flex-col gap-3">
              <button className="btn-teal" onClick={finish}>يلا نبدأ ←</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
