"use client";
/* ─── محرّر معلومات الطالب — يُستعمل في صفحة /profile/edit المستقلّة ───
   حقولٌ اختيارية تُحفَظ فوراً في DarbUser (مصدرٌ واحد). لعبةٌ تدريجية: +5 فضة مع كل معلومةٍ
   جديدة، ووسام + 30 عند 100٪ (مرّة لكلٍّ). التعديل لاحقاً لا يمنح فضةً من جديد. */
import { useState } from "react";
import { loadUser, saveUser, addSilver, type DarbUser } from "@/lib/storage";
import { profileCompletion, pendingProfileRewards } from "@/lib/profileCompletion";
import { n } from "@/lib/format";

const STUDY_STYLES: { id: "book" | "video" | "both"; label: string }[] = [
  { id: "book", label: "📘 بالقراءة" }, { id: "video", label: "🎬 بالفيديو" }, { id: "both", label: "🧩 الاثنين" },
];
const HOBBIES = ["📖 القراءة", "⚽ الرياضة", "🎨 الرسم", "💻 البرمجة", "🎮 الألعاب", "✈️ السفر", "📷 التصوير", "✍️ الكتابة"];
const INTERESTS = ["🔬 العلوم", "🩺 الطب", "⚙️ الهندسة", "💼 الأعمال", "🎭 الفنون", "🗣️ اللغات", "🚀 ريادة الأعمال", "🌍 البيئة"];
const SUBJECTS = ["رياضيات", "فيزياء", "كيمياء", "أحياء", "لغتي", "إنجليزي", "حاسب", "اجتماعيات"];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className="px-3.5 py-2 rounded-full t-small font-bold transition active:scale-95"
      style={{ background: on ? "var(--accent)" : "var(--surface2)", color: on ? "#fff" : "var(--text-muted)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}` }}>
      {children}
    </button>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="t-title font-bold mb-2.5" style={{ color: "var(--text)" }}>{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function ProfileEditor() {
  const [user, setUser] = useState<DarbUser | null>(() => (typeof window !== "undefined" ? loadUser() : null));
  const [celebrate, setCelebrate] = useState<string | null>(null);
  if (!user) return null;
  const comp = profileCompletion(user);

  const commit = (patch: Partial<DarbUser>) => {
    const next: DarbUser = { ...(loadUser() ?? user), ...patch };
    const reward = pendingProfileRewards(next);
    if (reward) {
      if (reward.silver) addSilver(reward.silver);
      if (reward.newRewardedFields.length) next.rewardedFields = [...(next.rewardedFields ?? []), ...reward.newRewardedFields];
      if (reward.setCompleteFlag) next.awardedProfileComplete = true;
      if (reward.badge) {
        /* اكتمل الملف أوّل مرّة: نُسجّل إشارةً عابرة ليعرضها «حفظ» في صفحة احتفالٍ مستقلّة */
        try { sessionStorage.setItem("darb_celebrate_complete", JSON.stringify({ silver: reward.silver })); } catch {}
        setCelebrate("🎉 اكتمل ملفك الشخصي — اضغط «حفظ ✓» لرؤية مكافأتك");
      } else {
        setCelebrate(reward.message);
      }
    }
    saveUser(next); setUser(next);
  };
  const toggle = (key: "hobbies" | "interests" | "favSubjects", val: string) => {
    const cur = user[key] ?? [];
    const arr = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
    commit({ [key]: arr.length ? arr : undefined });
  };
  const on = (key: "hobbies" | "interests" | "favSubjects", val: string) => (user[key] ?? []).includes(val);

  return (
    <div className="flex flex-col gap-5">
      {/* تقدّم الاكتمال */}
      <div className="ds-card">
        <div className="flex items-center justify-between mb-2">
          <p className="t-title font-black" style={{ color: "var(--text)" }}>تقدّمك</p>
          <span className="t-h3 font-black font-mono-nums" style={{ color: comp.pct === 100 ? "var(--success)" : "var(--accent-light)" }}>{comp.pct === 100 ? "🏅 " : ""}{n(comp.pct)}٪</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--text-muted) 22%, transparent)" }}>
          <div className="h-full rounded-full eval-bar-fill" style={{ width: `${comp.pct}%`, background: comp.pct === 100 ? "var(--success)" : "var(--accent)" }} />
        </div>
      </div>

      {celebrate && (
        <div className="ds-card rise flex items-start gap-3" style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, var(--border))" }}>
          <span className="text-[22px] flex-shrink-0">🎉</span>
          <p className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{celebrate}</p>
          <button onClick={() => setCelebrate(null)} className="t-caption font-bold px-2" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
      )}

      <div className="ds-card flex flex-col gap-5">
        <Group title="طريقة المذاكرة">
          {STUDY_STYLES.map((s) => <Chip key={s.id} on={user.studyStyle === s.id} onClick={() => commit({ studyStyle: user.studyStyle === s.id ? undefined : s.id })}>{s.label}</Chip>)}
        </Group>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="t-title font-bold" style={{ color: "var(--text)" }}>ساعات المذاكرة اليومية</p>
            <span className="t-body font-black font-mono-nums" style={{ color: "var(--accent-light)" }}>{n(user.studyHours ?? 3)} ساعة</span>
          </div>
          <input type="range" min={1} max={16} step={1} value={user.studyHours ?? 3} aria-label="ساعات المذاكرة اليومية"
            onChange={(e) => commit({ studyHours: parseInt(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: "var(--accent)", background: "var(--surface2)" }} />
        </div>
        <Group title="الهوايات">{HOBBIES.map((h) => <Chip key={h} on={on("hobbies", h)} onClick={() => toggle("hobbies", h)}>{h}</Chip>)}</Group>
        <Group title="الاهتمامات">{INTERESTS.map((i) => <Chip key={i} on={on("interests", i)} onClick={() => toggle("interests", i)}>{i}</Chip>)}</Group>
        <Group title="المواد المفضّلة">{SUBJECTS.map((s) => <Chip key={s} on={on("favSubjects", s)} onClick={() => toggle("favSubjects", s)}>{s}</Chip>)}</Group>
      </div>
    </div>
  );
}
