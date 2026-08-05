"use client";
/* ─── الملف الشخصي — بسيطٌ عمداً: الهوية + الإنجازات + الإعدادات (والحساب) ───
   ليس Dashboard: الإحصائيات/التقدم مكانها الرئيسية، والأهداف/النتائج/مؤشّر الرضا
   مكانها «خطتي» /plan. هنا فقط: مَن أنت (الترويسة)، إنجازاتك، وإعداداتك وحسابك. */
import { useEffect, useMemo, useState } from "react";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import NextThread from "@/components/NextThread";
import { phaseIdOf, phaseAllows } from "@/lib/transition";
import {
  loadUser, saveUser, loadStats, ensureJoinDate,
  type DarbUser, type DarbStats,
} from "@/lib/storage";
import { getTrack } from "@/lib/tracks";
import { getPlan } from "@/lib/plan";
import type { PlanId } from "@/lib/types";
import Link from "next/link";
import { computeXP, getLevel, getUnlockedBadgeIds, BADGE_DEFS } from "@/lib/xp";
import { claimLevelRewards } from "@/lib/levelRewards";
import { n } from "@/lib/format";

import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfilePreferences from "@/components/profile/ProfilePreferences";
import ProfileExtra from "@/components/profile/ProfileExtra";
import ProfileAccount from "@/components/profile/ProfileAccount";
import GuardianLink from "@/components/sanad/GuardianLink";
import { readGuestMode } from "@/components/AuthGate";

function fmtJoin(d: string): string {
  try { return "انضم " + new Date(d + "T12:00:00").toLocaleDateString("ar-u-nu-latn", { year: "numeric", month: "long" }); }
  catch { return d; }
}

function readVaultCount(): number {
  if (typeof window === "undefined") return 0;
  try { const v = JSON.parse(localStorage.getItem("darb_vault") ?? "[]"); return Array.isArray(v) ? v.length : 0; }
  catch { return 0; }
}

/* الأربعةُ القائمة — لا ميزةَ جديدة. `examOnly` للأرينا وحدها (مبارياتٌ بالمسار). */
const COMMUNITY: { href: string; icon: string; label: string; desc: string; examOnly?: boolean }[] = [
  { href: "/council", label: "المجلس", icon: "🏛️", desc: "أسئلةُ الطلاب وأجوبتهم" },
  { href: "/challenges", label: "التحديات", icon: "🎯", desc: "مهامٌّ تكسب بها فضّة" },
  { href: "/leaderboard", label: "لوحة الشرف", icon: "🏆", desc: "ترتيبُ الطلاب" },
  { href: "/arena", label: "الأرينا", icon: "⚔️", desc: "مبارياتُ اختبارك", examOnly: true },
];

export default function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>(() => {
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t === "info" || t === "prefs") return t;
    }
    return "info";
  });

  /* جزاءُ المستوى — فضّةٌ ولقبٌ يُمنحان عند بلوغه. مؤجَّلٌ خطوةً بعد الرسم:
     ضبطُ الحالة داخل الأثر مباشرةً يُسلسل رسماتٍ متتالية. */
  const [levelUp, setLevelUp] = useState<{ silver: number; titles: string[] } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const r = claimLevelRewards();
      if (r.levels.length) setLevelUp({ silver: r.silver, titles: r.titles });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  /* توست نجاح الحفظ — يظهر ثانيتين ثم يختفي (يُقرأ من ?saved=1 بعد الرجوع من صفحة التعديل) */
  const [savedToast, setSavedToast] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("saved") === "1");
  useEffect(() => {
    if (!savedToast) return;
    try { window.history.replaceState(null, "", "/profile?tab=info"); } catch {}
    const id = setTimeout(() => setSavedToast(false), 2000);
    return () => clearTimeout(id);
  }, [savedToast]);

  /* تهيئة كسولة SSR-safe (لا setState متزامن في effect — يوافق React Compiler) */
  const [user, setUser] = useState<DarbUser | null>(() => (typeof window !== "undefined" ? loadUser() : null));
  const [stats] = useState<DarbStats | null>(() => (typeof window !== "undefined" ? loadStats() : null));
  const [phase] = useState(() => (typeof window !== "undefined" ? phaseIdOf(loadUser()) : null));
  const [vaultCount] = useState(() => readVaultCount());
  const [joinDate] = useState(() => (typeof window !== "undefined" ? ensureJoinDate() : ""));
  const [planId] = useState<PlanId>(() => (typeof window !== "undefined" ? getPlan() : "free"));
  const [isPrivate, setIsPrivate] = useState(() =>
    typeof window !== "undefined" ? ((loadUser() as (DarbUser & { isPrivate?: boolean }))?.isPrivate ?? false) : false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  /* صورة Google (إن وُجدت) — والزائر بلا حسابٍ فبلا صورة: لا نجلب Firebase لنعرف ذلك */
  useEffect(() => {
    if (readGuestMode()) return;
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => { unsub = onAuth((u) => setPhotoURL(u?.photoURL ?? null)); });
    return () => { unsub?.(); };
  }, []);

  /* ── مشتقّات مذكَّرة ── */
  const xp = useMemo(() => (stats ? computeXP(stats) : 0), [stats]);
  const level = useMemo(() => getLevel(xp), [xp]);
  const unlockedIds = useMemo(() => new Set(stats ? getUnlockedBadgeIds(stats, vaultCount) : []), [stats, vaultCount]);

  /* ── أفعال التحرير ── */
  const updateUser = (partial: Partial<DarbUser>) => {
    setUser((prev) => {
      const next = { ...(prev as DarbUser), ...partial };
      saveUser(next);
      if (partial.name !== undefined) import("@/lib/firestore").then(({ syncUser }) => { syncUser({ name: next.name }); });
      return next;
    });
  };
  const togglePrivacy = () => {
    setIsPrivate((prev) => {
      const next = !prev;
      if (user) { const u = { ...user, isPrivate: next } as DarbUser; saveUser(u); }
      import("@/lib/firestore").then(({ syncUser }) => { syncUser({ isPrivate: next }); });
      return next;
    });
  };

  const header = (
    <Dome compact>
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="title-lg grad-title">ملفي</h1>
      </div>
    </Dome>
  );

  if (!user || !stats) {
    return <div className="min-h-dvh pb-nav">{header}<ProfileSkeleton /></div>;
  }

  return (
    <div className="min-h-dvh pb-nav desk-wide">
      {savedToast && (
        <div className="fixed top-4 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none" role="status" aria-live="polite">
          <div className="slide-up pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5"
            style={{ background: "color-mix(in srgb, var(--success) 16%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--success) 48%, var(--border))", boxShadow: "0 10px 30px rgba(0,0,0,0.28)" }}>
            <span className="text-[17px] leading-none">✅</span>
            <span className="t-body font-black" style={{ color: "var(--text)" }}>تم حفظ معلوماتك بنجاح</span>
          </div>
        </div>
      )}
      {header}
      <div className="profile-shell px-5 py-5 max-w-lg mx-auto flex flex-col gap-5">
        <ProfileHeader
          user={user} track={getTrack(user.track)} level={level} xp={xp}
          joinLabel={joinDate ? fmtJoin(joinDate) : ""} planId={planId} photoURL={photoURL}
          onUserChange={updateUser}
        />

        {levelUp && (
          <div className="ds-card rise flex items-start gap-3"
            style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, var(--border))" }}>
            <span className="text-[22px] flex-shrink-0" aria-hidden="true">🎖️</span>
            <p className="t-body font-black flex-1 min-w-0 leading-relaxed" style={{ color: "var(--text)" }}>
              {levelUp.titles.length > 0 && <>وصلتَ لقب «{levelUp.titles[levelUp.titles.length - 1]}» — </>}
              <span className="font-mono-nums">+{n(levelUp.silver)}</span> فضة في محفظتك.
            </p>
            <button onClick={() => setLevelUp(null)} className="t-caption font-bold px-2" style={{ color: "var(--text-muted)" }}>✕</button>
          </div>
        )}

        {/* الإنجازات صفحةٌ قائمةٌ بذاتها الآن — وهذه بوّابتُها بأرقامها الحقيقية */}
        <Link href="/profile/achievements"
          className="ds-card ds-card-interactive flex items-center gap-3 no-underline"
          style={{ ["--tint" as string]: "var(--gold)" }}>
          <span className="w-11 h-11 rounded-2xl grid place-items-center text-[20px] flex-shrink-0"
            style={{ background: "color-mix(in srgb, var(--gold) 14%, var(--surface2))" }} aria-hidden="true">🏆</span>
          <span className="flex-1 min-w-0">
            <span className="block t-title font-black" style={{ color: "var(--text)" }}>إنجازاتك</span>
            <span className="block t-caption" style={{ color: "var(--text-muted)" }}>
              {n(unlockedIds.size)} من {n(BADGE_DEFS.length)} شارة — وفيها فضّةٌ تُصرف
            </span>
          </span>
          <span className="t-body font-black flex-shrink-0" style={{ color: "var(--accent-light)" }}>←</span>
        </Link>

        {/* ═══ المجتمع والتحديات ═══
            ▓ العطل: «المجلس» و«الأرينا» و«لوحة الشرف» و«التحديات» ألفٌ وثلاثمئةُ
            سطرٍ مبنيّة، ورابطُها الوحيد في المشروع كلِّه هو **الشريط الجانبيّ
            للحاسب**. ودربُ جوّالٌ أوّلاً — فأربعُ ميزاتٍ كاملةٍ لا يصلها الطالب.
            هذا مدخلُها على الجوال، بمكوّنات الصفحة نفسِها ولا شيء جديد.
            ▓ و«الأرينا» مبارياتُ اختباراتٍ تُوزَّع بمسار الطالب (`trackId`)، فلا
            تُعرض لمن تجاوز مرحلة القياس — بالبوابة نفسِها لا بشرطٍ ثانٍ. */}
        <section className="flex flex-col gap-2.5">
          <p className="eyebrow px-0.5" style={{ color: "var(--text-muted)" }}>المجتمع والتحديات</p>
          <div className="grid grid-cols-2 gap-2.5">
            {COMMUNITY.filter((c) => !c.examOnly || phaseAllows(phase, "secondary-study")).map((c) => (
              <Link key={c.href} href={c.href}
                className="ds-card ds-card-tight ds-card-interactive flex items-center gap-2.5 no-underline">
                <span className="text-[20px] flex-shrink-0" aria-hidden="true">{c.icon}</span>
                <span className="flex flex-col min-w-0">
                  <span className="t-body font-black leading-tight" style={{ color: "var(--text)" }}>{c.label}</span>
                  <span className="t-caption truncate" style={{ color: "var(--text-muted)" }}>{c.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <ProfileTabs active={tab} onChange={setTab} />

        {tab === "info" && (
          <div id="profile-panel-info" role="tabpanel" aria-labelledby="profile-tab-info" className="profile-tab-panel">
            <ProfileExtra />
          </div>
        )}

        {tab === "prefs" && (
          <div id="profile-panel-prefs" role="tabpanel" aria-labelledby="profile-tab-prefs" className="profile-tab-panel flex flex-col gap-5">
            {/* حُذف «إعدادات التقويم» من هنا: ثلاثةُ حقولٍ تُكتب في التخزين
                ولا يقرؤها شيءٌ في المنتج (نوعُ الطالب · المنطقة · سنةُ التخرّج).
                والمنطقةُ منها كانت نسخةً ثانيةً لا تُحسب في اكتمال ملفك — مكانها
                الحقيقيّ «معلوماتي». إعدادٌ لا يُغيّر شيئاً أسوأُ من غيابه. */}
            <ProfilePreferences isPrivate={isPrivate} onTogglePrivacy={togglePrivacy} />
            {/* ربطُ وليّ الأمر — بيد الطالب: هو من يُنشئ الرمز ومن يفصل */}
            <GuardianLink />
            <ProfileAccount />
          </div>
        )}
      </div>

      <NextThread page="/profile" />
      <PageFooter />
    </div>
  );
}
