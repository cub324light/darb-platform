export type BirdId = "falcon" | "hoopoe" | "swan" | "raven" | "peacock" | "phoenix";
export type PlanId = "free" | "shaheen" | "anqa";
export type SubjectId = "فيزياء" | "رياضيات" | "كيمياء" | "أحياء";

export interface VaultError {
  id: string;
  question: string;
  subject: SubjectId;
  category: string;
  note: string;
  createdAt: number;
  reviewCount: number;
}

export interface ReviewCard {
  id: string;
  question: string;
  answer: string;
  subject: SubjectId;
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: number;
  createdAt: number;
}

export interface OrbitSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  subject: SubjectId;
  silverEarned: number;
  completed: boolean;
}

export interface UserState {
  id: string;
  name: string;
  plan: PlanId;
  bird: BirdId;
  streak: number;
  silver: number;
  gold: number;
  totalFocusHours: number;
  roadmapProgress: Record<SubjectId, number>;
  vaultErrors: VaultError[];
  reviewCards: ReviewCard[];
  sessions: OrbitSession[];
  lastActiveAt: number;
}

export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: number;
}

export type SM2Grade = 0 | 1 | 2 | 3 | 4 | 5;
