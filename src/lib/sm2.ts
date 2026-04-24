import type { SM2Grade, SM2Result } from "./types";

const MIN_EASE = 1.3;

export function sm2(card: { interval: number; repetitions: number; easeFactor: number }, grade: SM2Grade): SM2Result {
  let { interval, repetitions, easeFactor } = card;

  if (grade < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    repetitions += 1;
    easeFactor = Math.max(MIN_EASE, easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  }

  const dueDate = Date.now() + interval * 24 * 60 * 60 * 1000;
  return { interval, repetitions, easeFactor, dueDate };
}

export function getDueCards<T extends { dueDate: number }>(cards: T[]): T[] {
  const now = Date.now();
  return cards.filter(c => c.dueDate <= now);
}

export function gradeLabel(grade: SM2Grade): string {
  const labels: Record<SM2Grade, string> = {
    0: "ما أعرف",
    1: "غلط تماماً",
    2: "صعب",
    3: "متوسط",
    4: "سهل",
    5: "سهل جداً",
  };
  return labels[grade];
}

export function nextReviewText(dueDate: number): string {
  const diff = dueDate - Date.now();
  const minutes = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);

  if (minutes <= 15) return "الآن";
  if (hours < 24) return `بعد ${hours} ساعة`;
  if (days === 1) return "الغد";
  return `بعد ${days} يوم`;
}
