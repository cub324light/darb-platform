"use client";
/* ─── صفحة المدرسة — صفحةٌ أساسية في درب ───
   مركز يوم الطالب الدراسي: مذكرة الواجبات (الأهم) + الدروس المطلوبة غداً + الاختبارات
   القادمة + الجدول + المتطلبات + المشاريع + إعلانات المعلمين. تُقرأ الواجبات من
   lib/homework لتصل Life Engine ودويرب. بيانات حقيقية فقط — ما لا نظام له بعد يُعرض
   بصدق («قريباً») لا ببياناتٍ وهمية. */
import { useSyncExternalStore } from "react";
import Link from "next/link";
import Dome from "@/components/Dome";
import PageFooter from "@/components/PageFooter";
import NextThread from "@/components/NextThread";
import HomeworkPlanner from "@/components/school/HomeworkPlanner";
import SchoolChecklist from "@/components/school/SchoolChecklist";
import { loadHomework, dueOn, type Homework } from "@/lib/homework";
import { localDayKey, loadUser } from "@/lib/storage";
import { currentPhase } from "@/lib/transition";
import { subjectsFor, trackLabel } from "@/lib/curriculum";
import SchoolTimelineCard from "@/components/SchoolTimelineCard";
import DismissibleNote from "@/components/DismissibleNote";
import Customizable from "@/components/Customizable";
import dynamic from "next/dynamic";
const DayJournal = dynamic(() => import("@/components/journal/DayJournal"), { ssr: false });
const MemoriesAlbum = dynamic(() => import("@/components/journal/MemoriesAlbum"), { ssr: false });
const TeachersCard = dynamic(() => import("@/components/school/TeachersCard"), { ssr: false });
const SchoolExams = dynamic(() => import("@/components/school/SchoolExams"), { ssr: false });

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
  /* حارسُ الأهلية — «المدرسة» لمن له مقعدٌ فيها وحدَه (قدرةُ `school`).
     الشريطُ يخفيها، وهذا يمنع الوصولَ المباشر بالرابط أيضاً. */
  if (!currentPhase().allows("school")) {
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
      <div className="page-content">
        {/* الأقسامُ يرتّبها الطالبُ ويخفي ما لا يعنيه — والترتيبُ الافتراضيُّ هنا
            من خريطة الرحلة (`SCHOOL_SECTION_ORDER`): **بالإلحاح الحقيقيّ لا
            بترتيب البناء**. كانت الصفحةُ تفتح على التقويم والموادّ قبل الواجب
            المستحقّ؛ صارت تفتح على ما عليه اليوم وغداً، ثم ما يُقاس، ثم ما
            يُحضَّر، ثم ما يُذكَر. */}
        <Customizable page="school" sections={[
          /* بطاقةٌ تُطوى بعد قراءتها — تُعرّف الصفحة ولا تنازع فعلاً */
          { id: "intro", label: "بطاقة التعريف", desc: "شرحٌ قصيرٌ لما في الصفحة", node: (
            <DismissibleNote id="school-intro" title="يومك الدراسي">
              واجباتك ودروسك واختباراتك ومتطلباتك في مكانٍ واحد — تُنظّم ضغطك الحقيقي، لا الاختبارات وحدها.
            </DismissibleNote>
          ) },
          /* فعلُ الصفحة: المستحقُّ والمتأخّر — ثم غدٌ بعده لأنه يحيل إليه («أضِفها من المذكرة أعلاه») */
          { id: "homework", label: "مذكرة الواجبات", desc: "واجباتك ومواعيدها", node: <HomeworkPlanner /> },
          { id: "tomorrow", label: "المطلوب غداً", desc: "واجباتُ الغد", node: <DueTomorrow /> },
          /* ثم ما يُقاس: اختباراتُه بمواعيدها، ثم «كم باقٍ»، ثم موادُّ فصله */
          { id: "exams", label: "اختباراتك المدرسية", desc: "الموعد والتحديد ووش قال المدرّس", node: <SchoolExams /> },
          { id: "timeline", label: "التقويم الدراسي", desc: "كم باقٍ على الاختبارات والإجازة", node: <SchoolTimelineCard /> },
          { id: "subjects", label: "موادّك", desc: "موادُّ صفّك وفصلك", node: <CurriculumSubjects /> },
          { id: "plan-link", label: "الجدول الدراسي", desc: "رابطٌ إلى جدولك", node: (
            <Link href="/plan" className="ds-card ds-card-interactive flex items-center gap-3 no-underline">
              <span className="text-[25px]">📅</span>
              <span className="flex flex-col flex-1 min-w-0">
                <span className="t-body font-black" style={{ color: "var(--text)" }}>الجدول الدراسي</span>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>نظّم مواعيد يومك واربط واجباتك بالأيام</span>
              </span>
              <span className="t-caption" style={{ color: "var(--accent-light)" }}>افتح ↗</span>
            </Link>
          ) },
          { id: "requirements", label: "قائمة المتطلبات", desc: "ما تحتاج إحضاره", node: (
            <SchoolChecklist storageKey="darb_school_requirements" title="قائمة المتطلبات" icon="🎒" placeholder="آلة حاسبة، كتاب الرياضيات، ملف بلاستيكي…" />
          ) },
          { id: "projects", label: "المشاريع", desc: "مشاريعُ موادّك", node: (
            <SchoolChecklist storageKey="darb_school_projects" title="المشاريع" icon="📂" placeholder="مشروع + المادة (مثل: بحث الأحياء)…" />
          ) },
          /* مرجعٌ يُفتح عند الحاجة: دليلُ مدرّسيه ودفترُ ملاحظاتٍ لكلٍّ منهم */
          { id: "teachers", label: "مدرّسوك", desc: "أسماؤهم وتواصلهم وملاحظاتك", node: <TeachersCard /> },
          /* ولا إلحاحَ في الأخيرين — ذاكرةُ سنةٍ لا مهمّةُ يوم */
          { id: "journal", label: "دفتر يومك", desc: "ارسم أو جدول أو اكتب", node: <DayJournal /> },
          { id: "memories", label: "ذكرياتك الدراسية", desc: "ألبومُ صورك في جوّالك", node: <MemoriesAlbum /> },
        ]} />
      </div>
      <div className="h-6" />
      <PageFooter />
    </div>
  );
}
