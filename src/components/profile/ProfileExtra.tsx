"use client";
/* ─── ✨ معلومات إضافية — بيانات الطالب الاختيارية داخل البروفايل ───
   ليست جزءاً من التسجيل: تُملأ في أي وقت، وتُجهّز لدويرب مستقبلاً (تخصيص الخطط والنصائح).
   لعبةٌ بسيطة: بطاقة اكتمال + مكافأة فضة/وسام تُصرف مرّة واحدة (منطقها في profileCompletion). */
import { useState } from "react";
import { loadUser, saveUser, addSilver, type DarbUser } from "@/lib/storage";
import { profileCompletion, pendingProfileRewards } from "@/lib/profileCompletion";
import { n } from "@/lib/format";

const HOBBIES = ["📖 القراءة", "⚽ الرياضة", "🎨 الرسم", "💻 البرمجة", "🎮 الألعاب", "✈️ السفر", "📷 التصوير", "✍️ الكتابة"];
const INTERESTS = ["🔬 العلوم", "🩺 الطب", "⚙️ الهندسة", "💼 الأعمال", "🎭 الفنون", "🗣️ اللغات", "🚀 ريادة الأعمال", "🌍 البيئة"];
const SUBJECTS = ["رياضيات", "فيزياء", "كيمياء", "أحياء", "لغتي", "إنجليزي", "حاسب", "اجتماعيات"];
const LEARN = ["🎬 بالفيديو", "📘 بالقراءة", "❓ بالأسئلة", "🧠 بالشرح", "🗺️ بالخرائط الذهنية"];

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
    const next: DarbUser = { ...user, ...patch };
    const reward = pendingProfileRewards(next);
    if (reward) {
      if (reward.silver) addSilver(reward.silver);
      if (reward.setInfoFlag) next.awardedProfileInfo = true;
      if (reward.setCompleteFlag) next.awardedProfileComplete = true;
      setCelebrate(reward.message);
    }
    saveUser(next);
    setUser(next);
  };

  const toggle = (key: "hobbies" | "interests" | "favSubjects", val: string) => {
    const cur = user[key] ?? [];
    const arr = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
    commit({ [key]: arr.length ? arr : undefined });
  };
  const has = (key: "hobbies" | "interests" | "favSubjects", val: string) => (user[key] ?? []).includes(val);
  const setLearn = (val: string) => commit({ learnPref: user.learnPref === val ? undefined : val });

  return (
    <div className="flex flex-col gap-5">
      {/* بطاقة اكتمال الملف */}
      <div className="ds-card">
        <div className="flex items-center justify-between mb-2">
          <p className="t-title font-black" style={{ color: "var(--text)" }}>اكتمال الملف الشخصي</p>
          <span className="t-h3 font-black font-mono-nums" style={{ color: comp.pct === 100 ? "var(--success)" : "var(--accent-light)" }}>
            {comp.pct === 100 ? "🏅 " : ""}{n(comp.pct)}٪
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: "color-mix(in srgb, var(--text-muted) 22%, transparent)" }}>
          <div className="h-full rounded-full eval-bar-fill" style={{ width: `${comp.pct}%`, background: comp.pct === 100 ? "var(--success)" : "var(--accent)" }} />
        </div>
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>{n(comp.done)} من {n(comp.total)} معلومات مكتملة — أكمل معلوماتك لتحصل على فضة ووسام.</p>
      </div>

      {/* رسالة الاحتفال بالمكافأة */}
      {celebrate && (
        <div className="ds-card rise flex items-start gap-3" style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, var(--border))" }}>
          <span className="text-[22px] flex-shrink-0">🎉</span>
          <div className="flex-1 min-w-0">
            <p className="t-body font-black" style={{ color: "var(--text)" }}>{celebrate}</p>
          </div>
          <button onClick={() => setCelebrate(null)} className="t-caption font-bold px-2" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
      )}

      {/* الحقول الاختيارية */}
      <div className="ds-card flex flex-col gap-5">
        <div>
          <p className="eyebrow mb-1">✨ معلومات إضافية</p>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>اختيارية تماماً — تساعد درب على تخصيص خطتك ونصائح دويرب لك.</p>
        </div>
        <Group title="الهوايات">
          {HOBBIES.map((h) => <Chip key={h} on={has("hobbies", h)} onClick={() => toggle("hobbies", h)}>{h}</Chip>)}
        </Group>
        <Group title="الاهتمامات">
          {INTERESTS.map((i) => <Chip key={i} on={has("interests", i)} onClick={() => toggle("interests", i)}>{i}</Chip>)}
        </Group>
        <Group title="المواد المفضّلة">
          {SUBJECTS.map((s) => <Chip key={s} on={has("favSubjects", s)} onClick={() => toggle("favSubjects", s)}>{s}</Chip>)}
        </Group>
        <Group title="طريقة التعلّم المفضّلة">
          {LEARN.map((l) => <Chip key={l} on={user.learnPref === l} onClick={() => setLearn(l)}>{l}</Chip>)}
        </Group>
      </div>
    </div>
  );
}
