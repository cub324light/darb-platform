"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import {
  onAuth, consumeRedirectResult, initialSync, isInitialSyncDone,
} from "@/lib/cloud";
import { loadUser } from "@/lib/storage";
import SignInScreen from "./SignInScreen";

/* المسارات العامة — تُعرض بدون تسجيل دخول للطالب:
   «/» و«/privacy» تسويقية، و«/admin» له حماية كلمة سر خاصة على الخادم. */
const PUBLIC_PATHS = ["/", "/privacy", "/admin"];

function Splash({ label }: { label?: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 relative z-[1]">
      <p className="font-black text-5xl"
        style={{ color: "var(--text)", letterSpacing: "-1px", filter: "drop-shadow(0 0 22px color-mix(in srgb, var(--accent) 45%, transparent))" }}>
        درب
      </p>
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

  /* أكمل تسجيل الدخول القادم عبر redirect (Google/Apple) */
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
    } else if (user && isInitialSyncDone()) {
      setSynced(true);
    } else if (!user) {
      setSynced(false);
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
