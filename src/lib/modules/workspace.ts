/* ─── Workspace (مساري) — لوحة العمل اليومية ───
   ليست مجرد Array: هي المسؤولة عن الترتيب والإضافة والحذف والإخفاء والأولوية
   وآخر نشاطٍ وحالة كل وحدة/عضو. وهي المكان الوحيد الذي يُنشئ وحدةً أو عضواً
   (buildInitialWorkspace للـCore + addModule/addMember عند ضغط الطالب). كل الدوال
   نقيّة تُرجع Workspace جديداً. الوحدات المجموعة (اللغة/البرامج) تحمل أعضاءً
   بتقدّمٍ مستقل، وتقدّم/حالة المجموعة مشتقّان منهم. */

import type { BoardStage } from "../examEligibility";
import type { ModuleId, ExamMemberId, ModuleInstance, ModuleMember, ModuleState } from "./types";
import { moduleDef, isCore, isGroup, coreModulesForStage, parentModuleOf } from "./registry";

export interface Workspace {
  modules: ModuleInstance[]; // الوحدات العليا (بطاقات الصفحة) مرتّبة بـ order
  updatedAt: number;
}

const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));
const nextOrder = (modules: ModuleInstance[]): number => modules.reduce((mx, m) => Math.max(mx, m.order), -1) + 1;

function makeInstance(id: ModuleId, order: number, now: number): ModuleInstance {
  const base: ModuleInstance = { id, kind: moduleDef(id).kind, state: "added", progress: 0, order, hidden: false, lastActivityAt: now };
  return isGroup(id) ? { ...base, members: [] } : base;
}

/* حالة المفرد يقودها التقدّم — إلا إن كانت يدوية (متوقف/يحتاج إعادة). */
function stateFromProgress(prev: ModuleState, p: number): ModuleState {
  if (prev === "paused" || prev === "needs-retake") return prev;
  return p >= 100 ? "completed" : p > 0 ? "active" : "added";
}

/* إعادة اشتقاق تقدّم/حالة/آخر نشاطٍ لوحدةٍ مجموعة من أعضائها. */
function recomputeGroup(m: ModuleInstance): ModuleInstance {
  const mem = m.members;
  if (!mem) return m;
  const progress = mem.length ? Math.round(mem.reduce((a, x) => a + x.progress, 0) / mem.length) : 0;
  const state: ModuleState =
    mem.length > 0 && mem.every((x) => x.state === "completed") ? "completed"
    : mem.some((x) => x.state === "active" || x.progress > 0) ? "active" : "added";
  const lastActivityAt = mem.reduce<number | undefined>(
    (mx, x) => (x.lastActivityAt && (!mx || x.lastActivityAt > mx) ? x.lastActivityAt : mx), m.lastActivityAt);
  return { ...m, progress, state, lastActivityAt };
}

/* بناء مساري الابتدائي: وحدات Core للمرحلة فقط. لا شيء اختياري يُضاف تلقائياً. */
export function buildInitialWorkspace(stage: BoardStage, now: number = Date.now()): Workspace {
  const core = coreModulesForStage(stage);
  return { modules: core.map((id, i) => makeInstance(id, i, now)), updatedAt: now };
}

/* مواءمة Core مع المرحلة عند الترقية التلقائية — يبقي الاختيارية كما هي. */
export function syncCoreModules(ws: Workspace, stage: BoardStage, now: number = Date.now()): Workspace {
  const want = new Set(coreModulesForStage(stage));
  const kept = ws.modules.filter((m) => m.kind !== "core" || want.has(m.id));
  const have = new Set(kept.filter((m) => m.kind === "core").map((m) => m.id));
  const base = nextOrder(kept);
  const added = [...want].filter((id) => !have.has(id)).map((id, i) => makeInstance(id, base + i, now));
  if (added.length === 0 && kept.length === ws.modules.length) return ws;
  return { modules: [...kept, ...added], updatedAt: now };
}

/* إضافة وحدة مفردة اختيارية (قدرات/تحصيلي) — الطريق الوحيد لإنشائها.
   يرفض: Core، مجموعة (تُضاف عبر addMember)، أو موجودةً أصلاً. لا يفحص الأهلية. */
export function addModule(ws: Workspace, id: ModuleId, now: number = Date.now()): Workspace {
  if (isCore(id) || isGroup(id)) return ws;
  if (ws.modules.some((m) => m.id === id)) return ws;
  return { modules: [...ws.modules, makeInstance(id, nextOrder(ws.modules), now)], updatedAt: now };
}

/* إضافة عضو (اختبار لغة/برنامج) — يُنشئ وحدته المجموعة الأمّ إن غابت ثم يضيفه.
   الطريق الوحيد لإنشاء عضو/مجموعة. لا يفحص الأهلية (منفصلة في canAddMember). */
export function addMember(ws: Workspace, memberId: ExamMemberId, now: number = Date.now()): Workspace {
  const parent = parentModuleOf(memberId);
  let modules = ws.modules;
  let group = modules.find((m) => m.id === parent);
  if (!group) {
    group = makeInstance(parent, nextOrder(modules), now);
    modules = [...modules, group];
  }
  if (group.members?.some((x) => x.id === memberId)) return ws; // موجود
  const member: ModuleMember = { id: memberId, state: "added", progress: 0, lastActivityAt: now };
  const next = recomputeGroup({ ...group, members: [...(group.members ?? []), member] });
  return { modules: modules.map((m) => (m.id === parent ? next : m)), updatedAt: now };
}

/* حذف وحدة عليا — Core لا تُحذف (مفردة أو مجموعة كاملة بأعضائها). */
export function removeModule(ws: Workspace, id: ModuleId, now: number = Date.now()): Workspace {
  if (isCore(id) || !ws.modules.some((m) => m.id === id)) return ws;
  return { modules: ws.modules.filter((m) => m.id !== id), updatedAt: now };
}

/* حذف عضو — من وحدته الأمّ؛ فإن أفرغها حُذفت المجموعة كذلك. */
export function removeMember(ws: Workspace, memberId: ExamMemberId, now: number = Date.now()): Workspace {
  const parent = parentModuleOf(memberId);
  const group = ws.modules.find((m) => m.id === parent);
  if (!group?.members?.some((x) => x.id === memberId)) return ws;
  const rest = group.members.filter((x) => x.id !== memberId);
  if (rest.length === 0) return { modules: ws.modules.filter((m) => m.id !== parent), updatedAt: now };
  const next = recomputeGroup({ ...group, members: rest });
  return { modules: ws.modules.map((m) => (m.id === parent ? next : m)), updatedAt: now };
}

/* الإخفاء — Core لا يُخفى. */
export function hideModule(ws: Workspace, id: ModuleId, hidden: boolean, now: number = Date.now()): Workspace {
  if (isCore(id) && hidden) return ws;
  return patch(ws, id, () => ({ hidden }), now);
}

/* إعادة الترتيب — تعيد ترقيم order حسب التسلسل المُعطى (المجهول يبقى بعده). */
export function reorderModules(ws: Workspace, orderedIds: ModuleId[], now: number = Date.now()): Workspace {
  const rank = new Map(orderedIds.map((id, i) => [id, i] as const));
  const modules = ws.modules.map((m) => ({ ...m, order: rank.get(m.id) ?? orderedIds.length + m.order }));
  return { modules, updatedAt: now };
}

export function setPriority(ws: Workspace, id: ModuleId, priority: boolean, now: number = Date.now()): Workspace {
  return patch(ws, id, () => ({ priority }), now);
}

export function touchActivity(ws: Workspace, id: ModuleId, now: number = Date.now()): Workspace {
  return patch(ws, id, () => ({ lastActivityAt: now }), now);
}

/* ── تقدّم/حالة/درجة الوحدة المفردة ── */
export function setProgress(ws: Workspace, id: ModuleId, progress: number, now: number = Date.now()): Workspace {
  if (isGroup(id)) return ws; // المجموعة يقودها أعضاؤها
  const p = clampPct(progress);
  return patch(ws, id, (m) => ({ progress: p, state: stateFromProgress(m.state, p), lastActivityAt: now }), now);
}
export function setState(ws: Workspace, id: ModuleId, state: ModuleState, now: number = Date.now()): Workspace {
  if (isGroup(id)) return ws;
  return patch(ws, id, () => ({ state, lastActivityAt: now }), now);
}
export function recordScore(ws: Workspace, id: ModuleId, score: string, now: number = Date.now()): Workspace {
  if (isGroup(id)) return ws;
  return patch(ws, id, () => ({ score, lastActivityAt: now }), now);
}

/* ── تقدّم/حالة/درجة عضو المجموعة — تُعاد اشتقاق المجموعة تلقائياً ── */
export function setMemberProgress(ws: Workspace, memberId: ExamMemberId, progress: number, now: number = Date.now()): Workspace {
  const p = clampPct(progress);
  return patchMember(ws, memberId, (x) => ({ progress: p, state: stateFromProgress(x.state, p), lastActivityAt: now }), now);
}
export function setMemberState(ws: Workspace, memberId: ExamMemberId, state: ModuleState, now: number = Date.now()): Workspace {
  return patchMember(ws, memberId, () => ({ state, lastActivityAt: now }), now);
}
export function recordMemberScore(ws: Workspace, memberId: ExamMemberId, score: string, now: number = Date.now()): Workspace {
  return patchMember(ws, memberId, () => ({ score, lastActivityAt: now }), now);
}

function patch(ws: Workspace, id: ModuleId, fn: (m: ModuleInstance) => Partial<ModuleInstance>, now: number): Workspace {
  let changed = false;
  const modules = ws.modules.map((m) => {
    if (m.id !== id) return m;
    changed = true;
    return { ...m, ...fn(m) };
  });
  return changed ? { modules, updatedAt: now } : ws;
}

function patchMember(ws: Workspace, memberId: ExamMemberId, fn: (x: ModuleMember) => Partial<ModuleMember>, now: number): Workspace {
  const parent = parentModuleOf(memberId);
  const group = ws.modules.find((m) => m.id === parent);
  if (!group?.members?.some((x) => x.id === memberId)) return ws;
  const members = group.members.map((x) => (x.id === memberId ? { ...x, ...fn(x) } : x));
  const next = recomputeGroup({ ...group, members });
  return { modules: ws.modules.map((m) => (m.id === parent ? next : m)), updatedAt: now };
}

/* ── محدِّدات القراءة ── */
export const getInstance = (ws: Workspace, id: ModuleId): ModuleInstance | undefined => ws.modules.find((m) => m.id === id);
export const hasModule = (ws: Workspace, id: ModuleId): boolean => ws.modules.some((m) => m.id === id);
export const getMember = (ws: Workspace, memberId: ExamMemberId): ModuleMember | undefined =>
  ws.modules.find((m) => m.id === parentModuleOf(memberId))?.members?.find((x) => x.id === memberId);
export const hasMember = (ws: Workspace, memberId: ExamMemberId): boolean => getMember(ws, memberId) !== undefined;
export const groupMembers = (ws: Workspace, id: ModuleId): ModuleMember[] => getInstance(ws, id)?.members ?? [];
/* الترتيب المعروض: الأولوية أولاً، ثم order. */
export const orderedModules = (ws: Workspace): ModuleInstance[] =>
  [...ws.modules].sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)) || a.order - b.order);
export const visibleModules = (ws: Workspace): ModuleInstance[] => orderedModules(ws).filter((m) => !m.hidden);
export const coreInstances = (ws: Workspace): ModuleInstance[] => ws.modules.filter((m) => m.kind === "core");
export const optionalInstances = (ws: Workspace): ModuleInstance[] => ws.modules.filter((m) => m.kind === "optional");

/* عدد الاختبارات المختارة (لحدّ مساري الأقصى): كل وحدةٍ مفردةٍ اختيارية (قدرات/تحصيلي)
   + كل عضوٍ في مجموعة (لغة/برنامج). الـCore (الجامعة) وحاويات المجموعات لا تُعدّ اختباراً
   بذاتها — العضو هو الاختبار. مصدرٌ واحد لعدّ الحدّ الأقصى ٣ (atMax/remainingSlots). */
export function examCount(ws: Workspace): number {
  return ws.modules.reduce((n, m) => {
    if (m.kind === "core") return n;
    return n + (isGroup(m.id) ? (m.members?.length ?? 0) : 1);
  }, 0);
}
