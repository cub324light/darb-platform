/* ─── Workspace (مساري) — لوحة العمل اليومية (قرار المالك #1) ───
   ليست مجرد Array من الوحدات: هي المسؤولة عن الترتيب والإضافة والحذف والإخفاء
   والأولوية وآخر نشاطٍ وحالة كل وحدة. وهي المكان الوحيد الذي يُنشئ وحدةً
   (buildInitialWorkspace للـCore تلقائياً + addModule للاختيارية عند ضغط الطالب —
   قاعدة المالك #7). كل الدوال نقيّة تُرجع Workspace جديداً. */

import type { BoardStage } from "../examEligibility";
import type { ModuleId, ModuleInstance, ModuleState } from "./types";
import { moduleDef, isCore, coreModulesForStage } from "./registry";

export interface Workspace {
  modules: ModuleInstance[]; // مرتّبة منطقياً بـ order (Core أولاً)
  updatedAt: number;
}

const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function makeInstance(id: ModuleId, order: number, now: number): ModuleInstance {
  return { id, kind: moduleDef(id).kind, state: "added", progress: 0, order, hidden: false, lastActivityAt: now };
}

/* بناء مساري الابتدائي: وحدات Core للمرحلة فقط. لا شيء اختياري يُضاف تلقائياً. */
export function buildInitialWorkspace(stage: BoardStage, now: number = Date.now()): Workspace {
  const core = coreModulesForStage(stage);
  return { modules: core.map((id, i) => makeInstance(id, i, now)), updatedAt: now };
}

/* مواءمة Core مع المرحلة عند الترقية التلقائية (ثانوي→خريج→جامعي):
   يضيف Core الناقصة للمرحلة الجديدة، ويحذف Core التي لم تعد تخصّها (المدرسة عند التخرّج)،
   ويُبقي كل الوحدات الاختيارية كما هي. */
export function syncCoreModules(ws: Workspace, stage: BoardStage, now: number = Date.now()): Workspace {
  const want = new Set(coreModulesForStage(stage));
  const kept = ws.modules.filter((m) => m.kind !== "core" || want.has(m.id));
  const have = new Set(kept.filter((m) => m.kind === "core").map((m) => m.id));
  const base = kept.reduce((mx, m) => Math.max(mx, m.order), -1) + 1;
  const added = [...want].filter((id) => !have.has(id)).map((id, i) => makeInstance(id, base + i, now));
  if (added.length === 0 && kept.length === ws.modules.length) return ws;
  return { modules: [...kept, ...added], updatedAt: now };
}

/* الإضافة — الطريق الوحيد لإنشاء وحدة اختيارية (قاعدة المالك #7).
   يرفض: Core، أو موجودةً أصلاً. لا يفحص الأهلية (منفصلة في canAddModule). */
export function addModule(ws: Workspace, id: ModuleId, now: number = Date.now()): Workspace {
  if (isCore(id)) return ws;                          // Core لا يُضاف يدوياً
  if (ws.modules.some((m) => m.id === id)) return ws; // بلا تكرار
  const order = ws.modules.reduce((mx, m) => Math.max(mx, m.order), -1) + 1;
  return { modules: [...ws.modules, makeInstance(id, order, now)], updatedAt: now };
}

/* الحذف — Core لا يُحذف (قاعدة المالك #2). */
export function removeModule(ws: Workspace, id: ModuleId, now: number = Date.now()): Workspace {
  if (isCore(id) || !ws.modules.some((m) => m.id === id)) return ws;
  return { modules: ws.modules.filter((m) => m.id !== id), updatedAt: now };
}

/* الإخفاء — Core لا يُخفى (المدرسة ظاهرة دائماً). */
export function hideModule(ws: Workspace, id: ModuleId, hidden: boolean, now: number = Date.now()): Workspace {
  if (isCore(id) && hidden) return ws;
  return patch(ws, id, () => ({ hidden }), now);
}

/* إعادة الترتيب — تعيد ترقيم order حسب التسلسل المُعطى (المجهول يبقى بعده بترتيبه). */
export function reorderModules(ws: Workspace, orderedIds: ModuleId[], now: number = Date.now()): Workspace {
  const rank = new Map(orderedIds.map((id, i) => [id, i] as const));
  const modules = ws.modules.map((m) => ({ ...m, order: rank.get(m.id) ?? orderedIds.length + m.order }));
  return { modules, updatedAt: now };
}

export function setPriority(ws: Workspace, id: ModuleId, priority: boolean, now: number = Date.now()): Workspace {
  return patch(ws, id, () => ({ priority }), now);
}

/* التقدّم يقود الحالة تلقائياً (0→added · 1..99→active · 100→completed)،
   إلا إن كانت الحالة يدوية (paused/needs-retake) فتبقى كما ضبطها الطالب. */
export function setProgress(ws: Workspace, id: ModuleId, progress: number, now: number = Date.now()): Workspace {
  const p = clampPct(progress);
  return patch(ws, id, (m) => {
    const manual = m.state === "paused" || m.state === "needs-retake";
    const state: ModuleState = manual ? m.state : p >= 100 ? "completed" : p > 0 ? "active" : "added";
    return { progress: p, state, lastActivityAt: now };
  }, now);
}

/* ضبط الحالة صراحةً (متوقف/يحتاج إعادة/…) — للانتقالات اليدوية. */
export function setState(ws: Workspace, id: ModuleId, state: ModuleState, now: number = Date.now()): Workspace {
  return patch(ws, id, () => ({ state, lastActivityAt: now }), now);
}

export function recordScore(ws: Workspace, id: ModuleId, score: string, now: number = Date.now()): Workspace {
  return patch(ws, id, () => ({ score, lastActivityAt: now }), now);
}

export function touchActivity(ws: Workspace, id: ModuleId, now: number = Date.now()): Workspace {
  return patch(ws, id, () => ({ lastActivityAt: now }), now);
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

/* ── محدِّدات القراءة ── */
export const getInstance = (ws: Workspace, id: ModuleId): ModuleInstance | undefined => ws.modules.find((m) => m.id === id);
export const hasModule = (ws: Workspace, id: ModuleId): boolean => ws.modules.some((m) => m.id === id);
/* الترتيب المعروض: الأولوية أولاً، ثم order. */
export const orderedModules = (ws: Workspace): ModuleInstance[] =>
  [...ws.modules].sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)) || a.order - b.order);
export const visibleModules = (ws: Workspace): ModuleInstance[] => orderedModules(ws).filter((m) => !m.hidden);
export const coreInstances = (ws: Workspace): ModuleInstance[] => ws.modules.filter((m) => m.kind === "core");
export const optionalInstances = (ws: Workspace): ModuleInstance[] => ws.modules.filter((m) => m.kind === "optional");
