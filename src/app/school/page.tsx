"use client";
/* ─── صفحة المدرسة — صفحةٌ أساسية في درب ───
   مركز يوم الطالب الدراسي: مذكرة الواجبات (الأهم) + الدروس المطلوبة غداً + الاختبارات
   القادمة + الجدول + المتطلبات + المشاريع + إعلانات المعلمين. تُقرأ الواجبات من
   lib/homework لتصل Life Engine ودويرب. بيانات حقيقية فقط — ما لا نظام له بعد يُعرض
   بصدق («قريباً») لا ببياناتٍ وهمية. */
import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import Dome from "@/components/Dome";
import PageFooter from "@/components/PageFooter";
import NextThread from "@/components/NextThread";
import HomeworkPlanner from "@/components/school/HomeworkPlanner";
import SchoolChecklist from "@/components/school/SchoolChecklist";
import { loadHomework, dueOn, type Homework } from "@/lib/homework";
import { loadTrackExamDates, localDayKey, loadUser } from "@/lib/storage";
import { isUniversityPhase, isGraduatePhase } from "@/lib/phase";
import { getTrack, type TrackId } from "@/lib/tracks";
import { daysUntil } from "@/lib/insights";
import { subjectsFor, trackLabel } from "@/lib/curriculum";
import SchoolTimelineCard from "@/components/SchoolTimelineCard";
import DismissibleNote from "@/components/DismissibleNote";
import dynamic from "next/dynamic";
const DayJournal = dynamic(() => import("@/components/journal/DayJournal"), { ssr: false });
const MemoriesAlbum = dynamic(() => import("@/components/journal/MemoriesAlbum"), { ssr: false });

const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

const addDaysKey = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localDayKey(d); };

function DueTomorrow() {
  const mounted = useMounted();
  const items: Homework[] = mounted ? dueOn(loadHomework(), addDaysKey(1)) : [];
  return (
    <section className="ds-card ds-stack-tight">
      <h2 className="t-h3" style={{ color: "var(--text)" }}>📖 المطلوب غداً</h2>
      {items.length === 0 ? (
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>لا واجبات مستحقّة غداً — أضِفها من المذكرة أعلاه.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((h) => (
            <div key={h.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: "var(--surface2)" }}>
              <span style={{ color: "var(--accent-light)" }}>•</span>
              <span className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{h.title}</span>
              {h.subject && <span className="t-caption" style={{ color: "var(--text-muted)" }}>{h.subject}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingExams() {
  const mounted = useMounted();
  const exams = mounted
    ? Object.entries(loadTrackExamDates())
        .map(([id, date]) => ({ id, name: (() => { try { return getTrack(id as TrackId).title; } catch { return id; } })(), date, days: daysUntil(date) }))
        .filter((e) => e.days != null && e.days >= 0)
        .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
    : [];
  return (
    <section className="ds-card ds-stack-tight">
      <h2 className="t-h3" style={{ color: "var(--text)" }}>🧪 الاختبارات القادمة</h2>
      {exams.length === 0 ? (
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>لم تُحدَّد مواعيد اختبارات بعد — حدّدها من صفحتك الرئيسية.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {exams.map((e) => (
            <div key={e.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: "var(--surface2)" }}>
              <span className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{e.name}</span>
              <span className="t-caption font-black" style={{ color: (e.days ?? 99) <= 14 ? "var(--gold)" : "var(--accent-light)" }}>بعد {e.days} يوماً</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* المواد الدراسية — تُجلب تلقائياً من نظام المنهج حسب المسار+الصف+الفصل.
   تظهر لثاني/ثالث ثانوي فقط (أول ثانوي بلا مسارٍ بعد → لا مواد). */
function CurriculumSubjects() {
  const mounted = useMounted();
  const u = mounted ? loadUser() : null;
  const subjects = mounted ? subjectsFor(u?.academicTrack, u?.grade, u?.academicTerm) : [];
  if (!mounted || subjects.length === 0) return null;
  const trackLbl = u?.academicTrack ? trackLabel(u.academicTrack) : "";
  const termLbl = u?.academicTerm === "second" ? "الفصل الثاني" : u?.academicTerm === "summer" ? "الفصل الثالث" : "الفصل الأول";
  return (
    <section className="ds-card ds-stack-tight">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>📚 المواد الدراسية</h2>
        <span className="t-caption font-bold px-3 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>{trackLbl} · {termLbl}</span>
      </div>
      <p className="t-caption" style={{ color: "var(--text-muted)" }}>موادك هذا الفصل حسب مسارك — يستخدمها دويرب لتركيز خطتك.</p>
      <div className="flex flex-wrap gap-2">
        {subjects.map((s) => (
          <span key={s} className="t-caption font-bold px-3 py-1.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>{s}</span>
        ))}
      </div>
    </section>
  );
}

export default function SchoolPage() {
  /* حارس الأهلية — «المدرسة» للثانوي فقط، لا تظهر للجامعي/الخريج إطلاقاً
     (الشريط السفلي يخفيها، وهذا يمنع الوصول المباشر بالرابط أيضاً) */
  const user = useMemo(() => loadUser(), []);
  if (isUniversityPhase(user) || isGraduatePhase(user)) {
    return (
      <div className="page desk-wide">
        <Dome compact>
          <div className="flex items-center justify-between">
            <h1 className="title-lg grad-title">المدرسة</h1>
          </div>
        </Dome>
        <div className="px-5 mt-8">
          <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[45px] mb-2">🎓</p>
            <p className="t-h3 mb-2" style={{ color: "var(--text)" }}>هذا القسم لطلاب المدرسة</p>
            <p className="t-body" style={{ color: "var(--text-muted)" }}>
              «المدرسة» (الواجبات والجدول والمتطلبات) مخصّصة للمرحلة الثانوية. مكانك «المستقبل».
            </p>
            <Link href="/future" className="inline-block mt-4 px-5 py-2.5 rounded-2xl font-bold text-[16px] no-underline"
              style={{ background: "var(--accent)", color: "#fff" }}>
              ← المستقبل
            </Link>
          </div>
        </div>
        <div className="h-6" />
        <NextThread page="/school" />
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="page desk-wide">
      {/* اسم الصفحة في القبّة تحت الساعة والفضّة — كما في بقية الصفحات.
          بلا إيموجي: grad-title يضع color: transparent فيحوّل المِحرَف إلى كتلةٍ ملوّنة. */}
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg grad-title">المدرسة</h1>
        </div>
      </Dome>
      <div className="h-4" />
      <div className="page-content flex flex-col gap-3">
        <DismissibleNote id="school-intro" title="يومك الدراسي">
          واجباتك ودروسك واختباراتك ومتطلباتك في مكانٍ واحد — تُنظّم ضغطك الحقيقي، لا الاختبارات وحدها.
        </DismissibleNote>

        {/* التقويم: «كم باقي؟» أولاً — سؤالُ الطالب الأول عند فتح المدرسة */}
        <SchoolTimelineCard />

        {/* المواد الدراسية — من نظام المنهج (المسار+الصف+الفصل) */}
        <CurriculumSubjects />

        {/* الأهم: مذكرة الواجبات */}
        <HomeworkPlanner />

        {/* دفترُ اليوم: يرسم أو يجدول أو يكتب — والصورُ في ألبوم جوّاله */}
        <DayJournal />
        <MemoriesAlbum />

        {/* المطلوب غداً + الاختبارات القادمة */}
        <div className="grid grid-cols-1 min-[560px]:grid-cols-2 gap-3">
          <DueTomorrow />
          <UpcomingExams />
        </div>

        {/* الجدول الدراسي — يربط الواجبات باليوم */}
        <Link href="/plan" className="ds-card ds-card-interactive flex items-center gap-3 no-underline">
          <span className="text-[25px]">📅</span>
          <span className="flex flex-col flex-1 min-w-0">
            <span className="t-body font-black" style={{ color: "var(--text)" }}>الجدول الدراسي</span>
            <span className="t-caption" style={{ color: "var(--text-muted)" }}>نظّم مواعيد يومك واربط واجباتك بالأيام</span>
          </span>
          <span className="t-caption" style={{ color: "var(--accent-light)" }}>افتح ↗</span>
        </Link>

        {/* المتطلبات + المشاريع */}
        <SchoolChecklist storageKey="darb_school_requirements" title="قائمة المتطلبات" icon="🎒" placeholder="آلة حاسبة، كتاب الرياضيات، ملف بلاستيكي…" />
        <SchoolChecklist storageKey="darb_school_projects" title="المشاريع" icon="📂" placeholder="مشروع + المادة (مثل: بحث الأحياء)…" />

        {/* إعلانات المعلمين — بصدق: يحتاج نظام معلّمين (قريباً) */}
        <section className="ds-card ds-stack-tight" style={{ opacity: 0.85 }}>
          <h2 className="t-h3" style={{ color: "var(--text)" }}>📢 إعلانات المعلمين</h2>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>ستظهر هنا إعلانات معلميك عند ربط مدرستك بدرب — قريباً. لن نعرض بياناتٍ تجريبية.</p>
        </section>
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
