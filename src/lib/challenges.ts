/* ─── نظام التحديات — أهداف بمكافآت فضة، تُحسب من الإحصاءات الموجودة ─── */
import { loadStats, loadSessionLog, computeStreak, addSilver, localDayKey, type DarbStats } from "./storage";

export interface ChallengeDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  goal: number;
  unit: string;
  reward: number;          // فضة
  period: "once" | "weekly";
  metric: (ctx: ChallengeCtx) => number;
}

interface ChallengeCtx {
  stats: DarbStats;
  streak: number;
  weekMins: number;
  weekSessions: number;
  vaultCount: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: "first_session", icon: "🚀", title: "ابدأ رحلتك", desc: "أكمل أول جلسة تركيز", goal: 1, unit: "جلسة", reward: 20, period: "once",
    metric: (c) => Math.min(c.stats.sessionsCount, 1) },
  { id: "streak_7", icon: "🔥", title: "أسبوع منتظم", desc: "ذاكر 7 أيام متتالية", goal: 7, unit: "يوم", reward: 60, period: "once",
    metric: (c) => c.streak },
  { id: "sessions_10", icon: "💪", title: "عشر جلسات", desc: "أكمل 10 جلسات تركيز", goal: 10, unit: "جلسة", reward: 50, period: "once",
    metric: (c) => c.stats.sessionsCount },
  { id: "week_300", icon: "⏱️", title: "خمس ساعات هذا الأسبوع", desc: "ذاكر 300 دقيقة خلال الأسبوع", goal: 300, unit: "دقيقة", reward: 70, period: "weekly",
    metric: (c) => c.weekMins },
  { id: "week_5sessions", icon: "📅", title: "خمس جلسات أسبوعية", desc: "أكمل 5 جلسات هذا الأسبوع", goal: 5, unit: "جلسة", reward: 40, period: "weekly",
    metric: (c) => c.weekSessions },
  { id: "vault_5", icon: "🔍", title: "صيّاد الأخطاء", desc: "سجّل 5 أخطاء في خزنتك", goal: 5, unit: "خطأ", reward: 30, period: "once",
    metric: (c) => c.vaultCount },
];

const CLAIM_KEY = "darb_challenges_claimed";

/* المُطالَب بها: «once» تُخزَّن بالـid، و«weekly» تُخزَّن بـid#مفتاح-الأسبوع */
function loadClaimed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(CLAIM_KEY) ?? "{}"); } catch { return {}; }
}
function saveClaimed(c: Record<string, boolean>) {
  try { localStorage.setItem(CLAIM_KEY, JSON.stringify(c)); } catch {}
}

/* مفتاح الأسبوع الحالي (يبدأ الأحد) لإعادة تعيين التحديات الأسبوعية */
function weekKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // الأحد
  return localDayKey(d);
}
function claimId(def: ChallengeDef): string {
  return def.period === "weekly" ? `${def.id}#${weekKey()}` : def.id;
}

export interface ChallengeState {
  def: ChallengeDef;
  current: number;
  done: boolean;
  claimed: boolean;
}

function buildCtx(): ChallengeCtx {
  const stats = loadStats();
  const log = loadSessionLog();
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = log.filter((e) => e.ts >= weekAgo);
  const dayMins = stats.dayMins ?? {};
  let weekMins = 0;
  for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); weekMins += dayMins[localDayKey(d)] ?? 0; }
  let vaultCount = 0;
  try { const v = JSON.parse(localStorage.getItem("darb_vault") ?? "[]"); vaultCount = Array.isArray(v) ? v.length : 0; } catch {}
  return { stats, streak: computeStreak(stats), weekMins, weekSessions: recent.length, vaultCount };
}

export function getChallengeStates(): ChallengeState[] {
  if (typeof window === "undefined") return [];
  const ctx = buildCtx();
  const claimed = loadClaimed();
  return CHALLENGES.map((def) => {
    const current = Math.min(def.metric(ctx), def.goal);
    return {
      def,
      current,
      done: current >= def.goal,
      claimed: claimed[claimId(def)] === true,
    };
  });
}

/* مطالبة بمكافأة تحدٍّ مكتمل — يضيف الفضة ويمنع التكرار */
export function claimChallenge(def: ChallengeDef): boolean {
  const states = getChallengeStates();
  const st = states.find((s) => s.def.id === def.id);
  if (!st || !st.done || st.claimed) return false;
  const claimed = loadClaimed();
  claimed[claimId(def)] = true;
  saveClaimed(claimed);
  addSilver(def.reward);
  return true;
}
