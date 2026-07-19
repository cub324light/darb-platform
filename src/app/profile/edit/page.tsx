"use client";
/* ─── صفحة تعديل معلومات الطالب (مستقلّة) — عرض البيانات ← تعديل ← حفظ ← رجوع ───
   حقولٌ اختيارية تُحفَظ فوراً في DarbUser؛ «حفظ» يعيد إلى «معلوماتي». */
import { useState } from "react";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import ProfileEditor from "@/components/profile/ProfileEditor";
import ProfileLearnPrefs from "@/components/profile/ProfileLearnPrefs";
import { loadPrefs, savePrefs, type LearningPrefs } from "@/lib/storage";

export default function ProfileEditPage() {
  const [prefs, setPrefs] = useState<LearningPrefs>(() => (typeof window !== "undefined" ? loadPrefs() : {}));
  const updatePrefs = (partial: Partial<LearningPrefs>) =>
    setPrefs((prev) => { const next = { ...prev, ...partial }; savePrefs(next); return next; });

  return (
    <div className="page">
      <div className="page-content pb-nav page-enter">
        <div className="flex items-center gap-2 pt-2 mb-1">
          <BackButton />
          <h1 className="t-h2 font-black" style={{ color: "var(--text)" }}>أكمل معلوماتك</h1>
        </div>
        <p className="t-caption mb-4" style={{ color: "var(--text-muted)" }}>اختيارية تماماً — تساعد درب على تخصيص خطتك ونصائح دويرب لك.</p>

        <ProfileEditor />

        <div className="mt-5">
          <ProfileLearnPrefs prefs={prefs} onPrefsChange={updatePrefs} />
        </div>

        <button onClick={() => window.location.assign("/profile?tab=info&saved=1")}
          className="btn-primary glow-blue mt-6 w-full">حفظ ✓</button>
      </div>
      <PageFooter />
    </div>
  );
}
