/* ألوانُ فترات التقويم — مصدرٌ واحد يقرأ منه شريطُ التقويم وبطاقةُ المدرسة،
   فلا يتعلّم الطالبُ رمزين للشيء نفسه. نقيّ: ثوابتُ عرضٍ لا غير. */
import type { PeriodKind } from "./academicCalendar";

export interface PeriodTone { color: string; icon: string; label: string }

export const PERIOD_TONE: Record<PeriodKind, PeriodTone> = {
  term:          { color: "var(--accent)",       icon: "📘", label: "أيام دراسة" },
  school_finals: { color: "var(--gold)",         icon: "📝", label: "اختبارات مدرسية" },
  break:         { color: "var(--success)",      icon: "🌿", label: "إجازة" },
  summer:        { color: "#F59E0B",             icon: "☀️", label: "إجازة صيفية" },
  qudurat:       { color: "var(--accent-light)", icon: "🧠", label: "قدرات" },
  tahsili:       { color: "var(--accent-light)", icon: "🧪", label: "تحصيلي" },
  step:          { color: "var(--accent-light)", icon: "🔤", label: "ستيب" },
};
