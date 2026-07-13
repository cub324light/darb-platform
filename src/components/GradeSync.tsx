"use client";
import { useEffect } from "react";
import { syncGradeWithCalendar } from "@/lib/gradeProgression";

/* الترقية التلقائية بين الصفوف حسب التقويم الدراسي — تُطبَّق مرّة عند تحميل التطبيق.
   لا تلمس شيئاً إلا إذا بدأ عامٌ دراسيٌّ جديد منذ ضبط الصف (تحفظ كل البيانات).
   تعمل للزائر والمسجّل معاً (بيانات محلية)، ولا شيء تعرضه. */
export default function GradeSync() {
  useEffect(() => { syncGradeWithCalendar(); }, []);
  return null;
}
