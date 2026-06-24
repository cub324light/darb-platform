"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import dynamic from "next/dynamic";
import { isInitialSyncDone, isAccountBlocked } from "@/lib/cloudFlags";
import { loadUser } from "@/lib/storage";
import Logo from "./Logo";
import BottomNav from "./BottomNav";

/* المسارات العامة — تُعرض بدون تسجيل دخول للطالب:
   «/» و«/privacy» تسويقية، و«/admin» له حماية كلمة سر خاصة على الخادم. */
const PUBLIC_PATHS = ["/", "/privacy", "/admin"];

/* تحميل SignInScreen ديناميكياً — يُبعدها وما تستورده من Firebase عن الحزمة المبدئية.
   المستخدمون العائدون لا يحتاجون شاشة الدخول على الإطلاق. */
const SignInScreen = dynamic(() => import("./SignInScreen"), { ssr: false });

function Splash({ label }: { label?: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 relative z-[1]">
      <Logo className="font-black text-5xl" style={{ letterSpacing: "-1px" }} />
      {label && <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>}
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
        <p className="text-[14px] leading-relaxed max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
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

/* بوابة المصادقة: الدخول إجباري لكل المسارات عدا العامة.
   تكمل دخول redirect، تراقب الحالة، وتنفّذ المزامنة الأولية مرة واحدة.
   Firebase تُحمَّل ديناميكياً بعد أول render — المستخدم العائد يرى المحتوى فوراً
   بينما تُحَلّ المصادقة في الخلفية (stale-while-revalidate). */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [synced, setSynced] = useState(isInitialSyncDone());
  const [redirectErr, setRedirectErr] = useState<string | null>(null);
  /* وضع الزائر — يتجاوز تسجيل الدخول ويحفظ البيانات محلياً فقط */
  const [guestMode, setGuestMode] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("darb_guest_mode") === "1"
  );

  const enterGuestMode = () => {
    try { localStorage.setItem("darb_guest_mode", "1"); } catch {}
    setGuestMode(true);
  };

  /* أكمل تسجيل الدخول القادم عبر redirect (Google) */
  useEffect(() => {
    import("@/lib/cloud").then(({ consumeRedirectResult }) => {
      consumeRedirectResult().then((e) => { if (e) setRedirectErr(e); });
    });
  }, []);

  /* راقب حالة المصادقة — عند الدخول بحساب حقيقي نلغي وضع الزائر */
  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => {
      unsub = onAuth((u) => {
        setUser(u);
        setAuthResolved(true);
        if (u) {
          try { localStorage.removeItem("darb_guest_mode"); } catch {}
          setGuestMode(false);
        }
      });
    });
    return () => { unsub?.(); };
  }, []);

  /* المزامنة الأولية بعد ثبوت تسجيل الدخول */
  useEffect(() => {
    let cancelled = false;
    if (user && !isInitialSyncDone()) {
      import("@/lib/cloud").then(({ initialSync }) => {
        if (!cancelled) {
          initialSync().finally(() => { if (!cancelled) setSynced(true); });
        }
      });
    } else if (!user) {
      const id = setTimeout(() => { if (!cancelled) setSynced(false); }, 0);
      return () => { cancelled = true; clearTimeout(id); };
    }
    return () => { cancelled = true; };
  }, [user]);

  /* مسجّل لكنه لم يُكمل onboarding → وجّهه لصفحة الإعداد */
  const authed = !!user || guestMode;
  const onboarded = (synced || guestMode) && authed ? !!loadUser()?.onboarded : false;
  const needsOnboarding = (synced || guestMode) && authed && !onboarded && pathname !== "/onboarding";

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  /* بيانات محلية جاهزة من جلسة سابقة (نفس الجهاز) — نعرض التطبيق فوراً
     والمزامنة تكمل في الخلفية (stale-while-revalidate)، فلا شاشة تحميل
     لكل العائدين. ننتظر السحابة فقط لو ما فيه نسخة محلية (جهاز جديد). */
  const hasLocal = typeof window !== "undefined" && !!loadUser()?.onboarded;

  /* الشريط السفلي يظهر فقط داخل التطبيق (ليس في الصفحات العامة ولا onboarding) */
  const showNav = !isPublic && pathname !== "/onboarding";

  if (isPublic) return <>{children}</>;
  /* عائد بجلسة سابقة على نفس الجهاز: اعرض التطبيق فوراً من بياناته المحلية بينما
     يُحمَّل Firebase وتُحَلّ المصادقة في الخلفية. */
  if (!authResolved) {
    if (hasLocal && !guestMode) return <>{children}{showNav && <BottomNav />}</>;
    return <Splash />;
  }
  if (!authed) return <SignInScreen initialError={redirectErr} onGuest={enterGuestMode} />;
  if (!synced && !guestMode && !hasLocal) return <Splash label="جارٍ استرجاع بياناتك..." />;
  if (isAccountBlocked()) return <BlockedScreen />;
  if (needsOnboarding) return <Splash />;
  return <>{children}{showNav && <BottomNav />}</>;
}
