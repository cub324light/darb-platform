"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { loadUser, resetAll } from "@/lib/storage";
import { updateProfile, type ProfilePatch } from "@/lib/userCommands";
import { exportData } from "@/lib/dataExport";
import { EmailVerifyNotice } from "@/components/EmailVerify";
import type { User } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { readGuestMode, exitGuestMode } from "@/components/AuthGate";
import { usePref, setPref } from "@/lib/prefs";
import { useCalSystem, applyCalSystem } from "@/lib/useCalSystem";
import { restoreAllDismissed } from "@/lib/dismissed";
import { resetAllLayouts } from "@/lib/pageLayoutStore";
import { useFontScale, applyFontScale, SCALE_LABEL, type FontScale } from "@/lib/fontScale";
import { TOUR_KEY } from "@/lib/firstRun";

/* صفٌّ في «تفضيلاتك»: عنوانٌ ووصفٌ ومفتاح. شكلٌ واحد لكل الصفوف. */
function PrefRow({ title, desc, control, last }: {
  title: string; desc: string; control: React.ReactNode; last?: boolean;
}) {
  return (
    <div className="px-4 py-3.5 flex items-center justify-between gap-3"
      style={last ? undefined : { borderBottom: "1px solid var(--border)" }}>
      <div className="flex-1 min-w-0">
        <p className="font-bold t-body" style={{ color: "var(--text)" }}>{title}</p>
        <p className="t-caption mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button onClick={onToggle} role="switch" aria-checked={on} aria-label={label}
      className="w-12 h-7 rounded-full flex items-center transition px-0.5"
      style={{ background: on ? "var(--accent)" : "var(--border)", justifyContent: on ? "flex-start" : "flex-end" }}>
      <span className="w-6 h-6 rounded-full" style={{ background: "#fff" }} />
    </button>
  );
}

/* لا نستورد من cloud.ts أو firestore.ts هنا — تُحمَّل ديناميكياً عند الحاجة فقط
   حتى لا يدخل Firebase في حزمة كل صفحة عبر سلسلة: SettingsPanel ← Dome ← كل صفحة */

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(typeof window !== "undefined" ? loadUser() : null);
  const [isPrivate, setIsPrivate] = useState(false);

  /* تفضيلاتُ المنتج — مخازنُ خارجية تُقرأ بـ`useSyncExternalStore`، فلا تكسر
     الترطيب ولا تنشئ نسخةً ثانيةً من الحقيقة. */
  const calSystem = useCalSystem();
  const calBands = usePref("calBands", true);
  const calPlanBands = usePref("calPlanBands", true);
  const orbitKeep = usePref("orbitKeep", true);
  const notifyEnd = usePref("notifyEnd", true);
  const soundEnd = usePref("soundEnd", true);
  const clock24 = usePref("clock24", false);
  const fontScale = useFontScale();
  const [restored, setRestored] = useState(false);
  const [layoutsReset, setLayoutsReset] = useState(false);
  const restoreIntros = () => {
    restoreAllDismissed();
    try {
      localStorage.removeItem(TOUR_KEY);
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("darb_guide_")) localStorage.removeItem(k);
      }
    } catch { /* تجاهل */ }
    setRestored(true);
  };

  // Cloud auth state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [syncMsg, setSyncMsg] = useState("");

  /* راقب حالة المصادقة — ديناميكي لأن SettingsPanel مستورد في Dome الموجود بكل صفحة.
     والزائر لا مصادقةَ له تُراقَب: كانت هذه السطور تجلب Firebase في كل صفحةٍ يفتحها.
     نراقب فقط حين تُفتح الإعدادات، فمن أراد تسجيل الدخول وجد الحالة جاهزةً حينها. */
  useEffect(() => {
    if (readGuestMode() && !open) return;
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => {
      unsub = onAuth(setAuthUser);
    });
    return () => { unsub?.(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      const u = loadUser();
      setUser(u);
      setIsPrivate((u as (typeof u & { isPrivate?: boolean }))?.isPrivate ?? false);
    }, 0);
    return () => clearTimeout(id);
  }, [open]);

  const togglePrivacy = () => {
    if (!user) return;
    const next = !isPrivate;
    setIsPrivate(next);
    updateProfile({ isPrivate: next } as ProfilePatch);
    import("@/lib/firestore").then(({ syncUser }) => { syncUser({ isPrivate: next }); });
  };

  const submitAuth = async () => {
    setAuthErr("");
    if (!authEmail.trim() || authPass.length < 6) {
      setAuthErr("اكتب الإيميل وكلمة مرور 6 أحرف على الأقل");
      return;
    }
    setAuthBusy(true);
    try {
      const { signIn, signUp, pushBackup, pullBackup } = await import("@/lib/cloud");
      if (authMode === "signup") {
        await signUp(authEmail, authPass);
        /* صار له حسابٌ حقيقيّ ⇒ لم يعد زائراً. قبل النسخ لا بعده: مراقبةُ
           المصادقة في `AuthGate` معطّلةٌ للزائر فلن تُزيل المفتاح نيابةً عنّا،
           وبقاؤه يُبقي `CloudSync` صامتاً فلا تُحفَظ بياناته بعد اليوم. */
        exitGuestMode();
        await pushBackup();
        setSyncMsg("تم إنشاء الحساب وحفظ بياناتك ☁️");
        setAuthOpen(false);
      } else {
        await signIn(authEmail, authPass);
        exitGuestMode();   // قبل `pullBackup`: فرعُ الاسترجاع يُعيد تحميل الصفحة
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
    /* مثائلُ المحرّكات تحمل نسخةً في الذاكرة من مخازنَ مُسحت — نُسقِطها قبل
       المغادرة كي لا تُعيد كتابةَ ما مُحي إن سبق أيُّ استدعاءٍ إعادةَ التحميل. */
    import("@/lib/engineSession").then(({ resetEngineSingletons }) => resetEngineSingletons()).catch(() => {});
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
      exitGuestMode();
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
            → رجوع
          </button>
        </div>

        <p className="title-md mb-5" style={{ color: "var(--text)" }}>الإعدادات</p>

        {/* ── تفضيلاتك ──
            هذه التفضيلاتُ موجودةٌ في المنتج منذ زمن، لكن كلَّ واحدٍ منها كان
            مخبوءاً في زاويته: التقويمُ في بطاقة المدرسة، وشريطُ الفترات داخل
            التقويم، وإبقاءُ الجلسة في أسفل «تركيز». فمن لم يعثر عليه لم يعرف
            أنّه موجود. جُمعت هنا في مكانٍ واحد — ولا نظامَ جديد: كلُّ مفتاحٍ
            يكتب في المخزن نفسِه الذي يقرأ منه أصحابُه. */}
        <p className="label mb-3">تفضيلاتك</p>
        <div className="rounded-2xl mb-6 overflow-hidden" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <PrefRow
            title="التقويم"
            desc="بأيّهما تُعرض التواريخ في التقويم الدراسي"
            control={
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface)" }}>
                {([["greg", "ميلادي"], ["hijri", "هجري"]] as const).map(([v, l]) => (
                  <button key={v} onClick={() => applyCalSystem(v)} aria-pressed={calSystem === v}
                    className="px-3 py-1.5 rounded-lg t-caption font-black transition"
                    style={calSystem === v ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-muted)" }}>
                    {l}
                  </button>
                ))}
              </div>
            }
          />
          <PrefRow
            title="التقويم الدراسي على الأيام"
            desc="ظلٌّ ملوّن يبيّن أيام الدراسة والإجازات والاختبارات"
            control={<Switch on={calBands} onToggle={() => setPref("calBands", !calBands)} label="التقويم الدراسي على الأيام" />}
          />
          <PrefRow
            title="خطّتك على الأيام"
            desc="خطٌّ تحت أيام فتراتك: اختبارٌ وحده، أو فترةٌ مشتركة"
            control={<Switch on={calPlanBands} onToggle={() => setPref("calPlanBands", !calPlanBands)} label="خطّتك على الأيام" />}
          />
          <PrefRow
            title="إبقاء جلسة تركيز شغّالة"
            desc="لو طلعت لصفحة ثانية تكمل الجلسة من حيث وقفت"
            control={
              <Switch on={orbitKeep} label="إبقاء جلسة تركيز شغّالة"
                onToggle={() => {
                  const next = !orbitKeep;
                  setPref("orbitKeep", next);
                  if (!next) { try { localStorage.removeItem("darb_orbit_session"); } catch {} }
                }} />
            }
          />
          <PrefRow
            title="حجم الخطّ"
            desc="يكبّر المنتج كلَّه بنسبةٍ واحدة"
            control={
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface)" }}>
                {(["small", "normal", "large"] as FontScale[]).map((v) => (
                  <button key={v} onClick={() => applyFontScale(v)} aria-pressed={fontScale === v}
                    className="px-2.5 py-1.5 rounded-lg t-caption font-black transition"
                    style={fontScale === v ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-muted)" }}>
                    {SCALE_LABEL[v]}
                  </button>
                ))}
              </div>
            }
          />
          <PrefRow
            title="الساعة بنظام ٢٤"
            desc={clock24 ? "١٤:٣٠" : "٢:٣٠ م"}
            control={<Switch on={clock24} onToggle={() => setPref("clock24", !clock24)} label="الساعة بنظام ٢٤" />}
          />
          <PrefRow
            title="تنبيه انتهاء جلسة التركيز"
            desc="إشعارٌ من النظام لو كنت في تطبيقٍ آخر"
            control={<Switch on={notifyEnd} onToggle={() => setPref("notifyEnd", !notifyEnd)} label="تنبيه انتهاء الجلسة" />}
          />
          <PrefRow
            title="صوت انتهاء الجلسة"
            desc="نغمةٌ قصيرة عند انتهاء التركيز أو الراحة"
            control={<Switch on={soundEnd} onToggle={() => setPref("soundEnd", !soundEnd)} label="صوت انتهاء الجلسة" />}
          />
          <PrefRow
            title="الشروحات والبطاقات التعريفية"
            desc={restored ? "رجعت — ستراها في زياراتك القادمة" : "أعِد إظهار ما أغلقته من شروحات الصفحات وبطاقاتها"}
            control={
              <button onClick={restoreIntros} disabled={restored}
                className="px-3.5 py-2 rounded-xl t-caption font-black transition active:scale-95 disabled:opacity-60"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                {restored ? "رجعت ✓" : "أعِدها"}
              </button>
            }
            last
          />
        </div>

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
                type="password" dir="ltr" placeholder="كلمة المرور (6 أحرف+)"
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

        {/* الاختبارات تُدار في «مساري» — المصدر الواحد. لا محرّر مسارات هنا (لا نظامين). */}
        <p className="label mb-3">اختباراتك</p>
        <a href="/roadmap" className="rounded-2xl px-4 py-3.5 mb-6 flex items-center gap-3 no-underline"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <span className="text-[22px]" aria-hidden="true">🗺️</span>
          <span className="flex-1 text-right">
            <span className="block font-bold text-[16px] text-[var(--text)]">أدِر اختباراتك من «مساري»</span>
            <span className="block text-[14px] text-[var(--text-muted)]">أضِف اختباراتك واحذفها وتابع تقدّمها هناك</span>
          </span>
          <span className="text-[var(--accent-light)]">←</span>
        </a>

        {/* ── الاشتراك وسند ──
            مكانُ الاشتراك: **الإعدادات** (متاحةٌ من كل صفحة) و**بطاقةُ الباقة في
            ملفك**. لا نضع زرَّ ترقيةٍ في كل زاوية: منتَجٌ يطلب المال في كل شاشةٍ
            يفقد ثقةَ من يذاكر فيه. */}
        <p className="label mb-3">الاشتراك</p>
        <a href="/pricing"
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-2 no-underline transition"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <span className="text-[20px]" aria-hidden="true">✦</span>
          <span className="flex-1 text-right">
            <span className="block font-bold text-[16px] text-[var(--text)]">باقتك والأسعار</span>
            <span className="block text-[14px] text-[var(--text-muted)]">شاهين وعنقاء — وما الذي يفتحه كلٌّ منهما</span>
          </span>
          <span className="text-[var(--accent-light)]">←</span>
        </a>
        <a href="/sanad"
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-6 no-underline transition"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <span className="text-[20px]" aria-hidden="true">🤝</span>
          <span className="flex-1 text-right">
            <span className="block font-bold text-[16px] text-[var(--text)]">سند — لوليّ أمرك</span>
            <span className="block text-[14px] text-[var(--text-muted)]">ملخّصٌ أسبوعيّ بإذنك، وتفصله متى شئت</span>
          </span>
          <span className="text-[var(--success)]">←</span>
        </a>

        {/* تخصيص الصفحات — كان هذا القسم يَعِد بزرٍّ حُذف من الرئيسية، فصار
            الوعدُ مكذوباً. الزرُّ رجع، وفي كلّ صفحةٍ لا في الرئيسية وحدها. */}
        <p className="label mb-3">تخصيص الصفحات</p>
        <div className="rounded-2xl px-4 py-3.5 mb-3"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p className="t-small font-semibold leading-relaxed" style={{ color: "var(--text-muted)" }}>
            في أعلى كل صفحة زرُّ «✥ تخصيص»: رتّب أقسامها وأخفِ ما لا يعنيك.
            و«تركيز» و«أخطائي» بلا تخصيص — الأولى شاشةُ مؤقّت، والثانية سجلٌّ ترتيبُه زمنيّ.
          </p>
        </div>
        <button onClick={() => { resetAllLayouts(); setLayoutsReset(true); }}
          className="w-full py-3 rounded-2xl t-small font-bold transition mb-6"
          style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
          {layoutsReset ? "رجعت كل الصفحات لترتيبها الأصلي ✓" : "أعِد ترتيب كل الصفحات الأصليّ"}
        </button>

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
