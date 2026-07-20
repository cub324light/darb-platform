/* ═══════════ قارئ مساري (Reader) — طبقة IO تجمع البيانات الحقيقية للجسر ═══════════
   الوحيد الذي يلمس التخزين. يجمّع لقطة ExamInputs من مصادرها الحقيقية ثم يمرّرها للجسر
   النقيّ computeExamDashboard. لا حساب هنا (فقط قراءةٌ وتجميع)؛ ولا واجهة. المتّصِل (الواجهة)
   يمرّر واصف الاختبار المحلول (subjects/examKey/label) فلا يفرّع القارئ بين وحدةٍ وعضو. */
import { loadUser, loadStats, ensureJoinDate, loadTrackExamDates, currentScoreMap, loadList } from "../storage";
import { EXAM_PROVIDER } from "../examProvider";
import { loadRoadmapConfig } from "./store";
import { getExamMeta } from "./model";
import { daysBetween, type ExamInputs } from "./metrics";
import { ROADMAP_TUNING } from "./config";

const DONE_KEY = "darb_done_lessons";
const CUSTOM_KEY = "darb_lessons";

interface ExamDescriptor { examId: string; subjects?: { name: string }[]; examKey?: string; label: string; scoreMax?: number }

/** عدّ عناصر المذاكرة (تأسيس + تدريب) لمواد الاختبار — نفس مصدر StudyBody. */
function itemCounts(subjects: { name: string }[] | undefined): { done: number; total: number } {
  if (!subjects?.length || typeof window === "undefined") return { done: 0, total: 0 };
  const done = new Set(loadList<string>(DONE_KEY));
  const custom = loadList<{ subject: string; id: string }>(CUSTOM_KEY);
  const tItems = loadList<{ subject: string; id: string }>("darb_tadreeb_items");
  const tDone = new Set(loadList<string>("darb_tadreeb_done"));
  let total = 0, hit = 0;
  for (const s of subjects) {
    const keys = custom.filter((c) => c.subject === s.name).map((c) => `custom-${c.id}`);
    const tr = tItems.filter((t) => t.subject === s.name).map((t) => t.id);
    total += keys.length + tr.length;
    hit += keys.filter((k) => done.has(k)).length + tr.filter((k) => tDone.has(k)).length;
  }
  return { done: hit, total };
}

/** أخطاء «أخطائي»: العدد + هل استُعمل الدفتر أصلاً + طابع آخر خطأ (ms) لحساب «آخر خطأ قبل...». */
function vaultInfo(): { count: number; ever: boolean; lastErrorAt: number | null } {
  if (typeof window === "undefined") return { count: 0, ever: false, lastErrorAt: null };
  try {
    const raw = localStorage.getItem("darb_vault");
    const arr = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(arr)) return { count: 0, ever: raw != null, lastErrorAt: null };
    const stamps = arr.map((e) => (typeof e?.createdAt === "number" ? e.createdAt : 0)).filter((t) => t > 0);
    return { count: arr.length, ever: raw != null, lastErrorAt: stamps.length ? Math.max(...stamps) : null };
  } catch { return { count: 0, ever: false, lastErrorAt: null }; }
}

/** نوافذ تسجيلٍ قادمة لهذا الاختبار من الجهة الرسمية (examProvider). */
function futureWindows(examKey: string | undefined, today: string): { start: string; end: string }[] {
  if (!examKey) return [];
  const entry = EXAM_PROVIDER.find((e) => e.trackId === examKey);
  if (!entry) return [];
  return entry.windows
    .filter((w) => w.registrationStart && w.registrationEnd && w.registrationEnd >= today)
    .map((w) => ({ start: w.registrationStart as string, end: w.registrationEnd as string }));
}

/** الالتزام (زمن) على نافذةٍ من الأيام النشطة الأخيرة — محايد النطاق (إجماليٌّ الآن).
    عرض النافذة من config (commitmentWindowDays) لا رقمٌ ثابت. */
function commitmentWindow(studyHours: number | undefined): { plannedMins: number; doneMins: number; started: boolean } {
  const dm = loadStats().dayMins ?? {};
  const recent = Object.keys(dm).filter((k) => (dm[k] ?? 0) > 0).sort().slice(-ROADMAP_TUNING.commitmentWindowDays);
  const doneMins = recent.reduce((a, k) => a + (dm[k] ?? 0), 0);
  const days = Math.max(1, recent.length);
  return { plannedMins: (studyHours ?? 0) * 60 * days, doneMins, started: recent.length > 0 };
}

/** يجمّع لقطة المدخلات الحقيقية لاختبارٍ واحد. */
export function readExamInputs(exam: ExamDescriptor, now: Date = new Date()): ExamInputs {
  const today = now.toISOString().slice(0, 10);
  const user = loadUser();
  const cfg = loadRoadmapConfig();
  const meta = getExamMeta(cfg, exam.examId);

  const counts = itemCounts(exam.subjects);
  const commit = commitmentWindow(user?.studyHours);
  const vault = vaultInfo();
  const examDate = exam.examKey ? (loadTrackExamDates()[exam.examKey] ?? null) : null;
  const scoreEntry = currentScoreMap()[exam.label];
  const waitingResult = (user?.pendingResults ?? []).some(
    (p) => (p.exam as string) === exam.examId || (p.exam as string) === exam.examKey,
  );
  const joinDate = ensureJoinDate();
  const elapsedDays = joinDate ? Math.max(0, daysBetween(joinDate, today)) : 0;
  const lastErrorDaysAgo = vault.lastErrorAt != null
    ? Math.max(0, daysBetween(new Date(vault.lastErrorAt).toISOString().slice(0, 10), today))
    : null;

  return {
    today,
    examDate,
    registrationDate: meta.registrationDate ?? null,
    targetScore: meta.targetScore ?? null,
    doneItems: counts.done,
    totalItems: counts.total,
    plannedMins: commit.plannedMins,
    doneMins: commit.doneMins,
    started: commit.started,
    activeErrors: vault.count,
    everLoggedErrors: vault.ever,
    lastErrorDaysAgo,
    lastScore: scoreEntry ? scoreEntry.score : null,
    scoreMax: exam.scoreMax && exam.scoreMax > 0 ? exam.scoreMax : 100,
    waitingResult,
    elapsedDays,
    examWindows: examDate ? [] : futureWindows(exam.examKey, today),
    prepDays: ROADMAP_TUNING.suggestedPrepDays,
  };
}
