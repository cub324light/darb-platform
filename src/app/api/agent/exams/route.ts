import { examsPayload } from "@/lib/agent/catalog";
import { agentJson, OPTIONS as opt } from "@/lib/agent/respond";

export const dynamic = "force-static";
export const OPTIONS = opt;

export function GET() {
  return agentJson({
    note: "الحقول الفارغة تعني أن الجهة الرسمية لم تُعلن الموعد بعد — لا تُخمَّن.",
    exams: examsPayload(),
  });
}
