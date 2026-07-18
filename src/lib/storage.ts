/* ─── تخزين حقيقي في localStorage — صفر بيانات وهمية ─── */
import type { TrackId, StudyGoalType } from "./tracks";
import type { PlanId } from "./types";
import type { Workspace } from "./modules/workspace";
import { buildInitialWorkspace, addModule, addMember } from "./modules/workspace";
import { workspaceTrackIds } from "./modules/consume";
import type { ModuleId, ExamMemberId } from "./modules/types";
import { toBoardStage } from "./examEligibility";

export interface DarbUser {
  name: string;
  track: TrackId;
  examDate?: string;
  onboarded: boolean;
  age?: number;
  studyLevel?: string;      // الحالة التعليمية: ثانوي/جامعي/خريج
  grade?: string;           // الصف (للثانوي): أول/ثاني/ثالث ثانوي
  gradStage?: string;       // نوع الخريج: خريج ثانوي / خريج جامعة
  gradRecency?: "this-year" | "earlier"; // الخريج: تخرّج هذه السنة أم سنوات سابقة (ملف)
  universityYear?: string;  // السنة الدراسية (للجامعي): الأولى ... الخامسة+
  goal?: StudyGoalType;     // الهدف الأساسي (goals[0]) — يقود تفعيل المسارات والأولويات (SSoT لكل المستهلكين القائمين)
  goals?: StudyGoalType[];  // كل الأهداف المختارة (متعدد بلا حد) — الأساسي منها = goals[0]
  targets?: string[];       // الوجهات النهائية (متعدّد): معرّفات ثابتة من lib/targets — الوجهة تقود recommendedExams (ADR-0001)
  goalUndecided?: boolean;  // اختار «ما أدري» في التسجيل — درب يحدّد الوجهة لاحقاً حسب الدرجات/الاهتمامات
  focus?: string;           // التركيز الأول (ADR-0001 §2.6): يبني الخطة الأولى فقط، لا يغيّر الوجهة — qudurat/tahsili/english/university/programs
  retakeExams?: string[];   // نيّة الإعادة (retakeIntent): اختبارات غير راضٍ عنها من سؤال الرضا — يقرؤها Life Engine/الخطة (لا Goal)
  finalizedExams?: string[]; // اختبارات اعتمد الطالب درجتها نهائيةً صراحةً (الحالة الثالثة مقابل «لم أقرّر»)
  gapYear?: boolean;        // خريج ينوي إعادة القدرات/التحصيلي (سنة استدراك)
  studyHours?: number;
  studyStyle?: "book" | "video" | "both"; // أسلوب المذاكرة المفضّل (التسجيل) — يقرؤه دويرب/الخطة
  subjects?: string[];
  activeTracks?: TrackId[]; // (نظام Track القديم — يُرحَّل إلى workspace ثم يُزال في المرحلة الأخيرة)
  workspace?: Workspace;    // مساري: لوحة عمل الطالب من وحداتٍ مستقلة (النظام الجديد)
  plan?: PlanId;
  school?: string;
  region?: string;              // المنطقة الرسمية (من saRegions) — تُجمع في التسجيل
  city?: string;                // المدينة/المحافظة
  district?: string;            // الحي (اختياري)
  willingToRelocate?: boolean;  // «لا أمانع الغربة» — يوسّع اقتراح الجامعات خارج منطقته
  regionsInterested?: string[]; // مناطق أخرى يهتمّ بالدراسة فيها (اختياري)
  phone?: string;
  bio?: string;        // سيرة قصيرة اختيارية (≤ ١٦٠ حرف)
  avatar?: string;     // معرّف أفاتار جاهز (وإلا صورة Google أو أول حرف)
  graduationYear?: number; // سنة التخرج المتوقعة (لمواءمة التقويم الدراسي)
  gradeYearId?: string;    // العام الدراسي (الهجري) الذي ضُبط فيه الصف — مرساة الترقية التلقائية
  academicTerm?: string;   // الفصل الحالي (أول/ثاني/صيف) — يؤكّده الطالب بالتسجيل، يحكم إتاحة المبكر
  trackType?: string;  // نوع المسار الجامعي: صحي/هندسي/حاسب/إداري/عام (اختياري)
  academicTrack?: import("./curriculum").AcademicTrack; // المسار الدراسي الثانوي (يقود المنهج) — لثاني/ثالث ثانوي
  secondaryGpa?: number; // نسبة الثانوية العامة (٠–١٠٠) — للخريج عند اختيار حساب معدله
  pendingResults?: PendingResultRecord[]; // اختبارات بانتظار النتيجة (لبطاقة العدّ التنازلي لاحقاً)
  /* ── حقول الجامعي (Phase Engine) — لا تظهر للثانوي أبداً ── */
  universityGpa?: number;        // المعدل الجامعي من 5
  creditHoursCompleted?: number; // الساعات المعتمدة المنجزة
  coopDone?: boolean;            // أنجز التدريب التعاوني/الصيفي
  gradSchoolInterest?: boolean;  // اهتمام بالدراسات العليا
}

export interface DarbStats {
  silver: number;
  totalFocusMins: number;
  sessionDays: string[]; // أيام فيها جلسة منجزة "YYYY-MM-DD"
  sessionsCount: number;
  todayFocusMins: number;
  todayKey: string;
  dayMins: Record<string, number>; // دقائق التركيز لكل يوم — للرسم الأسبوعي
  lastBonusDay?: string; // آخر يوم أُعطيت فيه مكافأة بدء أوربت اليومية
  analyzedCount?: number; // عدد الملفات التي حُلِّلت بالذكاء
  plansCount?: number;    // عدد خطط دويرب المطبَّقة على الجدول
  aiChats?: number;       // عدد محادثات دويرب (المساعد الذكي)
  quizCount?: number;     // عدد الاختبارات/الأسئلة المولّدة بالذكاء
  trackProgress?: number; // أقصى نسبة مئوية مكتملة من مسار التأسيس أو التدريب
  joinedAt?: string;      // أول يوم استُخدمت فيه المنصة "YYYY-MM-DD"
}

const USER_KEY = "darb_user";
const STATS_KEY = "darb_stats";

/* مفتاح اليوم بالتوقيت المحلي للجهاز (لا UTC) — حتى لا تُصفَّر إحصائيات
   «اليوم» عند منتصف ليل غرينتش (٣ فجراً بتوقيت السعودية) فتختفي قبل أوانها.
   يبدأ اليوم وينتهي مع منتصف ليل الطالب الفعلي. */
export const localDayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayKey = () => localDayKey();

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

/* يضيف مساراً إلى المسارات النشطة (dedupe) ويحفظ — لزر تفعيل المسار الذهبي.
   لا يغيّر المسار الأساسي ولا يصفّر شيئاً؛ مجرّد تفعيل إضافي بإذن المستخدم. */
export function activateTrack(id: TrackId): DarbUser | null {
  const u = loadUser();
  if (!u) return null;
  /* المصدر الواحد: «التفعيل» يضيف وحدةً/عضواً إلى الـWorkspace (لا activeTracks) */
  const withWs = ensureWorkspace(u);
  let ws = withWs.workspace ?? { modules: [], updatedAt: Date.now() };
  const mid = LEGACY_TRACK_TO_MODULE[id];
  const mem = LEGACY_TRACK_TO_MEMBER[id];
  if (mid) ws = addModule(ws, mid);
  else if (mem) ws = addMember(ws, mem);
  else return withWs; // مدرسه/غير معروف — لا اختبار يُضاف
  const next: DarbUser = { ...withWs, workspace: ws };
  saveUser(next);
  return next;
}

/* ── مساري (Workspace) — التخزين + ترحيل النظام القديم ──
   خريطة activeTracks القديمة: القياس → وحدات عليا مفردة؛ اللغة/البرامج → أعضاءٌ
   داخل وحدتيهما المجموعتين. «مدرسه» Core تُبنى تلقائياً فتُستثنى. */
const LEGACY_TRACK_TO_MODULE: Partial<Record<TrackId, ModuleId>> = {
  "قدرات": "qudurat",
  "تحصيلي": "tahsili",
  "تحصيلي مبكر": "tahsili",
};
const LEGACY_TRACK_TO_MEMBER: Partial<Record<TrackId, ExamMemberId>> = {
  "ستيب": "step",
  "ايلتس": "ielts",
  "توفل": "toefl",
  "دوليقو": "duolingo",
  "CPC": "aramco",
  "ITC": "itc",
};

/* يضمن وجود Workspace للطالب: يبنيه من المرحلة (Core فقط) ويرحّل activeTracks القديمة
   إلى وحدات/أعضاء (مرة واحدة). لا يمسّ شيئاً إن كان workspace موجوداً بالفعل. نقيّ. */
export function ensureWorkspace(u: DarbUser): DarbUser {
  if (u.workspace) return u;
  const stage = toBoardStage({ studyLevel: u.studyLevel, grade: u.grade });
  let ws: Workspace = stage ? buildInitialWorkspace(stage) : { modules: [], updatedAt: Date.now() };
  const legacy = u.activeTracks?.length ? u.activeTracks : (u.track ? [u.track] : []);
  for (const t of legacy) {
    const mid = LEGACY_TRACK_TO_MODULE[t];
    if (mid) { ws = addModule(ws, mid); continue; }
    const mem = LEGACY_TRACK_TO_MEMBER[t];
    if (mem) ws = addMember(ws, mem);
  }
  return { ...u, workspace: ws };
}

/* Workspace الطالب الحالي — نقطة القراءة الموحّدة للمستهلكين (المواد/المهارات).
   يمرّ عبر ensureWorkspace (طبقة الترحيل الوحيدة التي تقرأ activeTracks القديمة). */
export function activeWorkspace(): Workspace {
  const u = loadUser();
  if (!u) return { modules: [], updatedAt: Date.now() };
  return ensureWorkspace(u).workspace ?? { modules: [], updatedAt: Date.now() };
}

/* معرّفات الكتالوج (globalSkills/TRACKS) المشتقّة من Workspace — نقطة القراءة الموحّدة
   للمستهلكين (المواد/المهارات/الألوان). تحلّ محلّ قراءة activeTracks المباشرة. الفولباك
   «تحصيلي» يطابق السلوك القديم عند غياب أي وحدةٍ دراسية بعد. */
export function activeTrackIds(): string[] {
  const t = workspaceTrackIds(activeWorkspace());
  return t.length ? t : ["تحصيلي"];
}

/* نسخة خام بلا فولباك — لمستهلكي قوائم الاختبارات (تنبيهات التسجيل/الفجوة):
   فراغٌ = لا اختبارات (فلا نلفّق «تحصيلي»). مشتقّة من Workspace وحده. */
export function activeExamTrackIds(): string[] {
  return workspaceTrackIds(activeWorkspace());
}

/* يحفظ Workspace داخل المستخدم — المزامنة السحابية تركبه مع بقية بيانات المستخدم. */
export function saveWorkspace(ws: Workspace): DarbUser | null {
  const u = loadUser();
  if (!u) return null;
  const next: DarbUser = { ...u, workspace: ws };
  saveUser(next);
  return next;
}

/* ── الأهلية لواجهة القبول الجامعي ──
   ذكاء القبول (الموزونة/المقارنة/تحليل الفجوة) مخصّص لمن هم على أعتاب القبول:
   طالب ثالث ثانوي أو خريج. لا يُعرض لطلاب أول/ثاني ثانوي (بعيدون) ولا للجامعي
   (التحق فعلاً). نقي وحتمي — مصدر واحد لكل المستهلكين. */
export function showsUniversityUI(u?: DarbUser | null): boolean {
  if (!u) return false;
  /* خريج الجامعة خرج من عالم القبول نهائياً — لا موزونة/مقارنة/قبول */
  if (u.studyLevel === "خريج") return u.gradStage !== "خريج جامعة";
  if (u.studyLevel === "ثانوي" && u.grade === "ثالث ثانوي") return true;
  return false;
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

/* ── سجل الجلسات: كل جلسة Orbit منجزة (المادة، المدة، الوقت) ── */
export interface SessionLogEntry {
  id: string;
  subject: string;
  focusMins: number;
  ts: number;       // وقت الإنجاز (ms)
}
const SESSION_LOG_KEY = "darb_session_log";
export function loadSessionLog(): SessionLogEntry[] { return loadList<SessionLogEntry>(SESSION_LOG_KEY); }
export function addSessionLog(subject: string, focusMins: number): void {
  const list = loadSessionLog();
  list.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), subject, focusMins, ts: Date.now() });
  // نحتفظ بآخر 200 جلسة
  saveList(SESSION_LOG_KEY, list.slice(0, 200));
}

/* مكافأة بدء أوربت اليومية (مرة واحدة بأول جلسة في اليوم) */
export const DAILY_ORBIT_BONUS = 10;

/* تُستدعى عند إكمال جلسة Orbit كاملة.
   النقاط = فضة لكل دقيقة تركيز + مكافأة 10 لأول جلسة في اليوم فقط.
   نُعيد الإحصاءات مع earned (الفضة المكتسبة في هذه الجلسة للعرض). */
export function recordSession(focusMins: number, subject?: string): DarbStats & { earned: number } {
  const s = loadStats();
  const day = todayKey();
  const firstToday = s.lastBonusDay !== day;
  const bonus = firstToday ? DAILY_ORBIT_BONUS : 0;
  const earned = focusMins + bonus;
  if (firstToday) s.lastBonusDay = day;
  s.silver += earned;
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
  addSessionLog(subject ?? "—", focusMins);
  return { ...s, earned };
}

/* عدّاد الملفات المحللة — يُستدعى عند نجاح تحليل ملف */
export function recordFileAnalyzed(): void {
  const s = loadStats();
  s.analyzedCount = (s.analyzedCount ?? 0) + 1;
  saveStats(s);
}

/* عدّاد محادثات دويرب — يُستدعى عند بدء محادثة جديدة مع المساعد الذكي */
export function recordAIChat(): void {
  const s = loadStats();
  s.aiChats = (s.aiChats ?? 0) + 1;
  saveStats(s);
}

/* عدّاد الاختبارات المولّدة — يُستدعى عند توليد أسئلة/اختبار بالذكاء */
export function recordQuiz(): void {
  const s = loadStats();
  s.quizCount = (s.quizCount ?? 0) + 1;
  saveStats(s);
}

/* نسبة إتمام المسار — تُحدَّث من صفحة الخريطة عند تغيّر التقدم */
export function recordTrackProgress(pct: number): void {
  const s = loadStats();
  s.trackProgress = Math.max(s.trackProgress ?? 0, Math.round(pct));
  saveStats(s);
}

/* عدّاد خطط دويرب — يُستدعى عند تطبيق خطة على الجدول */
export function recordPlanCreated(): void {
  const s = loadStats();
  s.plansCount = (s.plansCount ?? 0) + 1;
  saveStats(s);
}

/* تاريخ الانضمام: يُثبَّت أول مرة (أقدم يوم جلسة إن وُجد، وإلا اليوم) ويُحفظ ويتزامن */
export function ensureJoinDate(): string {
  const s = loadStats();
  if (s.joinedAt) return s.joinedAt;
  const earliest = s.sessionDays.length ? [...s.sessionDays].sort()[0] : todayKey();
  s.joinedAt = earliest;
  saveStats(s);
  return earliest;
}

/* يضيف يوماً إلى أيام الجلسات (لاستعادة الستريك المكسور — بطاقة الاستعادة).
   لا يضيف دقائق ولا فضة: مجرد ترميم لسلسلة الأيام. */
export function addSessionDay(day: string): void {
  const s = loadStats();
  if (!s.sessionDays.includes(day)) {
    s.sessionDays.push(day);
    saveStats(s);
  }
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
  const key = (dt: Date) => localDayKey(dt);
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
  const root = document.documentElement;
  /* نوقف الانتقالات لحظة التبديل ليصير فورياً بلا لاق (cross-fade بطيء) */
  root.classList.add("theme-switching");
  root.setAttribute("data-theme", theme);
  // لون شريط المتصفح على الجوال يتبع الثيم
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#F8F4EC" : "#07070D");
  try {
    localStorage.setItem("darb_theme", theme);
  } catch {}
  /* نعيد تفعيل الانتقالات بعد إطار رسم واحد */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
  });
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
    ["darb_user","darb_stats","darb_vault","darb_cards","darb_lessons","darb_done_lessons",
     "darb_posts","darb_schedule","darb_exam_date","darb_events","darb_exam_flow","darb_stage_reviews",
     "darb_tadreeb_items","darb_tadreeb_done","darb_tasreebat_pct","darb_subject_exam_dates",
     "darb_track_exam_dates","darb_results","darb_skills","darb_skill_progress",
     "darb_session_log","darb_leaks_plan","darb_exam_coord","darb_dash_config","darb_dash_sched_v2",
     "darb_prefs","darb_goals","darb_daily","darb_retention","darb_coach_memory","darb_calendar",
     "darb_study_plan","darb_admissions","darb_uni_tools"].forEach((k) =>
      localStorage.removeItem(k)
    );
    /* تعليمات أول زيارة تظهر من جديد بعد الضبط */
    Object.keys(localStorage)
      .filter((k) => k.startsWith("darb_guide_"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/* ── تنسيق الاختبارات: كيف يوزّع الطالب وقته بين مسارين أو أكثر ── */
export type ExamCoordStrategy = "sequential" | "alternate" | "split" | "custom";
export interface ExamCoord {
  strategy: ExamCoordStrategy;
  custom: string; // تعليمات حرة يكتبها الطالب (تُغذّى للمساعد الذكي)
}
const EXAM_COORD_KEY = "darb_exam_coord";
export function loadExamCoord(): ExamCoord {
  if (typeof window === "undefined") return { strategy: "sequential", custom: "" };
  try {
    const r = localStorage.getItem(EXAM_COORD_KEY);
    return r ? { strategy: "sequential", custom: "", ...JSON.parse(r) } as ExamCoord : { strategy: "sequential", custom: "" };
  } catch { return { strategy: "sequential", custom: "" }; }
}
export function saveExamCoord(c: ExamCoord) {
  try { localStorage.setItem(EXAM_COORD_KEY, JSON.stringify(c)); } catch {}
}

/* جملة التوجيه التي تُرسل للمساعد الذكي حسب استراتيجية التنسيق */
export function examCoordPrompt(c: ExamCoord, tracks: string[]): string {
  if (tracks.length < 2) return "";
  const t = tracks.join(" و");
  switch (c.strategy) {
    case "sequential": return ` الطالب عنده اختبارات: ${t}. ركّز على الاختبار الأقرب موعداً أولاً حتى ينتهي، ثم انتقل للثاني.`;
    case "alternate":  return ` الطالب عنده اختبارات: ${t}. وزّع الأيام بالتناوب — يوم لكل مسار.`;
    case "split":      return ` الطالب عنده اختبارات: ${t}. اقسم وقت كل يوم بين المسارين (فترة لكل واحد).`;
    case "custom":     return c.custom.trim() ? ` الطالب عنده اختبارات: ${t}. تعليمات الطالب للتنسيق: ${c.custom.trim()}` : "";
    default: return "";
  }
}

/* ── نتائج اختبارات الطالب («نتائجي») — سجل يدوي يضيفه الطالب ── */
export interface ExamResult {
  id: string;
  exam: string;           // اسم الاختبار (مسار أو نص حر)
  date?: string;          // YYYY-MM-DD
  score?: string;         // الدرجة كنص (يسمح 87.5 أو 6.5 ...)
  note?: string;
  attemptNumber?: number; // رقم المحاولة (١، ٢، ...) — يُحتسب تلقائياً عند الإضافة
}

const RESULTS_KEY = "darb_results";
export function loadResults(): ExamResult[] { return loadList<ExamResult>(RESULTS_KEY); }
export function saveResults(list: ExamResult[]) { saveList(RESULTS_KEY, list); }

/* ── انتظار النتيجة: حالةٌ مستقلّة (لا تُعامَل كأنه لم يختبر) ──
   تُحفَظ داخل البروفايل (DarbUser.pendingResults): النوع + النمط + تاريخ الاختبار،
   ليحسب النظام لاحقاً موعد الظهور والمتبقّي تلقائياً (بطاقة العدّ التنازلي — examResultStatus.ts). */
export type PendingExam = "qudurat" | "tahsili" | "step";
export interface PendingResultRecord {
  exam: PendingExam;
  mode: "computer" | "paper"; // التحصيلي ورقيٌّ دائماً
  testDate: string;           // متى اختبر / آخر محاولة — YYYY-MM-DD (قد يكون فارغاً لـ STEP)
  savedAt: string;            // تاريخ حفظ الحالة — YYYY-MM-DD
}

/* ── نتائج القبول الجامعي: تتبّع التقديمات وحالتها (رحلة الطالب الكاملة) ── */
export type AdmissionStatus = "applied" | "accepted" | "rejected" | "waiting";
export interface AdmissionApplication {
  id: string;
  universityId?: string;   // معرّف من قائمة الجامعات (أو نص حر)
  university: string;       // اسم الجامعة المعروض
  major?: string;           // التخصص المُقدَّم عليه
  status: AdmissionStatus;
  date?: string;            // YYYY-MM-DD
  note?: string;
}
const ADMISSIONS_KEY = "darb_admissions";
export function loadAdmissions(): AdmissionApplication[] { return loadList<AdmissionApplication>(ADMISSIONS_KEY); }
export function saveAdmissions(list: AdmissionApplication[]) { saveList(ADMISSIONS_KEY, list); }

/* خريطة تجمّع أحدث درجة لكل اختبار + عدد المحاولات — للمحركات (نقية، لا تعديل) */
export function currentScoreMap(): Record<string, { score: number; date: string; attempts: number }> {
  const results = loadResults();
  const map: Record<string, { score: number; date: string; attempts: number }> = {};
  for (const r of results) {
    const key = r.exam.trim();
    if (!key || !r.score) continue;
    const n = parseFloat(r.score);
    if (!Number.isFinite(n)) continue;
    const prev = map[key];
    if (!prev) {
      map[key] = { score: n, date: r.date ?? "", attempts: 1 };
    } else {
      map[key] = {
        score: Math.max(prev.score, n),   // أعلى درجة
        date: r.date && r.date > prev.date ? r.date : prev.date,
        attempts: prev.attempts + 1,
      };
    }
  }
  return map;
}

/* ── تفضيلات التعلّم — كيف يحب الطالب يذاكر (كلها اختيارية) ── */
export type StudyTime    = "فجر" | "صباح" | "ظهر" | "مساء" | "ليل";
export type SessionLen   = 25 | 45 | 60 | 90;
export type LearningStyle = "فيديو" | "قراءة" | "أسئلة" | "شرح ذكي" | "خرائط ذهنية";
export type StudyDevice  = "جوال" | "تابلت" | "لابتوب" | "مكتبي";
export type StudyFormat  = "ورقي" | "رقمي" | "الاثنان";

export interface DarbPrefs {
  studyTime?: StudyTime;
  sessionLen?: SessionLen;
  learningStyle?: LearningStyle[]; // متعدّد الاختيار
  device?: StudyDevice;
  format?: StudyFormat;
  /* مدخلات محرّك الاستراتيجية (كلها اختيارية — للمحرّك افتراضات ذكية) */
  studyDays?: number;              // أيام المذاكرة الأسبوعية (3–7)
  vacationMode?: boolean;          // وضع الإجازة → طاقة أعلى وأيام أكثر
  subjectFocus?: "auto" | "single" | "parallel" | "rotating"; // تجاوز توزيع المواد
}

const PREFS_KEY = "darb_prefs";
export function loadPrefs(): DarbPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as DarbPrefs) : {};
  } catch { return {}; }
}
export function savePrefs(p: DarbPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}

/* ── تفضيلات التقويم الدراسي (تجاوزات اختيارية فوق التقويم الرسمي) ── */
const CALENDAR_KEY = "darb_calendar";
export function loadCalendarConfig<T = Record<string, unknown>>(): T {
  if (typeof window === "undefined") return {} as T;
  try {
    const raw = localStorage.getItem(CALENDAR_KEY);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch { return {} as T; }
}
export function saveCalendarConfig(c: unknown) {
  try { localStorage.setItem(CALENDAR_KEY, JSON.stringify(c)); } catch {}
}

/* ── الأهداف الأكاديمية — درجات مستهدفة + الجامعة/التخصص (كلها اختيارية) ── */
export interface DarbGoals {
  quduratTarget?: number;
  tahsiliTarget?: number;
  stepTarget?: number;
  cpcTarget?: number;
  itcTarget?: number;
  university?: string;      // الاسم المحلول (SSoT لدويرب) — قد يكون نصاً حراً عند «أخرى»
  major?: string;           // اسم التخصص المحلول
  universityId?: string;    // معرّف منظَّم من قائمة الجامعات (أو «other»)
  majorId?: string;         // معرّف منظَّم من قائمة التخصصات (أو «other»)
  highschoolPct?: number;   // نسبة الثانوية العامة (لحساب الموزونة)
}

const GOALS_KEY = "darb_goals";
export function loadGoals(): DarbGoals {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? (JSON.parse(raw) as DarbGoals) : {};
  } catch { return {}; }
}
export function saveGoals(g: DarbGoals) {
  try { localStorage.setItem(GOALS_KEY, JSON.stringify(g)); } catch {}
}

/* ── خريطة المهارات: معرّفات المهارات المُتقنة ── */
const SKILLS_KEY = "darb_skills";
export function loadSkills(): string[] { return loadList<string>(SKILLS_KEY); }
export function saveSkills(ids: string[]) { saveList(SKILLS_KEY, ids); }

/* ── تاريخ شبكة التخصص (طبقة History لشبكة القرارات) ──
   عدّاد لكل عقدة ضغطها الطالب — ما يراه كثيراً يهبط في الترتيب لاحقاً. */
const GRAPH_VISITS_KEY = "darb_graph_visits";
export function loadGraphVisits(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(GRAPH_VISITS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch { return {}; }
}
export function recordGraphVisit(label: string): Record<string, number> {
  const v = loadGraphVisits();
  v[label] = (v[label] ?? 0) + 1;
  try { localStorage.setItem(GRAPH_VISITS_KEY, JSON.stringify(v)); } catch {}
  return v;
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
  | "quote" | "stats" | "tools" | "community" | "certificate"
  | "studiers" | "map";

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
  stats:       { label: "إحصائياتك",     desc: "ساعات التركيز والجلسات والأخطاء" },
  tools:       { label: "أسرع وصول",   desc: "اختصارات: جلسة أوربت، خطة ذكية، تحليل ملف، إضافة خطأ" },
  community:   { label: "المجتمع",      desc: "المجلس والأرينا" },
  certificate: { label: "الشهادة",      desc: "شهادة الانضباط والترقية" },
  studiers:    { label: "كم يذاكر الآن",   desc: "عدد الطلاب النشطين على المنصة الآن" },
  map:         { label: "خريطة السعودية",   desc: "توزيع الطلاب على مناطق المملكة" },
};

/* التركيز على المهمة — «يعرف الطالب ماذا يذاكر الآن ويبدأ بخطوة واحدة»:
   يظهر افتراضياً أربعة أقسام فقط بهذا الترتيب —
   ١) يومك (البطل: ماذا الآن + الفعل الواحد)  ٢) جدول اليوم (خطة اليوم)
   ٣) أسرع وصول (اختصارات)  ٤) مساراتك (تقدّم موجز).
   بقية الأقسام تبقى متاحة عبر «تخصيص» لكنها مخفيّة افتراضياً حتى لا تُشتّت المهمة. */
const DASH_DEFAULT_ORDER: DashSectionId[] = [
  // ظاهر افتراضياً — يخدم مهمة الصفحة الواحدة
  "today", "schedule", "tools", "track",
  // مخفيّ افتراضياً — متاح دائماً من «تخصيص» (لا يُحذف كوده)
  "ai", "weekly", "stats", "quote", "community", "certificate", "studiers", "map",
];

function defaultLayout(): DashItem[] {
  // مخفيّ افتراضياً: كل ما لا يخدم «ماذا أذاكر الآن» مباشرةً — يُرجَّع من «تخصيص»
  const hidden = new Set<DashSectionId>([
    "ai", "weekly", "stats", "quote", "community", "certificate", "studiers", "map",
  ]);
  return DASH_DEFAULT_ORDER.map((id) => ({ id, visible: !hidden.has(id) }));
}

const DASH_CONFIG_KEY = "darb_dash_config";
const DASH_SCHED2_KEY = "darb_dash_sched_v2"; // علم ترحيل لمرة واحدة
const DASH_TODAY_FIRST_KEY = "darb_dash_today_first_v1"; // ترحيل: يومك أولاً + دويرب ثانياً
const DASH_HERO_V2_KEY = "darb_dash_hero_v2"; // ترحيل: ترتيب «الانطباع الأول» الجديد
const DASH_FOCUS_KEY = "darb_dash_focus_v1"; // ترحيل: إعادة ضبط لتخطيط «ماذا أذاكر الآن» المُنقّى (٤ أقسام)

/* ترحيل لمرة واحدة: انقل «جدول اليوم» ليصير ثاني عنصر — يُحترم تخصيص المستخدم بعدها */
function migrateScheduleSecond(layout: DashItem[]): DashItem[] {
  try {
    if (localStorage.getItem(DASH_SCHED2_KEY)) return layout;
    const out = [...layout];
    const idx = out.findIndex((i) => i.id === "schedule");
    if (idx > 1) {
      const [sched] = out.splice(idx, 1);
      out.splice(1, 0, sched);
    }
    localStorage.setItem(DASH_SCHED2_KEY, "1");
    localStorage.setItem(DASH_CONFIG_KEY, JSON.stringify({ layout: out }));
    return out;
  } catch {
    return layout;
  }
}

/* ترحيل لمرة واحدة: ضع «يومك» أولاً و«دويرب» ثانياً */
function migrateTodayFirst(layout: DashItem[]): DashItem[] {
  try {
    if (localStorage.getItem(DASH_TODAY_FIRST_KEY)) return layout;
    localStorage.setItem(DASH_TODAY_FIRST_KEY, "1");
    const todayItem = layout.find((l) => l.id === "today");
    const aiItem    = layout.find((l) => l.id === "ai");
    const rest      = layout.filter((l) => l.id !== "today" && l.id !== "ai");
    const out       = [...(todayItem ? [todayItem] : []), ...(aiItem ? [aiItem] : []), ...rest];
    localStorage.setItem(DASH_CONFIG_KEY, JSON.stringify({ layout: out }));
    return out;
  } catch {
    return layout;
  }
}

/* ترحيل لمرة واحدة: أعد ترتيب الأقسام إلى ترتيب «الانطباع الأول» الجديد —
   نحافظ على إظهار/إخفاء كل قسم كما خصّصه المستخدم، ونغيّر الترتيب فقط. */
function migrateHeroOrder(layout: DashItem[]): DashItem[] {
  try {
    if (localStorage.getItem(DASH_HERO_V2_KEY)) return layout;
    localStorage.setItem(DASH_HERO_V2_KEY, "1");
    const visById = new Map(layout.map((l) => [l.id, l.visible]));
    const hiddenByDefault = new Set<DashSectionId>(["studiers", "map"]);
    const out: DashItem[] = DASH_DEFAULT_ORDER.map((id) => ({
      id,
      visible: visById.has(id) ? visById.get(id)! : !hiddenByDefault.has(id),
    }));
    localStorage.setItem(DASH_CONFIG_KEY, JSON.stringify({ layout: out }));
    return out;
  } catch {
    return layout;
  }
}

/* ترحيل لمرة واحدة: إعادة ضبط تخطيط كل المستخدمين إلى الافتراضي المُنقّى الجديد —
   «يومك ← جدول اليوم ← أسرع وصول ← مساراتك» ظاهرة، والبقية مخفيّة (متاحة عبر «تخصيص»).
   يُطبَّق مرة واحدة فقط ثم يُحترم تخصيص المستخدم بعده — كنمط migrateTodayFirst/migrateHeroOrder. */
function migrateFocusV1(layout: DashItem[]): DashItem[] {
  try {
    if (localStorage.getItem(DASH_FOCUS_KEY)) return layout;
    localStorage.setItem(DASH_FOCUS_KEY, "1");
    const out = defaultLayout();
    localStorage.setItem(DASH_CONFIG_KEY, JSON.stringify({ layout: out }));
    return out;
  } catch {
    return layout;
  }
}

export function loadDashConfig(): DashConfig {
  if (typeof window === "undefined") return { layout: defaultLayout() };
  try {
    const raw = localStorage.getItem(DASH_CONFIG_KEY);
    if (!raw) return { layout: migrateFocusV1(migrateHeroOrder(migrateTodayFirst(migrateScheduleSecond(defaultLayout())))) };
    const parsed = JSON.parse(raw);

    // الصيغة الجديدة: { layout: [...] } — نُكمل أي قسم ناقص ونُسقط المجهول
    if (parsed && Array.isArray(parsed.layout)) {
      const known: DashItem[] = parsed.layout.filter(
        (it: DashItem) => it && DASH_DEFAULT_ORDER.includes(it.id)
      );
      const seen = new Set(known.map((it) => it.id));
      const hiddenByDefault = new Set<DashSectionId>(["studiers", "map"]);
      const merged = [
        ...known,
        ...DASH_DEFAULT_ORDER.filter((id) => !seen.has(id)).map((id) => ({ id, visible: !hiddenByDefault.has(id) })),
      ];
      return { layout: migrateFocusV1(migrateHeroOrder(migrateTodayFirst(migrateScheduleSecond(merged)))) };
    }

    // ترحيل من الصيغة القديمة: { showStats, showWeekly, showSchedule, showTools, showAI }
    const oldVis: Partial<Record<DashSectionId, boolean>> = {
      stats: parsed.showStats,
      weekly: parsed.showWeekly,
      schedule: parsed.showSchedule,
      tools: parsed.showTools,
      ai: parsed.showAI,
    };
    return { layout: migrateFocusV1(migrateHeroOrder(migrateTodayFirst(migrateScheduleSecond(DASH_DEFAULT_ORDER.map((id) => ({ id, visible: oldVis[id] ?? true })))))) };
  } catch {
    return { layout: defaultLayout() };
  }
}

export function saveDashConfig(cfg: DashConfig) {
  try { localStorage.setItem(DASH_CONFIG_KEY, JSON.stringify(cfg)); } catch {}
}

/* ── مخطط الدراسة الذكي — تعديلات المستخدم على الساعات وترتيب المواد ── */
export interface StudyPlanSubject {
  name: string;
  hoursPerWeek: number;   // ساعات أسبوعية (معدَّلة يدوياً)
  order: number;          // ترتيب العرض (0 = أعلى)
}
export interface StudyPlanOverride {
  subjects: StudyPlanSubject[];
  lastModified: string;  // ISO timestamp
}

const STUDY_PLAN_KEY = "darb_study_plan";
export function loadStudyPlan(): StudyPlanOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STUDY_PLAN_KEY);
    return raw ? (JSON.parse(raw) as StudyPlanOverride) : null;
  } catch { return null; }
}
export function saveStudyPlan(plan: StudyPlanOverride) {
  try { localStorage.setItem(STUDY_PLAN_KEY, JSON.stringify(plan)); } catch {}
}
export function clearStudyPlan() {
  try { localStorage.removeItem(STUDY_PLAN_KEY); } catch {}
}

/* ── أدوات الجامعة (/uni-tools): مدخلات الحاسبات — حفظ محلي فقط (لا مزامنة سحابية)
   القيم الرقمية تُخزَّن نصاً خاماً كما كتبها الطالب في الحقول، والحساب كله
   في src/lib/uniTools النقي. ── */
export interface UniToolsCourseRow { name: string; hours: string; letter: string }
export interface UniToolsState {
  system?: 4 | 5;                // نظام المعدل المختار (افتراضي 5)
  courses?: UniToolsCourseRow[]; // مواد الفصل (حاسبة المعدل)
  prevGpa?: string;              // التراكمي الحالي
  prevHours?: string;            // الساعات المنجزة
  targetGpa?: string;            // الهدف («وش أحتاج؟»)
  absence?: { weeklyHours?: string; weeks?: string; limitPct?: string; absent?: string };
  final?: { currentScore?: string; currentOutOf?: string; finalWeight?: string; targetTotal?: string };
  convert?: { value?: string; from?: 4 | 5 | 100; to?: 4 | 5 | 100 };
}
const UNI_TOOLS_KEY = "darb_uni_tools";
export function loadUniTools(): UniToolsState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(UNI_TOOLS_KEY);
    return raw ? (JSON.parse(raw) as UniToolsState) : {};
  } catch { return {}; }
}
export function saveUniTools(s: UniToolsState) {
  try { localStorage.setItem(UNI_TOOLS_KEY, JSON.stringify(s)); } catch {}
}
