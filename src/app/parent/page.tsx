"use client";
import { useState } from "react";
import Link from "next/link";

const WEEKLY_STATS = [
  { day: "الأحد", mins: 180, sessions: 3 },
  { day: "الاثنين", mins: 100, sessions: 2 },
  { day: "الثلاثاء", mins: 0, sessions: 0 },
  { day: "الأربعاء", mins: 200, sessions: 4 },
  { day: "الخميس", mins: 150, sessions: 3 },
  { day: "الجمعة", mins: 50, sessions: 1 },
  { day: "السبت", mins: 250, sessions: 5 },
];

const maxMins = Math.max(...WEEKLY_STATS.map((d) => d.mins));

export default function ParentPage() {
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [showAlertWarning, setShowAlertWarning] = useState(false);

  const handleToggleAlert = () => {
    if (!alertEnabled) {
      setShowAlertWarning(true);
    } else {
      setAlertEnabled(false);
    }
  };

  const confirmAlert = () => {
    setAlertEnabled(true);
    setShowAlertWarning(false);
  };

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between glass border-b border-[var(--border)] sticky top-0 z-10">
        <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition">
          ← الرئيسية
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg">👨‍👦</span>
          <span className="font-black text-[var(--text)]">بوابة سند</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-xs text-[var(--success)]">مباشر</span>
        </div>
      </div>

      <div className="px-5 pt-5 pb-16 max-w-lg mx-auto">
        {/* Son status card */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.03))",
            border: "1.5px solid rgba(16,185,129,0.3)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: "rgba(16,185,129,0.2)" }}
            >
              🦅
            </div>
            <div>
              <p className="font-black text-[var(--text)]">فهد — الصقر</p>
              <p className="text-xs text-[var(--text-muted)]">طالب التحصيلي · شاهين</p>
            </div>
            <div className="mr-auto flex items-center gap-1.5 glass px-3 py-1.5 rounded-full">
              <span className="text-sm streak-fire">🔥</span>
              <span className="font-mono-nums font-bold text-sm text-[var(--gold)]">7</span>
            </div>
          </div>

          {/* Current status */}
          <div
            className="rounded-xl p-3 flex items-center gap-3 mb-4"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <span className="text-2xl">⏱️</span>
            <div>
              <p className="font-bold text-sm text-[var(--success)]">يذاكر الآن</p>
              <p className="text-xs text-[var(--text-muted)]">جلسة Orbit · فيزياء · 23 دقيقة مضت</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="glass rounded-xl p-2">
              <p className="font-mono-nums font-black text-lg text-[var(--blue-light)]">24</p>
              <p className="text-[9px] text-[var(--text-muted)]">ساعة تركيز</p>
            </div>
            <div className="glass rounded-xl p-2">
              <p className="font-mono-nums font-black text-lg text-[var(--gold)]">35%</p>
              <p className="text-[9px] text-[var(--text-muted)]">تقدم الخريطة</p>
            </div>
            <div className="glass rounded-xl p-2">
              <p className="font-mono-nums font-black text-lg text-[var(--danger)]">8</p>
              <p className="text-[9px] text-[var(--text-muted)]">في الخزنة</p>
            </div>
          </div>
        </div>

        {/* Weekly chart */}
        <div className="glass rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[var(--text)]">نشاط الأسبوع</h3>
            <span className="text-xs text-[var(--text-muted)]">بالدقائق</span>
          </div>
          <div className="flex items-end gap-2 h-20">
            {WEEKLY_STATS.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: "60px" }}>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: d.mins === 0 ? "4px" : (d.mins / maxMins) * 60 + "px",
                      background: d.mins === 0 ? "var(--border)" : "linear-gradient(180deg, #3B82F6, #1D4ED8)",
                    }}
                  />
                </div>
                <span className="text-[8px] text-[var(--text-muted)]">{d.day.slice(0, 1)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--text-dim)] mt-3 text-center">
            إجمالي هذا الأسبوع:{" "}
            <strong className="text-[var(--blue-light)]">
              {Math.round(WEEKLY_STATS.reduce((a, d) => a + d.mins, 0) / 60)} ساعة
            </strong>
          </p>
        </div>

        {/* Comparison */}
        <div className="glass rounded-2xl p-5 mb-5">
          <h3 className="font-bold text-sm text-[var(--text)] mb-3">مقارنة بالمتوسط</h3>
          <div className="space-y-3">
            {[
              { label: "ساعات التركيز", son: 70, avg: 50, unit: "%" },
              { label: "الاتساق اليومي", son: 85, avg: 60, unit: "%" },
              { label: "الخزنة (مراجعة أخطاء)", son: 40, avg: 30, unit: "%" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-dim)]">{row.label}</span>
                  <span className="text-[var(--success)]">أفضل من {row.avg}% من الطلاب</span>
                </div>
                <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full"
                    style={{ width: row.avg + "%", background: "rgba(100,116,139,0.5)" }}
                  />
                  <div
                    className="h-full rounded-full absolute top-0 right-0 transition-all"
                    style={{ width: (100 - row.son) + "%", background: "transparent" }}
                  />
                  <div
                    className="h-full rounded-full absolute top-0 left-0"
                    style={{ width: row.son + "%", background: "#10B981", opacity: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="glass rounded-2xl p-5 mb-5">
          <h3 className="font-bold text-sm text-[var(--text)] mb-4">إعدادات المتابعة</h3>

          {/* Feature toggles */}
          <div className="space-y-4">
            {[
              { label: "حالة الابن (يذاكر/أنهى)", enabled: true, locked: true },
              { label: "تقارير أداء أسبوعية", enabled: true, locked: true },
              { label: "مقارنة بالمتوسط العام", enabled: true, locked: true },
              { label: "رسائل دعم بعد الجلسة", enabled: true, locked: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-dim)]">{item.label}</span>
                <div
                  className="w-11 h-6 rounded-full flex items-center px-0.5"
                  style={{ background: "#10B981" }}
                >
                  <div className="w-5 h-5 bg-white rounded-full mr-auto transition" />
                </div>
              </div>
            ))}

            {/* Instant alert — disabled by default with warning */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-[var(--text-dim)]">إشعار التغيب الفوري</span>
                <span className="block text-[10px] text-[var(--text-muted)]">⚠️ مغلق افتراضياً (انظر تحذير درب)</span>
              </div>
              <button
                onClick={handleToggleAlert}
                className="w-11 h-6 rounded-full flex items-center px-0.5 transition"
                style={{ background: alertEnabled ? "#EF4444" : "var(--border)" }}
              >
                <div
                  className="w-5 h-5 bg-white rounded-full transition-transform"
                  style={{ transform: alertEnabled ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Feathers */}
        <div className="glass rounded-2xl p-5 mb-5">
          <h3 className="font-bold text-sm text-[var(--text)] mb-3">ريش الفخر 🪶</h3>
          <p className="text-xs text-[var(--text-dim)] mb-3">أرسل لابنك ريشة بيضاء عند الإنجاز</p>
          <div className="flex gap-3">
            <div className="flex-1 glass rounded-xl p-3 text-center cursor-pointer hover:border-white/20 transition">
              <p className="text-xl mb-1">🪶</p>
              <p className="text-xs text-white font-bold">بيضاء</p>
              <p className="text-[9px] text-[var(--text-muted)]">من الوالد</p>
            </div>
            <div className="flex-1 glass rounded-xl p-3 text-center cursor-pointer hover:border-yellow-500/20 transition">
              <p className="text-xl mb-1">✨</p>
              <p className="text-xs text-[var(--gold)] font-bold">ذهبية</p>
              <p className="text-[9px] text-[var(--text-muted)]">إنجاز خاص</p>
            </div>
          </div>
        </div>

        {/* Pricing CTA */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <p className="font-black text-lg text-[var(--success)] mb-1">سند — 49 ريال/شهر</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">ابن واحد مجاناً · خصم 50% لأخ أو أخت</p>
          <button
            className="w-full py-3 rounded-2xl font-bold text-sm text-[var(--bg)] transition"
            style={{ background: "#10B981" }}
          >
            اشترك في سند الآن
          </button>
        </div>
      </div>

      {/* Alert warning modal */}
      {showAlertWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-3xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <p className="text-2xl mb-2">💡</p>
              <p className="font-black text-base text-[var(--gold)]">نصيحة من درب</p>
            </div>
            <p className="text-sm text-[var(--text-dim)] leading-relaxed mb-5 text-center">
              الإشعار الفوري قد يشعر ابنك بالضغط الزائد ويؤثر على تركيزه.
              نوصي بمتابعة التقرير الأسبوعي بدلاً من ذلك.
            </p>
            <p className="text-xs text-[var(--text-muted)] text-center mb-5">
              هل أنت متأكد من التفعيل؟
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setShowAlertWarning(false)}
                className="w-full py-3 rounded-2xl font-bold text-sm text-[var(--bg)]"
                style={{ background: "#10B981" }}
              >
                اكتفِ بالتقرير الأسبوعي
              </button>
              <button
                onClick={confirmAlert}
                className="w-full py-2 text-xs text-[var(--text-muted)]"
              >
                فعّل رغم ذلك
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
