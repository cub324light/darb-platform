/* ═══════════ دمجُ النسخة الاحتياطية — لكلِّ عائلةٍ دلالتُها ═══════════
   ▸ العطل المثبَت: `pullBackup` كان يكتب كلَّ مفتاحٍ من كتلة السحابة فوق
     المحلّيّ بلا نظر (Last-Write-Wins على الكتلة كلِّها). فقِسنا:
       · جهازٌ أنجز ٨٠٪ قدرات وآخرُ ٧٥٪ تحصيلي ⇒ بعد المزامنة `qudurat = 10٪`.
       · جهازٌ أقدمُ محا **تسعين دقيقةً وخمسين فضّةً ويوماً من السلسلة**.
       · نسخةٌ أقدمُ أرجعت طالبَ ثالثٍ ثانويٍّ إلى ثاني، فصار الملفُّ `hs-2`
         والذاكرةُ `hs-3`، وأُعيد إطلاقُ `StudentPhaseChanged` في التحميل التالي.

   ▸ ثلاثُ فئاتٍ لا رابعة، ولكلِّ عائلةٍ قاعدتُها — **لا دمجَ عامٌّ ساذجٌ لأيّ كائن**:
       ① LWW      — حالةٌ يحرّرها الطالبُ كوحدةٍ واحدة (الاسم · السيرة · الأفاتار ·
                    تفضيلاتُ التعلّم · اختياراتُه). السحابةُ تفوز كما كان.
       ② تراكميّ  — ما يزيد ولا ينقص: الوحداتُ وتقدّمُها · الأيامُ والدقائق ·
                    العدّادات · المجموعاتُ ذاتُ المعرّفات · الأوسمةُ والمستويات.
       ③ المرحلة  — **لا تراجع**: `newPhaseRank >= currentPhaseRank`. المرحلةُ ملكُ
                    محرّك الانتقال، ولا يجوز لاسترجاعٍ كتليٍّ أن يُرجع الطالبَ خلفاً.

   ▸ نقيٌّ ١٠٠٪: مُدخلاتٌ نصّيةٌ وخارجٌ نصّيّ. لا `localStorage` ولا `window` ولا
     `Date`. وكلُّ دالّةٍ **مُتماثلةٌ (idempotent)**: دمجٌ مكرَّرٌ لا يُنتج تكراراً.
   ▸ وما لا نعرف له دلالةً من الشيفرة يبقى على LWW — لا نخترع له قاعدة. */

import type { DarbUser, DarbStats } from "./storage";
import { ALL_PHASE_IDS, phaseIdOf } from "./transition";

/* ─────────── أدواتٌ صغيرة ─────────── */
const parse = <T,>(raw: string | null | undefined): T | null => {
  if (raw == null) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
};
const maxOf = (a?: number, b?: number): number | undefined => {
  if (typeof a !== "number") return b;
  if (typeof b !== "number") return a;
  return Math.max(a, b);
};
const unionStrings = (a?: string[], b?: string[]): string[] =>
  [...new Set([...(a ?? []), ...(b ?? [])])];

/* ─────────── ③ المرحلة — رتبةٌ لا تتراجع ─────────── */

/** رتبةُ المرحلة من ترتيب السجلّ. المجهولةُ `-1` فتخسر أمام أيّ معلومة. */
export function phaseRank(u: Partial<DarbUser> | null): number {
  const id = phaseIdOf(u as DarbUser | null);
  return id ? ALL_PHASE_IDS.indexOf(id) : -1;
}

/** حقولُ المرحلة الأربعة — ما يكتبه محرّكُ الانتقال ولا يكتبه غيرُه. */
export const PHASE_FIELDS = ["studyLevel", "grade", "gradStage", "gradeYearId"] as const;

/* ─────────── ② الوحدات — اتّحادٌ بالمعرّف وأعلى تقدّم ─────────── */
interface ModuleLike { id: string; progress?: number; lastActivityAt?: number; members?: unknown[]; [k: string]: unknown }
interface WorkspaceLike { modules?: ModuleLike[]; updatedAt?: number }

export function mergeWorkspace(a?: WorkspaceLike, b?: WorkspaceLike): WorkspaceLike | undefined {
  if (!a) return b;
  if (!b) return a;
  const out = new Map<string, ModuleLike>();
  /* الترتيبُ يتبع المحلّيَّ ثم يُلحَق ما انفردت به السحابة */
  for (const m of a.modules ?? []) out.set(m.id, m);
  for (const m of b.modules ?? []) {
    const prev = out.get(m.id);
    if (!prev) { out.set(m.id, m); continue; }
    /* أعلى تقدّمٍ يفوز، وأحدثُ نشاط، والأعضاءُ اتّحادٌ بالمعرّف */
    out.set(m.id, {
      ...prev, ...m,
      progress: maxOf(prev.progress, m.progress) ?? 0,
      lastActivityAt: maxOf(prev.lastActivityAt, m.lastActivityAt),
      ...(prev.members || m.members
        ? { members: mergeById((prev.members ?? []) as { id: string }[], (m.members ?? []) as { id: string }[]) }
        : {}),
      /* التقدّمُ أعلى الاثنين، فالحالةُ تتبعه لا تعارضه */
      state: (prev.progress ?? 0) >= (m.progress ?? 0) ? prev.state : m.state,
    });
  }
  return { ...a, ...b, modules: [...out.values()], updatedAt: maxOf(a.updatedAt, b.updatedAt) };
}

/* ─────────── ② مجموعاتٌ ذاتُ معرّفات — اتّحادٌ بلا تكرار ─────────── */
export function mergeById<T extends { id: string; updatedAt?: number }>(a: T[], b: T[]): T[] {
  const out = new Map<string, T>();
  for (const x of a ?? []) if (x && typeof x.id === "string") out.set(x.id, x);
  for (const x of b ?? []) {
    if (!x || typeof x.id !== "string") continue;
    const prev = out.get(x.id);
    if (!prev) { out.set(x.id, x); continue; }
    /* عند التعارض: الأحدثُ ختماً إن وُجد ختم، وإلا يبقى المحلّيُّ (لا نخمّن) */
    const pick = (x.updatedAt ?? 0) > (prev.updatedAt ?? 0) ? x : prev;
    out.set(x.id, pick);
  }
  return [...out.values()];
}

/* ─────────── ①+②+③ ملفُّ الطالب ─────────── */
export function mergeUser(local: DarbUser | null, cloud: DarbUser | null): DarbUser | null {
  if (!local) return cloud;
  if (!cloud) return local;
  /* ① الأساسُ من السحابة — حالةٌ يحرّرها الطالبُ على جهازٍ واحدٍ في المرّة */
  const out: DarbUser = { ...local, ...cloud };

  /* ③ المرحلة: الأعلى رتبةً يفوز، وحقولُها الأربعةُ تُنقل معاً لا مفرَّقة
     (`gradeYearId` مرساةُ الترقية — لو تخلّفت أُعيدت الترقيةُ وأُعيد حدثُها). */
  const keep = phaseRank(cloud) < phaseRank(local) ? local : cloud;
  for (const f of PHASE_FIELDS) {
    const v = keep[f];
    const rec = out as unknown as Record<string, unknown>;
    if (v === undefined) delete rec[f]; else rec[f] = v;
  }

  /* ② التراكميّ */
  const ws = mergeWorkspace(local.workspace as WorkspaceLike | undefined, cloud.workspace as WorkspaceLike | undefined);
  if (ws) out.workspace = ws as unknown as DarbUser["workspace"];
  const rewarded = unionStrings(local.rewardedFields, cloud.rewardedFields);
  if (rewarded.length) out.rewardedFields = rewarded;
  if (local.awardedProfileComplete || cloud.awardedProfileComplete) out.awardedProfileComplete = true;
  return out;
}

/* ─────────── ② الإحصاءات ─────────── */
export function mergeStats(local: DarbStats | null, cloud: DarbStats | null): DarbStats | null {
  if (!local) return cloud;
  if (!cloud) return local;
  const dayMins: Record<string, number> = { ...(local.dayMins ?? {}) };
  for (const [d, v] of Object.entries(cloud.dayMins ?? {})) {
    dayMins[d] = Math.max(dayMins[d] ?? 0, v ?? 0);
  }
  /* «اليوم» يتبع أحدثَ مفتاحِ يومٍ بين الجهازين؛ وعند تساويهما أعلى الدقيقتين */
  const sameDay = local.todayKey === cloud.todayKey;
  const newer = (local.todayKey ?? "") >= (cloud.todayKey ?? "") ? local : cloud;
  return {
    ...local, ...cloud,
    silver: maxOf(local.silver, cloud.silver) ?? 0,
    totalFocusMins: maxOf(local.totalFocusMins, cloud.totalFocusMins) ?? 0,
    sessionsCount: maxOf(local.sessionsCount, cloud.sessionsCount) ?? 0,
    sessionDays: unionStrings(local.sessionDays, cloud.sessionDays).sort(),
    dayMins,
    todayKey: newer.todayKey,
    todayFocusMins: sameDay ? (maxOf(local.todayFocusMins, cloud.todayFocusMins) ?? 0) : newer.todayFocusMins,
    analyzedCount: maxOf(local.analyzedCount, cloud.analyzedCount),
    plansCount: maxOf(local.plansCount, cloud.plansCount),
    aiChats: maxOf(local.aiChats, cloud.aiChats),
    quizCount: maxOf(local.quizCount, cloud.quizCount),
    trackProgress: maxOf(local.trackProgress, cloud.trackProgress),
    /* أوّلُ يومٍ في درب أقدمُهما، وآخرُ مكافأةٍ أحدثُهما */
    joinedAt: [local.joinedAt, cloud.joinedAt].filter(Boolean).sort()[0],
    lastBonusDay: [local.lastBonusDay, cloud.lastBonusDay].filter(Boolean).sort().pop(),
  };
}

/* ─────────── ③ الأهداف — قرارٌ لا يتراجع ─────────── */

/**
 * حقولُ **القرار** في `darb_goals` وحدَها: الجامعةُ المستهدفة وتخصّصُها وكليّتُها.
 * ▓ قِسنا العطل: نسخةٌ سحابيةٌ أقدم أرجعت «الملك سعود/طب» إلى «الملك فهد/هندسة».
 * ▓ وما عداها في `darb_goals` (الدرجاتُ المستهدفة · نسبةُ الثانوية) يبقى LWW —
 *   لا نعمّم القاعدةَ بلا دليل.
 */
export const GOAL_DECISION_FIELDS = ["university", "universityId", "major", "majorId", "college"] as const;

interface GoalsLike { updatedAt?: number; [k: string]: unknown }

/**
 * الأحدثُ ختماً يفوز بحقول القرار. وحين لا يكون الختمُ موثوقاً (غائبٌ في أحد
 * الطرفين أو متساوٍ) **لا نخترع مقارنةً زمنية**: نُبقي قرارَ `mine` — فالطالبُ
 * لا يُرجَع إلى هدفٍ تركه.
 */
export function mergeGoals(mine: GoalsLike | null, theirs: GoalsLike | null): GoalsLike | null {
  if (!mine) return theirs;
  if (!theirs) return mine;
  const a = typeof mine.updatedAt === "number" ? mine.updatedAt : null;
  const b = typeof theirs.updatedAt === "number" ? theirs.updatedAt : null;
  const theirsIsNewer = a != null && b != null && b > a;
  const decisionSource = theirsIsNewer ? theirs : mine;
  const out: GoalsLike = { ...mine, ...theirs };
  for (const f of GOAL_DECISION_FIELDS) {
    const v = decisionSource[f];
    if (v === undefined) delete out[f]; else out[f] = v;
  }
  const ts = maxOf(a ?? undefined, b ?? undefined);
  if (ts != null) out.updatedAt = ts;
  return out;
}

/* ─────────── جدولُ العائلات ─────────── */
type Rule = "user" | "stats" | "goals" | "by-id" | "string-set" | "max-number";

/** لكلِّ مفتاحٍ دلالتُه. وما ليس هنا يبقى على LWW — لا نخترع له قاعدة. */
export const MERGE_RULES: Readonly<Record<string, Rule>> = {
  darb_user: "user",
  darb_stats: "stats",
  darb_goals: "goals",
  /* مجموعاتٌ لكلِّ عنصرٍ فيها معرّفٌ ثابت */
  darb_results: "by-id",
  darb_vault: "by-id",
  darb_admissions: "by-id",
  darb_sessions: "by-id",
  darb_homework: "by-id",
  darb_cards: "by-id",
  darb_lessons: "by-id",
  darb_tadreeb_items: "by-id",
  darb_sources: "by-id",
  darb_teachers: "by-id",
  /* قوائمُ معرّفاتٍ نصّية — ما أُنجز لا يُنتقَض */
  darb_done_lessons: "string-set",
  darb_tadreeb_done: "string-set",
  darb_badges_claimed: "string-set",
  darb_levels_claimed: "string-set",
  darb_challenges_claimed: "string-set",
  darb_skills: "string-set",
  /* عدّادٌ لا يتراجع */
  darb_rp: "max-number",
};

/** أيُّ الطرفين يفوز حين لا قاعدةَ للمفتاح (LWW) وحين يتساوى الطرفان؟
    · `"theirs"` (الافتراضيّ) = سلوكُ **السحب** كما كان: نسخةُ السحابة تفوز.
    · `"mine"`   = سلوكُ **الرفع**: حالةُ الجهاز الرافع تفوز — فلا يرفع جهازٌ
      حالةً سحابيةً محلَّ حالته هو. والعائلاتُ التراكميةُ متماثلةٌ في الاتجاهين
      (اتّحادٌ وأعلى قيمة) فلا يغيّرها هذا. */
export type MergePrefer = "theirs" | "mine";

/**
 * يدمج قيمةَ مفتاحٍ واحد. `mine` قيمةُ صاحب النداء و`theirs` القيمةُ الواردة.
 * يعيد النصَّ الذي يُكتب، أو الطرفَ المفضَّل إن لم تكن للمفتاح قاعدة (LWW).
 * (الاسمان `local`/`cloud` سابقاً — نفسُ الترتيب ونفسُ السلوك الافتراضيّ.)
 */
export function mergeKey(key: string, mine: string | null, theirs: string, prefer: MergePrefer = "theirs"): string {
  const rule = MERGE_RULES[key];
  const fallback = prefer === "mine" ? (mine ?? theirs) : theirs;
  if (!rule || mine == null) return fallback;
  /* الطرفُ الذي يفوز بحقول LWW داخل العائلات المركَّبة */
  const [a, b] = prefer === "mine" ? [theirs, mine] : [mine, theirs];
  try {
    switch (rule) {
      case "user": {
        const m = mergeUser(parse<DarbUser>(a), parse<DarbUser>(b));
        return m ? JSON.stringify(m) : fallback;
      }
      case "stats": {
        const m = mergeStats(parse<DarbStats>(a), parse<DarbStats>(b));
        return m ? JSON.stringify(m) : fallback;
      }
      case "goals": {
        /* حقولُ القرار تُحسم بالختم لا بالاتجاه؛ وعند غيابه يبقى قرارُ `mine`. */
        const m = mergeGoals(parse<GoalsLike>(mine), parse<GoalsLike>(theirs));
        return m ? JSON.stringify(m) : fallback;
      }
      case "by-id": {
        const x = parse<{ id: string }[]>(a), y = parse<{ id: string }[]>(b);
        if (!Array.isArray(x) || !Array.isArray(y)) return fallback;
        return JSON.stringify(mergeById(x, y));
      }
      case "string-set": {
        const x = parse<string[]>(a), y = parse<string[]>(b);
        if (!Array.isArray(x) || !Array.isArray(y)) return fallback;
        return JSON.stringify(unionStrings(x, y));
      }
      case "max-number": {
        const x = Number(a), y = Number(b);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return fallback;
        return String(Math.max(x, y));
      }
    }
  } catch { return fallback; }   // تلفٌ في أيّ طرف ⇒ لا نُسقط العملية
}

/**
 * قيمةُ المفتاح **قبل الرفع**: تُدمج مع ما في السحابة فلا يمحو جهازٌ عملَ آخر.
 * وما لا قاعدةَ له يبقى LWW — تُرفع حالةُ هذا الجهاز كما كانت تُرفع تماماً.
 */
export function mergeForUpload(key: string, mine: string, theirs: string | null): string {
  if (theirs == null) return mine;
  return mergeKey(key, mine, theirs, "mine");
}
