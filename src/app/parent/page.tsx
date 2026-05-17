"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { BirdId, VaultError } from "@/lib/types";

interface DarbUser {
  name: string;
  exam: string;
  bird: BirdId;
  examDate?: string;
  onboarded: boolean;
}

interface OrbitData {
  totalSessions: number;
  totalSilver: number;
  totalFocusMins: number;
  streak: number;
  sessionsToday: number;
  lastActiveDate: string;
}

const BIRD_ICONS: Record<BirdId, string> = {
  falcon: "🦅", hoopoe: "🦜", swan: "🦢", raven: "🐦‍⬛", peacock: "🦚", phoenix: "🔥",
};

export default function ParentPage() {
  const [user, setUser]         = useState<DarbUser | null>(null);
  const [orbit, setOrbit]       = useState<OrbitData | null>(null);
  const [vaultCount, setVaultCount] = useState(0);
  const [roadmapPct, setRoadmapPct] = useState(0);
  const [alertEnabled, setAlertEnabled]       = useState(false);
  const [showAlertWarning, setShowAlertWarning] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("darb_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}

    try {
      const raw = localStorage.getItem("darb_orbit");
      if (raw) setOrbit(JSON.parse(raw));
    } catch {}

    try {
      const vault: VaultError[] = JSON.parse(localStorage.getItem("darb_vault") ?? "[]");
      setVaultCount(vault.length);
    } catch {}

    try {
      const completed: string[] = JSON.parse(localStorage.getItem("darb_roadmap") ?? "[]");
      // rough estimate: assume total ~100 lessons
      setRoadmapPct(Math.min(100, Math.round((completed.length / 100) * 100)));
    } catch {}
  }, []);

  const focusHours   = orbit ? Math.round(orbit.totalFocusMins / 60) : 0;
  const streak       = orbit?.streak ?? 0;
  const isActiveToday = orbit?.lastActiveDate === new Date().toISOString().split("T")[0];

  if (!user) {
    return (
      <div className="min-h-dvh bg-[var(--bg)] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-5">👨‍👦</p>
        <h1 className="font-black text-2xl text-[var(--text)] mb-3">بوابة سند</h1>
        <p className="text-base text-[var(--text-muted)] mb-6">
          لم يسجّل الطالب دخوله بعد. اطلب منه فتح التطبيق واتمام الإعداد.
        </p>
        <Link href="/" className="px-6 py-3 rounded-2xl font-bold text-sm text-[var(--bg)]"
          style={{ background: "#10B981" }}>
          العودة
        </Link>
      </div>
    );
  }

  const handleToggleAlert = () => {
    if (!alertEnabled) setShowAlertWarning(true);
    else setAlertEnabled(false);
  };

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <div className="px-5 py-4 flex items-center justify-between glass border-b border-[var(--border)] sticky top-0 z-10">
        <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition">
          ← الرئيسية
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg">👨‍👦</span>
          <span className="font-black text-[var(--text)]">بوابة سند</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isActiveToday ? "bg-[var(--success)] animate-pulse" : "bg-[var(--border)]"}`} />
          <span className={`text-xs font-bold ${isActiveToday ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
            {isActiveToday ? "نشط اليوم" : "لم يبدأ"}
          </span>
        </div>
      </div>

      <div className="px-5 pt-5 pb-16 max-w-lg mx-auto">

        {/* Student card */}
        <div className="rounded-2xl p-5 mb-5"
          style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.03))", border: "1.5px solid rgba(16,185,129,0.3)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: "rgba(16,185,129,0.2)" }}>
              {BIRD_ICONS[user.bird] ?? "🦅"}
            </div>
            <div>
              <p className="font-black text-[var(--text)]">{user.name}</p>
              <p className="text-xs text-[var(--text-muted)]">طالب {user.exam}</p>
            </div>
            <div className="mr-auto flex items-center gap-1.5 glass px-3 py-1.5 rounded-full">
              <span className="text-sm streak-fire">🔥</span>
              <span className="font-mono-nums font-bold text-sm text-[var(--gold)]">{streak}</span>
            </div>
          </div>

          {/* Status */}
          <div className="rounded-xl p-3 flex items-center gap-3 mb-4"
            style={isActiveToday
              ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }
              : { background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <span className="text-2xl">{isActiveToday ? "⏱️" : "💤"}</span>
            <div>
              <p className={`font-bold text-sm ${isActiveToday ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
                {isActiveToday ? "أكمل جلسة اليوم" : "لم يبدأ اليوم بعد"}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {orbit?.sessionsToday ? `${orbit.sessionsToday} جلسة اليوم` : "لا جلسات اليوم"}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="glass rounded-xl p-2">
              <p className="font-mono-nums font-black text-lg text-[var(--blue-light)]">{focusHours}</p>
              <p className="text-[9px] text-[var(--text-muted)]">ساعة تركيز</p>
            </div>
            <div className="glass rounded-xl p-2">
              <p className="font-mono-nums font-black text-lg text-[var(--gold)]">{roadmapPct}%</p>
              <p className="text-[9px] text-[var(--text-muted)]">تقدم الخريطة</p>
            </div>
            <div className="glass rounded-xl p-2">
              <p className="font-mono-nums font-black text-lg text-[var(--danger)]">{vaultCount}</p>
              <p className="text-[9px] text-[var(--text-muted)]">في الخزنة</p>
            </div>
          </div>
        </div>

        {/* All-time stats */}
        <div className="glass rounded-2xl p-5 mb-5">
          <h3 className="font-bold text-sm text-[var(--text)] mb-4">الإحصاءات الكاملة</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: orbit?.totalSessions ?? 0, label: "إجمالي الجلسات",    unit: "جلسة", color: "var(--blue-light)" },
              { val: orbit?.totalSilver   ?? 0, label: "السيلفر المكتسب",   unit: "🪙",   color: "var(--gold)"      },
              { val: focusHours,                label: "ساعات التركيز",      unit: "ساعة", color: "var(--success)"   },
              { val: vaultCount,                label: "أسئلة في الخزنة",   unit: "سؤال", color: "var(--danger)"    },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-4 text-center">
                <p className="font-mono-nums font-black text-2xl" style={{ color: s.color }}>{s.val}</p>
                <p className="text-xs font-bold text-[var(--text)] mt-0.5">{s.unit}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="glass rounded-2xl p-5 mb-5">
          <h3 className="font-bold text-sm text-[var(--text)] mb-4">إعدادات المتابعة</h3>
          <div className="space-y-4">
            {[
              { label: "حالة الطالب (يذاكر/أنهى)" },
              { label: "تقارير أداء أسبوعية" },
              { label: "مقارنة بالمتوسط العام" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-dim)]">{item.label}</span>
                <div className="w-11 h-6 rounded-full flex items-center px-0.5" style={{ background: "#10B981" }}>
                  <div className="w-5 h-5 bg-white rounded-full mr-auto" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-[var(--text-dim)]">إشعار التغيب الفوري</span>
                <span className="block text-[10px] text-[var(--text-muted)]">⚠️ مغلق افتراضياً</span>
              </div>
              <button onClick={handleToggleAlert}
                className="w-11 h-6 rounded-full flex items-center px-0.5 transition"
                style={{ background: alertEnabled ? "#EF4444" : "var(--border)" }}>
                <div className="w-5 h-5 bg-white rounded-full transition-transform"
                  style={{ transform: alertEnabled ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>
          </div>
        </div>

        {/* Feathers */}
        <div className="glass rounded-2xl p-5 mb-5">
          <h3 className="font-bold text-sm text-[var(--text)] mb-3">ريش الفخر 🪶</h3>
          <p className="text-xs text-[var(--text-dim)] mb-3">أرسل لابنك ريشة بيضاء عند الإنجاز</p>
          <div className="flex gap-3">
            <div className="flex-1 glass rounded-xl p-3 text-center cursor-pointer transition">
              <p className="text-xl mb-1">🪶</p>
              <p className="text-xs text-white font-bold">بيضاء</p>
            </div>
            <div className="flex-1 glass rounded-xl p-3 text-center cursor-pointer transition">
              <p className="text-xl mb-1">✨</p>
              <p className="text-xs text-[var(--gold)] font-bold">ذهبية</p>
            </div>
          </div>
        </div>

        {/* Pricing CTA */}
        <div className="rounded-2xl p-5 text-center"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <p className="font-black text-lg text-[var(--success)] mb-1">سند — 49 ريال/شهر</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">ابن واحد مجاناً · خصم 50% لأخ أو أخت</p>
          <button className="w-full py-3 rounded-2xl font-bold text-sm text-[var(--bg)]"
            style={{ background: "#10B981" }}>
            اشترك في سند الآن
          </button>
        </div>
      </div>

      {showAlertWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-3xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <p className="text-2xl mb-2">💡</p>
              <p className="font-black text-base text-[var(--gold)]">نصيحة من درب</p>
            </div>
            <p className="text-sm text-[var(--text-dim)] leading-relaxed mb-5 text-center">
              الإشعار الفوري قد يشعر ابنك بالضغط الزائد. نوصي بمتابعة التقرير الأسبوعي.
            </p>
            <div className="space-y-2">
              <button onClick={() => setShowAlertWarning(false)}
                className="w-full py-3 rounded-2xl font-bold text-sm text-[var(--bg)]"
                style={{ background: "#10B981" }}>
                اكتفِ بالتقرير الأسبوعي
              </button>
              <button onClick={() => { setAlertEnabled(true); setShowAlertWarning(false); }}
                className="w-full py-2 text-xs text-[var(--text-muted)]">
                فعّل رغم ذلك
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
