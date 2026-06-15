"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import {
  onAuth, consumeRedirectResult, initialSync, isInitialSyncDone,
  isAccountBlocked, signOutUser,
} from "@/lib/cloud";
import { loadUser } from "@/lib/storage";
import SignInScreen from "./SignInScreen";
import Logo from "./Logo";

/* المسارات العامة — تُعرض بدون تسجيل دخول للطالب:
   «/» و«/privacy» تسويقية، و«/admin» له حماية كلمة سر خاصة على الخادم. */
const PUBLIC_PATHS = ["/", "/privacy", "/admin"];

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
      <button onClick={() => { signOutUser().then(() => window.location.reload()); }}
        className="px-6 py-3 rounded-2xl font-bold text-sm"
        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
        تسجيل خروج
      </button>
    </div>
  );
}

/* بوابة المصادقة: الدخول إجباري لكل المسارات عدا العامة.
   تكمل دخول redirect، تراقب الحالة، وتنفّذ المزامنة الأولية مرة واحدة. */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [synced, setSynced] = useState(isInitialSyncDone());
  const [redirectErr, setRedirectErr] = useState<string | null>(null);

  /* أكمل تسجيل الدخول القادم عبر redirect (Google) */
  useEffect(() => {
    consumeRedirectResult().then((e) => { if (e) setRedirectErr(e); });
  }, []);

  /* راقب حالة المصادقة */
  useEffect(() => onAuth((u) => { setUser(u); setAuthResolved(true); }), []);

  /* المزامنة الأولية بعد ثبوت تسجيل الدخول */
  useEffect(() => {
    let cancelled = false;
    if (user && !isInitialSyncDone()) {
      initialSync().finally(() => { if (!cancelled) setSynced(true); });
    } else if (!user) {
      // defer to avoid synchronous setState in effect body
      const id = setTimeout(() => { if (!cancelled) setSynced(false); }, 0);
      return () => { cancelled = true; clearTimeout(id); };
    }
    return () => { cancelled = true; };
  }, [user]);

  /* مسجّل لكنه لم يُكمل onboarding → وجّهه لصفحة الإعداد */
  const onboarded = synced && !!user ? !!loadUser()?.onboarded : false;
  const needsOnboarding = synced && !!user && !onboarded && pathname !== "/onboarding";

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  if (isPublic) return <>{children}</>;
  if (!authResolved) return <Splash />;
  if (!user) return <SignInScreen initialError={redirectErr} />;
  if (!synced) return <Splash label="جارٍ استرجاع بياناتك..." />;
  if (isAccountBlocked()) return <BlockedScreen />;
  if (needsOnboarding) return <Splash />;
  return <>{children}</>;
}
