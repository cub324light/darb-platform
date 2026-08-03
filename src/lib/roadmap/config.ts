/* ═══════════ إعداد مساري الموحّد (Roadmap Config) — كل الأرقام القابلة للضبط هنا ═══════════
   قاعدةٌ صارمة: لا رقمٌ ثابتٌ (Hardcoded) داخل أي محرّك. كل عتبة/وزن/سقف/مدّة في هذا الملف،
   فنغيّرها مستقبلاً بلا لمس المحرّكات. المحرّكات نقيّةٌ 100٪ وتستقبل هذا الإعداد كمُدخَل
   (بقيمةٍ افتراضيةٍ من هنا)، فلا تعتمد على تخزينٍ ولا على قيمٍ مبثوثة.

   لماذا ملفٌ واحد؟ الشفافية والضبط السريع: أيّ تعديلٍ على «تعريف المؤشّر» يحدث في مكانٍ
   واحد، بلا مطاردة أرقامٍ في الكود، وبلا خطر تعارض. */

export interface ReadinessWeights {
  commitment: number; progress: number; results: number; errors: number; proximity: number;
}

export interface RoadmapTuning {
  /* حدود الاختبارات + قفل الأولوية */
  maxExams: number;               // أقصى عدد اختباراتٍ مخطّطة
  priorityLockDays: number;       // مدّة قفل ترتيب الأولوية بالأيام
  examPlanLockDays: number;       // مدّة قفل نمط توزيع الاختبارات بالأيام

  /* الجاهزية: أوزان العوامل + حدود النطاق + أدنى عددٍ من العوامل «الكافية» */
  readiness: { weights: ReadinessWeights; goodAt: number; watchAt: number; minFactors: number; };

  errorsCap: number;              // السقف الذي عنده تصبح إشارة «الأخطاء» صفراً
  commitmentWindowDays: number;   // نافذة أيام الالتزام النشطة
  proximityPrepDays: number;      // مدّة التحضير المرجعية لإشارة «متّسع الوقت»
  forecast: { minElapsedDays: number; minDone: number; }; // أدنى بياناتٍ لتقدير تاريخ الانتهاء
  suggestedPrepDays: number;      // مدّة التحضير المطلوبة قبل اقتراح تاريخ تسجيلٍ بثقة
  prediction: { anchorWeight: number; errorsFloor: number; }; // وزن المرتكز + أدنى تأثيرٍ للأخطاء

  /* التقويم → الخطة: كم يخفّض حدث reduce الوقت المتاح (0..1) */
  planning: { reduceFactor: number; };
  /* جلسة المذاكرة: مدّة افتراضية بلا خطّة · أدنى وقتٍ لجلسة · تقدير دقائق السؤال الواحد */
  session: { fallbackMins: number; minTaskMins: number; drillPerQuestionMins: number; };
  /* الإحصائيات: عدد أيام الـHeatmap + عتبات مستويات النشاط (دقائق) */
  stats: { heatmapDays: number; heatThresholds: [number, number, number, number]; };
}

/* القيم الافتراضية — «تعريف المؤشّرات». عدّلها هنا فقط. */
export const ROADMAP_TUNING: RoadmapTuning = {
  maxExams: 3,
  priorityLockDays: 3,
  examPlanLockDays: 7,
  readiness: {
    weights: { commitment: 0.28, progress: 0.28, results: 0.20, errors: 0.16, proximity: 0.08 },
    goodAt: 0.70,
    watchAt: 0.45,
    minFactors: 2,
  },
  errorsCap: 40,
  commitmentWindowDays: 7,
  proximityPrepDays: 60,
  forecast: { minElapsedDays: 3, minDone: 3 },
  suggestedPrepDays: 45,
  prediction: { anchorWeight: 0.7, errorsFloor: 0.9 },
  planning: { reduceFactor: 0.5 },
  session: { fallbackMins: 60, minTaskMins: 10, drillPerQuestionMins: 1 },
  stats: { heatmapDays: 84, heatThresholds: [1, 30, 60, 120] },
};
