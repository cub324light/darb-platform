"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Stars from "@/components/Stars";

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
    <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <Stars />
      <div className="page-wrap text-center">
        <p className="font-black text-5xl" style={{ color: "var(--blue)" }}>درب</p>
        <p className="text-sm mt-2 font-semibold" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
          YOUR PATH TO EXCELLENCE
        </p>
      </div>
    </div>
  );
}
