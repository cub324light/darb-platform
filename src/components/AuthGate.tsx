"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import {
  onAuth, consumeRedirectResult, initialSync, isInitialSyncDone,
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
  if (needsOnboarding) return <Splash />;
  return <>{children}</>;
}
