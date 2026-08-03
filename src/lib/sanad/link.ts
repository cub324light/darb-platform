/* ═══════════ ربطُ سند — محرّكٌ نقيّ ١٠٠٪ ═══════════
   وليُّ الأمر على جوّاله، والطالبُ على جوّاله. فكيف يعرف سندٌ أنّ هذا أبو ذاك؟
   **برمزٍ يصنعه الطالب ويقرؤه والدُه** — لا برقم جوّالٍ يُدخله الوالدُ فيفتح
   ملفَّ من ليس ابنه.

   ▓ المبدأ: الربطُ **بيد الطالب**. هو الذي يُنشئ الرمز، وهو الذي يفصل متى شاء،
     ولا يُربط أحدٌ بحسابه من خلف ظهره. هذا شرطٌ لا زينة: منتَجٌ يتابع القاصرَ
     بلا علمه يفسد الثقةَ التي يقوم عليها.

   ▓ الرمزُ قصيرُ العمر: يُقرأ مرّةً ثم يموت. رمزٌ أبديٌّ يُتداول في مجموعةٍ
     دراسيةٍ فيفتح ملفَّ صاحبه لغرباء.

   ▓ حروفٌ بلا التباس: أسقطنا (٠ O) و(١ I L) و(٢ Z) و(٥ S) و(٨ B) — الرمزُ
     يُقرأ من شاشةٍ ويُكتب بإصبعٍ مستعجل.

   ▓ نقيّ: مُدخلاتٌ داخلة ونتيجةٌ خارجة. لا تخزين ولا نافذة ولا وقتٍ من عنده. */

/** أبجديّةُ الرمز — بلا حروفٍ تلتبس بأرقام. */
export const CODE_ALPHABET = "ACDEFGHJKMNPQRTUVWXY3467";
export const CODE_LEN = 6;

/** عمرُ الرمز — عشرُ دقائق تكفي لأن يقرأه الوالدُ ويكتبه، ولا تكفي ليُنشر. */
export const CODE_TTL_MS = 10 * 60 * 1000;

/** أقصى عددِ أولياء أمرٍ لطالبٍ واحد — أبٌ وأمٌّ وثالثٌ عند الحاجة. */
export const MAX_GUARDIANS = 3;

export interface PairCode {
  code: string;
  /** لحظةُ الإنشاء (ms) — تأتي من الخارج فيبقى المحرّك نقيّاً. */
  issuedAt: number;
}

export interface Guardian {
  id: string;
  /** ما يعرّفه للطالب: «أبي» أو «أمي» أو اسمٌ كتبه الوالد. */
  label: string;
  /** بريدُ الوالد إن سجّل بحساب — للعرض لا للتواصل. */
  email?: string;
  linkedAt: number;
}

export type LinkFail = "bad-format" | "expired" | "mismatch" | "full" | "duplicate";

/** رمزٌ من عشوائيّاتٍ تأتي من الخارج (`rnd` تُعيد ٠..١) — فيُختبَر. */
export function makeCode(rnd: () => number, now: number): PairCode {
  let code = "";
  for (let i = 0; i < CODE_LEN; i++) {
    const r = Math.abs(Number.isFinite(rnd()) ? rnd() : 0) % 1;
    code += CODE_ALPHABET[Math.min(CODE_ALPHABET.length - 1, Math.floor(r * CODE_ALPHABET.length))];
  }
  return { code, issuedAt: now };
}

/** تطبيعُ ما كتبه الوالد: حروفٌ كبيرة، وبلا فراغاتٍ ولا شرطات. */
export const normalizeCode = (raw: string): string =>
  raw.toUpperCase().replace(/[\s-_]/g, "").trim();

/** هل الشكلُ صحيحٌ أصلاً؟ (قبل أن نقول «غير مطابق» فنُوهم الوالدَ أنه قارب) */
export const isWellFormed = (raw: string): boolean => {
  const c = normalizeCode(raw);
  return c.length === CODE_LEN && [...c].every((ch) => CODE_ALPHABET.includes(ch));
};

export const isExpired = (issuedAt: number, now: number): boolean =>
  now - issuedAt >= CODE_TTL_MS;

/** كم بقي من عمر الرمز بالثواني — للعدّاد الذي يراه الطالب. */
export const secondsLeft = (issuedAt: number, now: number): number =>
  Math.max(0, Math.ceil((issuedAt + CODE_TTL_MS - now) / 1000));

export interface LinkAttempt {
  entered: string;
  issued: PairCode | null;
  now: number;
  guardians: Guardian[];
  /** بريدُ الوالد المحاوِل — يمنع ربطَ الشخص نفسِه مرّتين. */
  email?: string;
}

export type LinkResult =
  | { ok: true; code: string }
  | { ok: false; reason: LinkFail };

/**
 * يتحقّق من محاولة ربط. الترتيبُ مقصود: الشكلُ أولاً (فلا نقول «انتهى» لرمزٍ
 * لم يُكتب أصلاً)، ثم الانتهاء، ثم المطابقة، ثم الحدود.
 */
export function verifyLink(i: LinkAttempt): LinkResult {
  const entered = normalizeCode(i.entered);
  if (!isWellFormed(entered)) return { ok: false, reason: "bad-format" };
  if (!i.issued) return { ok: false, reason: "mismatch" };
  if (isExpired(i.issued.issuedAt, i.now)) return { ok: false, reason: "expired" };
  if (entered !== i.issued.code) return { ok: false, reason: "mismatch" };
  if (i.email && i.guardians.some((g) => g.email && g.email.toLowerCase() === i.email!.toLowerCase())) {
    return { ok: false, reason: "duplicate" };
  }
  if (i.guardians.length >= MAX_GUARDIANS) return { ok: false, reason: "full" };
  return { ok: true, code: entered };
}

export const LINK_FAIL_TEXT: Record<LinkFail, string> = {
  "bad-format": `الرمز ${CODE_LEN} حروفٍ وأرقام — راجع ما كتبته.`,
  expired: "انتهت صلاحية الرمز. اطلب من ابنك رمزاً جديداً.",
  mismatch: "الرمز غير مطابق. تأكّد من الحروف كما تظهر على شاشته.",
  full: `لا يُربط بحساب الطالب أكثر من ${MAX_GUARDIANS} أولياء أمر.`,
  duplicate: "أنت مرتبطٌ بحسابه أصلاً.",
};

export const addGuardian = (list: Guardian[], g: Guardian): Guardian[] =>
  list.some((x) => x.id === g.id) ? list : [...list, g];

export const removeGuardian = (list: Guardian[], id: string): Guardian[] =>
  list.filter((g) => g.id !== id);
