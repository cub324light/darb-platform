/* ─── منطق الباقات (الخطط) — مصدر واحد للحقيقة ───
   الباقة تُحفظ على المستخدم محلياً وتتزامن سحابياً (top-level field)
   حتى تستطيع لوحة الإدارة قراءتها ومنحها. */
import { loadUser, saveUser } from "./storage";
import { syncUser } from "./firestore";
import type { PlanId } from "./types";

export const PLAN_NAMES: Record<PlanId, string> = {
  free: "مجاني",
  shaheen: "شاهين",
  anqa: "عنقاء",
};

export const PLAN_COLORS: Record<PlanId, string> = {
  free: "#64748B",
  shaheen: "#2563EB",
  anqa: "#F59E0B",
};

export const PLAN_ORDER: PlanId[] = ["free", "shaheen", "anqa"];

/* حد الخزنة لكل مادة في الباقة المجانية — غير محدود للمدفوع */
export const VAULT_FREE_LIMIT = 25;

export function normalizePlan(p: unknown): PlanId {
  return p === "shaheen" || p === "anqa" ? p : "free";
}

export function getPlan(): PlanId {
  if (typeof window === "undefined") return "free";
  return normalizePlan(loadUser()?.plan);
}

export function isPaid(): boolean {
  return getPlan() !== "free";
}

/* تفعيل باقة محلياً ومزامنتها للسحابة فوراً */
export function setPlan(plan: PlanId): boolean {
  const u = loadUser();
  if (!u) return false;
  saveUser({ ...u, plan });
  syncUser({ plan });
  return true;
}
