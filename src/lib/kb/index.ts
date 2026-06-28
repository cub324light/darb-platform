/* ─── قاعدة المعرفة — الواجهة العامة ───
   تدمج البذرة المضمّنة مع ما يضيفه المشرف (overlay من Firestore) فينتج سجل
   واحد. إضافة/تعطيل أي مصدر = بيانات overlay، بلا تعديل كود. */
import type { Source, KBEntry, SourceCategory } from "./types";
import { SEED_SOURCES } from "./sources";
import { SEED_ENTRIES } from "./entries";
import { searchEntries, bestDirectAnswer, kbGroundingBlock, type KBMatch } from "./retrieval";

export * from "./types";
export { SEED_SOURCES, SEED_VERIFIED_AT } from "./sources";
export { SEED_ENTRIES } from "./entries";
export { searchEntries, rankSources, bestDirectAnswer, kbGroundingBlock, normalizeAr, tokenize, type KBMatch } from "./retrieval";
export { sourceFreshness, entryFreshness, scanStaleSources, suggestedStatus, type FreshnessState, type FreshnessInfo } from "./staleness";
export { diffSource, diffEntry, nextVersion, buildVersionRecords, type FieldChange } from "./versioning";

/* يدمج قائمة بذرة مع overlay (بالـ id): overlay يتجاوز البذرة، والجديد يُضاف */
export function mergeById<T extends { id: string }>(seed: T[], overlay: T[]): T[] {
  const map = new Map<string, T>();
  for (const s of seed) map.set(s.id, s);
  for (const o of overlay) map.set(o.id, o); // overlay يفوز
  return [...map.values()];
}

export interface KBSnapshot { sources: Source[]; entries: KBEntry[]; }

/* لقطة كاملة من البذرة + overlay اختياري */
export function buildSnapshot(overlay?: Partial<KBSnapshot>): KBSnapshot {
  return {
    sources: mergeById(SEED_SOURCES, overlay?.sources ?? []),
    entries: mergeById(SEED_ENTRIES, overlay?.entries ?? []),
  };
}

/* البحث في قاعدة المعرفة (offline-first) — يُعيد المطابقات + كتلة التأريض
   لدويرب + أفضل إجابة مباشرة عالية الثقة (إن وُجدت). */
export interface KBResult {
  matches: KBMatch[];
  grounding: string;
  direct: KBMatch | null;
}

export function searchKB(
  query: string,
  snapshot: KBSnapshot,
  opts: { category?: SourceCategory; now: number; limit?: number } = { now: 0 },
): KBResult {
  const matches = searchEntries(query, snapshot.entries, { category: opts.category, now: opts.now, limit: opts.limit ?? 5, minScore: 35 });
  const sourcesById = new Map(snapshot.sources.map((s) => [s.id, s]));
  return {
    matches,
    grounding: kbGroundingBlock(matches, sourcesById),
    direct: bestDirectAnswer(matches),
  };
}
