"use client";
/* ─── ✨ معلوماتي — عرضٌ بسيط (نمط Duolingo): بطاقة بيانات + زر إلى صفحة التعديل ───
   لا نموذج مفتوح هنا. البيانات في DarbUser (مصدرٌ واحد). التعديل في /profile/edit ثم رجوع. */
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

interface Row { label: string; value: string; }

export default function ProfileExtra() {
  const [user] = useState<DarbUser | null>(() => (typeof window !== "undefined" ? loadUser() : null));
  if (!user) return null;
  const comp = profileCompletion(user);
  const done = comp.pct === 100;

  const list = (a?: string[]) => (a && a.length ? a.join("، ") : "");
  const rows: Row[] = [
    { label: "الاسم", value: user.name ?? "" },
    { label: "المرحلة الدراسية", value: user.grade || user.studyLevel || "" },
    { label: "المسار الدراسي", value: user.academicTrack ? trackLabel(user.academicTrack) : "" },
    { label: "الهدف", value: goalText(user) },
    { label: "المنطقة", value: user.region ?? "" },
    { label: "طريقة المذاكرة", value: user.studyStyle ? STYLE_LABEL[user.studyStyle] ?? "" : "" },
    { label: "ساعات المذاكرة", value: user.studyHours ? `${n(user.studyHours)} ساعة` : "" },
    { label: "الهوايات", value: list(user.hobbies) },
    { label: "الاهتمامات", value: list(user.interests) },
    { label: "المواد المفضّلة", value: list(user.favSubjects) },
    { label: "طريقة التعلّم", value: list(user.learningStyle) },
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

      {/* بطاقة عرض البيانات (للقراءة فقط) */}
      <div className="ds-card">
        <p className="eyebrow mb-3">👤 معلوماتي</p>
        <div className="flex flex-col">
          {rows.map((r, i) => (
            <div key={r.label} className="flex items-start justify-between gap-3 py-2.5"
              style={i < rows.length - 1 ? { borderBottom: "1px solid var(--border)" } : undefined}>
              <span className="t-body font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>{r.label}</span>
              <span className="t-body font-bold text-left min-w-0" style={{ color: r.value ? "var(--text)" : "var(--text-dim)" }}>
                {r.value || "لم تُحدَّد"}
              </span>
            </div>
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
