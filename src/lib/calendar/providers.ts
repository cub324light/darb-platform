/* ─── سجلّ مزوّدي التقويم (قابل للتوسّع) ───
   المرحلة 1 (الآن): Google / Apple / Outlook عبر ICS + روابط ويب للحدث المفرد.
   المرحلة 2 (لاحقاً): مزوّد "google-oauth" يدفع الأحداث مباشرة عبر Calendar API.
   المرحلة 3 (لاحقاً): Microsoft Graph وNotion.
   إضافة مزوّد = إضافة عنصر لهذا المصفوف فقط — لا تغيير في الواجهة. */
import type { CalEvent, CalendarProvider } from "./types";
import { downloadICS } from "./ics";

/* تاريخ → YYYYMMDDTHHMMSSZ (لروابط Google) */
function gcalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/* رابط إضافة حدث مفرد إلى Google Calendar على الويب */
export function googleEventUrl(e: CalEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${gcalDate(e.start)}/${gcalDate(e.end)}`,
    details: e.description ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* رابط إضافة حدث مفرد إلى Outlook على الويب */
export function outlookEventUrl(e: CalEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: e.start.toISOString(),
    enddt: e.end.toISOString(),
    body: e.description ?? "",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function openSingleOrDownload(
  events: CalEvent[],
  calName: string,
  urlFor: (e: CalEvent) => string,
) {
  /* حدث واحد → إضافة سريعة عبر الويب. عدة أحداث → تنزيل ICS للاستيراد. */
  if (events.length === 1) {
    window.open(urlFor(events[0]), "_blank", "noopener");
  } else {
    downloadICS(events, calName);
  }
}

export const CALENDAR_PROVIDERS: CalendarProvider[] = [
  {
    id: "google",
    label: "Google Calendar",
    icon: "📅",
    kind: "weblink",
    multi: false,
    enabled: true,
    handler: (events, calName) => openSingleOrDownload(events, calName, googleEventUrl),
  },
  {
    id: "apple",
    label: "Apple Calendar",
    icon: "",
    kind: "download",
    multi: true,
    enabled: true,
    handler: (events, calName) => downloadICS(events, calName),
  },
  {
    id: "outlook",
    label: "Outlook",
    icon: "📆",
    kind: "weblink",
    multi: false,
    enabled: true,
    handler: (events, calName) => openSingleOrDownload(events, calName, outlookEventUrl),
  },
  {
    id: "ics",
    label: "تنزيل ملف ICS",
    icon: "📥",
    kind: "download",
    multi: true,
    enabled: true,
    handler: (events, calName) => downloadICS(events, calName),
  },
];

/* مزوّدو المراحل القادمة — معطّلون الآن، يظهرون كـ«قريباً» (إثبات قابلية التوسّع) */
export const UPCOMING_PROVIDERS: Pick<CalendarProvider, "id" | "label" | "icon">[] = [
  { id: "outlook-graph", label: "ربط Outlook مباشرة", icon: "🔗" },
  { id: "notion", label: "Notion Calendar", icon: "🗒️" },
];
