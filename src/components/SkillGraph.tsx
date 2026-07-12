"use client";
import { useMemo, useState } from "react";
import {
  skillsForTrack, skillNodeStatus, skillDepth,
  MASTERY_THRESHOLD, type GlobalSkill, type NodeStatus,
} from "@/lib/globalSkills";
import { loadSkillProgress, setSkillSelfAssessment } from "@/lib/skillProgress";

/* خريطة المهارات: شجرة تفاعلية للمسار — يتقدّم الطالب بإتقان المهارات بالترتيب. */
export default function SkillGraph({ track }: { track: string | undefined | null }) {
  const skills = useMemo(() => skillsForTrack(track ?? ""), [track]);
  const [progress, setProgress] = useState(() => loadSkillProgress());

  const mastered = useMemo<Set<string>>(
    () => new Set(
      Object.entries(progress)
        .filter(([, p]) => p.masteryScore >= MASTERY_THRESHOLD)
        .map(([id]) => id)
    ),
    [progress]
  );

  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  /* الأقسام بالترتيب مع ترتيب كل قسم حسب العمق */
  const sections = useMemo(() => {
    const map = new Map<string, GlobalSkill[]>();
    for (const s of skills) {
      const arr = map.get(s.domain) ?? [];
      arr.push(s);
      map.set(s.domain, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => skillDepth(a, byId) - skillDepth(b, byId));
    }
    return [...map.entries()];
  }, [skills, byId]);

  if (skills.length === 0) {
    return (
      <p className="text-[15px] px-1 py-2" style={{ color: "var(--text-muted)" }}>
        خريطة المهارات متاحة لمساري القدرات والتحصيلي حالياً.
      </p>
    );
  }

  const masteredCount = skills.filter((s) => mastered.has(s.id)).length;
  const pct = Math.round((masteredCount / skills.length) * 100);

  const toggle = (skill: GlobalSkill, status: NodeStatus) => {
    if (status === "locked") return;
    if (status === "mastered") {
      // إلغاء الإتقان يلغي تلقائياً كل المهارات التي تعتمد عليه
      const toReset = new Set([skill.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const s of skills) {
          if (!toReset.has(s.id) && (s.prereqs ?? []).some((p) => toReset.has(p))) {
            toReset.add(s.id);
            changed = true;
          }
        }
      }
      for (const id of toReset) setSkillSelfAssessment(id, "none");
    } else {
      setSkillSelfAssessment(skill.id, "mastered");
    }
    setProgress(loadSkillProgress());
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
        <span className="text-[15px] font-bold font-mono-nums" style={{ color: "var(--text-dim)" }}>
          {masteredCount}/{skills.length}
        </span>
      </div>

      {sections.map(([section, list]) => (
        <div key={section} className="flex flex-col gap-2">
          <p className="text-[15px] font-black" style={{ color: "var(--accent-light)" }}>{section}</p>
          <div className="flex flex-wrap gap-2">
            {list.map((s) => {
              const status = skillNodeStatus(s, mastered);
              const prereqNames = (s.prereqs ?? [])
                .map((p) => byId.get(p)?.name)
                .filter(Boolean)
                .join("، ");
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s, status)}
                  disabled={status === "locked"}
                  title={status === "locked" && prereqNames ? `يتطلب: ${prereqNames}` : undefined}
                  className="rounded-xl px-3 py-2 text-[15px] font-bold transition active:scale-[0.97] text-right"
                  style={{ ...statusStyle[status], cursor: status === "locked" ? "not-allowed" : "pointer" }}>
                  <span className="flex items-center gap-1.5">
                    <span>{status === "mastered" ? "✓" : status === "locked" ? "🔒" : "•"}</span>
                    <span>{s.name}</span>
                  </span>
                  {status === "locked" && prereqNames && (
                    <span className="block text-[11px] font-normal mt-0.5" style={{ color: "var(--text-muted)" }}>
                      يتطلب: {prereqNames}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
        اضغط مهارة متاحة لتعليمها كمُتقنة، فتنفتح المهارات التي تعتمد عليها.
      </p>
    </div>
  );
}
