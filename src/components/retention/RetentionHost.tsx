"use client";
/* ─── مضيف نقاط العودة (Retention Host) ───
   يُركَّب مرة في لوحة الطالب. يقرّر — حسب الأولوية نفسها — أي حدثٍ يُعرض:
   احتفال معلم ← ترحيب بالعودة ← استعادة ستريك ← تقرير أسبوعي، ويسجّل فتح اليوم.

   ▓ العرض: بانرٌ صغير داخل الصفحة لا نافذةٌ تغطّي الشاشة — لا Popup على لوحة
   الطالب (سرعة الانتقال أولاً). المنطق والبيانات لم تتغيّر: القرار وتسجيل اليوم
   وتعليم «شوهد» واستعادة الستريك كما هي؛ تغيّر الغلاف فقط. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { loadStats, loadSessionLog } from "@/lib/storage";
import { computeWeeklyReport } from "@/lib/weeklyReport";
import { buildDuwairbProfile } from "@/lib/duwairb";
import { trackEvent } from "@/lib/analytics";
import {
  daysAway, recordOpenToday, pendingMilestone, markMilestoneSeen,
  streakBreak, canUseRecovery, applyRecovery, shouldShowWeekly, markWeeklySeen,
} from "@/lib/retention";
import { n as ar } from "@/lib/format";
import { isTourPending, subscribeTour } from "@/lib/firstRun";

type View =
  | { type: "milestone"; pct: number }
  | { type: "welcome"; away: number }
  | { type: "recovery"; priorStreak: number }
  | { type: "weekly" };


const MILESTONE_TITLE: Record<number, string> = {
  25: "أكملت ربع مسارك", 50: "وصلت نصف الطريق", 75: "ثلاثة أرباع المسار", 100: "أكملت مسارك بالكامل",
};

export default function RetentionHost() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [recovered, setRecovered] = useState<number | null>(null);

  /* بيانات العرض (تُحمَّل مرة) */
  const data = useMemo(() => {
    if (typeof window === "undefined") return null;
    const stats = loadStats();
    const weekly = computeWeeklyReport(stats, loadSessionLog());
    const { goalLine } = buildDuwairbProfile();
    return { stats, weekly, goalLine };
  }, []);

  const tourPending = useSyncExternalStore(subscribeTour, isTourPending, () => false);

  /* القرار + تسجيل فتح اليوم — مرة واحدة (حارسٌ ضد StrictMode) */
  const initRef = useRef(false);
  useEffect(() => {
    if (!data || initRef.current) return;
    initRef.current = true;
    const away = daysAway();
    const ms = pendingMilestone(data.stats);
    const brk = streakBreak(data.stats);
    let v: View | null = null;
    if (ms != null) v = { type: "milestone", pct: ms };
    else if (away >= 3) v = { type: "welcome", away };
    else if (brk.broke && canUseRecovery()) v = { type: "recovery", priorStreak: brk.priorStreak };
    else if (shouldShowWeekly(data.weekly.hasData)) v = { type: "weekly" };
    recordOpenToday();
    setView(v);
    setReady(true);
  }, [data]);

  /* تعليم «شوهد» + تحليلات (كما كان) */
  useEffect(() => {
    if (!ready || !view) return;
    if (view.type === "milestone") { markMilestoneSeen(view.pct); trackEvent("milestone_reached", { pct: view.pct }); }
    if (view.type === "weekly")    { markWeeklySeen(); trackEvent("weekly_report_viewed", {}); }
    if (view.type === "welcome")   { trackEvent("comeback_shown", { daysAway: daysAway() }); }
  }, [ready, view]);

  /* الجولة أوّلاً: لا نطلب من الطالب فعلاً وهو تحت حجابها. حين تنتهي يُبثّ
     `TOUR_DONE_EVENT` فيظهر الشريط في الحال بلا إعادة تحميل. */
  if (!ready || !view || dismissed || !data || tourPending) return null;

  const recover = () => {
    const r = applyRecovery();
    if (r.ok) { setRecovered(r.restored); trackEvent("streak_recovered", {}); }
    else setDismissed(true);
  };

  /* ── صياغة البانر لكل حدث ── */
  let emoji = "✨", title = "", text = "", tint = "var(--accent)";
  let action: { label: string; href?: string; onClick?: () => void } | null = null;

  if (recovered != null) {
    emoji = "🔥"; tint = "var(--gold)";
    title = "تم استعادة ستريكك";
    text = `رجّعناه إلى ${ar(recovered)} يوم — ذاكر اليوم حتى لا ينكسر مجدداً.`;
  } else switch (view.type) {
    case "milestone":
      emoji = "🎉"; tint = "var(--gold)";
      title = `${ar(view.pct)}٪ — ${MILESTONE_TITLE[view.pct] ?? "إنجاز جديد"}`;
      text = data.goalLine ? "كل خطوة تقرّبك من هدفك. واصل، إنجازك يتراكم." : "إنجازٌ يستحق الاحتفال — استمر على إيقاعك.";
      break;
    case "welcome":
      emoji = "👋";
      title = `عدت بعد ${ar(view.away)} أيام — اشتقنا لك`;
      text = "أسهل طريقة للعودة: جلسة تركيزٍ قصيرة اليوم.";
      action = { label: "ابدأ جلسة", href: "/orbit" };
      break;
    case "recovery":
      emoji = "💔"; tint = "var(--gold)";
      title = `انكسر ستريكك (${ar(view.priorStreak)} يوم)`;
      text = "عندك بطاقة استعادة تُصلح السلسلة — تُستخدم مرة كل 30 يوماً.";
      action = { label: "🛟 استعد سلسلتك", onClick: recover };
      break;
    case "weekly":
      emoji = "📊";
      title = "تقرير أسبوعك جاهز";
      text = "شاهد ملخّص تركيزك ونصيحة دويرب في قسم «أسبوعك» بالأسفل.";
      break;
  }

  /* ⚠ كان صفاً أفقياً واحداً يحمل أربعة عناصر: إيموجي + نصّ + زرّ فعلٍ
     `whitespace-nowrap` + إغلاق. على شاشة جوّالٍ ضيّقة يبتلع الزرّان العرض فينضغط
     النصّ إلى عمودٍ نحيل من كلمةٍ في السطر — «خرّب الشاشة» كما وصفه المالك.
     الآن صفّان: النصّ يأخذ عرضه كاملاً، والفعلُ تحته بمساحة لمسٍ مريحة. */
  const actionClass = "block w-full text-center text-[15px] font-black px-3 py-2.5 rounded-xl no-underline transition active:scale-[0.99]";
  const actionStyle = { background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint };

  return (
    <div className="mb-4 flex flex-col gap-2.5 rounded-2xl px-4 py-3.5"
      style={{ background: `color-mix(in srgb, ${tint} 9%, var(--surface))`, border: `1px solid color-mix(in srgb, ${tint} 30%, var(--border))` }}>
      <div className="flex items-start gap-3">
        <span className="text-[25px] leading-none flex-shrink-0" aria-hidden="true">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-black" style={{ color: "var(--text)" }}>{title}</p>
          <p className="text-[14px] leading-snug" style={{ color: "var(--text-dim)" }}>{text}</p>
        </div>
        <button onClick={() => setDismissed(true)} aria-label="إغلاق"
          className="tap-44 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[15px] transition active:scale-90"
          style={{ color: "var(--text-muted)", background: "var(--surface2)" }}>✕</button>
      </div>
      {action && (action.href
        ? <a href={action.href} className={actionClass} style={actionStyle}>{action.label}</a>
        : <button onClick={action.onClick} className={actionClass} style={actionStyle}>{action.label}</button>
      )}
    </div>
  );
}
