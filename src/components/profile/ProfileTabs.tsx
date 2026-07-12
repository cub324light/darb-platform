"use client";
/* ─── شريط تبويب الملف الشخصي — لاصق أعلى المحتوى ───
   تحكّم خارجي (controlled): الحالة في الصفحة الأم. */
import { memo } from "react";

export type ProfileTab = "overview" | "stats" | "goals" | "future" | "prefs" | "achievements" | "coach";

/* الترتيب حسب الأولوية: النظرة العامة ثم الأهداف ثم الإحصائيات — المعرّفات ثابتة */
export const PROFILE_TABS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: "overview",     label: "نظرة عامة", icon: "🧭" },
  { id: "goals",        label: "الأهداف",    icon: "🎯" },
  { id: "stats",        label: "الإحصائيات", icon: "📊" },
  { id: "future",       label: "مستقبلي الجامعي", icon: "🎓" },
  { id: "coach",        label: "مدرّبي",     icon: "🤖" },
  { id: "prefs",        label: "التفضيلات",  icon: "⚙️" },
  { id: "achievements", label: "الإنجازات",  icon: "🏅" },
];

function ProfileTabsBase({ active, onChange, showUniversity = true }: { active: ProfileTab; onChange: (t: ProfileTab) => void; showUniversity?: boolean }) {
  /* تبويب «مستقبلي الجامعي» يظهر فقط للمؤهَّلين (ثالث ثانوي/خريج) */
  const tabs = showUniversity ? PROFILE_TABS : PROFILE_TABS.filter((t) => t.id !== "future");
  return (
    <div className="profile-tabs-bar sticky top-0 z-30 -mx-5 px-5 py-2.5 mb-1"
      style={{ background: "var(--glass-bg)", borderBottom: "1px solid var(--border)" }}>
      <div role="tablist" aria-label="أقسام الملف الشخصي"
        className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button key={t.id} id={`profile-tab-${t.id}`} role="tab" aria-selected={on}
              aria-controls={`profile-panel-${t.id}`}
              onClick={() => onChange(t.id)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-bold transition active:scale-95 flex-shrink-0"
              style={{
                background: on ? "var(--accent)" : "var(--surface2)",
                color: on ? "#fff" : "var(--text-muted)",
                border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
              }}>
              <span className="text-[15px]" aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ProfileTabsBase);
