"use client";
import { useMemo, useState } from "react";
import {
  graphForTrack, skillStatus, skillDepth,
  type Skill, type NodeStatus,
} from "@/lib/skillGraph";
import { loadSkills, saveSkills } from "@/lib/storage";

/* خريطة المهارات: شجرة تفاعلية للمسار — يتقدّم الطالب بإتقان المهارات بالترتيب. */
export default function SkillGraph({ track }: { track: string | undefined | null }) {
  const skills = useMemo(() => graphForTrack(track), [track]);
  const [mastered, setMastered] = useState<Set<string>>(() => new Set(loadSkills()));

  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  /* الأقسام بالترتيب مع ترتيب كل قسم حسب العمق */
  const sections = useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const s of skills) {
      const arr = map.get(s.section) ?? [];
      arr.push(s);
      map.set(s.section, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => skillDepth(a, byId) - skillDepth(b, byId));
    }
    return [...map.entries()];
  }, [skills, byId]);

  if (skills.length === 0) {
    return (
      <p className="text-[13px] px-1 py-2" style={{ color: "var(--text-muted)" }}>
        خريطة المهارات متاحة لمساري القدرات والتحصيلي حالياً.
      </p>
    );
  }

  const masteredCount = skills.filter((s) => mastered.has(s.id)).length;
  const pct = Math.round((masteredCount / skills.length) * 100);

  const toggle = (skill: Skill, status: NodeStatus) => {
    if (status === "locked") return;
    setMastered((prev) => {
      const next = new Set(prev);
      if (next.has(skill.id)) {
        // إلغاء الإتقان يلغي تلقائياً ما يعتمد عليه (يبقى الرسم متّسقاً)
        next.delete(skill.id);
        let changed = true;
        while (changed) {
          changed = false;
          for (const s of skills) {
            if (next.has(s.id) && !s.prereqs.every((p) => next.has(p))) {
              next.delete(s.id);
              changed = true;
            }
          }
        }
      } else {
        next.add(skill.id);
      }
      saveSkills([...next]);
      return next;
    });
  };

  const statusStyle: Record<NodeStatus, React.CSSProperties> = {
    mastered:  { background: "color-mix(in srgb, var(--success) 16%, transparent)", border: "1.5px solid var(--success)", color: "var(--success)" },
    available: { background: "var(--surface)", border: "1.5px solid var(--accent)", color: "var(--text)" },
    locked:    { background: "var(--surface)", border: "1.5px dashed var(--border)", color: "var(--text-muted)", opacity: 0.7 },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* شريط التقدّم */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "var(--success)" : "var(--accent)" }} />
        </div>
        <span className="text-[13px] font-bold font-mono-nums" style={{ color: "var(--text-dim)" }}>
          {masteredCount}/{skills.length}
        </span>
      </div>

      {sections.map(([section, list]) => (
        <div key={section} className="flex flex-col gap-2">
          <p className="text-[13px] font-black" style={{ color: "var(--accent-light)" }}>{section}</p>
          <div className="flex flex-wrap gap-2">
            {list.map((s) => {
              const status = skillStatus(s, mastered);
              const prereqNames = s.prereqs
                .map((p) => byId.get(p)?.name)
                .filter(Boolean)
                .join("، ");
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s, status)}
                  disabled={status === "locked"}
                  title={status === "locked" && prereqNames ? `يتطلب: ${prereqNames}` : undefined}
                  className="rounded-xl px-3 py-2 text-[13px] font-bold transition active:scale-[0.97] text-right"
                  style={{ ...statusStyle[status], cursor: status === "locked" ? "not-allowed" : "pointer" }}>
                  <span className="flex items-center gap-1.5">
                    <span>{status === "mastered" ? "✓" : status === "locked" ? "🔒" : "•"}</span>
                    <span>{s.name}</span>
                  </span>
                  {status === "locked" && prereqNames && (
                    <span className="block text-[10px] font-normal mt-0.5" style={{ color: "var(--text-muted)" }}>
                      يتطلب: {prereqNames}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        اضغط مهارة متاحة لتعليمها كمُتقنة، فتنفتح المهارات التي تعتمد عليها.
      </p>
    </div>
  );
}
