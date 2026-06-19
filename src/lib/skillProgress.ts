/* ─── تتبع مستوى الإتقان لكل مهارة (0–100) ───
   درجة الإتقان تتحرك نحو 100 عند الإجابة الصحيحة ونحو 0 عند الخطأ.
   التخزين: localStorage (darb_skill_progress) + مزامنة سحابية عبر cloud.ts. */

export interface SkillProgress {
  skillId: string;
  masteryScore: number;   // 0–100
  answeredCount: number;
  correctCount: number;
  lastUpdated: string;    // YYYY-MM-DD
}

export type SkillTier = "strong" | "medium" | "weak" | "new";

const KEY = "darb_skill_progress";

const today = () => new Date().toISOString().slice(0, 10);

/* ── قراءة وكتابة ── */
export function loadSkillProgress(): Record<string, SkillProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, SkillProgress>) : {};
  } catch {
    return {};
  }
}

export function saveSkillProgress(progress: Record<string, SkillProgress>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {}
}

/* ── تسجيل إجابة — يُستدعى من مكوّنات الاختبار ── */
export function recordSkillAnswer(skillId: string, correct: boolean): SkillProgress {
  const all = loadSkillProgress();
  const prev = all[skillId] ?? {
    skillId,
    masteryScore: 0,
    answeredCount: 0,
    correctCount: 0,
    lastUpdated: today(),
  };
  // خوارزمية ELO مبسّطة: صح → نقترب من 100 بنسبة 10% | خطأ → نبتعد 10%
  const raw = correct
    ? prev.masteryScore + (100 - prev.masteryScore) * 0.1
    : prev.masteryScore * 0.9;
  const updated: SkillProgress = {
    skillId,
    masteryScore: Math.round(Math.min(100, Math.max(0, raw))),
    answeredCount: prev.answeredCount + 1,
    correctCount: prev.correctCount + (correct ? 1 : 0),
    lastUpdated: today(),
  };
  all[skillId] = updated;
  saveSkillProgress(all);
  return updated;
}

/* ── ضبط يدوي (تقييم ذاتي) ── */
export function setSkillSelfAssessment(skillId: string, level: "none" | "partial" | "mastered"): SkillProgress {
  const scores: Record<string, number> = { none: 15, partial: 50, mastered: 85 };
  const all = loadSkillProgress();
  const prev = all[skillId];
  const updated: SkillProgress = {
    skillId,
    masteryScore: scores[level],
    answeredCount: prev?.answeredCount ?? 0,
    correctCount: prev?.correctCount ?? 0,
    lastUpdated: today(),
  };
  all[skillId] = updated;
  saveSkillProgress(all);
  return updated;
}

/* ── تصنيف المهارة ── */
export function skillTier(score: number, hasData: boolean): SkillTier {
  if (!hasData) return "new";
  if (score >= 70) return "strong";
  if (score >= 40) return "medium";
  return "weak";
}

/* ── أضعف N مهارات (للتوصيات) ── */
export function weakestSkillIds(
  progress: Record<string, SkillProgress>,
  allIds: string[],
  n = 3,
): string[] {
  return allIds
    .map((id) => ({ id, score: progress[id]?.masteryScore ?? 0 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((s) => s.id);
}

/* ── إحصائيات إجمالية ── */
export function overallStats(
  progress: Record<string, SkillProgress>,
  allIds: string[],
): { strong: number; medium: number; weak: number; newSkills: number; avgScore: number } {
  let strong = 0, medium = 0, weak = 0, newSkills = 0, total = 0;
  for (const id of allIds) {
    const p = progress[id];
    if (!p) { newSkills++; continue; }
    total += p.masteryScore;
    const t = skillTier(p.masteryScore, true);
    if (t === "strong") strong++;
    else if (t === "medium") medium++;
    else weak++;
  }
  const rated = allIds.length - newSkills;
  return { strong, medium, weak, newSkills, avgScore: rated ? Math.round(total / rated) : 0 };
}
