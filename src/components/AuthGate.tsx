"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import dynamic from "next/dynamic";
import { isInitialSyncDone, isAccountBlocked, resetInitialSyncDone } from "@/lib/cloudFlags";
import { loadUser } from "@/lib/storage";
import { setNamespace } from "@/lib/engineNamespace";
import { ensureLocalOwnership } from "@/lib/accountScope";
import Logo from "./Logo";
import BottomNav from "./BottomNav";
import DesktopSidebar from "./DesktopSidebar";

/* المسارات العامة — تُعرض بدون تسجيل دخول للطالب:
   «/» و«/privacy» تسويقية، و«/admin» له حماية كلمة سر خاصة على الخادم،
   وصفحات المحتوى التعليمي (faq/flashcards/success-stories) عامة للفهرسة. */
const PUBLIC_PATHS = [
  "/", "/privacy", "/terms", "/subscription", "/admin",
  "/faq", "/tahsili/flashcards", "/success-stories",
  /* صفحاتٌ تعريفية يقرؤها الزاحفُ ووكيلُ الذكاء الاصطناعي قبل أي تسجيل. لو بقيت
     خلف البوّابة لَرأى الزائرُ غير المسجَّل — والزاحفُ الذي لا يشغّل JS — قشرةً
     فارغة بلا `<main>` ولا عنوان. تحقّقتُ منها فعلاً قبل إضافتها. */
  "/about", "/features", "/docs", "/docs/api",
];

/* أقصى إعادات لمحاولة استرجاع ملف المستخدم قبل اعتباره «بلا حساب» (يمنع رمي العائد
   إلى onboarding على أصل Preview البطيء/البارد قبل اكتمال السحب السحابي) */
const MAX_SYNC_RETRIES = 3;

/* تحميل SignInScreen ديناميكياً — يُبعدها وما تستورده من Firebase عن الحزمة المبدئية.
   المستخدمون العائدون لا يحتاجون شاشة الدخول على الإطلاق. */
const SignInScreen = dynamic(() => import("./SignInScreen"), { ssr: false });

function Splash({ label }: { label?: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 relative z-[1]">
      <Logo className="font-black text-5xl" style={{ letterSpacing: "-1px" }} />
      {label && <p className="text-[16px] font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>}
    </div>
  );
}

/* شاشة الحساب الموقوف — تُعرض عند ضبط blocked من لوحة الإدارة */
function BlockedScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-8 text-center relative z-[1]">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
        style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", border: "1.5px solid color-mix(in srgb, var(--danger) 40%, transparent)" }}>
        ⛔
      </div>
      <div>
        <p className="title-md mb-2" style={{ color: "var(--text)" }}>تم إيقاف حسابك</p>
        <p className="text-[16px] leading-relaxed max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
          حسابك موقوف حالياً عن استخدام درب. لو تعتقد أنه خطأ، تواصل معنا.
        </p>
      </div>
      <button
        onClick={() => {
          import("@/lib/cloud").then(({ signOutUser }) =>
            signOutUser().then(() => window.location.reload())
          );
        }}
        className="px-6 py-3 rounded-2xl font-bold text-sm"
        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
        تسجيل خروج
      </button>
    </div>
  );
}

/* ═══ متجرُ وضع الزائر ═══
   مصدرٌ واحد يقرأ منه `AuthGate` وغيرُه، ويبثّ تغيّره فلا تتفرّق النسخ. */
export const GUEST_KEY = "darb_guest_mode";
export const GUEST_CHANGED = "darb:guestChanged";
export const readGuestMode = (): boolean => {
  try { return localStorage.getItem(GUEST_KEY) === "1"; } catch { return false; }
};
const subscribeGuest = (cb: () => void) => {
  window.addEventListener(GUEST_CHANGED, cb);
  return () => window.removeEventListener(GUEST_CHANGED, cb);
};
/* الخروج من وضع الزائر — يُستدعى فور نجاح تسجيل دخولٍ حقيقيّ من أي مكان.
   واجبٌ لا تحسين: ما دام المفتاح موجوداً تبقى المزامنة السحابية معطّلةً عن
   صاحب الحساب (`CloudSync` يخرج مبكراً)، فتضيع بياناته وهو يحسبها محفوظة. */
export const exitGuestMode = (): void => {
  try { localStorage.removeItem(GUEST_KEY); } catch { /* تجاهل */ }
  try { window.dispatchEvent(new CustomEvent(GUEST_CHANGED)); } catch { /* تجاهل */ }
};

/* بوابة المصادقة: الدخول إجباري لكل المسارات عدا العامة.
   تكمل دخول redirect، تراقب الحالة، وتنفّذ المزامنة الأولية مرة واحدة.
   Firebase تُحمَّل ديناميكياً بعد أول render — المستخدم العائد يرى المحتوى فوراً
   بينما تُحَلّ المصادقة في الخلفية (stale-while-revalidate). */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  /* عام: القائمة الثابتة + دليل الجامعات وكل ملف جامعة (/universities و /universities/[id]).
     نطابق «/universities» بدقّة و«/universities/» كبادئة فقط، فلا نفتح غيرها بالخطأ. */
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname === "/universities" ||
    pathname.startsWith("/universities/");

  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [synced, setSynced] = useState(isInitialSyncDone());
  /* هل تأكّد السحب الأولي فعلاً (لم تسبقه المهلة)؟ + عدّاد إعادات المحاولة */
  const [syncConfirmed, setSyncConfirmed] = useState(false);
  const [syncTries, setSyncTries] = useState(0);
  const [redirectErr, setRedirectErr] = useState<string | null>(null);
  /* وضع الزائر — يتجاوز تسجيل الدخول ويحفظ البيانات محلياً فقط.
     قيمةٌ خارجية (localStorage) تختلف بين الخادم والعميل، فتُقرأ بـ`useSyncExternalStore`
     بلقطةٍ خادميّة ثابتة (`false`): الخادم والعميل يرسمان الشيء نفسه لحظة الترطيب ثم
     يُعاد الرسم بالقيمة الحقيقية. قراءتها في مُهيّئ `useState` كانت تكسر الترطيب
     (React #418) لأن الخادم يرسم شاشة البداية والعميل يرسم التطبيق. */
  const guestMode = useSyncExternalStore(subscribeGuest, readGuestMode, () => false);

  const enterGuestMode = () => {
    try { localStorage.setItem(GUEST_KEY, "1"); } catch {}
    try { window.dispatchEvent(new CustomEvent(GUEST_CHANGED)); } catch {}
  };

  /* ═══ الزائر لا يُحمَّل له Firebase إطلاقاً ═══
     كانت المصادقة تُجلَب في كل صفحة لكل زائر: ~363 ك.ب من JS يدفع ثمنها طالبٌ
     اختار صراحةً أن يستخدم التطبيق بلا حساب وبياناته محليّةٌ كلّها.
     ومَخرَجُ الزائر إلى حسابٍ قائمٌ فعلاً: الإعدادات ← «حسابك السحابي» ← «سجّل
     دخولك واحفظ بياناتك»، و`SettingsPanel` يجلب Firebase عند فتح اللوحة لا قبلها.
     ولأن مراقبةَ المصادقة هنا معطّلةٌ للزائر، فمَن يسجّل الدخول هناك يستدعي
     `exitGuestMode()` بنفسه؛ وبثُّ `GUEST_CHANGED` يُشغّل هذه المراقبة فوراً —
     ولهذا `guestMode` في مصفوفة الاعتماديات.

     ⚠ الحارسان أدناه يقرآن `readGuestMode()` لا المتغيّر `guestMode`، وهذا فرقٌ
     جوهريّ لا تجميل: `useSyncExternalStore` يُعيد **اللقطة الخادميّة** (`false`)
     في رسمة الترطيب الأولى، وتأثيراتُ تلك الرسمة تُنفَّذ قبل إعادة الرسم بالقيمة
     الحقيقية — فلو حكّمنا `guestMode` لانطلق التحميل للزائر ثم نظّفنا بعد فوات
     الأوان، وقد صار Firebase محمّلاً. القراءة المباشرة تُصيب لأن التأثير لا يعمل
     إلا على العميل حيث `localStorage` متاح. */

  /* أكمل تسجيل الدخول القادم عبر redirect (Google) */
  useEffect(() => {
    if (readGuestMode()) return;   // ⚠ اقرأ المتجر لا قيمةَ الرسم — انظر الملاحظة أدناه
    import("@/lib/cloud").then(({ consumeRedirectResult }) => {
      consumeRedirectResult().then((e) => { if (e) setRedirectErr(e); });
    });
  }, [guestMode]);

  /* راقب حالة المصادقة — عند الدخول بحساب حقيقي نلغي وضع الزائر */
  useEffect(() => {
    if (readGuestMode()) return;   // ⚠ اقرأ المتجر لا قيمةَ الرسم — انظر الملاحظة أدناه
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => {
      unsub = onAuth((u) => {
        /* بدّل فضاء المحرّكات لهذا المستخدم قبل أي وصول/مزامنة — يمنع تسرّب
           بيانات حساب لآخر. الضبط متزامن؛ إسقاط المثائل القديمة كسولاً. */
        if (setNamespace(u?.uid ?? null)) {
          import("@/lib/engineSession").then(({ resetEngineSingletons }) => resetEngineSingletons());
        }
        /* C2: امسح بيانات أي حساب آخر على الجهاز قبل تحميل بيانات هذا المستخدم
           (متزامن، بلا Firebase). إن مُسح شيء أعِد المزامنة لسحب بياناته. */
        if (ensureLocalOwnership(u?.uid ?? null) && u) {
          resetInitialSyncDone();
          setSynced(false);
        }
        setUser(u);
        setAuthResolved(true);
        if (u) exitGuestMode();
      });
    });
    return () => { unsub?.(); };
  }, [guestMode]);

  /* المزامنة الأولية بعد ثبوت تسجيل الدخول */
  useEffect(() => {
    let cancelled = false;
    if (user && !isInitialSyncDone()) {
      import("@/lib/cloud").then(({ initialSync }) => {
        if (!cancelled) {
          initialSync().then((confirmed) => {
            if (!cancelled) { setSyncConfirmed(confirmed); setSynced(true); }
          });
        }
      });
    } else if (!user) {
      const id = setTimeout(() => {
        if (!cancelled) { setSynced(false); setSyncConfirmed(false); setSyncTries(0); }
      }, 0);
      return () => { cancelled = true; clearTimeout(id); };
    }
    return () => { cancelled = true; };
  }, [user, syncTries]);

  /* مستخدم مصادَق بلا ملف محلي ولم تتأكّد المزامنة (Firestore بطيء/بارد على Preview) →
     أعِد محاولة السحب بدل رميه إلى onboarding. محدودة بـ MAX_SYNC_RETRIES ثم نستسلم. */
  useEffect(() => {
    if (user && synced && !syncConfirmed && syncTries < MAX_SYNC_RETRIES && !loadUser()?.onboarded) {
      const id = setTimeout(() => {
        resetInitialSyncDone();
        setSynced(false);
        setSyncTries((n) => n + 1);
      }, 1200);
      return () => clearTimeout(id);
    }
  }, [user, synced, syncConfirmed, syncTries]);

  /* مسجّل لكنه لم يُكمل onboarding → وجّهه لصفحة الإعداد */
  const authed = !!user || guestMode;
  const onboarded = (synced || guestMode) && authed ? !!loadUser()?.onboarded : false;
  /* لا نُرسل المصادَق إلى onboarding إلا إذا تأكّدت حالة ملف السحابة (قراءة نجحت: استُرجِع
     ملفه أو لا حساب له فعلاً) أو كان زائراً. عند تعذّر القراءة (غير مؤكّد) لا نرميه أبداً
     للبداية — نُبقي شاشة الاسترجاع ونعيد المحاولة، حمايةً لبياناته السحابية من الطمس. */
  const onboardingReady = guestMode || syncConfirmed;
  const needsOnboarding = (synced || guestMode) && authed && !onboarded && onboardingReady && pathname !== "/onboarding";

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  /* بيانات محلية جاهزة من جلسة سابقة (نفس الجهاز) — نعرض التطبيق فوراً
     والمزامنة تكمل في الخلفية (stale-while-revalidate)، فلا شاشة تحميل
     لكل العائدين. ننتظر السحابة فقط لو ما فيه نسخة محلية (جهاز جديد).

     تُقرأ بلقطةٍ خادميّة ثابتة (`false`): الخادم لا يرى `localStorage` فيرسم شاشة
     البداية، وكان العميل يرسم التطبيق في اللحظة نفسها فينكسر الترطيب (React #418)
     لكل عائدٍ مسجَّل. الآن يتّفق العرضان ثم يُعاد الرسم فوراً بالقيمة الحقيقية. */
  const hasLocal = useSyncExternalStore(
    subscribeGuest,                       // يكفي أي اشتراك: القيمة تُقرأ في كل رسم
    () => !!loadUser()?.onboarded,
    () => false,
  );

  /* الشريط السفلي يظهر فقط داخل التطبيق (ليس في الصفحات العامة ولا onboarding) */
  const showNav = !isPublic && pathname !== "/onboarding";

  if (isPublic) return <>{children}</>;
  /* الزائر حالتُه محسومةٌ بذاتها: لا حساب يُنتظر ولا مراقبةَ مصادقةٍ تعمل له أصلاً،
     فلو انتظرنا `authResolved` بقي على شاشة البداية إلى الأبد. */
  const resolved = authResolved || guestMode;
  /* عائد بجلسة سابقة على نفس الجهاز: اعرض التطبيق فوراً من بياناته المحلية بينما
     يُحمَّل Firebase وتُحَلّ المصادقة في الخلفية. */
  if (!resolved) {
    if (hasLocal && !guestMode) return <>{children}{showNav && <><BottomNav /><DesktopSidebar /></>}</>;
    return <Splash />;
  }
  if (!authed) return <SignInScreen initialError={redirectErr} onGuest={enterGuestMode} />;
  if (!synced && !guestMode && !hasLocal) return <Splash label="جارٍ استرجاع بياناتك..." />;
  if (isAccountBlocked()) return <BlockedScreen />;
  if (needsOnboarding) return <Splash />;
  /* مصادَق وملفه لم يُسترجَع ولم تتأكّد حالة السحابة (قراءة فاشلة/بطيئة) → أظهر شاشة
     الاسترجاع (تُعاد المحاولة)؛ لا تَعرض لوحة فارغة ولا ترمِه إلى onboarding على «غياب» غير مؤكّد */
  if (authed && !guestMode && !syncConfirmed && !loadUser()?.onboarded) {
    return <Splash label="جارٍ استرجاع بياناتك..." />;
  }
  return <>{children}{showNav && <><BottomNav /><DesktopSidebar /></>}</>;
}
