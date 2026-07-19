"use client";
/* ─── ✨ معلوماتي — بيانات الطالب الشخصية داخل البروفايل (لا الإعدادات) ───
   مصدرٌ واحد: كل الحقول من DarbUser يقرؤها البروفايل/دويرب/الخطة (لا تكرار). ليست جزءاً من
   التسجيل: تُملأ في أي وقت. لعبةٌ تدريجية: +٥ فضة مع كل معلومةٍ جديدة، ووسام + ٣٠ عند ١٠٠٪. */
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

export default function ProfileExtra() {
  const [user, setUser] = useState<DarbUser | null>(() => (typeof window !== "undefined" ? loadUser() : null));
  const [celebrate, setCelebrate] = useState<string | null>(null);
  if (!user) return null;
  const comp = profileCompletion(user);

  const commit = (patch: Partial<DarbUser>) => {
    /* ندمج على أحدث نسخةٍ مخزّنة (لا حالة المكوّن) كي لا نطمس حقولاً حرّرها قسمٌ آخر (طريقة التعلّم). */
    const next: DarbUser = { ...(loadUser() ?? user), ...patch };
    const reward = pendingProfileRewards(next);
    if (reward) {
      if (reward.silver) addSilver(reward.silver);
      if (reward.newRewardedFields.length) next.rewardedFields = [...(next.rewardedFields ?? []), ...reward.newRewardedFields];
      if (reward.setCompleteFlag) next.awardedProfileComplete = true;
      setCelebrate(reward.message);
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
      {/* اكتمال الملف — بطاقة تهنئة عند ١٠٠٪، وإلا تقدّمٌ مع «باقي كذا معلومة» */}
      {comp.pct === 100 ? (
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
          <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{n(comp.done)} من {n(comp.total)} — كل معلومةٍ تضيفها = +٥ فضة.</p>
        </div>
      )}

      {celebrate && (
        <div className="ds-card rise flex items-start gap-3" style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, var(--border))" }}>
          <span className="text-[22px] flex-shrink-0">🎉</span>
          <p className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{celebrate}</p>
          <button onClick={() => setCelebrate(null)} className="t-caption font-bold px-2" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
      )}

      <div className="ds-card flex flex-col gap-5">
        <div>
          <p className="eyebrow mb-1">✨ معلوماتي</p>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>بيانات شخصية اختيارية — تساعد درب على تخصيص خطتك ونصائح دويرب لك.</p>
        </div>

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

        <Group title="الهوايات">
          {HOBBIES.map((h) => <Chip key={h} on={on("hobbies", h)} onClick={() => toggle("hobbies", h)}>{h}</Chip>)}
        </Group>
        <Group title="الاهتمامات">
          {INTERESTS.map((i) => <Chip key={i} on={on("interests", i)} onClick={() => toggle("interests", i)}>{i}</Chip>)}
        </Group>
        <Group title="المواد المفضّلة">
          {SUBJECTS.map((s) => <Chip key={s} on={on("favSubjects", s)} onClick={() => toggle("favSubjects", s)}>{s}</Chip>)}
        </Group>

        {/* مستقبلاً: الدرجة المستهدفة لكل اختبار */}
        <div className="rounded-xl px-3.5 py-3 flex items-center gap-2.5" style={{ background: "var(--surface2)", border: "1px dashed var(--border)" }}>
          <span className="text-[17px]">🎯</span>
          <div className="min-w-0">
            <p className="t-body font-bold" style={{ color: "var(--text)" }}>الدرجة المستهدفة لكل اختبار</p>
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>قريباً — لتخصيص خطتك حسب هدفك في كل اختبار.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
