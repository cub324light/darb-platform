/* ─── استرجاع المعرفة (KB-first Retrieval) — وحدة نقية ───
   تبحث في مدخلات المعرفة محلياً (بلا إنترنت) وتُرتّب حسب التطابق ودرجة الثقة
   والحداثة. حتمية تماماً — قابلة للاختبار. تستعملها طبقة دويرب أولاً قبل LLM. */
import type { KBEntry, Source, SourceCategory } from "./types";

/* تطبيع عربي: إزالة التشكيل وتوحيد الألف/الياء/التاء المربوطة والأرقام */
export function normalizeAr(text: string): string {
  return (text || "")
    .replace(/[ً-ْٰ]/g, "")      // تشكيل
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ـ]/g, "")                          // تطويل
    .replace(/[^\p{L}\p{N}\s]/gu, " ")            // رموز
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function tokenize(text: string): string[] {
  return normalizeAr(text).split(" ").filter((t) => t.length >= 2);
}

const STALE_PENALTY_PER_DAY = 0.02; // تخفيف صغير لكل يوم تأخّر تحقق

/* عامل الحداثة 0–1: يقترب من 1 للمدخل المُتحقَّق حديثاً */
export function freshnessFactor(lastVerified: number, now: number): number {
  const days = Math.max(0, (now - lastVerified) / 86_400_000);
  return Math.max(0.4, 1 - days * STALE_PENALTY_PER_DAY * 0.1);
}

export interface KBMatch {
  entry: KBEntry;
  score: number;        // 0–100 ثقة المطابقة الكلية
  keywordHits: number;
}

function isUsable(e: { status: KBEntry["status"]; expiresAt: number | null }, now: number): boolean {
  if (e.status !== "active") return false;
  if (e.expiresAt != null && now >= e.expiresAt) return false;
  return true;
}

/* يبحث في المدخلات ويُعيد الأفضل تطابقاً (مرتّبة) ضمن قسم اختياري */
export function searchEntries(
  query: string,
  entries: KBEntry[],
  opts: { category?: SourceCategory; now: number; limit?: number; minScore?: number } = { now: 0 },
): KBMatch[] {
  const now = opts.now;
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return [];

  const matches: KBMatch[] = [];
  for (const e of entries) {
    if (!isUsable(e, now)) continue;
    if (opts.category && e.category !== opts.category) continue;

    /* مجموعة كلمات المدخل: الكلمات المفتاحية + السؤال */
    const kwTokens = new Set<string>();
    for (const k of e.keywords) for (const t of tokenize(k)) kwTokens.add(t);
    for (const t of tokenize(e.question)) kwTokens.add(t);

    let hits = 0;
    for (const t of qTokens) if (kwTokens.has(t)) hits++;
    if (hits === 0) continue;

    /* نسبة التغطية من استعلام المستخدم (كم من كلماته وُجدت) */
    const coverage = hits / qTokens.size;
    const fresh = freshnessFactor(e.lastVerified, now);
    /* الدرجة: تطابق (60%) + ثقة المدخل (30%) + حداثة (10%) */
    const score = Math.round((coverage * 60) + (e.trust * 0.3) + (fresh * 10));
    matches.push({ entry: e, score, keywordHits: hits });
  }

  matches.sort((a, b) => b.score - a.score || b.entry.trust - a.entry.trust);
  const min = opts.minScore ?? 0;
  return matches.filter((m) => m.score >= min).slice(0, opts.limit ?? 5);
}

/* ترتيب المصادر: الرسمي أولاً ثم الأعلى ثقة ثم الأحدث تحققاً */
export function rankSources(sources: Source[], now: number): Source[] {
  return [...sources]
    .filter((s) => s.status === "active" && (s.expiresAt == null || now < s.expiresAt))
    .sort((a, b) =>
      Number(b.official) - Number(a.official) ||
      b.trust - a.trust ||
      b.lastVerified - a.lastVerified);
}

/* كتلة سياق عربية تُحقن في برومبت دويرب (إسناد + ثقة) — تأريض بلا إنترنت */
export function kbGroundingBlock(matches: KBMatch[], sourcesById: Map<string, Source>): string {
  if (matches.length === 0) return "";
  const lines: string[] = ["معلومات موثّقة من قاعدة معرفة درب (اعتمدها أولاً ولا تخالفها):"];
  for (const m of matches.slice(0, 3)) {
    const srcNames = m.entry.sourceIds
      .map((id) => sourcesById.get(id)?.name)
      .filter(Boolean)
      .join("، ");
    lines.push(`• ${m.entry.answer}${srcNames ? ` (المصدر: ${srcNames})` : ""}`);
  }
  lines.push("إن لم يكفِ ما سبق، أجب بمعرفتك العامة دون اختلاق مواعيد أو أرقام رسمية.");
  return lines.join("\n");
}

/* قرار «هل نجيب من قاعدة المعرفة مباشرة؟» — للحالات عالية الثقة (توفير LLM) */
export function bestDirectAnswer(matches: KBMatch[], threshold = 78): KBMatch | null {
  const top = matches[0];
  if (top && top.score >= threshold && top.keywordHits >= 2) return top;
  return null;
}
