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
    <div className="min-h-dvh bg-[var(--bg)] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4" style={{ filter: "drop-shadow(0 0 20px rgba(37,99,235,0.4))" }}>🦅</div>
        <p className="text-[var(--text-muted)] text-base font-medium">درب</p>
      </div>
    </div>
  );
}
