"use client";
/* ─── تسجيل الدخول + مزامنة كل البيانات مع Firebase ───
   الدخول إجباري (Google / إيميل). بعد الدخول تُسترجع نسخة
   السحابة إلى localStorage، وتُرفع تلقائياً عند أي تغيير ومغادرة الصفحة. */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as fbSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  setPersistence,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { loadUser, saveUser, loadStats, computeStreak, RESET_PENDING_KEY } from "./storage";
import { mergeKey, mergeForUpload } from "./backupMerge";
import { normalizePlan } from "./plan";
import { BACKUP_KEYS, ensureLocalOwnership } from "./accountScope";
import {
  markInitialSyncDone, resetInitialSyncDone,
  markAccountBlocked,
} from "./cloudFlags";

export { isInitialSyncDone, isAccountBlocked } from "./cloudFlags";
export { ensureLocalOwnership } from "./accountScope";

/* BACKUP_KEYS انتقلت إلى accountScope.ts (لتُشارَك مع البوابة وتُربَط بالمالك).
   ملاحظة: darb_theme غير مدرج — الثيم خاص بكل جهاز. وذاكرة/أحداث المحرّك
   تُزامَن على مستوى الكيان عبر engineSync (لا ضمن هذه الكتلة). */

/* أعلام المزامنة والحظر مُعرَّفة في cloudFlags.ts (بلا Firebase)
   ومُعاد تصديرها أعلاه — نحدّثها هنا عبر setters فقط. */

/* ─── المصادقة ─── */
export function currentUser(): User | null {
  return auth.currentUser;
}

/* رمز هوية Firebase الحالي — تُرفقه نداءات الذكاء كي يتحقّق الخادم من الطالب. */
export async function getIdToken(): Promise<string | null> {
  const u = auth.currentUser;
  if (!u) return null;
  try { return await u.getIdToken(); } catch { return null; }
}

export function onAuth(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

/* ─── تثبيت الجلسة: نجرّب أكثر من نوع تخزين بالترتيب حتى ينجح أحدها.
   لا نُفشل الدخول لو كل الأنواع رُفضت (بعض المتصفحات/الوضع الخاص تمنع
   IndexedDB وlocalStorage) — نكمل بالذاكرة على الأقل لهذه الجلسة. */
async function ensurePersistence(): Promise<void> {
  const types = [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
  ];
  for (const p of types) {
    try {
      await setPersistence(auth, p);
      return;
    } catch {
      /* جرّب النوع التالي */
    }
  }
}

export async function signUp(email: string, password: string) {
  await ensurePersistence();
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  /* أرسل رابط التوثيق فوراً — لا نُفشل التسجيل إن تعذّر الإرسال (شبكة/حد إرسال) */
  try { await sendEmailVerification(cred.user); } catch { /* تجاهل */ }
  return cred.user;
}

/* إعادة إرسال رابط توثيق البريد للمستخدم الحالي */
export async function resendVerification(): Promise<void> {
  const u = auth.currentUser;
  if (u && !u.emailVerified) await sendEmailVerification(u);
}

/* يعيد تحميل بيانات المستخدم من الخادم (بعد ضغطه رابط التوثيق) ويرجع حالة التوثيق. */
export async function reloadVerification(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  try { await u.reload(); } catch { /* تجاهل */ }
  return auth.currentUser?.emailVerified ?? false;
}

export async function signIn(email: string, password: string) {
  await ensurePersistence();
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser() {
  await fbSignOut(auth);
  resetInitialSyncDone();
  markAccountBlocked(false);
  /* C2: امسح بيانات المستخدم المحلية عند الخروج كي لا يراها المستخدم التالي
     على الجهاز نفسه. بياناته محفوظة في السحابة وتُسحب عند دخوله مجدداً. */
  ensureLocalOwnership(null);
}

/* ─── Google — popup أولاً دائماً (أكثر موثوقية ويُظهر الأخطاء فوراً)؛
   نلجأ لـ redirect فقط لو المتصفح منع البوب-أب ─── */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    /* البوب-أب ممنوع/مُغلق (شائع في PWA على الجوال) → جرّب redirect */
    if (
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, provider);
    } else throw e;
  }
}

/* يُستدعى عند إقلاع البوابة لإكمال تسجيل الدخول عبر redirect.
   يرجع رسالة خطأ بالعربي إن فشل، أو null إن لا شيء/نجح. */
export async function consumeRedirectResult(): Promise<string | null> {
  try {
    await getRedirectResult(auth);
    return null;
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    return code ? authErrorMsg(code) : "تعذّر تسجيل الدخول — حاول مرة ثانية";
  }
}

/* رسائل خطأ مفهومة بالعربي */
export function authErrorMsg(code: string): string {
  switch (code) {
    case "auth/invalid-email": return "الإيميل غير صحيح";
    case "auth/email-already-in-use": return "هذا الإيميل مسجّل من قبل — سجّل دخول بدله";
    case "auth/weak-password": return "كلمة المرور قصيرة — 6 أحرف على الأقل";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "الإيميل أو كلمة المرور غير صحيحة";
    case "auth/too-many-requests": return "محاولات كثيرة — انتظر شوي وحاول مرة ثانية";
    case "auth/network-request-failed": return "تأكد من اتصالك بالإنترنت";
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
      return "طريقة الدخول هذي غير مفعّلة — فعّلها من Firebase: Authentication ← Sign-in method";
    case "auth/account-exists-with-different-credential":
      return "عندك حساب بنفس الإيميل بطريقة دخول ثانية — جرّب الطريقة الأخرى";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "أُلغي تسجيل الدخول";
    case "auth/unauthorized-domain":
      return "هذا النطاق غير مصرّح — أضِفه في Firebase: Authentication ← Settings ← Authorized domains";
    default: return "صار خطأ — حاول مرة ثانية";
  }
}

/* علامةُ «ابدأ من الصفر» — تُقرأ ولا تُمسح إلا بعد رفعٍ ناجح (انظر `initialSync`) */
function consumeResetPending(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(RESET_PENDING_KEY) === "1"; } catch { return false; }
}
function clearResetPending(): void {
  try { localStorage.removeItem(RESET_PENDING_KEY); } catch { /* تجاهل */ }
}

/* ─── المزامنة الأولية: مرة واحدة بعد ثبوت تسجيل الدخول ─── */
/* تُستدعى من البوابة بعد تسجيل الدخول:
   اسحب من السحابة؛ وإن لم توجد نسخة وعندك بيانات محلية ارفعها (ترحيل حساب مجهول قديم). */
export async function initialSync(): Promise<boolean> {
  /* confirmed = هل عرفنا يقيناً حالة ملف السحابة (قراءة نجحت أو الوثيقة غائبة فعلاً)؟
     قراءة pullBackup الفاشلة أو تجاوز المهلة → confirmed=false، فلا ترمي البوابة
     المستخدمَ العائد إلى onboarding بناءً على «غياب» غير مؤكّد (وتطمس بياناته). */
  let confirmed = false;

  /* ▓ «ابدأ من الصفر» يعني صفراً حقيقياً. كان المسحُ المحلّيُّ يعقبه تحميلٌ كامل
     يُصفّر `_initialSyncDone`، فيسحب هذا الاستدعاءُ الكتلةَ القديمةَ ويدمج
     الذاكرةَ والأحداثَ — فتعود بياناتُه كلُّها بعد ثوانٍ (قِسناه: خمسةَ عشرَ
     مفتاحاً عادت). فإن كانت العلامةُ قائمةً: **لا نسحب**، بل نرفع المحلّيَّ
     الفارغَ لتتبع السحابةُ قرارَ الطالب الصريح (سُئل مرّتين قبله). والعلامةُ
     لا تُمسح إلا بعد رفعٍ ناجح، فلو انقطعت الشبكةُ لم تعد البياناتُ في المرّة
     التالية. والزائرُ لا يمرّ من هنا أصلاً — لا مصادقةَ له. */
  if (consumeResetPending()) {
    const pushed = await pushBackup({ merge: false });
    if (pushed) clearResetPending();
    markInitialSyncDone();
    return true;
  }

  try {
    /* استرجاع ملف السحابة (getDoc واحد) بمهلته الخاصة — هو ما يحسم onboarding */
    const pull = await Promise.race([
      pullBackup(),
      new Promise<{ ok: boolean; restored: boolean }>((resolve) =>
        setTimeout(() => resolve({ ok: false, restored: false }), 6000)),
    ]);
    confirmed = pull.ok;
    if (!pull.restored && hasLocalData()) await pushBackup();
    /* مزامنة حالة المحرّكات (أثقل) خلف مهلة منفصلة — لا تؤثّر على قرار onboarding */
    await Promise.race([
      (async () => {
        const { pullEngineState } = await import("./engineSync");
        await pullEngineState();
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 6000)),
    ]);
  } catch {
    /* نكمل في كل الأحوال */
  } finally {
    markInitialSyncDone();
  }
  return confirmed;
}

/* ─── جمع البيانات من localStorage ─── */
function collectBackup(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  for (const k of BACKUP_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
}

/** كتلةُ الرفع بعد دمجها مع ما في السحابة — مفتاحاً مفتاحاً بجدول العائلات. */
async function mergedBackupForUpload(uid: string): Promise<Record<string, string>> {
  const mine = collectBackup();
  let theirs: Record<string, string> = {};
  try {
    const snap = await getDoc(doc(db, "users", uid));
    theirs = (snap.exists() ? (snap.data().backup as Record<string, string>) : {}) ?? {};
  } catch {
    return mine;   // تعذّرت القراءة ⇒ ارفع المحلّيَّ كما كان يُرفع
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(mine)) {
    const remote = typeof theirs[k] === "string" ? theirs[k] : null;
    out[k] = mergeForUpload(k, v, remote);
  }
  /* ما في السحابة ولم يعد على هذا الجهاز يبقى كما هو — الرفعُ لا يحذف */
  for (const [k, v] of Object.entries(theirs)) if (!(k in out) && typeof v === "string") out[k] = v;
  return out;
}

/* ─── رفع نسخة كاملة للسحابة ─── */
export async function pushBackup(opts?: { merge?: boolean }): Promise<boolean> {
  const u = auth.currentUser;
  if (!u || typeof window === "undefined") return false;
  try {
    /* ▓ ادمج قبل الرفع. كان الرفعُ يكتب كتلةَ هذا الجهاز فوق كتلة السحابة، فجهازٌ
       يرفع بعد آخرَ يمحو عملَه (قِسناه: تقدّمُ وحدةٍ · دقائقُ يومٍ · فضّةٌ · نتائج).
       والسحبُ صار يدمج، لكنّ رفعاً بلا سحبٍ سابقٍ في الجلسة (زرُّ «احفظ الآن» ·
       تسجيلُ الخروج) كان يبقى عمياء. الآن: **محلّيّ + سحابة ← دمج ← رفع**،
       بجدول العائلات نفسِه؛ وما لا قاعدةَ له يبقى LWW فتُرفع حالةُ هذا الجهاز
       كما كانت تماماً. وفشلُ القراءة لا يُسقط الرفع — نرفع المحلّيَّ كما كان. */
    /* `merge: false` لمسارٍ واحدٍ فقط: «ابدأ من الصفر». الدمجُ هناك يُعيد ما
       طلب الطالبُ محوَه، فالرفعُ يستبدل استبدالاً — وهو أصلُ ما كان قبل الدمج. */
    const backup = opts?.merge === false ? collectBackup() : await mergedBackupForUpload(u.uid);
    const usr = loadUser();
    const st = loadStats();
    // حقول منظّمة للوحة الأدمن + النسخة الكاملة للاسترجاع.
    // ملاحظة أمنية: «plan/blocked/blockUntil» لا تُكتب من هنا إطلاقاً — يضبطها
    // الأدمن عبر Admin SDK فقط، وقواعد Firestore تمنع كتابتها من العميل.
    await setDoc(
      doc(db, "users", u.uid),
      {
        email: u.email ?? null,
        name: usr?.name ?? null,
        track: usr?.track ?? null,
        streak: computeStreak(st),
        focusMins: st.totalFocusMins,
        sessions: st.sessionsCount,
        silver: st.silver,
        backup,
        backupAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
    /* رفع حالة المحرّكات (ذاكرة/أحداث) بدمج ذرّي — منفصل عن الكتلة */
    const { pushEngineState } = await import("./engineSync");
    await pushEngineState();
    /* ملخّصُ سند — لمن ربط وليَّ أمره وحده. هذه هي اللحظةُ التي «يتحدّث» فيها
       ما يراه الوالد؛ ولذلك نقول له في لوحته متى كان آخرُ تحديث. */
    try {
      const { isSanadActive, pushDigest } = await import("./sanad/cloud");
      if (isSanadActive()) await pushDigest();
    } catch { /* المزامنةُ لا تُفشل النسخَ الاحتياطيّ */ }
    return true;
  } catch {
    return false;
  }
}

/* ─── استرجاع النسخة من السحابة إلى localStorage ─── */
export async function pullBackup(): Promise<{ ok: boolean; restored: boolean }> {
  const u = auth.currentUser;
  if (!u || typeof window === "undefined") return { ok: false, restored: false };
  try {
    const snap = await getDoc(doc(db, "users", u.uid));
    /* قراءة ناجحة بلا وثيقة = مستخدم جديد فعلاً (ok=true)، تختلف عن فشل القراءة أدناه */
    if (!snap.exists()) return { ok: true, restored: false };
    const data = snap.data();

    /* حالة الإيقاف والباقة محفوظتان كحقول عُليا يضبطها الأدمن — تُقرأ دائماً */
    markAccountBlocked(data.blocked === true);
    const cloudPlan = data.plan as string | undefined;

    const backup = data.backup as Record<string, string> | undefined;
    const hasBackup = !!backup && Object.keys(backup).length > 0;
    if (hasBackup) {
      /* ▓ كان هذا يكتب كلَّ مفتاحٍ فوق المحلّيّ بلا نظر، فتُمحى بالكتلة بياناتٌ
         **تتراكم**: تقدّمُ وحدةٍ في جهازٍ آخر · دقائقُ يومٍ · فضّةٌ · يومٌ من
         السلسلة · أوسمةٌ. وأخطرُ من ذلك أنّه كان يُرجع **المرحلة** للخلف فيتناقض
         الملفُّ مع الذاكرة ويُعاد إطلاقُ حدثِ المرحلة.
         الآن لكلِّ عائلةٍ دلالتُها في `backupMerge`، وما لا قاعدةَ له يبقى كما
         كان (السحابةُ تفوز) — لا دمجَ عامٌّ ساذج. */
      for (const [k, v] of Object.entries(backup!)) {
        if (typeof v !== "string") continue;
        localStorage.setItem(k, mergeKey(k, localStorage.getItem(k), v));
      }
    }

    /* الباقة من الحقل العلوي (يضبطه الأدمن عبر Admin SDK) هي المرجع الوحيد —
       تُطبَّق دائماً بعد استرجاع النسخة لتتجاوز أي قيمة داخل backup، فلا يمكن
       تزوير الباقة محلياً ومزامنتها. الغياب = «free». */
    {
      const local = loadUser();
      if (local) saveUser({ ...local, plan: normalizePlan(cloudPlan) });
    }

    return { ok: true, restored: hasBackup };
  } catch {
    /* فشل القراءة (شبكة/قواعد/تعذّر) → حالة غير مؤكّدة؛ لا نَبني عليها قرار onboarding */
    return { ok: false, restored: false };
  }
}

/* هل توجد بيانات محلية تستحق الحفظ؟ (للتمييز بين جهاز جديد ومستخدم قائم) */
export function hasLocalData(): boolean {
  return !!loadUser();
}
