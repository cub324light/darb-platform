"use client";
/* ─── ✨ معلوماتي — عرضٌ بسيط (نمط Duolingo): بطاقاتٌ صغيرة + زر إلى صفحة التعديل ───
   لا نموذج مفتوح هنا. البيانات في DarbUser (مصدرٌ واحد). التعديل في /profile/edit ثم رجوع.
   المعلومة الفارغة تُعرض «➕ أضفها الآن» بلونٍ محفِّز وتنقل مباشرةً لصفحة التعديل. */
import { useState } from "react";
import Link from "next/link";
import { loadUser, type DarbUser } from "@/lib/storage";
import { trackLabel } from "@/lib/curriculum";
import { profileCompletion } from "@/lib/profileCompletion";
import { n } from "@/lib/format";

const GOAL_LABEL: Record<string, string> = {
  university: "الجامعة", aramco: "أرامكو", itc: "ITC", military: "الكليات العسكرية", scholarship: "الابتعاث",
};
const STYLE_LABEL: Record<string, string> = { book: "بالقراءة", video: "بالفيديو", both: "بالقراءة والفيديو" };

function goalText(u: DarbUser): string {
  if (u.goalUndecided) return "درب يحدّد لي";
  const t = (u.targets ?? []).map((x) => GOAL_LABEL[x] ?? x);
  return t.join(" · ");
}

interface Field { icon: string; label: string; value: string; wide?: boolean; }

export default function ProfileExtra() {
  const [user] = useState<DarbUser | null>(() => (typeof window !== "undefined" ? loadUser() : null));
  if (!user) return null;
  const comp = profileCompletion(user);
  const done = comp.pct === 100;

  const list = (a?: string[]) => (a && a.length ? a.join("، ") : "");
  const fields: Field[] = [
    { icon: "👤", label: "الاسم", value: user.name ?? "", wide: true },
    { icon: "🎓", label: "المرحلة", value: user.grade || user.studyLevel || "" },
    { icon: "🧭", label: "المسار الدراسي", value: user.academicTrack ? trackLabel(user.academicTrack) : "" },
    { icon: "🎯", label: "الهدف", value: goalText(user) },
    { icon: "📍", label: "المنطقة", value: user.region ?? "" },
    { icon: "📚", label: "طريقة المذاكرة", value: user.studyStyle ? STYLE_LABEL[user.studyStyle] ?? "" : "" },
    { icon: "⏰", label: "ساعات المذاكرة", value: user.studyHours ? `${n(user.studyHours)} ساعات` : "" },
    { icon: "🎨", label: "الهوايات", value: list(user.hobbies) },
    { icon: "💡", label: "الاهتمامات", value: list(user.interests) },
    { icon: "📗", label: "المواد المفضّلة", value: list(user.favSubjects) },
    { icon: "🧠", label: "طريقة التعلّم", value: list(user.learningStyle) },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* اكتمال الملف */}
      {done ? (
        <div className="ds-card flex items-center gap-3" style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, var(--border))" }}>
          <span className="text-[26px] flex-shrink-0">🏅</span>
          <div className="min-w-0">
            <p className="t-title font-black" style={{ color: "var(--text)" }}>ملفك الشخصي مكتمل</p>
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>يمكنك تعديل معلوماتك متى شئت.</p>
          </div>
        </div>
      ) : (
        <div className="ds-card">
          <div className="flex items-center justify-between mb-2">
            <p className="t-title font-black" style={{ color: "var(--text)" }}>اكتمال الملف الشخصي</p>
            <span className="t-h3 font-black font-mono-nums" style={{ color: "var(--accent-light)" }}>{n(comp.pct)}٪</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: "color-mix(in srgb, var(--text-muted) 22%, transparent)" }}>
            <div className="h-full rounded-full eval-bar-fill" style={{ width: `${comp.pct}%`, background: "var(--accent)" }} />
          </div>
          <p className="t-caption font-bold" style={{ color: "var(--accent-light)" }}>
            {(() => { const r = comp.total - comp.done; return `باقي ${r === 1 ? "معلومة واحدة" : r === 2 ? "معلومتان" : `${n(r)} معلومات`} ويكتمل ملفك`; })()}
          </p>
        </div>
      )}

      {/* بطاقاتٌ صغيرة لكل معلومة */}
      <div>
        <p className="eyebrow mb-3">👤 معلوماتي</p>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => f.value ? (
            <div key={f.label} className={`rounded-2xl p-3.5 ${f.wide ? "col-span-2" : ""}`}
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[15px] leading-none">{f.icon}</span>
                <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{f.label}</span>
              </div>
              <p className="t-body font-black leading-snug" style={{ color: "var(--text)" }}>{f.value}</p>
            </div>
          ) : (
            <Link key={f.label} href="/profile/edit" aria-label={`أضف ${f.label}`}
              className={`rounded-2xl p-3.5 no-underline block active:scale-95 transition ${f.wide ? "col-span-2" : ""}`}
              style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))", border: "1.5px dashed color-mix(in srgb, var(--accent) 50%, var(--border))" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[15px] leading-none">{f.icon}</span>
                <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{f.label}</span>
              </div>
              <p className="t-body font-black leading-snug" style={{ color: "var(--accent-light)" }}>➕ أضفها الآن</p>
            </Link>
          ))}
        </div>
      </div>

      {/* زرٌّ كبير → صفحة التعديل المستقلّة */}
      <Link href="/profile/edit" className="btn-primary glow-blue no-underline text-center">
        {done ? "✏️ تعديل معلوماتي" : "✨ أكمل بياناتك"}
      </Link>
    </div>
  );
}
