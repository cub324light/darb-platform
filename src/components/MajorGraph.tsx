"use client";
/* ─── شبكة تخصصك — «كل شيء متصل» (Knowledge Graph تفاعلي) ───
   لا اتجاه واحد: ابدأ من أي عقدة (مادة/أداة/شركة/شهادة/وظيفة)، فترى كل ما يتّصل
   بها مجموعاً بنوعه، ثم اقفز لأيّها لتُعيد التمركز حوله. كل الحواف من graph.ts
   النقي (بيانات موجودة، لا معلومة معزولة). حالة واحدة (العقدة المركزية) بلا أي
   setState في effect — النقر يعيد التمركز مباشرة. */
import { useState } from "react";
import { neighbors, entryGroups, type GraphNode, type NodeKind } from "@/lib/graph";
import { loadGraphVisits, recordGraphVisit } from "@/lib/storage";
import { rankBySeen, isFamiliar } from "@/lib/decision";

/* لونٌ بمعنى لكل نوع عقدة: أزرق=أداة · ذهبي=شهادة · أخضر=وظيفة · رمادي=معلومة */
const KIND_COLOR: Record<NodeKind, string> = {
  subject: "var(--accent-light)",
  tool: "var(--accent)",
  project: "var(--text-muted)",
  company: "var(--text-muted)",
  cert: "var(--gold)",
  role: "var(--success)",
};
const KIND_ICON: Record<NodeKind, string> = {
  subject: "📖", tool: "🧰", project: "🚀", company: "🏢", cert: "🎓", role: "🎯",
};
const KIND_ONE: Record<NodeKind, string> = {
  subject: "مادة", tool: "أداة", project: "مشروع", company: "شركة", cert: "شهادة", role: "وظيفة",
};

export default function MajorGraph({ majorId }: { majorId: string | null }) {
  /* نقاط الدخول (ممثّل واحد لكل نوع) + العقدة المركزية الابتدائية = أول مادة */
  const [entries] = useState(() => entryGroups(majorId));
  const [node, setNode] = useState<GraphNode>(
    () => entries.find((g) => g.kind === "subject")?.nodes[0]
      ?? entries[0]?.nodes[0]
      ?? { kind: "subject" as NodeKind, label: "تخصصك" },
  );
  /* طبقة History: تاريخ ضغط الطالب — يُقرأ كسولاً ويُحدَّث عند كل تمركز */
  const [visits, setVisits] = useState<Record<string, number>>(() => loadGraphVisits());
  if (entries.length === 0) return null;

  /* التمركز على عقدة = تسجيل زيارتها (فيهبط تعريفها لاحقاً) */
  const focus = (n: GraphNode) => { setVisits(recordGraphVisit(n.label)); setNode(n); };

  const nb = neighbors(majorId, node);
  const centerColor = KIND_COLOR[node.kind];

  return (
    <section className="ds-card ds-stack-tight"
      style={{
        background: "linear-gradient(160deg, color-mix(in srgb, var(--accent) 6%, var(--surface)) 0%, var(--surface) 80%)",
        borderColor: "color-mix(in srgb, var(--accent) 18%, var(--border))",
      }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[20px]" aria-hidden="true">🕸️</span>
        <div className="flex-1">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>شبكة تخصصك — كل شيء متصل</h2>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>
            ابدأ من أي شيء، ونُريك كل ما يتّصل به — ثم اقفز لأي عقدة.
          </p>
        </div>
      </div>

      {/* جرّب الدخول من أي نوع — لا اتجاه واحد */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
        <span className="t-caption font-black flex-shrink-0 self-center" style={{ color: "var(--text-muted)" }}>ادخل من:</span>
        {entries.map((g) => {
          const active = node.kind === g.kind;
          return (
            <button key={g.kind} onClick={() => focus(g.nodes[0])} aria-pressed={active}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[14px] font-black whitespace-nowrap flex-shrink-0 transition active:scale-95"
              style={{
                background: active ? `color-mix(in srgb, ${KIND_COLOR[g.kind]} 16%, transparent)` : "var(--surface)",
                color: active ? KIND_COLOR[g.kind] : "var(--text-muted)",
                border: `1.5px solid ${active ? `color-mix(in srgb, ${KIND_COLOR[g.kind]} 55%, transparent)` : "var(--border)"}`,
              }}>
              <span aria-hidden="true">{g.icon}</span>{KIND_ONE[g.kind]}
            </button>
          );
        })}
      </div>

      {/* العقدة المركزية */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{
          background: `color-mix(in srgb, ${centerColor} 12%, var(--surface))`,
          border: `1.5px solid color-mix(in srgb, ${centerColor} 42%, transparent)`,
        }}>
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[23px] flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${centerColor} 18%, transparent)` }} aria-hidden="true">
          {KIND_ICON[node.kind]}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="t-caption" style={{ color: centerColor }}>{KIND_ONE[node.kind]}</span>
          <span className="t-h3 leading-tight" style={{ color: "var(--text)" }}>{node.label}</span>
        </div>
      </div>

      {/* المجموعات المتّصلة — كل عقدة قابلة للنقر تُعيد التمركز */}
      <div className="flex flex-col gap-2.5">
        {nb.groups.map((g) => (
          <div key={g.kind} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="text-[15px]" aria-hidden="true">{g.icon}</span>
              <span className="t-caption font-black" style={{ color: "var(--text-muted)" }}>{g.title}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* طبقة History: الأكثر مشاهدةً يهبط، والمألوف يخفت (يبقى متاحاً) */}
              {rankBySeen(g.nodes, visits).map((n) => {
                const familiar = isFamiliar(n.label, visits);
                return (
                  <button key={n.kind + n.label} onClick={() => focus(n)}
                    className="t-caption px-2.5 py-1.5 rounded-lg text-right transition active:scale-95 flex items-center gap-1"
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderInlineStartWidth: 3,
                      borderInlineStartColor: `color-mix(in srgb, ${KIND_COLOR[n.kind]} ${familiar ? 30 : 60}%, transparent)`,
                      color: familiar ? "var(--text-muted)" : "var(--text)",
                      opacity: familiar ? 0.7 : 1,
                    }}>
                    {familiar && <span className="text-[11px]" style={{ color: "var(--success)" }} aria-hidden="true">✓</span>}
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="t-caption px-0.5" style={{ color: "var(--text-muted)" }}>
        اضغط أي عقدة لتصير المركز — وما تفتحه كثيراً يخفت (✓) ليتقدّم الجديد. الشبكة تتعلّم منك.
      </p>
    </section>
  );
}
