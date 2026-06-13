/* ─── تخزين حقيقي في localStorage — صفر بيانات وهمية ─── */
import type { TrackId } from "./tracks";

export interface DarbUser {
  name: string;
  track: TrackId;
  examDate?: string;
  onboarded: boolean;
  age?: number;
  studyLevel?: string;
  subjects?: string[]; // up to 3 selected subject names
  activeTracks?: TrackId[];
}

export interface DarbStats {
  silver: number;
  totalFocusMins: number;
  sessionDays: string[]; // أيام فيها جلسة منجزة "YYYY-MM-DD"
  sessionsCount: number;
  todayFocusMins: number;
  todayKey: string;
  dayMins: Record<string, number>; // دقائق التركيز لكل يوم — للرسم الأسبوعي
}

const USER_KEY = "darb_user";
const STATS_KEY = "darb_stats";

const todayKey = () => new Date().toISOString().slice(0, 10);

/* ── المستخدم ── */
export function loadUser(): DarbUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as DarbUser) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: DarbUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

/* ── الإحصاءات ── */
const EMPTY_STATS: DarbStats = {
  silver: 0,
  totalFocusMins: 0,
  sessionDays: [],
  sessionsCount: 0,
  todayFocusMins: 0,
  todayKey: "",
  dayMins: {},
};

export function loadStats(): DarbStats {
  if (typeof window === "undefined") return { ...EMPTY_STATS };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const s = raw ? ({ ...EMPTY_STATS, ...JSON.parse(raw) } as DarbStats) : { ...EMPTY_STATS };
    if (s.todayKey !== todayKey()) {
      s.todayFocusMins = 0;
      s.todayKey = todayKey();
    }
    return s;
  } catch {
    return { ...EMPTY_STATS };
  }
}

function saveStats(s: DarbStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {}
}

/* تُستدعى عند إكمال جلسة Orbit كاملة */
export function recordSession(focusMins: number, silverEarned: number): DarbStats {
  const s = loadStats();
  const day = todayKey();
  s.silver += silverEarned;
  s.totalFocusMins += focusMins;
  s.todayFocusMins += focusMins;
  s.todayKey = day;
  s.sessionsCount += 1;
  if (!s.sessionDays.includes(day)) s.sessionDays.push(day);
  s.dayMins = { ...s.dayMins, [day]: (s.dayMins?.[day] ?? 0) + focusMins };
  // نحتفظ بآخر 60 يوم فقط
  const keys = Object.keys(s.dayMins).sort();
  if (keys.length > 60) keys.slice(0, keys.length - 60).forEach((k) => delete s.dayMins[k]);
  saveStats(s);
  return s;
}

/* سيلفر إضافي (الأرينا وغيرها) */
export function addSilver(n: number): DarbStats {
  const s = loadStats();
  s.silver = Math.max(0, s.silver + n);
  saveStats(s);
  return s;
}

/* ستريك حقيقي: أيام متتالية تنتهي اليوم أو أمس */
export function computeStreak(stats: DarbStats): number {
  const days = new Set(stats.sessionDays);
  if (days.size === 0) return 0;
  const d = new Date();
  const key = (dt: Date) => dt.toISOString().slice(0, 10);
  // لو ما فيه جلسة اليوم، نبدأ العد من أمس
  if (!days.has(key(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(key(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/* ── تخزين عام لأي قائمة (الخزنة / المراجعة / الدروس) ── */
export function loadList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function saveList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

/* ── الثيم ── */
export type Theme = "dark" | "light";

export function loadTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("darb_theme") as Theme) || "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // لون شريط المتصفح على الجوال يتبع الثيم
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#F8F4EC" : "#07070D");
  try {
    localStorage.setItem("darb_theme", theme);
  } catch {}
}

/* ── تاريخ الاختبار ── */
const EXAM_KEY = "darb_exam_date";

export function loadExamDate(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(EXAM_KEY); } catch { return null; }
}

export function saveExamDate(date: string | null) {
  try {
    if (date) localStorage.setItem(EXAM_KEY, date);
    else localStorage.removeItem(EXAM_KEY);
  } catch {}
}

/* ── تواريخ اختبار لكل مادة ── */
const SUBJECT_EXAM_DATES_KEY = "darb_subject_exam_dates";

export function loadSubjectExamDates(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SUBJECT_EXAM_DATES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch { return {}; }
}

export function saveSubjectExamDates(dates: Record<string, string>) {
  try { localStorage.setItem(SUBJECT_EXAM_DATES_KEY, JSON.stringify(dates)); } catch {}
}

/* ── تواريخ اختبار لكل مسار (مفتاح = TrackId) ── */
const TRACK_EXAM_DATES_KEY = "darb_track_exam_dates";

export function loadTrackExamDates(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TRACK_EXAM_DATES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch { return {}; }
}

export function saveTrackExamDates(dates: Record<string, string>) {
  try { localStorage.setItem(TRACK_EXAM_DATES_KEY, JSON.stringify(dates)); } catch {}
}

export function resetAll() {
  try {
    ["darb_user","darb_stats","darb_vault","darb_cards","darb_lessons","darb_posts",
     "darb_schedule","darb_exam_date","darb_events","darb_exam_flow","darb_stage_reviews",
     "darb_tadreeb_items","darb_tadreeb_done","darb_tasreebat_pct","darb_subject_exam_dates",
     "darb_track_exam_dates"].forEach((k) =>
      localStorage.removeItem(k)
    );
    /* تعليمات أول زيارة تظهر من جديد بعد الضبط */
    Object.keys(localStorage)
      .filter((k) => k.startsWith("darb_guide_"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/* ── تقدم الاختبار والدرجات ── */
export interface ExamFlow {
  grade?: number;
  skippedGrade?: boolean;
  skippedTadreeb?: boolean;
  happy?: boolean;
  plan?: string;
}

/* مراجعات كل ربع لكل مرحلة */
export interface StageReviews {
  tasees25?: boolean; tasees50?: boolean; tasees75?: boolean;
  tadreeb25?: boolean; tadreeb50?: boolean; tadreeb75?: boolean;
}

/* ── عناصر مرحلة التدريب ── */
export interface TrainingItem {
  id: string;
  subject: string;
  title: string;
}

const EXAM_FLOW_KEY = "darb_exam_flow";
const STAGE_REVIEWS_KEY = "darb_stage_reviews";

export function loadExamFlow(): ExamFlow {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(EXAM_FLOW_KEY) ?? "{}") as ExamFlow; } catch { return {}; }
}

export function saveExamFlow(f: ExamFlow) {
  try { localStorage.setItem(EXAM_FLOW_KEY, JSON.stringify(f)); } catch {}
}

export function loadStageReviews(): StageReviews {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STAGE_REVIEWS_KEY) ?? "{}") as StageReviews; } catch { return {}; }
}

export function saveStageReviews(r: StageReviews) {
  try { localStorage.setItem(STAGE_REVIEWS_KEY, JSON.stringify(r)); } catch {}
}

const TADREEB_ITEMS_KEY = "darb_tadreeb_items";
const TADREEB_DONE_KEY  = "darb_tadreeb_done";
const TASREEBAT_PCT_KEY = "darb_tasreebat_pct";

export function loadTadreebItems(): TrainingItem[] { return loadList<TrainingItem>(TADREEB_ITEMS_KEY); }
export function saveTadreebItems(items: TrainingItem[]) { saveList(TADREEB_ITEMS_KEY, items); }
export function loadTadreebDone(): string[] { return loadList<string>(TADREEB_DONE_KEY); }
export function saveTadreebDone(done: string[]) { saveList(TADREEB_DONE_KEY, done); }
export function loadTasreebatPct(): number {
  if (typeof window === "undefined") return 0;
  try { return Math.min(99, Math.max(0, +(localStorage.getItem(TASREEBAT_PCT_KEY) ?? "0"))); } catch { return 0; }
}
export function saveTasreebatPct(n: number) {
  try { localStorage.setItem(TASREEBAT_PCT_KEY, String(Math.min(99, Math.max(0, n)))); } catch {}
}

/* ── أحداث الجدول اليومي ── */
export interface ScheduleEvent {
  id: string;
  type: "study" | "busy";
  subject?: string;
  label?: string;
  fromHour: number;   // 5-23
  toHour: number;     // 6-24
  recurrence:
    | { kind: "once"; date: string }
    | { kind: "weekly"; dayOfWeek: number }   // 0-6
    | { kind: "daily"; fromDate: string }
    | { kind: "multiweekly"; days: number[] }; // multiple weekdays
}

const EVENTS_KEY = "darb_events";

export function loadEvents(): ScheduleEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as ScheduleEvent[]) : [];
  } catch { return []; }
}

export function saveEvents(events: ScheduleEvent[]) {
  try { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); } catch {}
}

/* ── الجدول الأسبوعي ── */
const SCHEDULE_KEY = "darb_schedule";

export type ScheduleEntry = { subject: string; hours: number };
export type WeeklySchedule = Record<string, ScheduleEntry[]>; // "0"-"6" = الأحد–السبت

export function loadSchedule(): WeeklySchedule | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    return raw ? (JSON.parse(raw) as WeeklySchedule) : null;
  } catch { return null; }
}

export function saveSchedule(s: WeeklySchedule) {
  try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s)); } catch {}
}

/* ── إعدادات الصفحة الرئيسية: ترتيب وإظهار الأقسام ── */
export type DashSectionId =
  | "track" | "today" | "schedule" | "ai" | "weekly"
  | "quote" | "stats" | "tools" | "community" | "certificate";

export interface DashItem { id: DashSectionId; visible: boolean; }
export interface DashConfig { layout: DashItem[]; }

/* أسماء ووصف كل قسم — تظهر في وضع التخصيص ودرج الإضافة */
export const DASH_SECTION_META: Record<DashSectionId, { label: string; desc: string }> = {
  track:       { label: "مسارك",        desc: "المواد والمسارات النشطة" },
  today:       { label: "يومك",         desc: "تقدّم اليوم وزر أوربت والعدّاد" },
  schedule:    { label: "جدول اليوم",   desc: "مواعيد المذاكرة وتعديلها" },
  ai:          { label: "دويرب",        desc: "مساعدك الذكي للجداول والنصائح" },
  weekly:      { label: "أسبوعك",       desc: "رسم دقائق التركيز اليومية" },
  quote:       { label: "اقتباس اليوم", desc: "جملة تحفيزية تتغيّر يومياً" },
  stats:       { label: "إحصاءاتك",     desc: "ساعات التركيز والجلسات والأخطاء" },
  tools:       { label: "الأدوات",      desc: "أوربت، الخزنة، المراجعة، الخريطة" },
  community:   { label: "المجتمع",      desc: "المجلس والأرينا" },
  certificate: { label: "الشهادة",      desc: "شهادة الانضباط والترقية" },
};

const DASH_DEFAULT_ORDER: DashSectionId[] = [
  "track", "today", "schedule", "ai", "weekly",
  "quote", "stats", "tools", "community", "certificate",
];

function defaultLayout(): DashItem[] {
  return DASH_DEFAULT_ORDER.map((id) => ({ id, visible: true }));
}

const DASH_CONFIG_KEY = "darb_dash_config";

export function loadDashConfig(): DashConfig {
  if (typeof window === "undefined") return { layout: defaultLayout() };
  try {
    const raw = localStorage.getItem(DASH_CONFIG_KEY);
    if (!raw) return { layout: defaultLayout() };
    const parsed = JSON.parse(raw);

    // الصيغة الجديدة: { layout: [...] } — نُكمل أي قسم ناقص ونُسقط المجهول
    if (parsed && Array.isArray(parsed.layout)) {
      const known: DashItem[] = parsed.layout.filter(
        (it: DashItem) => it && DASH_DEFAULT_ORDER.includes(it.id)
      );
      const seen = new Set(known.map((it) => it.id));
      const merged = [
        ...known,
        ...DASH_DEFAULT_ORDER.filter((id) => !seen.has(id)).map((id) => ({ id, visible: true })),
      ];
      return { layout: merged };
    }

    // ترحيل من الصيغة القديمة: { showStats, showWeekly, showSchedule, showTools, showAI }
    const oldVis: Partial<Record<DashSectionId, boolean>> = {
      stats: parsed.showStats,
      weekly: parsed.showWeekly,
      schedule: parsed.showSchedule,
      tools: parsed.showTools,
      ai: parsed.showAI,
    };
    return { layout: DASH_DEFAULT_ORDER.map((id) => ({ id, visible: oldVis[id] ?? true })) };
  } catch {
    return { layout: defaultLayout() };
  }
}

export function saveDashConfig(cfg: DashConfig) {
  try { localStorage.setItem(DASH_CONFIG_KEY, JSON.stringify(cfg)); } catch {}
}
