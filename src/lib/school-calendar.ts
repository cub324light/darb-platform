/* ─── التقويم الدراسي السعودي — وزارة التعليم (moe.gov.sa) ───
   1447/1448 (2025/2026): نهاية العام ٢٥/٠٦/٢٠٢٦، بداية العام ٢٣/٠٨/٢٠٢٦
   1448/1449 (2026/2027): بداية ٣٠/٠٨/٢٠٢٦ — منطقة مكة/المدينة/جدة/الطائف */

export interface SchoolEvent {
  id: string;
  label: string;
  from: string;  // YYYY-MM-DD
  to: string;    // YYYY-MM-DD
  type: "start" | "break" | "end";
}

export const SCHOOL_CALENDAR: SchoolEvent[] = [
  /* ── 1447/1448 ── */
  { id: "end-1447",        label: "نهاية العام الدراسي ١٤٤٧",  from: "2026-06-25", to: "2026-08-22", type: "end"   },
  { id: "start-1448",      label: "بداية العام الدراسي ١٤٤٨",  from: "2026-08-23", to: "2026-08-23", type: "start" },
  /* ── 1448/1449 ── */
  { id: "start-1448-full", label: "بداية الفصل الدراسي",        from: "2026-08-30", to: "2026-08-30", type: "start" },
  { id: "national-1448",   label: "إجازة اليوم الوطني",          from: "2026-09-23", to: "2026-09-26", type: "break" },
  { id: "fall-1448",       label: "إجازة الخريف",                from: "2026-11-20", to: "2026-11-28", type: "break" },
  { id: "midyear-1448",    label: "إجازة منتصف العام",            from: "2027-01-08", to: "2027-01-16", type: "break" },
  { id: "foundation-1448", label: "إجازة يوم التأسيس",            from: "2027-02-19", to: "2027-02-22", type: "break" },
  { id: "fitr-1448",       label: "إجازة عيد الفطر",             from: "2027-02-26", to: "2027-03-13", type: "break" },
  { id: "adha-1448",       label: "إجازة عيد الأضحى",            from: "2027-04-30", to: "2027-05-22", type: "break" },
  { id: "end-1448",        label: "نهاية العام الدراسي ١٤٤٨",   from: "2027-07-01", to: "2027-08-28", type: "end"   },
  { id: "start-1449",      label: "بداية العام الدراسي ١٤٤٩",   from: "2027-08-29", to: "2027-08-29", type: "start" },
];

/* الحدث النشط الآن (إجازة أو بداية/نهاية) — null إذا لا شيء */
export function activeSchoolEvent(today: string): SchoolEvent | null {
  const t = new Date(today).getTime();
  return SCHOOL_CALENDAR.find((e) => {
    const f = new Date(e.from).getTime();
    const o = new Date(e.to).getTime();
    return f <= t && t <= o;
  }) ?? null;
}

/* الأحداث القادمة خلال N يوم */
export function upcomingSchoolEvents(today: string, withinDays = 10): SchoolEvent[] {
  const t = new Date(today).getTime();
  const limit = t + withinDays * 86400000;
  return SCHOOL_CALENDAR.filter((e) => {
    const f = new Date(e.from).getTime();
    return f > t && f <= limit;
  });
}

/* كم يوم حتى انتهاء الإجازة الحالية؟ (لو في إجازة الآن) */
export function daysUntilSchoolResumes(today: string): number | null {
  const ev = activeSchoolEvent(today);
  if (!ev || ev.type === "start") return null;
  const t = new Date(today).getTime();
  const o = new Date(ev.to).getTime();
  return Math.max(0, Math.round((o - t) / 86400000));
}
