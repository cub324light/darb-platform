/* ─── تمهيد الذاكرة عبر حدث (event-sourcing صارم) ───
   لا تُكتب الذاكرة مباشرة. نُطلق StudentRegistered يحمل لقطة بيانات الطالب،
   فيتولّى MemoryReactor كتابة الذاكرة. مرة واحدة، حتميّ وآمن للتكرار،
   وقابل لإعادة الإنتاج عبر replay (الحدث مكتفٍ ذاتياً باللقطة). */
"use client";
import { events } from "./index";
import type { ImportSnapshot } from "./types";
import { loadUser, loadGoals } from "../storage";
import { findMajor } from "../university";
import type { EduStage } from "../memory/types";

const SEED_FLAG = "darb_memory_seeded_v1";

function stageFor(studyLevel?: string): EduStage {
  if (studyLevel === "جامعي") return "university";
  if (studyLevel === "خريج") return "general";
  return "secondary";
}

/** يبني لقطة الطالب من التخزين ويُطلق StudentRegistered مرة واحدة. */
export function seedStudentMemory(): void {
  if (typeof window === "undefined") return;
  try { if (localStorage.getItem(SEED_FLAG)) return; } catch { return; }

  const u = loadUser();
  if (!u) return; // لا نمهّد قبل اكتمال التسجيل
  const g = loadGoals();

  const targets: { exam: string; target: number }[] = [];
  if (typeof g.quduratTarget === "number") targets.push({ exam: "قدرات", target: g.quduratTarget });
  if (typeof g.tahsiliTarget === "number") targets.push({ exam: "تحصيلي", target: g.tahsiliTarget });
  if (typeof g.stepTarget === "number") targets.push({ exam: "ستيب", target: g.stepTarget });

  const snapshot: ImportSnapshot = {
    name: u.name,
    age: typeof u.age === "number" ? u.age : undefined,
    region: u.region,
    school: u.school,
    studyLevel: (u.studyLevel === "ثانوي" || u.studyLevel === "جامعي" || u.studyLevel === "خريج") ? u.studyLevel : undefined,
    grade: u.grade,
    studyHours: typeof u.studyHours === "number" ? u.studyHours : undefined,
    targets: targets.length ? targets : undefined,
    university: g.university,
    major: g.major ?? (g.majorId ? findMajor(g.majorId)?.name : undefined),
  };

  events().emit({
    eventType: "StudentRegistered",
    metadata: { snapshot },
    source: "migration",
    educationalStage: stageFor(u.studyLevel),
    actor: { kind: "system" },
  });

  try { localStorage.setItem(SEED_FLAG, "1"); } catch { /* */ }
}
