"use client";
/* ─── مضيف نقاط العودة (Retention Host) ───
   يُركَّب مرة في الداشبورد، ويقرّر — حسب أولوية واضحة — أي بطاقة عودة تظهر:
   احتفال معلم ← ترحيب بالعودة ← استعادة ستريك ← تقرير أسبوعي ← تسجيل اليوم.
   يعرض عنصراً واحداً «حدثاً» + تسجيل اليوم كحد أقصى حتى لا نُرهق الطالب. */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Confetti from "@/components/Confetti";
import { loadStats, loadSessionLog, loadUser } from "@/lib/storage";
import { subjectsForTracks, type TrackId } from "@/lib/tracks";
import { computeWeeklyReport, fmtMins, type WeeklyReportData } from "@/lib/weeklyReport";
import { buildDuwairbProfile } from "@/lib/duwairb";
import { trackEvent } from "@/lib/analytics";
import {
  daysAway, recordOpenToday, comebackSummary,
  pendingMilestone, markMilestoneSeen,
  streakBreak, canUseRecovery, applyRecovery,
  shouldShowWeekly, markWeeklySeen,
} from "@/lib/retention";

type View =
  | { type: "milestone"; pct: number }
  | { type: "welcome"; away: number }
  | { type: "recovery"; priorStreak: number }
  | { type: "weekly" };

const ar = (n: number) => n.toLocaleString("ar");

/* ── غلاف ورقة سفلية موحّد ── */
function Sheet({ children, onClose, closeLabel = "تمام" }: { children: React.ReactNode; onClose: () => void; closeLabel?: string }) {
  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-end justify-center p-4 pb-8"
      role="dialog" aria-modal="true"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4 slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}>
        {children}
        <button onClick={onClose} className="w-full py-3 rounded-2xl text-[15px] font-black transition active:scale-[0.98]"
          style={{ background: "var(--accent)", color: "#fff" }}>{closeLabel}</button>
      </div>
    </div>,
    document.body,
  );
}

export default function RetentionHost() {
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState<View[]>([]);
  const [idx, setIdx] = useState(0);

  /* بيانات مشتركة للعرض (تُحمَّل مرة) */
  const data = useMemo(() => {
    if (typeof window === "undefined") return null;
    const stats = loadStats();
    const log = loadSessionLog();
    const weekly = computeWeeklyReport(stats, log);
    const { profile, goalLine } = buildDuwairbProfile();
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const subjects = subjectsForTracks(ids.length ? ids : (["تحصيلي"] as TrackId[])).map((s) => s.name);
    return { stats, weekly, profile, goalLine, subjects };
  }, []);

  /* بناء الطابور مرة واحدة فقط — الحارس يمنع إعادة التشغيل (StrictMode في
     التطوير يُشغّل الـ effect مرتين، وهذا الـ effect يُحدِّث lastOpen فيجب ألا يتكرر) */
  const initRef = useRef(false);
  useEffect(() => {
    if (!data || initRef.current) return;
    initRef.current = true;
    const away = daysAway();          // يُقرأ قبل التحديث
    const events: View[] = [];
    const ms = pendingMilestone(data.stats);
    const brk = streakBreak(data.stats);
    if (ms != null) events.push({ type: "milestone", pct: ms });
    else if (away >= 3) events.push({ type: "welcome", away });
    else if (brk.broke && canUseRecovery()) events.push({ type: "recovery", priorStreak: brk.priorStreak });
    else if (shouldShowWeekly(data.weekly.hasData)) events.push({ type: "weekly" });

    const q: View[] = [...events];

    recordOpenToday();
    setQueue(q);
    setReady(true);
  }, [data]);

  /* تعليم «شوهد» + تحليلات عند ظهور كل بطاقة */
  useEffect(() => {
    if (!ready) return;
    const v = queue[idx];
    if (!v) return;
    if (v.type === "milestone") { markMilestoneSeen(v.pct); trackEvent("milestone_reached", { pct: v.pct }); }
    if (v.type === "weekly")    { markWeeklySeen(); trackEvent("weekly_report_viewed", {}); }
    if (v.type === "welcome")   { trackEvent("comeback_shown", { daysAway: daysAway() }); }
  }, [ready, idx, queue]);

  if (!ready || !data) return null;
  const v = queue[idx];
  if (!v) return null;
  const next = () => setIdx((i) => i + 1);

  switch (v.type) {
    case "milestone":   return <MilestoneView pct={v.pct} goalLine={data.goalLine} onClose={next} />;
    case "welcome":     return <WelcomeView away={v.away} onClose={next} />;
    case "recovery":    return <RecoveryView priorStreak={v.priorStreak} onClose={next} />;
    case "weekly":      return <WeeklyView weekly={data.weekly} profile={data.profile} goalLine={data.goalLine} onClose={next} />;
    default:            return null;
  }
}

/* ════════ ٤) احتفال المعلم — Confetti + رسالة دويرب ════════ */
function milestoneText(pct: number): { title: string; emoji: string } {
  switch (pct) {
    case 25:  return { title: "أكملت ربع مسارك!", emoji: "🌱" };
    case 50:  return { title: "وصلت نصف الطريق!", emoji: "🚀" };
    case 75:  return { title: "ثلاثة أرباع المسار!", emoji: "🔥" };
    default:  return { title: "أكملت مسارك بالكامل!", emoji: "🏆" };
  }
}
function MilestoneView({ pct, goalLine, onClose }: { pct: number; goalLine: string | null; onClose: () => void }) {
  const { title, emoji } = milestoneText(pct);
  const msg = goalLine
    ? `كل خطوة تقرّبك من هدفك — ${goalLine}. واصل، إنجازك يتراكم.`
    : "إنجاز يستحق الاحتفال — استمر على نفس الإيقاع.";
  return (
    <>
      <Confetti count={44} />
      {createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
          role="dialog" aria-modal="true"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={onClose}>
          <div className="w-full max-w-sm rounded-3xl p-7 flex flex-col items-center gap-3 text-center slide-up"
            style={{ background: "var(--surface)", border: "2px solid color-mix(in srgb, var(--gold) 45%, transparent)" }}
            onClick={(e) => e.stopPropagation()}>
            <span className="text-[60px] leading-none">{emoji}</span>
            <span className="font-mono-nums font-black text-[34px]" style={{ color: "var(--gold)" }}>{ar(pct)}٪</span>
            <h2 className="text-[20px] font-black" style={{ color: "var(--text)" }}>{title}</h2>
            <div className="rounded-2xl px-4 py-3 w-full" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
              <p className="text-[12px] font-bold mb-0.5" style={{ color: "var(--accent-light)" }}>🤖 رسالة دويرب</p>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text)" }}>{msg}</p>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-2xl text-[15px] font-black mt-1 transition active:scale-[0.98]"
              style={{ background: "var(--gold)", color: "var(--btn-text-on-gold)" }}>يلا نكمّل 🎉</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ════════ ٥) ترحيب بالعودة — تلخيص ما فات ════════ */
function WelcomeView({ away, onClose }: { away: number; onClose: () => void }) {
  const s = useMemo(() => comebackSummary(), []);
  return (
    <Sheet onClose={onClose} closeLabel="رجعت بقوة 💪">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[48px] leading-none">👋</span>
        <h2 className="text-[20px] font-black" style={{ color: "var(--text)" }}>عدت بعد {ar(away)} أيام — اشتقنا لك</h2>
        <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>هذا ملخّص سريع لما فاتك، وخطوة بسيطة ترجّعك للإيقاع.</p>
      </div>
      <div className="flex flex-col gap-2">
        {s.streakBroke && (
          <Row icon="💔" text="انكسر ستريكك خلال غيابك — جلسة اليوم تبدأ سلسلة جديدة." />
        )}
        {s.dueCards > 0 && (
          <Row icon="🃏" text={`${ar(s.dueCards)} بطاقة مراجعة تنتظرك في «بطاقاتي».`} />
        )}
        {s.lastStudyDaysAgo != null && s.lastStudyDaysAgo >= 1 && (
          <Row icon="📆" text={`آخر جلسة مذاكرة قبل ${ar(s.lastStudyDaysAgo)} يوم — رجّعها اليوم.`} />
        )}
        <Row icon="⏱️" text="ابدأ جلسة أوربت قصيرة (٢٥ دقيقة) — أسهل طريقة للعودة." />
      </div>
      <a href="/orbit" className="w-full py-3 rounded-2xl text-[15px] font-black text-center no-underline transition active:scale-[0.98]"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
        ⏱️ ابدأ جلسة الآن
      </a>
    </Sheet>
  );
}
function Row({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <span className="text-[18px] leading-none flex-shrink-0" aria-hidden="true">{icon}</span>
      <p className="text-[13.5px] leading-snug" style={{ color: "var(--text)" }}>{text}</p>
    </div>
  );
}

/* ════════ ٣) استعادة الستريك ════════ */
function RecoveryView({ priorStreak, onClose }: { priorStreak: number; onClose: () => void }) {
  const [done, setDone] = useState(false);
  const [restored, setRestored] = useState(0);
  const recover = () => {
    const r = applyRecovery();
    if (r.ok) { setRestored(r.restored); setDone(true); trackEvent("streak_recovered", { priorStreak }); }
    else onClose();
  };
  if (done) {
    return (
      <>
        <Confetti count={32} />
        <Sheet onClose={onClose} closeLabel="واصل السلسلة 🔥">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-[48px] leading-none">🔥</span>
            <h2 className="text-[20px] font-black" style={{ color: "var(--text)" }}>تم استعادة ستريكك!</h2>
            <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
              رجّعناه إلى {ar(restored)} يوم. ذاكر اليوم حتى لا ينكسر مجدداً — البطاقة تتجدّد بعد ٣٠ يوماً.
            </p>
          </div>
        </Sheet>
      </>
    );
  }
  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-end justify-center p-4 pb-8"
      role="dialog" aria-modal="true"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4 slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[48px] leading-none">💔</span>
          <h2 className="text-[20px] font-black" style={{ color: "var(--text)" }}>انكسر ستريكك ({ar(priorStreak)} يوم)</h2>
          <p className="text-[13.5px]" style={{ color: "var(--text-muted)" }}>
            فاتك يوم واحد فقط. عندك <b style={{ color: "var(--gold)" }}>بطاقة استعادة</b> — تستخدمها مرة كل ٣٠ يوماً لإصلاح السلسلة.
          </p>
        </div>
        <button onClick={recover} className="w-full py-3.5 rounded-2xl text-[15px] font-black transition active:scale-[0.98]"
          style={{ background: "var(--gold)", color: "var(--btn-text-on-gold)" }}>🛟 استخدم بطاقة الاستعادة</button>
        <button onClick={onClose} className="w-full py-2.5 rounded-2xl text-[14px] font-bold"
          style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>لا، أبدأ سلسلة جديدة</button>
      </div>
    </div>,
    document.body,
  );
}

/* ════════ ٢) التقرير الأسبوعي + توصية دويرب ════════ */
function weeklyRecommendation(weekly: WeeklyReportData, weakest: string | undefined, goalLine: string | null): string {
  const parts: string[] = [];
  if (goalLine) parts.push(`${goalLine}.`);
  const weak = weekly.lowSubject?.name ?? weakest;
  if (weak) parts.push(`ركّز هذا الأسبوع على ${weak} — هي الأحوج لرفع جاهزيتك.`);
  if (weekly.deltaPct != null && weekly.deltaPct < 0) parts.push(`ساعاتك نزلت ${ar(Math.abs(weekly.deltaPct))}٪ عن الأسبوع الماضي — رجّع إيقاعك بجلسة اليوم.`);
  else if (weekly.activeDays >= 5) parts.push(`انتظامك ممتاز (${ar(weekly.activeDays)} أيام نشطة) — حافظ عليه.`);
  if (parts.length <= (goalLine ? 1 : 0)) parts.push("ابدأ جلسة أوربت اليوم وابنِ أسبوعاً أقوى.");
  return parts.join(" ");
}
function WeeklyView({ weekly, profile, goalLine, onClose }: { weekly: WeeklyReportData; profile: ReturnType<typeof buildDuwairbProfile>["profile"]; goalLine: string | null; onClose: () => void }) {
  const rec = weeklyRecommendation(weekly, profile.weakest, goalLine);
  const stat = (label: string, value: string) => (
    <div className="rounded-2xl px-3 py-2.5 text-center" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="font-mono-nums font-black text-[18px]" style={{ color: "var(--accent-light)" }}>{value}</p>
      <p className="text-[11.5px] font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
  return (
    <Sheet onClose={onClose} closeLabel="أسبوع جديد، يلا 💪">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[40px] leading-none">📊</span>
        <h2 className="text-[19px] font-black" style={{ color: "var(--text)" }}>تقرير أسبوعك</h2>
        <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>ملخّص آخر ٧ أيام</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stat("ساعات الدراسة", fmtMins(weekly.mins))}
        {stat("عدد الجلسات", ar(weekly.sessions))}
        {stat("أقوى مادة", weekly.topSubject?.name ?? "—")}
        {stat("أضعف مادة", weekly.lowSubject?.name ?? "—")}
      </div>
      <div className="rounded-2xl px-4 py-3.5" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
        <p className="text-[12px] font-bold mb-1" style={{ color: "var(--accent-light)" }}>🤖 توصية دويرب</p>
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--text)" }}>{rec}</p>
      </div>
    </Sheet>
  );
}

