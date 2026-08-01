/* /llms-full.txt — النسخة الموسّعة: تُدرِج البيانات العامّة نفسها نصّاً كي يجيب
   الوكيلُ عن أسئلة الطالب دون أن يستدعي واجهةً أصلاً. */
import {
  SITE, CAPABILITIES, universitiesPayload, examsPayload, calendarPayload, faqPayload,
} from "@/lib/agent/catalog";

export const dynamic = "force-static";

export function GET() {
  const unis = universitiesPayload();
  const exams = examsPayload();
  const cal = calendarPayload();
  const faq = faqPayload();

  const qs = (u: (typeof unis)[number]) =>
    u.qsRank == null ? "" : ` · QS ${u.qsRank}${u.qsRankTo ? `–${u.qsRankTo}` : ""} (${u.qsYear})`;

  const body = `# ${SITE.name} — المرجع الكامل للوكلاء
> ${SITE.descriptionAr}

${SITE.descriptionEn}

الموقع: ${SITE.url} · اللغة: ${SITE.locale}

## الخدمات
${CAPABILITIES.map((c) => `### ${c.name}\n${c.summary}\nالرابط: ${SITE.url}${c.path}`).join("\n\n")}

## الجامعات (${unis.length})
${unis.map((u) => `- ${u.name} — ${u.region ?? "—"} · ${u.kind ?? "—"}${qs(u)} · ${u.url}`).join("\n")}

لكليات جامعةٍ وتخصّصاتها الدقيقة: ${SITE.url}/api/agent/universities?id=<id>

## الاختبارات ونوافذها الرسمية
${exams.map((e) => {
  const ws = e.windows.length
    ? e.windows.map((w) => `  - ${w.label}: ${w.announced
        ? `تسجيل ${w.registrationStart ?? "؟"} → ${w.registrationEnd ?? "؟"} · اختبار ${w.examStart ?? "؟"} → ${w.examEnd ?? "؟"}`
        : "لم تُعلن الهيئة مواعيدها بعد"}`).join("\n")
    : "  - بلا نوافذ ثابتة";
  return `- ${e.id}${e.alwaysOpen ? " (المحوسب متاح طوال السنة)" : ""}\n${ws}`;
}).join("\n")}

## التقويم الدراسي (مُحدَّث لـ ${cal.updatedFor})
${cal.years.map((y) => `### ${y.id}هـ (${y.gregorianLabel})
المصدر: ${y.source}
بداية العام: ${y.schoolStart} · نهايته: ${y.schoolEnd}
${y.periods.map((p) => `- ${p.label}: ${p.start} → ${p.end}`).join("\n")}`).join("\n\n")}

## الأسئلة الشائعة (${faq.length})
${faq.map((f) => `### ${f.question}\n${f.answer}`).join("\n\n")}

## حدود وصدق البيانات
- لا تُتاح بيانات الطلاب لأي وكيل — الخطط والأخطاء والتقدّم خاصّةٌ بصاحبها.
- ما لم تُعلنه الجهات الرسمية يُترك فارغاً؛ درب لا تخمّن تاريخاً ولا رقماً.
- ترتيب QS يُعرض بسنة إصداره، والمراكز المتأخّرة كنطاقٍ لا كرقمٍ مفرد.
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
