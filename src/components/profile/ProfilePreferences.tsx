"use client";
/* ─── تفضيلات التعلّم + الخصوصية — تُغذّي تجربة الطالب لاحقاً ─── */
import { memo } from "react";
import type { DarbPrefs, StudyTime, SessionLen, LearningStyle, StudyDevice, StudyFormat } from "@/lib/storage";

interface Props {
  prefs: DarbPrefs;
  onPrefsChange: (partial: Partial<DarbPrefs>) => void;
  isPrivate: boolean;
  onTogglePrivacy: () => void;
}

const STUDY_TIMES: StudyTime[]   = ["فجر", "صباح", "ظهر", "مساء", "ليل"];
const SESSION_LENS: SessionLen[] = [25, 45, 60, 90];
const STYLES: LearningStyle[]    = ["فيديو", "قراءة", "أسئلة", "شرح ذكي", "خرائط ذهنية"];
const DEVICES: StudyDevice[]     = ["جوال", "تابلت", "لابتوب", "مكتبي"];
const FORMATS: StudyFormat[]     = ["ورقي", "رقمي", "الاثنان"];

function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} aria-pressed={on} aria-label={label}
      className="px-3.5 py-2 rounded-full text-[13px] font-bold transition active:scale-95"
      style={{
        background: on ? "var(--accent)" : "var(--surface2)",
        color: on ? "#fff" : "var(--text-muted)",
        border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
      }}>
      {children}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[13px] font-bold mb-2" style={{ color: "var(--text)" }}>{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ProfilePreferencesBase({ prefs, onPrefsChange, isPrivate, onTogglePrivacy }: Props) {
  const toggleStyle = (s: LearningStyle) => {
    const cur = prefs.learningStyle ?? [];
    onPrefsChange({ learningStyle: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl p-5 flex flex-col gap-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div>
          <p className="label mb-1">تفضيلات التعلّم</p>
          <p className="text-[12px] mb-1" style={{ color: "var(--text-muted)" }}>نستخدمها لاحقاً لنخصّص جدولك واقتراحاتك.</p>
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
              onClick={() => onPrefsChange({ sessionLen: prefs.sessionLen === l ? undefined : l })}>{l.toLocaleString("ar")} د</Chip>
          ))}
        </Group>

        <Group title="🎨 أسلوب التعلّم (اختر ما يناسبك)">
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
      </div>

      {/* الخصوصية */}
      <div>
        <p className="label mb-3">الخصوصية</p>
        <div className="rounded-2xl px-4 py-4 flex items-center justify-between gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="min-w-0">
            <p className="font-bold text-[15px]" style={{ color: "var(--text)" }}>ظهورك في الترتيب</p>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {isPrivate ? "خاص — لا تظهر للآخرين ولا في لوحة الشرف" : "عام — تظهر في البحث ولوحة الشرف"}
            </p>
          </div>
          <button onClick={onTogglePrivacy}
            className="px-4 py-2.5 rounded-xl font-black text-[14px] flex-shrink-0 transition active:scale-95"
            style={isPrivate
              ? { background: "#EF4444", color: "#fff", border: "1.5px solid #EF4444" }
              : { background: "transparent", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}>
            {isPrivate ? "خاص ●" : "عام"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProfilePreferencesBase);
