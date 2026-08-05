/* ─── ربط بيانات localStorage بمالكها (Account Scoping) ───
   جذر إصلاح C2: مفاتيح بيانات المستخدم (BACKUP_KEYS) كانت تبقى على الجهاز بعد
   تسجيل الخروج/تبديل الحساب، فيراها المستخدم التالي. هنا نُلزم أن البيانات
   المحلية تخصّ المستخدم المصادَق حالياً، ونمسح أي بيانات لحساب آخر فور تغيّر
   الهوية. وحدة خالية من Firebase (localStorage فقط) كي تُستدعى بشكل متزامن
   من البوابة قبل أي مزامنة، وقابلة للاختبار. */

/* المفاتيح التي تُحفظ في السحابة وتمثّل بيانات المستخدم.
   ▓ كانت قائمةً مكتوبةً بيدٍ تتفرّق عن الواقع (سقط منها `darb_sessions` و
     `darb_calendar_events` والمستوى والأوسمة). صارت **مشتقّةً** من سجلّ المفاتيح
     الواحد: كلُّ ما نطاقُه `student` وليس قديماً. الاسمُ والشكلُ كما هما. */
export { BACKUP_KEYS } from "./storageKeys";
import { BACKUP_KEYS } from "./storageKeys";

/* مفتاح يحمل uid مالك البيانات المحلية حالياً — خارج BACKUP_KEYS عمداً */
const OWNER_KEY = "darb_owner_uid";
const SEEN_BROADCASTS_KEY = "darb_seen_broadcasts";

function ls(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return localStorage; } catch { return null; }
}

export function localDataOwner(): string | null {
  return ls()?.getItem(OWNER_KEY) ?? null;
}

function setLocalDataOwner(uid: string | null): void {
  const s = ls(); if (!s) return;
  try { if (uid) s.setItem(OWNER_KEY, uid); else s.removeItem(OWNER_KEY); } catch { /* تجاهل */ }
}

/* هل توجد أي بيانات مستخدم محلية الآن؟ */
export function hasAnyLocalUserData(): boolean {
  const s = ls(); if (!s) return false;
  return BACKUP_KEYS.some((k) => s.getItem(k) != null);
}

/* يمسح كل بيانات المستخدم المحلية (BACKUP_KEYS + توابع العرض المرتبطة بالحساب) */
export function clearLocalUserData(): void {
  const s = ls(); if (!s) return;
  try {
    for (const k of BACKUP_KEYS) s.removeItem(k);
    s.removeItem(SEEN_BROADCASTS_KEY); // حالة «شوهد» الإشعارات تخصّ الحساب أيضاً
  } catch { /* تجاهل */ }
}

/* يُلزم أن البيانات المحلية تخصّ uid الحالي. يُستدعى عند كل تغيّر هوية:
   - تسجيل خروج (uid=null وليس وضع زائر): امسح البيانات وأزل المالك.
   - وضع الزائر (uid=null مع darb_guest_mode): لا تمسح — null حالته الطبيعية وبياناته له.
   - دخول مستخدم مختلف عن مالك البيانات: امسح بيانات الحساب الآخر ثم اربط الملكية.
   - دخول مالك مجهول وبيانات موجودة وليست لزائر: امسح احتياطاً (قد تكون لحساب سابق
     قبل هذا الإصلاح) ليُعاد سحبها من السحابة.
   - وضع الزائر (بيانات بلا مالك): اربط الملكية دون مسح (يحافظ على ترحيل الزائر).
   يعيد true إن مسح بيانات (فيُعاد سحب السحابة). نقي عدا localStorage. */
export function ensureLocalOwnership(uid: string | null): boolean {
  const s = ls(); if (!s) return false;

  if (!uid) {
    /* وضع الزائر: null هو حالته الطبيعية (بلا جلسة Firebase) وبياناته المحلية له —
       لا تمسح، وإلا يفقد بياناته عند كل إقلاع ويدور في حلقة onboarding لا نهائية.
       تسجيل الخروج الحقيقي (بلا علم زائر) يبقى يمسح — فيُحفَظ ضمان C2. */
    const isGuest = (() => { try { return s.getItem("darb_guest_mode") === "1"; } catch { return false; } })();
    if (isGuest) return false;
    const had = hasAnyLocalUserData() || !!localDataOwner();
    clearLocalUserData();
    setLocalDataOwner(null);
    return had;
  }

  const owner = localDataOwner();
  if (owner === uid) return false; // بياناتي أنا

  if (owner && owner !== uid) {
    clearLocalUserData();          // بيانات حساب آخر صريحة → امسحها
    setLocalDataOwner(uid);
    return true;
  }

  // owner == null (لا مالك مسجّل بعد)
  const isGuest = (() => { try { return s.getItem("darb_guest_mode") === "1"; } catch { return false; } })();
  if (isGuest) { setLocalDataOwner(uid); return false; } // ترحيل بيانات الزائر (سلوك قائم)

  if (hasAnyLocalUserData()) {     // بيانات مجهولة المالك (قبل الإصلاح) → امسح احتياطاً
    clearLocalUserData();
    setLocalDataOwner(uid);
    return true;
  }

  setLocalDataOwner(uid);          // جهاز نظيف → اربط الملكية فقط
  return false;
}
