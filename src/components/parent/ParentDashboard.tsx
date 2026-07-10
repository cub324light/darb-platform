"use client";
/* ─── بوابة سند — لوحة الوالد ───
   جواب أربعة أسئلة فقط: هل ابني بخير؟ هل يتقدّم؟ هل يحتاج دعماً؟ ماذا أفعل اليوم؟
   تقرأ بياناتٍ حقيقيةً من درب عبر readParentDigest (لا بيانات تجريبية، لا نظام جديد).
   ترتيبٌ ثابت: بطاقة الطالب ← الحالة ← التقدّم ← الدعم ← الاختبار ← الإنجازات ←
   الاقتراح ← لحظات ← الخصوصية. الوالد يفهمها في أقل من دقيقة. */
import { useMemo, useSyncExternalStore } from "react";
import { readParentDigest, type ParentStatus } from "@/lib/parentDigest";

const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

const STATUS_COLOR: Record<ParentStatus, string> = {
  great: "var(--success)", watch: "var(--gold)", act: "var(--danger)",
};

function Delta({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="t-caption" style={{ color: "var(--text-muted)" }}>— بلا مقارنة</span>;
  const up = pct >= 0;
  return <span className="t-caption font-black font-mono-nums" style={{ color: up ? "var(--success)" : "var(--gold)" }}>{up ? "▲" : "▼"} {Math.abs(pct)}٪ عن الأسبوع الماضي</span>;
}

export default function ParentDashboard() {
  const mounted = useMounted();
  const digest = useMemo(() => (mounted ? readParentDigest() : null), [mounted]);

  if (!mounted) return <div className="h-40" aria-hidden />;

  if (!digest) {
    return (
      <div className="ds-card ds-card-lg flex flex-col items-center text-center gap-3 py-10">
        <span style={{ fontSize: "2.2rem" }}>🌱</span>
        <h2 className="t-h3" style={{ color: "var(--text)" }}>لا توجد بيانات كافية بعد</h2>
        <p className="t-body" style={{ color: "var(--text-dim)", maxWidth: "22rem" }}>
          ستظهر لوحة سند بمجرّد أن يبدأ الطالب رحلته — جلسة مذاكرة أو درسٌ واحد يكفي لتبدأ المتابعة.
        </p>
      </div>
    );
  }

  const { student, status, progress, support, nextExam, achievements, suggestion, moments, alert } = digest;
  const sc = STATUS_COLOR[status.level];

  return (
    <div className="flex flex-col gap-3">
      {/* ١) بطاقة الطالب */}
      <section className="ds-card flex items-center gap-3.5">
        <span className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{ width: 52, height: 52, fontSize: 22, fontWeight: 800, color: "white", background: "linear-gradient(150deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #7c5cf0))" }}>{student.name.charAt(0)}</span>
        <div className="flex-1 min-w-0">
          <h1 className="t-h2" style={{ color: "var(--text)" }}>{student.name}</h1>
          {student.stage && <p className="t-caption" style={{ color: "var(--text-dim)" }}>{student.stage}</p>}
        </div>
        {student.goal && <span className="t-caption font-black px-3 py-1.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>🎯 {student.goal}</span>}
      </section>

      {/* ٢) الحالة العامة — واحدة فقط + جملة قصيرة */}
      <section className="ds-card flex items-center gap-3" style={{ background: `color-mix(in srgb, ${sc} 8%, var(--surface))`, borderColor: `color-mix(in srgb, ${sc} 30%, var(--border))` }}>
        <span style={{ fontSize: "1.6rem" }}>{status.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="t-body font-black" style={{ color: sc }}>{status.label}</p>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>{status.line}</p>
        </div>
      </section>

      {/* تنبيه واحد على الأكثر (عند وجوده) */}
      {alert && (
        <section className="ds-card flex items-start gap-3" style={{ borderRight: "3px solid var(--gold)" }}>
          <span style={{ fontSize: "1.3rem" }}>📢</span>
          <div className="flex-1 min-w-0">
            <p className="t-body font-black" style={{ color: "var(--text)" }}>{alert.title}</p>
            <p className="t-caption" style={{ color: "var(--text-dim)", lineHeight: 1.7 }}>{alert.body}</p>
          </div>
        </section>
      )}

      {/* ٣) التقدّم */}
      <section className="ds-card ds-stack-tight">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>التقدّم هذا الأسبوع</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl px-3 py-3 flex flex-col gap-1" style={{ background: "var(--surface2)" }}>
            <span className="t-caption" style={{ color: "var(--text-muted)" }}>⏱ ساعات الدراسة</span>
            <span className="t-h3 font-black font-mono-nums" style={{ color: "var(--text)" }}>{progress.hours.value}</span>
            <Delta pct={progress.hours.deltaPct} />
          </div>
          <div className="rounded-xl px-3 py-3 flex flex-col gap-1" style={{ background: "var(--surface2)" }}>
            <span className="t-caption" style={{ color: "var(--text-muted)" }}>📅 الجلسات</span>
            <span className="t-h3 font-black font-mono-nums" style={{ color: "var(--text)" }}>{progress.sessions.value}</span>
            <span className="t-caption font-black font-mono-nums" style={{ color: progress.sessions.delta >= 0 ? "var(--success)" : "var(--gold)" }}>
              {progress.sessions.delta > 0 ? `+${progress.sessions.delta}` : progress.sessions.delta} عن الماضي
            </span>
          </div>
          <div className="rounded-xl px-3 py-3 flex flex-col gap-1" style={{ background: "var(--surface2)" }}>
            <span className="t-caption" style={{ color: "var(--text-muted)" }}>🔥 الالتزام</span>
            <span className="t-h3 font-black font-mono-nums" style={{ color: sc }}>{progress.commitmentPct}٪</span>
            <div className="h-1.5 rounded-full overflow-hidden mt-0.5" style={{ background: "var(--surface)" }}>
              <div className="h-full rounded-full" style={{ width: `${progress.commitmentPct}%`, background: sc }} />
            </div>
          </div>
        </div>
      </section>

      {/* ٤) يحتاج دعم — مادة واحدة + ٥) الاختبار القادم */}
      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-3">
        {support && (
          <section className="ds-card ds-stack-tight" style={{ borderColor: "color-mix(in srgb, var(--gold) 30%, var(--border))" }}>
            <h2 className="t-h3" style={{ color: "var(--text)" }}>⚠️ يحتاج دعماً في</h2>
            <p className="t-h3 font-black" style={{ color: "var(--gold)" }}>{support.subject}</p>
            <p className="t-caption" style={{ color: "var(--text-dim)", lineHeight: 1.7 }}>{support.reason}</p>
          </section>
        )}
        {nextExam && (
          <section className="ds-card ds-stack-tight">
            <h2 className="t-h3" style={{ color: "var(--text)" }}>📅 الاختبار القادم</h2>
            <p className="t-h3 font-black" style={{ color: "var(--text)" }}>{nextExam.name}</p>
            <p className="t-body" style={{ color: "var(--accent-light)" }}>بعد {nextExam.days} يوماً</p>
          </section>
        )}
      </div>

      {/* ٦) الإنجازات */}
      {achievements.length > 0 && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>🏆 آخر الإنجازات</h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((a, i) => (
              <span key={i} className="t-caption font-black flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                <span style={{ fontSize: "1.05rem" }}>{a.icon}</span> {a.text}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ٧) اقتراح واحد للوالد */}
      {suggestion && (
        <section className="ds-card flex items-start gap-3" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border))" }}>
          <span style={{ fontSize: "1.3rem" }}>💡</span>
          <div className="flex-1 min-w-0">
            <p className="t-caption font-black" style={{ color: "var(--accent-light)" }}>اقتراحنا لك اليوم</p>
            <p className="t-body" style={{ color: "var(--text)", lineHeight: 1.8 }}>{suggestion}</p>
          </div>
        </section>
      )}

      {/* لحظات تستحق أن تعرفها */}
      {moments.length > 0 && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>لحظات تستحق أن تعرفها</h2>
          <div className="flex flex-col gap-2">
            {moments.map((m, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                <span style={{ fontSize: "1.2rem" }}>{m.icon}</span>
                <span className="t-body" style={{ color: "var(--text-dim)" }}>{m.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* الخصوصية */}
      <section className="ds-card ds-stack-tight">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>🛡️ خصوصية مطمئنة — بلا تجسّس</h2>
        <p className="t-caption" style={{ color: "var(--text-dim)", lineHeight: 1.8 }}>
          ترى تقدّمه العام والتزامه وأين يحتاج دعماً وإنجازاته — <span style={{ color: "var(--text-muted)" }}>ولا ترى محادثات دويرب، ولا أخطاءه المفصّلة، ولا حلول الأسئلة، ولا سجلّ نشاطه الكامل. الملخّص فقط.</span>
        </p>
      </section>
    </div>
  );
}
