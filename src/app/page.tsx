"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("darb_user");
      const user = raw ? JSON.parse(raw) : null;
      if (user?.onboarded) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    } catch {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <p
          className="font-black text-5xl mb-2 text-[var(--accent-light)]"
          style={{ filter: "drop-shadow(0 0 22px color-mix(in srgb, var(--accent) 40%, transparent))" }}
        >
          درب
        </p>
        <p className="text-[var(--text-muted)] text-sm font-medium tracking-widest">YOUR PATH TO EXCELLENCE</p>
      </div>
    </div>
  );
}
