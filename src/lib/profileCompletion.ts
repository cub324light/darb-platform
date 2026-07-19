/* ─── اكتمال الملف الشخصي + مكافآته — منطقٌ نقيّ (لا localStorage، قابلٌ للاختبار) ───
   قائمةٌ من ٨ معلومات: ٤ أساسية (من التسجيل) + ٤ إضافية (اختيارية من البروفايل، تُجهّز
   لدويرب مستقبلاً). المكافآت: +٥٠ فضة عند إكمال المعلومات الإضافية، ووسام + فضة عند ١٠٠٪. */

export interface FullProfile {
  name?: string; grade?: string; studyLevel?: string; region?: string;
  targets?: string[]; goalUndecided?: boolean;
  hobbies?: string[]; interests?: string[]; favSubjects?: string[]; learnPref?: string;
  awardedProfileInfo?: boolean; awardedProfileComplete?: boolean;
}

export interface ProfileFieldState { id: string; label: string; group: "core" | "extra"; done: boolean; }
export interface CompletionResult { total: number; done: number; pct: number; extraDone: boolean; fields: ProfileFieldState[]; }

const has = (a?: unknown[]): boolean => Array.isArray(a) && a.length > 0;

/** حالة اكتمال الملف: منجز/الكل، النسبة، وحالة كل معلومة. */
export function profileCompletion(u?: FullProfile | null): CompletionResult {
  const fields: ProfileFieldState[] = [
    { id: "name",       label: "الاسم",            group: "core",  done: !!u?.name },
    { id: "stage",      label: "المرحلة الدراسية", group: "core",  done: !!(u?.grade || u?.studyLevel) },
    { id: "region",     label: "المنطقة",          group: "core",  done: !!u?.region },
    { id: "goal",       label: "الهدف",            group: "core",  done: !!(has(u?.targets) || u?.goalUndecided) },
    { id: "hobbies",    label: "الهوايات",         group: "extra", done: has(u?.hobbies) },
    { id: "interests",  label: "الاهتمامات",       group: "extra", done: has(u?.interests) },
    { id: "favSubjects",label: "المواد المفضّلة",  group: "extra", done: has(u?.favSubjects) },
    { id: "learnPref",  label: "طريقة التعلّم",    group: "extra", done: !!u?.learnPref },
  ];
  const done = fields.filter((f) => f.done).length;
  const total = fields.length;
  const extraDone = fields.filter((f) => f.group === "extra").every((f) => f.done);
  return { total, done, pct: Math.round((done / total) * 100), extraDone, fields };
}

/* ── المكافآت (تُصرف مرّة واحدة لكلٍّ عبر علمَي DarbUser) ── */
export interface RewardOutcome {
  silver: number; badge: boolean; message: string;
  setInfoFlag: boolean; setCompleteFlag: boolean;
}

const AR = "ar-u-nu-arab";
const ar = (x: number) => x.toLocaleString(AR);

/** ما الذي يُصرف الآن لهذا الملف (بحسب علمَي الصرف)؟ null إن لا شيء. */
export function pendingProfileRewards(u: FullProfile): RewardOutcome | null {
  const c = profileCompletion(u);
  let silver = 0, badge = false, setInfoFlag = false, setCompleteFlag = false;
  const parts: string[] = [];
  if (c.extraDone && !u.awardedProfileInfo) {
    silver += 50; setInfoFlag = true; parts.push(`أكملت معلوماتك الإضافية (+${ar(50)} فضة)`);
  }
  if (c.pct === 100 && !u.awardedProfileComplete) {
    silver += 30; badge = true; setCompleteFlag = true; parts.push(`اكتمل ملفك ١٠٠٪ — وسام + ${ar(30)} فضة`);
  }
  if (silver === 0 && !badge) return null;
  return { silver, badge, message: `🎉 أحسنت! ${parts.join(" · ")}.`, setInfoFlag, setCompleteFlag };
}
