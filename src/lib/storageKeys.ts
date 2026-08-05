/* ═══════════ سجلُّ مفاتيح التخزين — المصدرُ الواحد لكلِّ قائمةِ مفاتيح ═══════════
   ▸ العطل الذي أُغلق: كانت في المشروع **ثلاثُ قوائمَ** تُصان باليد ولا تتّفق —
     المفاتيحُ المستعملةُ فعلاً · `BACKUP_KEYS` (ما يُرفع للسحابة) · قائمةُ
     `resetAll` (ما يُمحى عند «ابدأ من الصفر»). فتفرّقت:
       · `darb_sessions` (كلُّ جلسات مساري) خارج النسخ الاحتياطي ⇒ تضيع بتبديل الجهاز،
         بينما `darb_session_log` (جلساتُ أوربت) محفوظ. سجلّان لواقعةٍ واحدة، أحدُهما فقط ينجو.
       · `darb_calendar_events` سقط من النسخ حين نُقل المفتاحُ من `darb_calendar`.
       · المستوى والأوسمةُ (`darb_rp` · `darb_levels_claimed` · `darb_badges_claimed`)
         خارج النسخ، والفضّةُ داخله — نصفُ الاقتصاد ينجو ونصفُه يضيع.
       · ذاكرةُ المحرّكات وعلمُ البذرة لا يمسحهما `resetAll` ⇒ مَن «بدأ من الصفر»
         يفتح دويرب فيناديه **باسمه القديم وصفِّه القديم**، ولا تُبذَر ذاكرتُه الجديدة أبداً.

   ▸ القاعدةُ من الآن: **لا قائمةَ مكتوبةً بيد**. كلُّ مفتاحٍ يُعلن عن نفسه هنا مرّةً،
     وتُشتقّ منه القوائمُ الأربع: النسخُ الاحتياطي · إعادةُ الضبط · الترحيلُ · التنظيف.
     ومفتاحٌ جديدٌ في المشروع بلا مدخلٍ هنا يسقط في اختبارِ اكتمالٍ يمسح `src` كلَّه.

   ▸ هذا الملفُّ **بياناتٌ محضة**: لا يستورد شيئاً ولا يلمس `localStorage`. */

/** أين يعيش المفتاح ولمن هو. */
export type KeyScope =
  /** بياناتُ الطالب نفسِه — تُرفع وتُمحى. */
  | "student"
  /** حالةُ المحرّكات (ذاكرة · أحداث · بذرة) — تُنطَّق بـuid وتُزامَن بمسارها الكيانيّ. */
  | "engine"
  /** إعدادُ جهازٍ أو جلسة — لا يُرفع ولا يُمحى (الثيم · وضعُ الزائر · مالكُ البيانات). */
  | "device"
  /** حالةُ عرضٍ محليّة: تعليماتُ أوّل زيارة · ترتيبُ البطاقات — تُمحى ولا تُرفع. */
  | "ui";

export interface StorageKeyDef {
  /** المفتاحُ الأساسيّ (بلا لاحقة الفضاء). */
  readonly key: string;
  readonly scope: KeyScope;
  /** `true` ⇒ المفتاحُ **بادئة** لعائلةِ مفاتيح (`darb_guide_*`). */
  readonly prefix?: boolean;
  /** يُنطَّق بفضاء المستخدم (`nsKey`) — مفاتيحُ المحرّكات وحدَها. */
  readonly namespaced?: boolean;
  /** مفتاحٌ قديمٌ يُرحَّل مرّةً ثم يُحذف — يُمحى ولا يُرفع. */
  readonly legacy?: boolean;
  /** لماذا هو هنا — للقارئ لا للمحرّك. */
  readonly note?: string;
}

/* ─── السجلّ. مفتاحٌ جديد؟ سطرٌ هنا ولا شيء غيره. ─── */
const REGISTRY: readonly StorageKeyDef[] = [
  /* ══ الملفُّ والأهدافُ والنتائج ══ */
  { key: "darb_user",              scope: "student", note: "ملفُّ الطالب — مصدرُ الحقيقة لبياناته" },
  { key: "darb_goals",             scope: "student" },
  { key: "darb_results",           scope: "student" },
  { key: "darb_admissions",        scope: "student" },
  { key: "darb_stats",             scope: "student" },
  { key: "darb_prefs",             scope: "student", legacy: true, note: "رُحِّل إلى DarbUser — يبقى للنسخ والمسح حتى يُرحَّل كلُّ جهاز" },
  { key: "darb_coach_memory",      scope: "student", legacy: true, note: "ذاكرةُ المدرّب القديمة — دُمجت في محرّك الذاكرة، وتبقى حتى تُرحَّل كلُّ الأجهزة" },

  /* ══ المذاكرة والتقدّم ══ */
  { key: "darb_vault",             scope: "student" },
  { key: "darb_cards",             scope: "student" },
  { key: "darb_lessons",           scope: "student" },
  { key: "darb_done_lessons",      scope: "student" },
  { key: "darb_tadreeb_items",     scope: "student" },
  { key: "darb_tadreeb_done",      scope: "student" },
  { key: "darb_skill_progress",    scope: "student" },
  { key: "darb_leaks_plan",        scope: "student" },
  /* ▓ لا يقرؤها كودٌ اليوم — بقيت في القائمتين المكتوبتين بيدٍ وحدَهما. تظلّ
     مرفوعةً وممحوّةً لأنّ على أجهزةِ طلابٍ حقيقيين بياناتٍ فيها، وحذفُها من
     السجلّ يعني فقدَها صامتاً عند أوّل استرجاع. */
  { key: "darb_tasreebat_pct",     scope: "student", legacy: true },
  { key: "darb_skills",            scope: "student", legacy: true },
  { key: "darb_stage_reviews",     scope: "student", legacy: true },
  { key: "darb_sources",           scope: "student" },
  { key: "darb_resource_use",      scope: "student" },
  { key: "darb_graph_visits",      scope: "student" },

  /* ══ الجلسات — سجلٌّ واحدٌ بعد التوحيد ══ */
  { key: "darb_sessions",          scope: "student", note: "سجلُّ الجلسات الواحد (StudySessionLog)" },
  { key: "darb_session_log",       scope: "student", legacy: true, note: "سجلُّ أوربت القديم — يُدمج مرّةً في darb_sessions" },
  { key: "darb_orbit_session",     scope: "ui",      note: "جلسةُ أوربت الجارية — حالةُ لحظةٍ لا تاريخ" },
  { key: "darb_focus_duration",    scope: "ui" },

  /* ══ الجدولُ والتقويم والخطة ══ */
  { key: "darb_events",            scope: "student", note: "أحداثُ الجدول اليومي (ScheduleEvent)" },
  { key: "darb_schedule",          scope: "student", legacy: true },
  { key: "darb_calendar",          scope: "student", note: "تفضيلاتُ التقويم الدراسي (كائن)" },
  { key: "darb_calendar_events",   scope: "student", note: "أحداثُ التقويم (مصفوفة) — فُصلت عن التفضيلات" },
  { key: "darb_study_plan",        scope: "student" },
  { key: "darb_exam_date",         scope: "student" },
  { key: "darb_track_exam_dates",  scope: "student" },
  { key: "darb_subject_exam_dates", scope: "student", legacy: true },
  { key: "darb_exam_flow",         scope: "student", legacy: true },
  { key: "darb_exam_coord",        scope: "student" },
  { key: "darb_daily",             scope: "student" },
  { key: "darb_retention",         scope: "student" },

  /* ══ المدرسة ══ */
  { key: "darb_homework",          scope: "student" },
  { key: "darb_school_exams",      scope: "student" },
  { key: "darb_school_projects",   scope: "student" },
  { key: "darb_school_requirements", scope: "student" },
  { key: "darb_teachers",          scope: "student" },
  { key: "darb_journal",           scope: "student" },

  /* ══ الجامعة ══ */
  { key: "darb_uni_tools",         scope: "student" },

  /* ══ الاقتصاد والإنجاز ══ */
  { key: "darb_rp",                scope: "student" },
  { key: "darb_levels_claimed",    scope: "student" },
  { key: "darb_badges_claimed",    scope: "student" },
  { key: "darb_challenges_claimed", scope: "student" },
  { key: "darb_cosmetics",         scope: "student" },

  /* ══ المجتمع ══ */
  { key: "darb_posts",             scope: "student", legacy: true },

  /* ══ حالةُ عرضٍ محلية — تُمحى مع «ابدأ من الصفر» ولا تُرفع ══ */
  { key: "darb_guide_",            scope: "ui", prefix: true, note: "تعليماتُ أوّل زيارة لكلّ صفحة" },
  { key: "darb_layout_",           scope: "ui", prefix: true, note: "ترتيبُ بطاقات الصفحة (pageLayout)" },
  { key: "darb_dismissed",         scope: "ui" },
  { key: "darb_rec_dismissed",     scope: "ui" },
  { key: "darb_alert_dismissed",   scope: "ui" },
  { key: "darb_hide_tips",         scope: "ui" },
  { key: "darb_greet_seed",        scope: "ui" },
  { key: "darb_dash_config",       scope: "ui", legacy: true, note: "نظامُ إعداد الرئيسية المحذوف" },
  { key: "darb_dash_sched_v2",     scope: "ui", legacy: true },

  /* ══ حالةُ المحرّكات — منطَّقة بالمستخدم، تُزامَن بمسارٍ كيانيٍّ مستقل ══ */
  { key: "darb_memory_v1",         scope: "engine", namespaced: true },
  { key: "darb_event_log_v1",      scope: "engine", namespaced: true },
  { key: "darb_memory_seeded_v1",  scope: "engine", namespaced: true, note: "علمُ البذرة — مسحُه بلا مسحِ الذاكرة يمنع البذرَ للأبد" },

  /* ══ جهازٌ وجلسة — لا تُرفع ولا تُمحى ══ */
  { key: "darb_theme",             scope: "device" },
  { key: "darb_font_scale",        scope: "ui", note: "مقياسُ الخط — كان يُمحى مع «ابدأ من الصفر»، فيبقى كذلك" },
  { key: "darb_sidebar_collapsed", scope: "device" },
  { key: "darb_cal_system",        scope: "device" },
  { key: "darb_guest_mode",        scope: "device" },
  { key: "darb_visitor",           scope: "device" },
  { key: "darb_tour_done",         scope: "device" },
  { key: "darb_owner_uid",         scope: "device", note: "مالكُ البيانات المحلية — خارجَ كلِّ قائمةٍ عمداً" },
  { key: "darb_analytics_consent", scope: "device" },
  { key: "darb_seen_broadcasts",   scope: "device", note: "«شوهد» للإشعارات — يمسحه accountScope وحدَه" },
  { key: "darb_content_backend",   scope: "device" },
  { key: "darb_content_overlay",   scope: "device" },
  { key: "darb_content_history",   scope: "device" },
  { key: "darb_celebrate_complete", scope: "device", note: "sessionStorage لا localStorage" },
  { key: "darb_ref_pending",       scope: "device" },
  { key: "darb_ref_redeemed",      scope: "device" },
  { key: "darb_sanad_code",        scope: "device" },
  { key: "darb_sanad_active",      scope: "device" },
  { key: "darb_sanad_child",       scope: "device" },
  { key: "darb_sanad_guardians",   scope: "device" },
];

export const STORAGE_KEYS: readonly StorageKeyDef[] = REGISTRY;

export function keyDef(key: string): StorageKeyDef | undefined {
  return REGISTRY.find((d) => d.key === key);
}

/* ─── القوائمُ المشتقّة — لا تُكتب بيد ─── */

/**
 * ما يُرفع إلى السحابة في النسخة الكتلية: بياناتُ الطالب وحدَها.
 * · `engine` له مسارُ مزامنةٍ كيانيّ مستقل (`engineSync`) فلا يُكرَّر هنا.
 * · `device` و`ui` تخصّان الجهاز لا الطالب.
 * · القديمُ (`legacy`) **يبقى مرفوعاً** ما دام يحمل بياناتِ طالبٍ لم تُرحَّل بعدُ
 *   على كلِّ جهاز — إسقاطُه قبل اكتمال الترحيل فقدٌ صامت.
 */
export const BACKUP_KEYS: readonly string[] = REGISTRY
  .filter((d) => d.scope === "student" && !d.prefix)
  .map((d) => d.key);

/** ما يُمحى عند «ابدأ من الصفر»: بياناتُ الطالب وعرضُه ومحرّكاته — لا إعدادُ جهازه. */
export const RESET_KEYS: readonly string[] = REGISTRY
  .filter((d) => (d.scope === "student" || d.scope === "ui" || d.scope === "engine") && !d.prefix)
  .map((d) => d.key);

/** بوادئُ تُمسح بالجملة عند إعادة الضبط (`darb_guide_*` · `darb_layout_*`). */
export const RESET_PREFIXES: readonly string[] = REGISTRY
  .filter((d) => d.prefix && (d.scope === "student" || d.scope === "ui"))
  .map((d) => d.key);

/** المفاتيحُ التي تُنطَّق بفضاء المستخدم — يعرفها الماسحُ ليمسح الصحيحَ منها. */
export const NAMESPACED_KEYS: readonly string[] = REGISTRY
  .filter((d) => d.namespaced)
  .map((d) => d.key);

/** مفاتيحُ الترحيل: قديمةٌ تُقرأ مرّةً ثم تُحذف. */
export const LEGACY_KEYS: readonly string[] = REGISTRY
  .filter((d) => d.legacy)
  .map((d) => d.key);
