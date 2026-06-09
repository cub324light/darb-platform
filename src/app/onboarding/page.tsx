"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Stars from "@/components/Stars";
import { useTheme } from "@/components/ThemeProvider";
import type { ExamId } from "@/lib/types";

const EXAMS: { id: ExamId; icon: string; title: string; sub: string }[] = [
  { id: "تحصيلي", icon: "📚", title: "التحصيلي",    sub: "علوم · رياضيات · كيمياء · أحياء" },
  { id: "قدرات",  icon: "🧠", title: "القدرات",     sub: "كمي + لفظي (قياس)"              },
  { id: "CPC",    icon: "🏭", title: "CPC — أرامكو", sub: "برنامج التعاون مع الجامعات"    },
];

export default function OnboardingPage() {
  const router  = useRouter();
  const { theme, toggle } = useTheme();
  const [name, setName]   = useState("");
  const [exam, setExam]   = useState<ExamId | null>(null);

  const start = () => {
    if (!name.trim() || !exam) return;
    const user = { name: name.trim(), exam, onboarded: true, streak: 0, silver: 0, focusHours: 0, sessions: 0 };
    localStorage.setItem("darb_user", JSON.stringify(user));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <Stars />

      <div className="page-wrap flex flex-col flex-1">
      {/* Theme toggle */}
      <div className="flex justify-start p-5">
        <button
          onClick={toggle}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-95"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-10 max-w-sm mx-auto w-full">

        {/* Logo */}
        <div className="text-center mb-10">
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
            YOUR PATH TO EXCELLENCE
          </p>
          <h1 className="text-5xl font-black" style={{ color: "var(--text)" }}>
            <span style={{ color: "var(--blue)" }}>د</span>رب
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            انضباط حقيقي · نتائج حقيقية
          </p>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2" style={{ color: "var(--text-dim)" }}>
            ما اسمك؟
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && exam && start()}
            placeholder="مثال: فهد، سارة، خالد..."
            maxLength={20}
            className="w-full rounded-2xl px-5 text-lg font-medium outline-none transition-all"
            style={{
              background: "var(--surface)",
              border: `2px solid ${name.trim() ? "var(--blue)" : "var(--border)"}`,
              color: "var(--text)",
              padding: "18px 20px",
            }}
          />
        </div>

        {/* Exam */}
        <div className="mb-8">
          <label className="block text-sm font-bold mb-3" style={{ color: "var(--text-dim)" }}>
            ماذا تستعد له؟
          </label>
          <div className="flex flex-col gap-3">
            {EXAMS.map((e) => (
              <button
                key={e.id}
                onClick={() => setExam(e.id)}
                className="w-full rounded-2xl text-right flex items-center gap-4 transition-all duration-200 active:scale-98"
                style={{
                  background: exam === e.id ? "rgba(37,99,235,0.12)" : "var(--surface)",
                  border: `2px solid ${exam === e.id ? "var(--blue)" : "var(--border)"}`,
                  padding: "18px 20px",
                  transform: exam === e.id ? "scale(1.01)" : "scale(1)",
                }}
              >
                <span className="text-3xl">{e.icon}</span>
                <div className="flex-1">
                  <p className="font-bold text-base" style={{ color: "var(--text)" }}>{e.title}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{e.sub}</p>
                </div>
                {exam === e.id && (
                  <span className="text-lg font-black" style={{ color: "var(--blue)" }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Start */}
        <button
          onClick={start}
          disabled={!name.trim() || !exam}
          className="btn-primary transition-all"
          style={{
            opacity: name.trim() && exam ? 1 : 0.4,
            fontSize: 18,
            padding: "20px 24px",
          }}
        >
          يلا نبدأ ←
        </button>
      </div>
      </div>
    </div>
  );
}
