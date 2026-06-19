export type PlanId = "free" | "shaheen" | "anqa";

export type VaultDifficulty = "سهل" | "متوسط" | "صعب";

export interface VaultError {
  id: string;
  question: string;
  subject: string;
  category: string;
  note: string;
  createdAt: number;
  reviewCount: number;
  difficulty?: VaultDifficulty; // صعوبة الخطأ — تُرتّب «الأهم» حسبها
}

export interface ReviewCard {
  id: string;
  question: string;
  answer: string;
  subject: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: number;
  createdAt: number;
}

export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: number;
}

export type SM2Grade = 0 | 1 | 2 | 3 | 4 | 5;
