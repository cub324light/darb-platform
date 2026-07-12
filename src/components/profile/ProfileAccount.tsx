"use client";
/* ─── الحساب — سطحٌ رفيع: البريد + خروج ───
   ليس تكراراً لنماذج الدخول/التسجيل/الحذف (تبقى في SettingsPanel عبر أيقونة الترس).
   يعرض حالة الحساب السحابي فقط ليكون «الحساب» حاضراً في البروفايل كما طلب المالك.
   يعيد استخدام cloud.ts. اشتراك onAuth غير متزامن (لا يخالف React Compiler).
   الخطوط: توكنات السلّم فقط (t-title/t-caption/t-small) — لا أحجام مباشرة. */
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

export default function ProfileAccount() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => { unsub = onAuth(setAuthUser); });
    return () => { unsub?.(); };
  }, []);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { pushBackup, signOutUser } = await import("@/lib/cloud");
      await pushBackup().catch(() => {});
      await signOutUser();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="label mb-3">الحساب</p>
      {authUser ? (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="flex-shrink-0" aria-hidden="true">☁️</span>
          <div className="min-w-0 flex-1">
            <p className="t-title truncate" style={{ color: "var(--text)" }}>
              {authUser.displayName || "حسابك"}
            </p>
            <p className="t-caption truncate" dir="ltr" style={{ color: "var(--text-muted)", textAlign: "right" }}>
              {authUser.email ?? "بياناتك محفوظة وتتزامن تلقائياً"}
            </p>
          </div>
          <button onClick={signOut} disabled={busy}
            className="t-small font-bold px-4 py-2.5 rounded-xl flex-shrink-0 transition active:scale-95 disabled:opacity-60"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            {busy ? "…" : "خروج"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="t-small" style={{ color: "var(--text-muted)" }}>
            تستخدم درب بدون حساب — سجّل الدخول من ⚙️ لحفظ بياناتك ومزامنتها.
          </p>
        </div>
      )}
    </div>
  );
}
