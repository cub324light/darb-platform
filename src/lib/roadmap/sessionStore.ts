/* ═══════════ محوّل تخزين الجلسات — المصدرُ الواحد لكلِّ جلسةٍ مذاكرة ═══════════
   ▸ العطل الذي أُغلق: كان لواقعةٍ واحدة (جلسةٌ انتهت) **سجلّان متوازيان**:
       · `darb_sessions`    — `StudySessionLog` (اختبار · مادّة · نوعُ المهمّة · البداية · المدّة)
                              حدُّه ألفُ جلسة، ومنه إحصاءاتُ «مساري» والجاهزيةُ وسياقُ دويرب.
       · `darb_session_log` — `SessionLogEntry` (مادّة · دقائق · وقت) حدُّه مئتان،
                              ومنه بطاقةُ أوربت والتقريرُ الأسبوعيُّ والتحدّيات.
     يكتبهما `/orbit` معاً في كلّ جلسة؛ ولو كتب أحدَهما وحدَه تفرّق العدُّ بين شاشتين.
     وزيادةً: الأوّلُ كان **خارج النسخ الاحتياطي** — فمن بدّل جهازه فقد جلساتِ مساري
     كلَّها واحتفظ بجلسات أوربت.

   ▸ صار `darb_sessions` هو السجلَّ الواحد، و`SessionLogEntry` **عرضاً مشتقّاً** منه
     (في `storage.loadSessionLog`) بنفس شكله ونفس ترتيبه ونفس حدّه — فلم يتغيّر على
     أيّ مستهلكٍ حرف. والقديمُ يُدمج مرّةً بلا فقدِ جلسةٍ واحدة. */
import type { StudySessionLog } from "./session";

const KEY = "darb_sessions";
const LEGACY_KEY = "darb_session_log";
const CAP = 1000; // نحتفظ بآخر ألف جلسة (يكفي لكل الإحصاءات)

/** شكلُ السجلّ القديم — يبقى معرَّفاً للترحيل وحدَه. */
interface LegacyEntry { id: string; subject: string; focusMins: number; ts: number }

function readRaw(key: string): unknown {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

/* ترحيلٌ لمرّةٍ واحدة: كلُّ مدخلٍ قديمٍ ليس في السجلّ الجديد يُحوَّل ويُدمج بترتيبه
   الزمنيّ. المطابقةُ بالمعرّف — و`/orbit` كان يكتب معرّفين مختلفين للجلسة نفسها
   (كلاهما من `Date.now()`)، فنطابق أيضاً بالبداية والمدّة كي لا تتضاعف جلسة. */
function migrateLegacy(current: StudySessionLog[]): StudySessionLog[] | null {
  const legacy = readRaw(LEGACY_KEY);
  if (!Array.isArray(legacy)) return null;
  const seenId = new Set(current.map((s) => s.id));
  const seenAt = new Set(current.map((s) => `${s.startedAt}|${s.durationMins}`));
  const added: StudySessionLog[] = [];
  for (const e of legacy as LegacyEntry[]) {
    if (!e || typeof e.ts !== "number") continue;
    const startedAt = e.ts - (e.focusMins ?? 0) * 60_000;
    if (seenId.has(e.id) || seenAt.has(`${startedAt}|${e.focusMins}`)) continue;
    added.push({
      id: e.id, examId: "orbit", subject: e.subject ?? "",
      taskKind: "review", startedAt, durationMins: e.focusMins ?? 0,
    });
  }
  if (added.length === 0) { try { localStorage.removeItem(LEGACY_KEY); } catch { /* تجاهل */ } return null; }
  const merged = [...current, ...added].sort((a, b) => a.startedAt - b.startedAt).slice(-CAP);
  try {
    localStorage.setItem(KEY, JSON.stringify(merged));
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* تجاهل تجاوز الحصّة — القراءةُ تبقى صحيحة */ }
  return merged;
}

export function loadSessions(): StudySessionLog[] {
  if (typeof window === "undefined") return [];
  const arr = readRaw(KEY);
  const current = Array.isArray(arr) ? (arr as StudySessionLog[]) : [];
  return migrateLegacy(current) ?? current;
}

export function saveSessions(sessions: StudySessionLog[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(sessions.slice(-CAP))); } catch { /* تجاهل */ }
}

/** يُلحِق جلسةً منتهية ويعيد القائمة المحدّثة. */
export function appendSession(log: StudySessionLog): StudySessionLog[] {
  const next = [...loadSessions(), log];
  saveSessions(next); return next;
}
