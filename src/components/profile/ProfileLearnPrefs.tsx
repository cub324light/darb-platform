"use client";
/* ─── تفضيلات التعلّم والاستراتيجية — بياناتٌ شخصية (نُقلت من الإعدادات إلى «معلوماتي») ───
   تبقى في مصدرها الوحيد DarbPrefs الذي تقرؤه الخطة/دويرب/الخريطة (لا تغيير للمنطق، نقل واجهةٍ فقط). */
import { memo } from "react";
import type { DarbPrefs, StudyTime, SessionLen, LearningStyle, StudyDevice, StudyFormat } from "@/lib/storage";
import { n } from "@/lib/format";

const STUDY_TIMES: StudyTime[]   = ["فجر", "صباح", "ظهر", "مساء", "ليل"];
const SESSION_LENS: SessionLen[] = [25, 45, 60, 90];
const STYLES: LearningStyle[]    = ["فيديو", "قراءة", "أسئلة", "شرح ذكي", "خرائط ذهنية"];
const DEVICES: StudyDevice[]     = ["جوال", "تابلت", "لابتوب", "مكتبي"];
const FORMATS: StudyFormat[]     = ["ورقي", "رقمي", "الاثنان"];

function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} aria-pressed={on} aria-label={label}
      className="px-3.5 py-2 rounded-full t-small font-bold transition active:scale-95"
      style={{ background: on ? "var(--accent)" : "var(--surface2)", color: on ? "#fff" : "var(--text-muted)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}` }}>
      {children}
    </button>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="t-title font-bold mb-2" style={{ color: "var(--text)" }}>{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface Props { prefs: DarbPrefs; onPrefsChange: (partial: Partial<DarbPrefs>) => void; }

function ProfileLearnPrefsBase({ prefs, onPrefsChange }: Props) {
  const toggleStyle = (s: LearningStyle) => {
    const cur = prefs.learningStyle ?? [];
    onPrefsChange({ learningStyle: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  };
  return (
    <div className="ds-card flex flex-col gap-5">
      <div>
        <p className="eyebrow mb-1">🎓 طريقة تعلّمي</p>
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>يستعملها دويرب والخطة معاً لتخصيص جدولك واقتراحاتك.</p>
      </div>

      <Group title="⏰ وقت المذاكرة المفضّل">
        {STUDY_TIMES.map((t) => (
          <Chip key={t} on={prefs.studyTime === t} label={`وقت ${t}`}
            onClick={() => onPrefsChange({ studyTime: prefs.studyTime === t ? undefined : t })}>{t}</Chip>
        ))}
      </Group>

      <Group title="⏳ مدة الجلسة المفضّلة">
        {SESSION_LENS.map((l) => (
          <Chip key={l} on={prefs.sessionLen === l} label={`${l} دقيقة`}
            onClick={() => onPrefsChange({ sessionLen: prefs.sessionLen === l ? undefined : l })}>{n(l)} د</Chip>
        ))}
      </Group>

      <Group title="🎨 أسلوب التعلّم">
        {STYLES.map((s) => (
          <Chip key={s} on={(prefs.learningStyle ?? []).includes(s)} label={s} onClick={() => toggleStyle(s)}>{s}</Chip>
        ))}
      </Group>

      <Group title="📱 جهاز المذاكرة">
        {DEVICES.map((d) => (
          <Chip key={d} on={prefs.device === d} label={d}
            onClick={() => onPrefsChange({ device: prefs.device === d ? undefined : d })}>{d}</Chip>
        ))}
      </Group>

      <Group title="📖 صيغة الدراسة">
        {FORMATS.map((f) => (
          <Chip key={f} on={prefs.format === f} label={f}
            onClick={() => onPrefsChange({ format: prefs.format === f ? undefined : f })}>{f}</Chip>
        ))}
      </Group>

      <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }} />
      <div>
        <p className="t-title font-bold" style={{ color: "var(--text)" }}>📐 استراتيجية المذاكرة</p>
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>يستعملها دويرب والخطة والخريطة معاً — قرار واحد في كل مكان.</p>
      </div>

      <Group title="🗓️ أيام المذاكرة الأسبوعية">
        {[3, 4, 5, 6, 7].map((d) => (
          <Chip key={d} on={prefs.studyDays === d} label={`${d} أيام`}
            onClick={() => onPrefsChange({ studyDays: prefs.studyDays === d ? undefined : d })}>{n(d)}</Chip>
        ))}
      </Group>

      <Group title="🌴 وضع الإجازة (طاقة أعلى)">
        <Chip on={prefs.vacationMode === true} label="وضع الإجازة مفعّل"
          onClick={() => onPrefsChange({ vacationMode: prefs.vacationMode ? undefined : true })}>
          {prefs.vacationMode ? "مفعّل ●" : "مفعّل"}
        </Chip>
      </Group>

      <Group title="🔀 توزيع المواد">
        {([
          { id: "auto", label: "تلقائي (يقرّره دويرب)" },
          { id: "single", label: "مادة واحدة حتى الإتقان" },
          { id: "parallel", label: "مادتان بالتوازي" },
          { id: "rotating", label: "تدوير على الكل" },
        ] as const).map((o) => (
          <Chip key={o.id} on={(prefs.subjectFocus ?? "auto") === o.id} label={o.label}
            onClick={() => onPrefsChange({ subjectFocus: o.id === "auto" ? undefined : o.id })}>{o.label}</Chip>
        ))}
      </Group>
    </div>
  );
}

export default memo(ProfileLearnPrefsBase);
