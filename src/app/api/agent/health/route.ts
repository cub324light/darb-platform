/* حالةُ الواجهة — تشير إليها `status` في فهرس الواجهات (RFC 9727).
   تُبنى من مصادر البيانات نفسها: إن سقط أحدُها ظهر هنا لا في وجه الوكيل. */
import { universitiesPayload, examsPayload, faqPayload, calendarPayload } from "@/lib/agent/catalog";
import { agentJson, OPTIONS as opt } from "@/lib/agent/respond";

export const dynamic = "force-static";
export const OPTIONS = opt;

export function GET() {
  const counts = {
    universities: universitiesPayload().length,
    exams: examsPayload().length,
    faq: faqPayload().length,
    academicYears: calendarPayload().years.length,
  };
  const ok = Object.values(counts).every((n) => n > 0);
  return agentJson({
    status: ok ? "ok" : "degraded",
    version: "1.0.0",
    counts,
  }, { status: ok ? 200 : 503 });
}
