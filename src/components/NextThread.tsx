"use client";
/* ─── خيطُ «الخطوة التالية» — يُوضع أسفل كل صفحة ───
   كانت صفحاتُ درب على الجوال غرفاً مغلقة: «مساري» و«أوربت» و«أخطائي» بصفر روابطَ
   سياقية، ومخرجُها الوحيد الشريط السفلي. هذا الخيط يحمل عمل الطالب إلى الصفحة
   التي تُكمله، مشتقّاً من حالته الحقيقية.

   القرار في `pageThread` (نقيٌّ ومُختبَر)، وهنا الـIO والعرض فقط — بحسب قاعدة P1. */
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { pageThread, type PageThread, type ThreadPage, type ThreadSignals } from "@/lib/pageThread";
import { readLifeContext, lifeEngine } from "@/lib/lifeEngine";
import { loadStats, loadList, loadEvents, loadGoals, loadUser, loadAdmissions } from "@/lib/storage";
import { arcNext, type ArcStep } from "@/lib/uniJourney";
import { phaseExperience } from "@/lib/experience";
import { isUniversityGraduate } from "@/lib/phase";
import { loadHomework, homeworkPressure } from "@/lib/homework";
import { getEventsForDate } from "@/lib/schedule";
import type { VaultError } from "@/lib/types";

const localDayKey = (d = new Date()): string => {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/* خطوةُ القوس — تُقرأ من تخزينٍ قائم كلِّه، ولا تُعرض لمن لم يفتح عالمُ القبول له
   بعد (أول/ثاني ثانوي في وضع الاستكشاف): الرحلةُ تبدأ حين تصير قراراً. */
function readJourney(): ArcStep | null {
  const u = loadUser();
  const exp = phaseExperience(u);
  const open = exp.admission === "full" || exp.phase === "university" || isUniversityGraduate(u);
  if (!open) return null;

  const goals = loadGoals();
  const apps = loadAdmissions();
  return arcNext({
    phase: exp.phase,
    isUniversityGraduate: isUniversityGraduate(u),
    hasMajor: !!(goals.major || goals.majorId),
    hasUniversity: !!(goals.universityId || goals.university),
    hasTargets: [goals.quduratTarget, goals.tahsiliTarget, goals.stepTarget]
      .some((t) => typeof t === "number" && Number.isFinite(t)),
    applications: apps.length,
    accepted: apps.some((a) => a.status === "accepted"),
    universityYear: u?.universityYear,
    creditHoursCompleted: u?.creditHoursCompleted ?? null,
  });
}

function readSignals(): ThreadSignals {
  const stats = loadStats();
  const goals = loadGoals();
  const today = localDayKey();
  /* «لم تُراجَع» = reviewCount صفر — لا نعدّ ما راجعه الطالب فعلاً */
  const errors = loadList<VaultError>("darb_vault");
  const hw = homeworkPressure(loadHomework(), today);
  return {
    activeErrors: errors.filter((e) => (e.reviewCount ?? 0) === 0).length,
    remainingDrills: 0,
    hasPlanToday: getEventsForDate(today, loadEvents()).length > 0,
    focusMinsToday: stats.todayFocusMins ?? 0,
    homeworkDue: hw.overdue + hw.dueToday,
    hasDestination: !!(goals.universityId || goals.majorId),
    /* كان ثابتاً `true` — فيرى الجامعيُّ والخرّيجُ خيطاً يعيدهما إلى دليل الجامعات.
       المصدرُ الصحيح هو نفسُه الذي يحكم الشريطَ السفليّ والقوائم. */
    admissionOpen: phaseExperience(loadUser()).admission !== "hidden",
    journey: readJourney(),
  };
}

function compute(page: ThreadPage): PageThread | null {
  try {
    return pageThread(page, lifeEngine(readLifeContext()), readSignals());
  } catch {
    return null;   // لا نُسقط الصفحة من أجل خيطٍ مساعد
  }
}

/* ⚠ `getSnapshot` يجب أن يُعيد المرجع نفسه ما لم تتغيّر البيانات، وإلا دار React
   في حلقةِ رسمٍ لا تنتهي. فنحسب مرّةً ونُخزّن، ولا نُبطِل الخزنة إلا عند حدثٍ
   يغيّر الحالة فعلاً (حفظُ جدولٍ أو تغيّرُ تخزين). */
let cache: { page: ThreadPage; value: PageThread | null } | null = null;
const listeners = new Set<() => void>();

const invalidate = () => {
  cache = null;
  for (const l of listeners) l();
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("darb:eventsChanged", invalidate);
  window.addEventListener("storage", invalidate);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      window.removeEventListener("darb:eventsChanged", invalidate);
      window.removeEventListener("storage", invalidate);
    }
  };
};

const snapshot = (page: ThreadPage): PageThread | null => {
  if (!cache || cache.page !== page) cache = { page, value: compute(page) };
  return cache.value;
};

/** وسطاءُ تسليمٍ إلى `/orbit` تعرفها الصفحةُ ولا يعرفها المحرّك النقيّ (جلسةُ
    اليوم مثلاً). تُلحَق بالخيط فقط إن كانت وجهتُه التركيز — فلا يفتح المؤقّت
    فارغاً وقد كان في الصفحة جلسةٌ مجدولة. */
export default function NextThread(
  { page, orbitHandoff }: { page: ThreadPage; orbitHandoff?: string },
) {
  const thread = useSyncExternalStore(subscribe, () => snapshot(page), () => null);
  if (!thread) return null;

  const href = orbitHandoff && thread.href === "/orbit"
    ? `/orbit?${orbitHandoff}`
    : thread.href;

  return (
    <section className="px-5 pb-2 max-w-lg mx-auto w-full">
      <Link
        href={href}
        className="ds-card ds-card-tight flex items-center gap-3 no-underline transition active:scale-[0.99]"
        style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))" }}
      >
        <span
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-[20px] flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)" }}
          aria-hidden="true"
        >
          {thread.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block t-caption" style={{ color: "var(--text-muted)" }}>{thread.reason}</span>
          <span className="block t-body font-black truncate" style={{ color: "var(--text)" }}>{thread.cta}</span>
        </span>
        <span className="t-body font-black flex-shrink-0" style={{ color: "var(--accent-light)" }} aria-hidden="true">←</span>
      </Link>
    </section>
  );
}
