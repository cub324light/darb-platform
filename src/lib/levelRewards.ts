"use client";
/* ═══════════ جزاءُ المستوى — طبقةُ التخزين وحدها ═══════════
   بلوغُ مستوىً جديد يُعطي الطالبَ **فضّةً ولقباً**. اللقبُ يُملَك تلقائياً، ولا
   يُلبَس إلا إن كانت خانتُه فارغة — فمن اختار لقباً يحبّه لا نخلعه عنه بترقية.

   يُصرف مرّةً واحدة عبر `darb_levels_claimed`. ومن بلغ مستوياتٍ قبل أن توجد
   الجائزة يأخذها كلَّها الآن — لا نعاقبه على أنه سبقنا. */
import { loadStats, addSilver } from "./storage";
import { computeXP, pendingLevelRewards } from "./xp";
import { CATALOG, levelTitle } from "./economy/catalog";
import { loadOwned, grantItem } from "./economy/store";

const KEY = "darb_levels_claimed";
export const LEVELS_CLAIMED = "darb:levelsClaimed";

export function loadClaimedLevels(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === "number") : [];
  } catch { return []; }
}

function saveClaimedLevels(ids: number[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* تجاهل */ }
}

export interface LevelClaim { levels: number[]; silver: number; titles: string[] }

/** يصرف ما استُحقّ ولم يُصرف. يُستدعى عند فتح الملف. */
export function claimLevelRewards(): LevelClaim {
  if (typeof window === "undefined") return { levels: [], silver: 0, titles: [] };
  const xp = computeXP(loadStats());
  const claimed = loadClaimedLevels();
  const due = pendingLevelRewards(xp, claimed);
  if (due.levels.length === 0) return { levels: [], silver: 0, titles: [] };

  saveClaimedLevels([...claimed, ...due.levels]);
  if (due.silver > 0) addSilver(due.silver);

  /* اللقبُ يُملَك دائماً، ويُلبَس إن كانت الخانةُ فارغةً وحدها */
  const titles: string[] = [];
  const wearIfEmpty = !loadOwned().equipped.title;
  due.levels.forEach((i, k) => {
    const t = levelTitle(CATALOG, i);
    if (!t) return;
    titles.push(t.label);
    /* آخرُ لقبٍ بلغه هو الذي يُلبَس، لا أوّلُها */
    grantItem(t.id, wearIfEmpty && k === due.levels.length - 1);
  });

  try { window.dispatchEvent(new Event(LEVELS_CLAIMED)); } catch { /* تجاهل */ }
  return { levels: due.levels, silver: due.silver, titles };
}

