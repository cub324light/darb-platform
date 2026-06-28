/* ─── استهداف الجمهور (Audience Targeting) — وحدة نقية ───
   تطابق فلتر جمهور مع ملف مستخدم. منطق استهداف فقط (ليس منطق إشعار) —
   لا تكرار لمحرّك الإشعار. حتمي وقابل للتوسّع بأنواع فلاتر جديدة. */
import { rankFromRP } from "@/lib/rank";
import type { AudienceFilter } from "./types";

const DAY = 86_400_000;

/* ملف المستخدم اللازم للاستهداف (يُشتق من وثيقة المستخدم على الخادم) */
export interface TargetProfile {
  stage?: string | null;        // ثانوي | جامعي | خريج
  grade?: string | null;        // أول/ثاني/ثالث ثانوي
  university?: string | null;   // الجامعة المستهدفة (من الأهداف)
  rp?: number | null;
  lastSeen?: number | null;     // ms
  quduratScore?: number | null;
  tahsiliScore?: number | null;
}

function norm(s: string): string {
  return s.replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, " ").trim().toLowerCase();
}

/* هل يطابق المستخدم الفلتر؟ */
export function matchesAudience(p: TargetProfile, f: AudienceFilter, now: number): boolean {
  switch (f.kind) {
    case "all":
      return true;

    case "stage":
      return !!f.stage && !!p.stage && norm(p.stage) === norm(f.stage);

    case "grade":
      return !!f.grade && !!p.grade && norm(p.grade) === norm(f.grade);

    case "university":
      return !!f.university && !!p.university && norm(p.university).includes(norm(f.university));

    case "rank": {
      const rp = typeof p.rp === "number" ? p.rp : null;
      if (rp == null) return false;
      if (typeof f.minRp === "number" && rp < f.minRp) return false;
      if (typeof f.maxRp === "number" && rp > f.maxRp) return false;
      return f.minRp != null || f.maxRp != null;
    }

    case "inactive": {
      const days = f.inactiveDays ?? 7;
      if (p.lastSeen == null) return true; // لم يُشاهَد قط ⇒ غير نشِط
      return now - p.lastSeen >= days * DAY;
    }

    case "score": {
      const exam = f.exam ?? "qudurat";
      const score = exam === "qudurat" ? p.quduratScore : p.tahsiliScore;
      if (score == null || typeof f.scoreValue !== "number") return false;
      return f.scoreOp === "lte" ? score <= f.scoreValue : score >= f.scoreValue;
    }

    default:
      return false;
  }
}

/* وصف عربي مقروء للجمهور (للمعاينة والسجل) */
export function describeAudience(f: AudienceFilter): string {
  switch (f.kind) {
    case "all":        return "جميع المستخدمين";
    case "stage":      return `المرحلة: ${f.stage ?? "—"}`;
    case "grade":      return `الصف: ${f.grade ?? "—"}`;
    case "university": return `الجامعة المستهدفة تحتوي: «${f.university ?? "—"}»`;
    case "rank": {
      const parts: string[] = [];
      if (f.minRp != null) parts.push(`RP ≥ ${f.minRp} (${rankFromRP(f.minRp).label})`);
      if (f.maxRp != null) parts.push(`RP ≤ ${f.maxRp} (${rankFromRP(f.maxRp).label})`);
      return `الرتبة: ${parts.join(" و") || "—"}`;
    }
    case "inactive":   return `غير نشِط منذ ≥ ${f.inactiveDays ?? 7} يوم`;
    case "score": {
      const exam = f.exam === "tahsili" ? "التحصيلي" : "القدرات";
      const op = f.scoreOp === "lte" ? "≤" : "≥";
      return `${exam} ${op} ${f.scoreValue ?? "—"}`;
    }
    default:           return "—";
  }
}

/* تحقّق من صحة الفلتر (للحفظ) — يُعيد رسالة خطأ أو null */
export function validateAudience(f: AudienceFilter): string | null {
  switch (f.kind) {
    case "all": return null;
    case "stage": return f.stage ? null : "اختر المرحلة";
    case "grade": return f.grade ? null : "اختر الصف";
    case "university": return f.university?.trim() ? null : "اكتب اسم الجامعة";
    case "rank": return (f.minRp != null || f.maxRp != null) ? null : "حدّد حدّ RP واحداً على الأقل";
    case "inactive": return (f.inactiveDays ?? 0) > 0 ? null : "حدّد عدد الأيام";
    case "score": return (f.exam && f.scoreOp && typeof f.scoreValue === "number") ? null : "أكمل شروط الدرجة";
    default: return "نوع جمهور غير معروف";
  }
}
