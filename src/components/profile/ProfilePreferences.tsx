"use client";
/* ─── إعدادات التطبيق فقط: الخصوصية + التحليلات ───
   لا معلوماتٍ شخصية هنا (بيانات الطالب انتقلت إلى تبويب «معلوماتي»). */
import { memo, useState } from "react";
import { hasAnalyticsConsent, setAnalyticsConsent } from "@/lib/consent";

interface Props { isPrivate: boolean; onTogglePrivacy: () => void; }

/* صف موافقة التحليلات — مكتفٍ ذاتياً (يقرأ/يكتب علم الموافقة). الافتراضي مُعطَّل. */
function AnalyticsConsentRow() {
  const [on, setOn] = useState(() => typeof window !== "undefined" && hasAnalyticsConsent());
  const toggle = () => { const next = !on; setAnalyticsConsent(next); setOn(next); };
  return (
    <div className="rounded-2xl px-4 py-4 flex items-center justify-between gap-3 mt-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="min-w-0">
        <p className="font-bold text-[17px]" style={{ color: "var(--text)" }}>التحليلات والقياس</p>
        <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
          {on ? "مفعّلة — تساعدنا على تحسين درب (PostHog وVercel ورصد الأعطال)" : "معطّلة — لا تُرسَل أي بيانات استخدام لجهات خارجية"}
        </p>
      </div>
      <button onClick={toggle} className="px-4 py-2.5 rounded-xl font-black text-[16px] flex-shrink-0 transition active:scale-95"
        style={on ? { background: "var(--accent)", color: "#fff", border: "1.5px solid var(--accent)" } : { background: "transparent", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}>
        {on ? "مفعّلة ●" : "معطّلة"}
      </button>
    </div>
  );
}

function ProfilePreferencesBase({ isPrivate, onTogglePrivacy }: Props) {
  return (
    <div>
      <p className="label mb-3">الخصوصية</p>
      <div className="rounded-2xl px-4 py-4 flex items-center justify-between gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="min-w-0">
          <p className="font-bold text-[17px]" style={{ color: "var(--text)" }}>ظهورك في الترتيب</p>
          <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
            {isPrivate ? "خاص — لا تظهر للآخرين ولا في لوحة الشرف" : "عام — تظهر في البحث ولوحة الشرف"}
          </p>
        </div>
        <button onClick={onTogglePrivacy} className="px-4 py-2.5 rounded-xl font-black text-[16px] flex-shrink-0 transition active:scale-95"
          style={isPrivate ? { background: "#EF4444", color: "#fff", border: "1.5px solid #EF4444" } : { background: "transparent", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}>
          {isPrivate ? "خاص ●" : "عام"}
        </button>
      </div>
      <AnalyticsConsentRow />
    </div>
  );
}

export default memo(ProfilePreferencesBase);
