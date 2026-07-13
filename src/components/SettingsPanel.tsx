"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TRACKS, TRACK_GROUPS, LANGUAGE_TESTS, trackEligibilityFor, type TrackId } from "@/lib/tracks";
import { examBoard, type BoardStage, type ExamBoardId } from "@/lib/examEligibility";
import { currentRegistrationStatus } from "@/lib/examProvider";
import { isAfterFirstTerm } from "@/lib/academicCalendar";
import { loadUser, saveUser, resetAll } from "@/lib/storage";

/* بطاقة اختبار القياس (قدرات/تحصيلي/مبكر) ↔ معرّف examBoard */
const QIYAS_EXAM_TRACK: Record<ExamBoardId, TrackId> = {
  qudurat: "قدرات", tahsiliEarly: "تحصيلي مبكر", tahsiliRegular: "تحصيلي",
};
const QIYAS_IDS: TrackId[] = ["قدرات", "تحصيلي", "تحصيلي مبكر"];
import { exportData } from "@/lib/dataExport";
import { EmailVerifyNotice } from "@/components/EmailVerify";
import type { User } from "firebase/auth";
import type { FirebaseError } from "firebase/app";

/* لا نستورد من cloud.ts أو firestore.ts هنا — تُحمَّل ديناميكياً عند الحاجة فقط
   حتى لا يدخل Firebase في حزمة كل صفحة عبر سلسلة: SettingsPanel ← Dome ← كل صفحة */

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(typeof window !== "undefined" ? loadUser() : null);
  const [activeTracksState, setActiveTracksState] = useState<TrackId[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);

  // Cloud auth state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [syncMsg, setSyncMsg] = useState("");

  /* راقب حالة المصادقة — ديناميكي لأن SettingsPanel مستورد في Dome الموجود بكل صفحة */
  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => {
      unsub = onAuth(setAuthUser);
    });
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      const u = loadUser();
      setUser(u);
      setActiveTracksState(u?.activeTracks ?? (u?.track ? [u.track] : []));
      setIsPrivate((u as (typeof u & { isPrivate?: boolean }))?.isPrivate ?? false);
    }, 0);
    return () => clearTimeout(id);
  }, [open]);

  const toggleActiveTrack = (id: TrackId) => {
    if (!user) return;
    const prev = activeTracksState;
    /* لا حدّ عددي — الأهلية (examEligibility) هي البوّابة الوحيدة للإضافة */
    const next = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id];
    if (next === prev) return;
    const primaryTrack = next[0] ?? user.track;
    if (primaryTrack !== user.track &&
        !confirm("تغيير مسارك الأساسي يبدّل خريطتك وأولوياتك. متأكد؟")) return;
    const updated = { ...user, track: primaryTrack, activeTracks: next };
    saveUser(updated);
    setUser(updated);
    setActiveTracksState(next);
    import("@/lib/firestore").then(({ syncUser }) => { syncUser({ track: primaryTrack }); });
  };

  const togglePrivacy = () => {
    if (!user) return;
    const next = !isPrivate;
    setIsPrivate(next);
    const updated = { ...user, isPrivate: next } as typeof user & { isPrivate: boolean };
    saveUser(updated as typeof user);
    import("@/lib/firestore").then(({ syncUser }) => { syncUser({ isPrivate: next }); });
  };

  const submitAuth = async () => {
    setAuthErr("");
    if (!authEmail.trim() || authPass.length < 6) {
      setAuthErr("اكتب الإيميل وكلمة مرور ٦ أحرف على الأقل");
      return;
    }
    setAuthBusy(true);
    try {
      const { signIn, signUp, pushBackup, pullBackup, authErrorMsg } = await import("@/lib/cloud");
      if (authMode === "signup") {
        await signUp(authEmail, authPass);
        await pushBackup();
        setSyncMsg("تم إنشاء الحساب وحفظ بياناتك ☁️");
        setAuthOpen(false);
      } else {
        await signIn(authEmail, authPass);
        const { restored } = await pullBackup();
        if (restored) { window.location.reload(); return; }
        await pushBackup();
        setSyncMsg("تم تسجيل الدخول ☁️");
        setAuthOpen(false);
      }
      setAuthPass("");
    } catch (e) {
      const { authErrorMsg } = await import("@/lib/cloud");
      setAuthErr(authErrorMsg((e as FirebaseError)?.code ?? ""));
    } finally {
      setAuthBusy(false);
    }
  };

  const manualSync = async () => {
    setSyncMsg("جارٍ الحفظ…");
    const { pushBackup } = await import("@/lib/cloud");
    const ok = await pushBackup();
    setSyncMsg(ok ? "تم الحفظ في السحابة ✓" : "تعذّر الحفظ — تأكد من الاتصال");
  };

  const doSignOut = async () => {
    const { pushBackup, signOutUser } = await import("@/lib/cloud");
    await pushBackup();
    await signOutUser();
    setSyncMsg("");
  };

  const reset = () => {
    if (!confirm("متأكد؟ راح ينمسح كل شيء وتبدأ من الصفر.")) return;
    resetAll();
    window.location.href = "/onboarding";
  };

  const [deleting, setDeleting] = useState(false);
  const deleteAccount = async () => {
    if (!confirm("هذا يحذف حسابك وكل بياناتك نهائياً — الجلسات والخطط والأخطاء والتقدّم. لا يمكن التراجع. متأكد؟")) return;
    if (!confirm("تأكيد أخير: سيُحذف كل شيء ولا يمكن استرجاعه. احذف الحساب؟")) return;
    setDeleting(true);
    try {
      if (authUser) {
        const { authedFetch } = await import("@/lib/authFetch");
        const res = await authedFetch("/api/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "delete" }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { alert(d.error ?? "تعذّر حذف الحساب"); setDeleting(false); return; }
        const { signOutUser } = await import("@/lib/cloud");
        await signOutUser().catch(() => {});
      }
      resetAll();
      try { localStorage.removeItem("darb_guest_mode"); } catch {}
      window.location.href = "/";
    } catch {
      alert("تعذّر الاتصال — حاول لاحقاً");
      setDeleting(false);
    }
  };

  const modal = open && typeof document !== "undefined" && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center"
      role="dialog" aria-modal="true" aria-label="الإعدادات"
      onClick={() => setOpen(false)}
      onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <div className="absolute inset-0 bg-black/55 fade-in" />
      <div
        className="relative w-full max-w-lg rounded-t-3xl p-6 pb-10 slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "none", maxHeight: "82vh", overflowY: "auto", overscrollBehavior: "contain" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="w-10 h-1.5 rounded-full bg-[var(--border)]" />
          <button
            onClick={() => setOpen(false)}
            className="text-[19px] font-bold px-3 py-1.5 rounded-xl"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
          >
            رجوع ←
          </button>
        </div>

        <p className="title-md mb-5" style={{ color: "var(--text)" }}>الإعدادات</p>

        {/* الخصوصية */}
        <p className="label mb-3">الخصوصية</p>
        <div className="rounded-2xl px-4 py-4 mb-6 flex items-center justify-between gap-3"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <div className="min-w-0">
            <p className="font-bold text-[17px]" style={{ color: "var(--text)" }}>بروفايل خاص</p>
            <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
              {isPrivate ? "لا يظهر للآخرين عند البحث" : "يمكن للآخرين رؤية بروفايلك"}
            </p>
          </div>
          <button
            onClick={togglePrivacy}
            className="px-4 py-2.5 rounded-xl font-black text-[16px] flex-shrink-0 transition active:scale-95"
            style={isPrivate
              ? { background: "#EF4444", color: "#fff", border: "1.5px solid #EF4444" }
              : { background: "transparent", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}>
            {isPrivate ? "خاص ●" : "عام"}
          </button>
        </div>

        {/* الحساب السحابي */}
        <p className="label mb-3">حسابك السحابي</p>
        <div className="mb-6">
          {authUser ? (
            <div className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">☁️</span>
                <p className="font-bold text-[17px] text-[var(--text)] truncate flex-1">{authUser.displayName || authUser.email}</p>
              </div>
              <p className="text-[15px] text-[var(--text-muted)] mb-3">
                {authUser.email ? `${authUser.email} · ` : ""}بياناتك محفوظة وتتزامن تلقائياً
              </p>
              {/* حالة توثيق البريد — Google موثّق تلقائياً */}
              {authUser.emailVerified ? (
                <p className="text-[14px] font-bold mb-3" style={{ color: "var(--success)" }}>✓ بريدك موثّق</p>
              ) : (
                <div className="mb-3">
                  <EmailVerifyNotice message="بريدك غير موثّق — وثّقه للمشاركة في المجتمع" />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={manualSync} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                  احفظ الآن
                </button>
                <button onClick={doSignOut} className="px-4 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  خروج
                </button>
              </div>
              {syncMsg && <p className="text-[15px] mt-2 font-semibold" style={{ color: "var(--accent-light)" }}>{syncMsg}</p>}
            </div>
          ) : authOpen ? (
            <div className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setAuthMode("signup"); setAuthErr(""); }}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition"
                  style={authMode === "signup"
                    ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
                    : { background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  حساب جديد
                </button>
                <button onClick={() => { setAuthMode("signin"); setAuthErr(""); }}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition"
                  style={authMode === "signin"
                    ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
                    : { background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  تسجيل دخول
                </button>
              </div>
              <input
                type="email" inputMode="email" dir="ltr" placeholder="الإيميل"
                value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-base text-[var(--text)] outline-none mb-2 text-left"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              />
              <input
                type="password" dir="ltr" placeholder="كلمة المرور (٦ أحرف+)"
                value={authPass} onChange={(e) => setAuthPass(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitAuth(); }}
                className="w-full rounded-xl px-4 py-3 text-base text-[var(--text)] outline-none mb-2 text-left"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
              />
              {authErr && <p className="text-[15px] mb-2 font-semibold" style={{ color: "var(--danger)" }}>{authErr}</p>}
              <div className="flex gap-2">
                <button onClick={submitAuth} disabled={authBusy}
                  className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
                  {authBusy ? "…" : authMode === "signup" ? "أنشئ الحساب" : "دخول"}
                </button>
                <button onClick={() => { setAuthOpen(false); setAuthErr(""); }}
                  className="px-4 rounded-xl text-sm font-bold" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setAuthOpen(true); setAuthMode("signup"); }}
              className="w-full rounded-2xl p-4 text-right flex items-center gap-3"
              style={{ background: "var(--surface2)", border: "1.5px dashed var(--accent)" }}>
              <span className="text-2xl">☁️</span>
              <span className="flex-1">
                <span className="block font-bold text-[17px] text-[var(--text)]">سجّل دخولك واحفظ بياناتك</span>
                <span className="block text-[15px] text-[var(--text-muted)]">عشان ما تروح لو غيّرت الجهاز</span>
              </span>
              <span className="text-[var(--accent-light)]">←</span>
            </button>
          )}
        </div>

        {/* الاختبارات — البوّابة الوحيدة examEligibility، بلا حدّ عددي.
            قياس: يظهر ما تسمح به المرحلة/النافذة/الهدف · اللغات: دائماً بلا حدّ ·
            برامج القبول: حسب أهلية القبول · المدرسة قسم مستقل (ليست هنا). */}
        <p className="label mb-3">اختباراتك</p>
        <div className="flex flex-col gap-3.5 mb-6">
          {(() => {
            const g = user?.grade;
            const stage: BoardStage | null =
              user?.studyLevel === "جامعي" ? "university"
              : user?.studyLevel === "خريج" ? "graduate"
              : g === "أول ثانوي" ? "first" : g === "ثاني ثانوي" ? "second" : g === "ثالث ثانوي" ? "third" : null;
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const isTargeted = !!(user?.targets?.length || user?.goals?.some((x) => x === "tahsili" || x === "university" || x === "major"));
            const board = stage ? examBoard({
              stage, isUniGrad: user?.gradStage === "خريج جامعة",
              afterFirstTerm: isAfterFirstTerm(), isTargeted,
              windows: {
                qudurat: currentRegistrationStatus("قدرات", today),
                tahsiliEarly: currentRegistrationStatus("تحصيلي مبكر", today),
                tahsiliRegular: currentRegistrationStatus("تحصيلي", today),
              },
            }) : [];
            const qiyasHint = new Map(board.map((e) => [QIYAS_EXAM_TRACK[e.id], e.hint] as const));
            const elig = stage ? trackEligibilityFor({ status: user?.studyLevel, grade: user?.grade, gradStage: user?.gradStage }) : [];
            const showTrack = (id: TrackId): boolean =>
              QIYAS_IDS.includes(id) ? qiyasHint.has(id)
              : LANGUAGE_TESTS.includes(id) ? true
              : elig.some((e) => e.id === id && e.status === "available");

            const groups = TRACK_GROUPS.map((grp) => ({ label: grp.label, ids: grp.ids.filter(showTrack) })).filter((grp) => grp.ids.length);
            if (!groups.length) return (
              <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>لا اختبارات في مرحلتك الآن — ركّز على المدرسة وأساسك.</p>
            );

            return groups.map((grp) => (
              <div key={grp.label}>
                <p className="text-[11px] font-black tracking-widest mb-2 px-0.5" style={{ color: "var(--text-muted)" }}>
                  ── {grp.label} ──
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {grp.ids.map((id) => {
                    const t = TRACKS.find((tr) => tr.id === id)!;
                    const selected = activeTracksState.includes(id);
                    const hint = qiyasHint.get(id);
                    return (
                      <button key={t.id} onClick={() => toggleActiveTrack(t.id)}
                        className="rounded-xl p-3 text-right transition active:scale-[0.98] relative"
                        style={{
                          background: selected ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface2)",
                          border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                        }}>
                        {selected && <span className="absolute top-2 left-2.5 text-[var(--accent-light)] text-sm font-black">✓</span>}
                        <p className="font-bold text-[16px] text-[var(--text)]">{t.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{hint ?? t.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* تخصيص الصفحة الرئيسية */}
        <p className="label mb-3">تخصيص الصفحة الرئيسية</p>
        <div className="rounded-2xl px-4 py-3.5 mb-6"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p className="text-[16px] font-semibold leading-relaxed" style={{ color: "var(--text-muted)" }}>
            التخصيص من الصفحة الرئيسية مباشرة — اضغط «تخصيص»، سحب الأقسام وإعادة ترتيبها وإخفاءها.
          </p>
        </div>

        {/* لوحة الإدارة — للمشرف فقط */}
        {authUser?.email === "cublight231@gmail.com" && (
          <a href="/admin"
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 mb-3"
            style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
            🛡 لوحة الإدارة
          </a>
        )}

        {/* بياناتك وحسابك */}
        <p className="label mb-3">بياناتك وحسابك</p>
        <button onClick={exportData}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 mb-3"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
          ⬇️ تصدير بياناتي (JSON)
        </button>

        <button onClick={reset} className="w-full py-3.5 rounded-2xl text-sm font-bold transition mb-3"
          style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "var(--danger)" }}>
          إعادة الضبط من الصفر
        </button>

        <button onClick={deleteAccount} disabled={deleting}
          className="w-full py-3.5 rounded-2xl text-sm font-black transition disabled:opacity-50"
          style={{ background: "#EF4444", border: "1.5px solid #EF4444", color: "#fff" }}>
          {deleting ? "جارٍ الحذف…" : "حذف الحساب نهائياً"}
        </button>
        <p className="text-[14px] mt-2 px-1" style={{ color: "var(--text-muted)" }}>
          «إعادة الضبط» تمسح بيانات هذا الجهاز فقط. «حذف الحساب» يمسح حسابك السحابي وكل بياناتك نهائياً.
        </p>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-icon" aria-label="الإعدادات">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="w-6 h-6">
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      {modal}
    </>
  );
}
