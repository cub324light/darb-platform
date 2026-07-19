/* ─── اكتمال الملف الشخصي + مكافآته التدريجية — منطقٌ نقيّ (لا localStorage) ───
   ٨ معلومات: ٤ أساسية (من التسجيل) + ٤ شخصية (البروفايل: هوايات/اهتمامات/مواد/طريقة مذاكرة).
   مكافآت تدريجية: +٥ فضة مع كل معلومةٍ شخصية تُضاف (مرّة لكلٍّ)، ووسام + ٣٠ فضة عند ١٠٠٪.
   مصدرٌ واحد: كل الحقول من DarbUser (لا تكرار). */

export interface FullProfile {
  name?: string; grade?: string; studyLevel?: string; region?: string;
  targets?: string[]; goalUndecided?: boolean;
  hobbies?: string[]; interests?: string[]; favSubjects?: string[];
  studyStyle?: string; // طريقة المذاكرة (بالقراءة/بالفيديو/الاثنين)
  rewardedFields?: string[]; awardedProfileComplete?: boolean;
}

export interface ProfileFieldState { id: string; label: string; group: "core" | "personal"; done: boolean; }
export interface CompletionResult { total: number; done: number; pct: number; fields: ProfileFieldState[]; }

const has = (a?: unknown[]): boolean => Array.isArray(a) && a.length > 0;

/** الحقول الشخصية التي تُكافأ بـ+٥ عند أول إضافة (طريقة المذاكرة تُملأ غالباً من التسجيل). */
export const REWARDED_FIELDS = ["hobbies", "interests", "favSubjects"] as const;

/** حالة اكتمال الملف: منجز/الكل، النسبة، وحالة كل معلومة. */
export function profileCompletion(u?: FullProfile | null): CompletionResult {
  const fields: ProfileFieldState[] = [
    { id: "name",       label: "الاسم",            group: "core",     done: !!u?.name },
    { id: "stage",      label: "المرحلة الدراسية", group: "core",     done: !!(u?.grade || u?.studyLevel) },
    { id: "region",     label: "المنطقة",          group: "core",     done: !!u?.region },
    { id: "goal",       label: "الهدف",            group: "core",     done: !!(has(u?.targets) || u?.goalUndecided) },
    { id: "studyStyle", label: "طريقة المذاكرة",   group: "personal", done: !!u?.studyStyle },
    { id: "hobbies",    label: "الهوايات",         group: "personal", done: has(u?.hobbies) },
    { id: "interests",  label: "الاهتمامات",       group: "personal", done: has(u?.interests) },
    { id: "favSubjects",label: "المواد المفضّلة",  group: "personal", done: has(u?.favSubjects) },
  ];
  const done = fields.filter((f) => f.done).length;
  const total = fields.length;
  return { total, done, pct: Math.round((done / total) * 100), fields };
}

/* ── المكافآت التدريجية (تُصرف مرّة واحدة لكلٍّ عبر rewardedFields + awardedProfileComplete) ── */
export interface RewardOutcome {
  silver: number; badge: boolean; message: string;
  newRewardedFields: string[]; setCompleteFlag: boolean;
}

const ar = (x: number) => x.toLocaleString("ar-u-nu-arab");

/** ما الذي يُصرف الآن؟ +٥ لكل معلومةٍ شخصية جديدة، ووسام + ٣٠ عند ١٠٠٪. null إن لا شيء. */
export function pendingProfileRewards(u: FullProfile): RewardOutcome | null {
  const c = profileCompletion(u);
  const doneById = new Map(c.fields.map((f) => [f.id, f.done]));
  const rewarded = new Set(u.rewardedFields ?? []);
  const newRewardedFields: string[] = [];
  for (const id of REWARDED_FIELDS) if (doneById.get(id) && !rewarded.has(id)) newRewardedFields.push(id);

  let silver = newRewardedFields.length * 5;
  const parts: string[] = [];
  if (newRewardedFields.length) parts.push(`+${ar(silver)} فضة`);

  let badge = false, setCompleteFlag = false;
  if (c.pct === 100 && !u.awardedProfileComplete) {
    silver += 30; badge = true; setCompleteFlag = true;
    parts.push(`🏅 وسام اكتمال الملف + ${ar(30)} فضة`);
  }
  if (silver === 0 && !badge) return null;
  return { silver, badge, message: `🎉 ${parts.join(" · ")}`, newRewardedFields, setCompleteFlag };
}
