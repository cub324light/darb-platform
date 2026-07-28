/* ─── مولّد ملفات ICS (RFC 5545) ───
   ينشئ ملف تقويم قياسي يعمل مع Google وApple وOutlook (وNotion) عبر الاستيراد.
   نكتب الأوقات بالـ UTC (لاحقة Z) فتكون لحظات مطلقة صحيحة في أي منطقة زمنية. */
import type { CalEvent } from "./types";

/* تهريب النصوص حسب المواصفة: الفواصل والفاصلة المنقوطة والشرطة المائلة وأسطر جديدة */
function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/* تاريخ → YYYYMMDDTHHMMSSZ */
function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/* طيّ الأسطر الطويلة (75 ثُماني) حسب المواصفة */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    parts.push((i === 0 ? "" : " ") + line.slice(i, i + (i === 0 ? 75 : 74)));
    i += i === 0 ? 75 : 74;
  }
  return parts.join("\r\n");
}

export function buildICS(events: CalEvent[], calName = "خطة درب"): string {
  const now = fmt(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Darb//Study Planner//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`,
  ];

  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${esc(e.uid)}`,
      `DTSTAMP:${now}`,
      `DTSTART:${fmt(e.start)}`,
      `DTEND:${fmt(e.end)}`,
      fold(`SUMMARY:${esc(e.title)}`),
    );
    if (e.description) lines.push(fold(`DESCRIPTION:${esc(e.description)}`));
    if (e.location) lines.push(fold(`LOCATION:${esc(e.location)}`));
    /* تنبيه قبل الجلسة بـ10 دقائق */
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(e.title)}`,
      "TRIGGER:-PT10M",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/* نزّل الـ ICS كملف في المتصفح */
export function downloadICS(events: CalEvent[], calName = "خطة درب", fileName = "darb-plan.ics") {
  const ics = buildICS(events, calName);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
