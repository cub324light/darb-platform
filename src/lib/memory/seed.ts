/* ─── بذرة الذاكرة من البيانات الموجودة ───
   يمنح المستخدمين الحاليين «دماغاً» من بياناتهم (التسجيل/الأهداف/الساعات)
   مرة واحدة. حتميّ وآمن للتكرار (remember يدمج حسب المفتاح الطبيعي).
   لاحقاً (المرحلة ٣) تتكفّل الأحداث بتحديث الذاكرة عند تغيّر البيانات. */
"use client";
import { memory } from "./index";
import type { EduStage, MemoryEvidence } from "./types";
import { loadUser, loadGoals } from "../storage";
import { findMajor } from "../university";

const SEED_FLAG = "darb_memory_seeded_v1";

function stageFor(studyLevel?: string): EduStage {
  if (studyLevel === "جامعي") return "university";
  if (studyLevel === "خريج") return "general";
  return "secondary";
}

/** يزرع الذاكرة من التخزين مرة واحدة (idempotent). */
export function seedMemoryFromStorage(): void {
  if (typeof window === "undefined") return;
  try { if (localStorage.getItem(SEED_FLAG)) return; } catch { return; }

  const u = loadUser();
  if (!u) return; // لا نزرع قبل اكتمال التسجيل
  const eng = memory();
  const now = Date.now();
  const ev = (ref: string): MemoryEvidence[] => [{ kind: "migration", ref, at: now }];
  const stage = stageFor(u.studyLevel);

  /* الهوية */
  if (u.name) eng.remember({ type: "identity.name", value: { name: u.name }, source: "onboarding", educationalStage: stage, evidence: ev("user.name") });
  if (typeof u.age === "number") eng.remember({ type: "identity.age", value: { age: u.age }, source: "onboarding", evidence: ev("user.age") });
  if (u.region) eng.remember({ type: "identity.region", value: { region: u.region }, source: "onboarding", evidence: ev("user.region") });
  if (u.school) eng.remember({ type: "identity.school", value: { school: u.school }, source: "onboarding", evidence: ev("user.school") });
  if (u.studyLevel === "ثانوي" || u.studyLevel === "جامعي" || u.studyLevel === "خريج")
    eng.remember({ type: "identity.studyLevel", value: { level: u.studyLevel }, source: "onboarding", educationalStage: stage, evidence: ev("user.studyLevel") });
  if (u.grade) eng.remember({ type: "identity.grade", value: { grade: u.grade }, source: "onboarding", educationalStage: stage, evidence: ev("user.grade") });
  if (typeof u.studyHours === "number") eng.remember({ type: "behavior.studyHoursPerDay", value: { hours: u.studyHours }, source: "onboarding", evidence: ev("user.studyHours") });

  /* الأهداف */
  const g = loadGoals();
  const addScore = (exam: string, target?: number) => {
    if (typeof target === "number") eng.remember({ type: "goal.targetScore", value: { exam, target }, source: "explicit", educationalStage: stage, evidence: ev(`goals.${exam}`) });
  };
  addScore("قدرات", g.quduratTarget);
  addScore("تحصيلي", g.tahsiliTarget);
  addScore("ستيب", g.stepTarget);
  if (g.university) eng.remember({ type: "goal.targetUniversity", value: { university: g.university }, source: "explicit", evidence: ev("goals.university") });
  const majorName = g.major ?? (g.majorId ? findMajor(g.majorId)?.name : undefined);
  if (majorName) eng.remember({ type: "goal.targetMajor", value: { major: majorName }, source: "explicit", evidence: ev("goals.major") });

  try { localStorage.setItem(SEED_FLAG, "1"); } catch { /* */ }
}
