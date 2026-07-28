/* ═══════════ تحويل جدول دويرب النصّيّ إلى أحداث تقويم ═══════════
   ▸ لماذا؟ برومبت «الجدول» يُلزم النموذج بصيغةٍ حرفية:
     «من [رقم] [ص/م] إلى [رقم] [ص/م] — [المادة أو راحة]».
     هنا نحوّل ذلك النصّ إلى `CalendarEvent` يُحفَظ في `darb_calendar` — لا إلى
     `ScheduleEvent` في `darb_events` (مخزنٌ آخر لا يقرأه تقويم مساري).
   ▸ نقيٌّ 100٪: نصٌّ داخلٌ وأحداثٌ خارجة. لا localStorage ولا Date.now — المعرّفات
     تأتي من الخارج كي يبقى الاختبار حتمياً. */
import type { CalendarEvent, EventKind } from "./calendar";

const AR_DIGITS: Record<string, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
};

/** يحوّل الأرقام العربية-الهندية إلى لاتينية للتحليل (العرض يبقى عربياً). */
export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => AR_DIGITS[d] ?? d);
}

/** يحوّل ساعةً بصيغة 12 إلى 24 حسب اللاحقة (ص/م/ظ). يعيد كسراً بالساعات. */
function parseHour(h: string, m: string, suffix: string): number {
  let hour = parseInt(h, 10);
  const mins = m ? parseInt(m, 10) : 0;
  if (!Number.isFinite(hour) || hour < 0 || hour > 24) return -1;
  if (!Number.isFinite(mins) || mins < 0 || mins > 59) return -1;
  if (suffix === "م" || suffix === "ظ") { if (hour < 12) hour += 12; }
  else if (suffix === "ص" && hour === 12) hour = 0;
  return hour + mins / 60;
}

const two = (x: number) => String(Math.floor(x)).padStart(2, "0");
/** ساعةٌ كسريّة ← "HH:mm" */
export function hhmm(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return m === 60 ? `${two(h + 1)}:00` : `${two(h)}:${two(m)}`;
}

const LINE = /من\s+(?:الساعة\s+)?(\d+)(?::(\d+))?\s*([صمظ]?)\s*(?:إلى|الى)\s*(?:الساعة\s+)?(\d+)(?::(\d+))?\s*([صمظ]?)\s*[—–\-:]\s*(.+)/;

/** كلماتٌ تدلّ على راحةٍ لا مذاكرة — تُستبعد من الجدول المحفوظ. */
const BREAK_WORDS = ["راحة", "استراحة", "بريك"];

export interface ParsedSlot {
  fromHour: number;
  toHour: number;
  label: string;
  /** المادة إن طابقت إحدى مواد الطالب. */
  subject?: string;
  isBreak: boolean;
}

/** يستخرج فترات الجدول من نصّ دويرب — بلا تداخلٍ وبلا ساعاتٍ مستحيلة. */
export function parseSlots(text: string, subjects: string[]): ParsedSlot[] {
  const out: ParsedSlot[] = [];
  for (const raw of normalizeDigits(text).split("\n")) {
    const m = raw.trim().match(LINE);
    if (!m) continue;
    const fromHour = parseHour(m[1], m[2] ?? "", m[3]);
    const toHour = parseHour(m[4], m[5] ?? "", m[6]);
    const label = m[7].trim();
    if (fromHour < 0 || toHour < 0 || fromHour >= toHour || toHour > 24) continue;
    /* تداخلٌ مع فترةٍ سابقة في نفس الدفعة ⇒ تجاهل (النموذج يخطئ أحياناً) */
    if (out.some((e) => fromHour < e.toHour && e.fromHour < toHour)) continue;
    const subject = subjects.find((s) => label.includes(s));
    out.push({ fromHour, toHour, label, subject, isBreak: BREAK_WORDS.some((w) => label.includes(w)) });
  }
  return out;
}

/**
 * يبني أحداث تقويمٍ من نصّ دويرب. الراحات تُستبعد: التقويم لحياة الطالب لا لفواصله.
 * `idOf` يأتي من الخارج فيبقى الاختبار حتمياً.
 */
export function slotsToEvents(
  text: string,
  i: { date: string; subjects: string[]; idOf: (index: number) => string },
): CalendarEvent[] {
  const kind: EventKind = "school";
  return parseSlots(text, i.subjects)
    .filter((s) => !s.isBreak)
    .map((s, idx) => ({
      id: i.idOf(idx),
      title: s.subject ? `مذاكرة ${s.subject}` : s.label,
      kind,
      start: `${i.date}T${hhmm(s.fromHour)}`,
      end: `${i.date}T${hhmm(s.toHour)}`,
      recurrence: "none" as const,
      impact: "busy" as const,
      source: "local" as const,
    }));
}
