"use client";
/* ─── لوحة الأدمن: الرسم التفاعلي (World Model) — أداة عمل لا مجرّد رسم ───
   يُبنى حيّاً من سجلّات المستودع (يعكس تعديلات الأدمن فوراً) عبر إعادة استخدام
   KnowledgeBase. الأداء: لا يرسم كل الرسم — فقط العقدة الحالية وجوارها (عمق ١ أو ٢)
   بحدٍّ أقصى للعقد، مع التوسيع بالتنقّل. لكل نوعٍ لونٌ ثابت. اضغط عقدةً لترى/تعدّل/
   تحذف/تضيف علاقاتها، وحالتها ومصدرها وآخر تعديل، وتنتقل إليها. */
import { useEffect, useMemo, useState } from "react";
import { KnowledgeBase } from "@/lib/kb/entities/registry";
import { KIND_META, RELATION_LABEL, type EntityKind, type RelationType, type KBEntity } from "@/lib/kb/entities/schema";
import { getContentRepository, STATUS_LABEL, type ContentRecord, type ContentStatus } from "@/lib/kb/repo";

/* لونٌ ثابت لكل نوع — نعرف نوع العقدة بمجرّد النظر */
const KIND_COLOR: Record<EntityKind, string> = {
  concept: "#7c9cff", lesson: "#5fd08a", book: "#f2b53c", resource: "#38bdf8", question: "#e879f9",
  exam: "#f87171", exam_session: "#fca5a5", job: "#fb923c", career_path: "#fdba74", company: "#fbbf24",
  skill: "#2dd4bf", tool: "#22d3ee", ai_tool: "#818cf8", project: "#a3e635", certification: "#facc15",
  university: "#a78bfa", college: "#c4b5fd", major: "#f472b6", subject: "#4ade80", course: "#34d399", goal: "#f59e0b",
};
const STATUS_COLOR: Record<ContentStatus, string> = { draft: "#646E8C", review: "#F5B40A", published: "#10B981", archived: "#F87171" };
const REL_TYPES: RelationType[] = ["belongs_to", "teaches", "leads_to", "requires", "related_to", "part_of", "prerequisite", "uses"];
const MAX_NODES = 40;

interface Placed { id: string; kind: EntityKind; name: string; x: number; y: number; hop: number; }

export default function AdminGraph() {
  const repo = useMemo(() => getContentRepository(), []);
  const [records, setRecords] = useState<ContentRecord[] | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [depth, setDepth] = useState<1 | 2>(1);
  const [filters, setFilters] = useState<Set<EntityKind>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => repo.list().then((r) => { setRecords(r); });
  useEffect(() => { let alive = true; repo.list().then((r) => { if (alive) { setRecords(r); setFocus((f) => f ?? (r.find((x) => x.entity.id === "concept:ohms-law")?.entity.id ?? r[0]?.entity.id ?? null)); } }).catch(() => { if (alive) setRecords([]); }); return () => { alive = false; }; }, [repo]);

  /* رسمٌ حيّ من السجلّات + خريطة الحالة */
  const graph = useMemo(() => new KnowledgeBase((records ?? []).map((r) => r.entity)), [records]);
  const recById = useMemo(() => new Map((records ?? []).map((r) => [r.entity.id, r])), [records]);

  /* جِوار العقدة الحالية حتى العمق (BFS)، مع حدٍّ أقصى — لا نرسم كل شيء */
  const { nodes, edges, truncated } = useMemo(() => {
    const empty = { nodes: [] as Placed[], edges: [] as { a: string; b: string; type: RelationType }[], truncated: 0 };
    if (!focus || !graph.get(focus)) return empty;
    const hop = new Map<string, number>([[focus, 0]]);
    let frontier = [focus];
    for (let d = 1; d <= depth; d++) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const e of graph.edges(id)) {
          if (!(filters.size === 0 || filters.has(e.entity.kind)) && e.entity.id !== focus) continue;
          if (!hop.has(e.entity.id)) { hop.set(e.entity.id, d); next.push(e.entity.id); }
        }
      }
      frontier = next;
    }
    const ids = [...hop.keys()];
    const truncatedCount = Math.max(0, ids.length - MAX_NODES);
    const shown = new Set(ids.slice(0, MAX_NODES));
    const W = 620, H = 440, cx = W / 2, cy = H / 2;
    const byHop = new Map<number, string[]>();
    for (const id of shown) { const h = hop.get(id)!; (byHop.get(h) ?? byHop.set(h, []).get(h)!).push(id); }
    const placed: Placed[] = [];
    for (const [h, list] of byHop) {
      const R = h === 0 ? 0 : h * 150;
      list.forEach((id, i) => {
        const ang = (2 * Math.PI * i) / list.length - Math.PI / 2 + (h === 2 ? 0.3 : 0);
        const e = graph.get(id)!;
        placed.push({ id, kind: e.kind, name: e.name, x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), hop: h });
      });
    }
    const es: { a: string; b: string; type: RelationType }[] = [];
    const seen = new Set<string>();
    for (const id of shown) for (const r of graph.edges(id)) {
      if (r.dir !== "out" || !shown.has(r.entity.id)) continue;
      const key = `${id}|${r.entity.id}|${r.type}`;
      if (seen.has(key)) continue; seen.add(key);
      es.push({ a: id, b: r.entity.id, type: r.type });
    }
    return { nodes: placed, edges: es, truncated: truncatedCount };
  }, [focus, depth, graph, filters]);

  const posOf = (id: string) => nodes.find((n) => n.id === id);
  const results = useMemo(() => (q.trim() ? graph.search(q, 6) : []), [q, graph]);

  const selRec = selected ? recById.get(selected) : null;
  const selEntity = selRec?.entity;

  const save = async (updater: (e: KBEntity) => KBEntity) => {
    if (!selEntity || !selRec) return;
    setBusy(true);
    try { await repo.save(updater(selEntity), { status: selRec.status }); await load(); }
    finally { setBusy(false); }
  };
  const removeRel = (i: number) => save((e) => ({ ...e, relations: (e.relations ?? []).filter((_, j) => j !== i) }));
  const addRel = (rel: { type: RelationType; to: string }) => save((e) => ({ ...e, relations: [...(e.relations ?? []), rel] }));

  if (records === null) return <p className="t-caption" style={{ color: "var(--text-muted)" }}>جارٍ التحميل…</p>;

  return (
    <div className="flex flex-col gap-3">
      {/* بحث يتمركز عليه الرسم مباشرة */}
      <div className="ds-card ds-stack-tight">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث لتتمركز على عقدة… (مثل: قانون أوم)"
          className="w-full rounded-xl px-4 py-2.5 t-body outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
        {q.trim() && results.length > 0 && (
          <div className="flex flex-col gap-1">
            {results.map((e) => (
              <button key={e.id} onClick={() => { setFocus(e.id); setSelected(e.id); setQ(""); }} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-right" style={{ background: "var(--surface2)" }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: KIND_COLOR[e.kind] }} />
                <span className="t-body font-black flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>{e.name}</span>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>{KIND_META[e.kind].label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* فلاتر الأنواع + العمق */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(Object.keys(KIND_META) as EntityKind[]).filter((k) => (records ?? []).some((r) => r.entity.kind === k)).map((k) => {
          const on = filters.has(k);
          return (
            <button key={k} onClick={() => setFilters((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
              className="t-caption font-bold px-2 py-1 rounded-lg flex items-center gap-1.5"
              style={{ background: on ? `color-mix(in srgb, ${KIND_COLOR[k]} 22%, transparent)` : "var(--surface2)", color: on ? KIND_COLOR[k] : "var(--text-muted)", border: `1px solid ${on ? KIND_COLOR[k] : "var(--border)"}` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: KIND_COLOR[k] }} />{KIND_META[k].label}
            </button>
          );
        })}
        {filters.size > 0 && <button onClick={() => setFilters(new Set())} className="t-caption" style={{ color: "var(--text-muted)" }}>مسح</button>}
        <span className="w-px h-4" style={{ background: "var(--border)" }} />
        <button onClick={() => setDepth(depth === 1 ? 2 : 1)} className="t-caption font-bold px-2 py-1 rounded-lg" style={{ background: "var(--surface2)", color: "var(--accent-light)", border: "1px solid var(--border)" }}>عمق: {depth === 1 ? "١" : "٢"}</button>
      </div>

      {/* الرسم */}
      <div className="ds-card" style={{ padding: 0, overflow: "hidden" }}>
        <svg viewBox="0 0 620 440" className="w-full" style={{ height: "auto", display: "block" }} role="img" aria-label="رسم نموذج العالم">
          {edges.map((e, i) => {
            const a = posOf(e.a), b = posOf(e.b); if (!a || !b) return null;
            return (
              <g key={i}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth={1.4} />
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} fill="var(--text-muted)" fontSize={9} textAnchor="middle" style={{ pointerEvents: "none" }}>{RELATION_LABEL[e.type]}</text>
              </g>
            );
          })}
          {nodes.map((n) => {
            const isFocus = n.id === focus, isSel = n.id === selected;
            const rec = recById.get(n.id);
            const r = isFocus ? 26 : 18;
            return (
              <g key={n.id} style={{ cursor: "pointer" }} onClick={() => setSelected(n.id)} onDoubleClick={() => { setFocus(n.id); setSelected(n.id); }}>
                <circle cx={n.x} cy={n.y} r={r} fill={KIND_COLOR[n.kind]} fillOpacity={isFocus ? 0.95 : 0.8} stroke={isSel ? "#fff" : rec ? STATUS_COLOR[rec.status] : "transparent"} strokeWidth={isSel ? 2.5 : 2} />
                <text x={n.x} y={n.y + r + 12} fill="var(--text)" fontSize={10.5} fontWeight={isFocus ? 700 : 500} textAnchor="middle" style={{ pointerEvents: "none" }}>{n.name.length > 16 ? n.name.slice(0, 15) + "…" : n.name}</text>
              </g>
            );
          })}
        </svg>
        <div className="flex items-center justify-between px-3 py-1.5" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>{nodes.length} عقدة معروضة{truncated > 0 ? ` · +${truncated} مخفية (وسّع بالتنقّل)` : ""}</span>
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>نقرة = تحديد · نقرتان = تمركُز</span>
        </div>
      </div>

      {/* لوحة العقدة — أداة العمل */}
      {selEntity && selRec && (
        <section className="ds-card ds-stack-tight">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: KIND_COLOR[selEntity.kind] }} />
            <h3 className="t-h3 flex-1 min-w-0" style={{ color: "var(--text)" }}>{selEntity.name}</h3>
            <span className="t-caption font-black px-2 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${STATUS_COLOR[selRec.status]} 16%, transparent)`, color: STATUS_COLOR[selRec.status] }}>{STATUS_LABEL[selRec.status]}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap t-caption" style={{ color: "var(--text-muted)" }}>
            <span>{KIND_META[selEntity.kind].label}</span>
            {selEntity.meta?.source && <span>· المصدر: {selEntity.meta.source}</span>}
            {selEntity.meta?.lastUpdated && <span>· آخر تعديل: {selEntity.meta.lastUpdated}</span>}
          </div>
          {selected !== focus && <button onClick={() => setFocus(selected)} className="t-caption font-black self-start px-3 py-1.5 rounded-lg" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>⌖ تمركّز على هذه العقدة</button>}

          {/* العلاقات — عرض/حذف/إضافة/تنقّل */}
          <p className="t-caption font-black" style={{ color: "var(--text-dim)" }}>العلاقات ({(selEntity.relations ?? []).length})</p>
          <div className="flex flex-col gap-1">
            {(selEntity.relations ?? []).map((rel, i) => {
              const target = graph.get(rel.to);
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "var(--surface2)" }}>
                  <span className="t-caption" style={{ color: "var(--text-muted)" }}>{RELATION_LABEL[rel.type]}</span>
                  <button onClick={() => { if (target) { setFocus(rel.to); setSelected(rel.to); } }} className="t-caption font-black flex-1 min-w-0 truncate text-right" style={{ color: target ? "var(--accent-light)" : "var(--danger)" }}>{target?.name ?? `${rel.to} (مفقود)`}</button>
                  <button disabled={busy} onClick={() => removeRel(i)} className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>✕</button>
                </div>
              );
            })}
          </div>
          <RelAdder graph={graph} onAdd={addRel} disabled={busy} />
        </section>
      )}
    </div>
  );
}

function RelAdder({ graph, onAdd, disabled }: { graph: KnowledgeBase; onAdd: (r: { type: RelationType; to: string }) => void; disabled: boolean }) {
  const [type, setType] = useState<RelationType>("related_to");
  const [to, setTo] = useState("");
  const ids = useMemo(() => graph.all().map((e) => ({ id: e.id, name: e.name })), [graph]);
  return (
    <div className="flex items-center gap-1.5">
      <select value={type} onChange={(e) => setType(e.target.value as RelationType)} className="t-caption rounded-lg px-2 py-1.5 outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
        {REL_TYPES.map((t) => <option key={t} value={t}>{RELATION_LABEL[t]}</option>)}
      </select>
      <input list="graph-entities" value={to} onChange={(e) => setTo(e.target.value)} placeholder="اربط بكيان…" className="flex-1 min-w-0 t-caption rounded-lg px-2 py-1.5 outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
      <datalist id="graph-entities">{ids.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</datalist>
      <button disabled={disabled} onClick={() => { if (to) { onAdd({ type, to }); setTo(""); } }} className="t-caption font-black px-2.5 py-1.5 rounded-lg" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>ربط</button>
    </div>
  );
}
