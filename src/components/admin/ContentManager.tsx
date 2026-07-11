"use client";
/* ─── لوحة الأدمن: إدارة المحتوى (World Model) ───
   إنشاء/تعديل/حذف/نشر/مراجعة المفاهيم وبقية الكيانات بدون كتابة كود. تتحدّث فقط عبر
   getContentRepository() — لا تلمس Firestore مباشرة (تبديل قاعدة البيانات لا يمسّها).
   الحقيقة هي الرسم: الروابط تُختار من كيانات World Model القائمة، لا معرّفاتٍ يدوية. */
import { useEffect, useMemo, useState } from "react";
import { KB, KIND_META, type EntityKind } from "@/lib/kb/entities";
import type { KBEntity, ConceptEntity, RelationType, ContentStatus } from "@/lib/kb/entities/schema";
import { RELATION_LABEL } from "@/lib/kb/entities/schema";
import {
  getContentRepository, STATUS_LABEL, STATUS_FLOW, type ContentRecord,
} from "@/lib/kb/repo";

const STATUS_COLOR: Record<ContentStatus, string> = {
  draft: "var(--text-muted)", review: "var(--gold)", published: "var(--success)", archived: "var(--danger)",
};
const nextStatus = (s: ContentStatus): ContentStatus | null => {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
};
const entityId = (kind: string, slug: string) => `${kind}:${slug}`;
const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9؀-ۿ-]/g, "").slice(0, 48) || `c-${Date.now().toString(36)}`;

type Draft = {
  id: string; kind: EntityKind; name: string; nameEn: string; category: string; summary: string;
  importance: number; difficulty: "" | "easy" | "medium" | "hard"; examFrequency: string;
  definition: string; whyImportant: string; examples: string;
  relations: { type: RelationType; to: string }[];
  isNew: boolean;
};

const REL_TYPES: RelationType[] = ["belongs_to", "teaches", "leads_to", "requires", "related_to", "part_of", "prerequisite", "uses"];

function draftFromRecord(rec: ContentRecord): Draft {
  const e = rec.entity;
  const c = e.kind === "concept" ? (e as ConceptEntity) : null;
  return {
    id: e.id, kind: e.kind, name: e.name, nameEn: e.nameEn ?? "", category: c?.category ?? "", summary: e.summary,
    importance: e.meta?.importance ?? 50, difficulty: c?.difficulty ?? "", examFrequency: c?.examFrequency != null ? String(c.examFrequency) : "",
    definition: c?.body?.definition ?? "", whyImportant: c?.body?.whyImportant ?? "", examples: (c?.body?.examples ?? []).join("\n"),
    relations: (e.relations ?? []).map((r) => ({ type: r.type, to: r.to })), isNew: false,
  };
}
const emptyDraft = (): Draft => ({
  id: "", kind: "concept", name: "", nameEn: "", category: "", summary: "", importance: 50, difficulty: "", examFrequency: "",
  definition: "", whyImportant: "", examples: "", relations: [], isNew: true,
});

function draftToEntity(d: Draft): KBEntity {
  const id = d.isNew ? entityId(d.kind, slugify(d.nameEn || d.name)) : d.id;
  const base = {
    kind: d.kind, id, name: d.name.trim(), nameEn: d.nameEn.trim() || undefined, summary: d.summary.trim(),
    relations: d.relations.filter((r) => r.to),
    meta: { version: 1, lastUpdated: new Date().toISOString().slice(0, 10), importance: d.importance },
  } as KBEntity;
  if (d.kind === "concept") {
    const examples = d.examples.split("\n").map((s) => s.trim()).filter(Boolean);
    return {
      ...base, category: d.category.trim() || undefined,
      difficulty: d.difficulty || undefined, examFrequency: d.examFrequency ? Number(d.examFrequency) : undefined,
      body: (d.definition || d.whyImportant || examples.length) ? { definition: d.definition.trim() || undefined, whyImportant: d.whyImportant.trim() || undefined, examples: examples.length ? examples : undefined } : undefined,
    } as ConceptEntity;
  }
  return base;
}

export default function ContentManager() {
  const repo = useMemo(() => getContentRepository(), []);
  const [records, setRecords] = useState<ContentRecord[] | null>(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<EntityKind | "all">("concept");
  const [status, setStatus] = useState<ContentStatus | "all">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = async () => {
    setErr(null);
    try { setRecords(await repo.list()); }
    catch (e) { setErr(`تعذّر تحميل المحتوى من ${repo.backend}: ${(e as Error).message}`); setRecords([]); }
  };
  /* التحميل الأول — لا setState متزامن داخل الـeffect (نُحدّث بعد حدّ async فقط) */
  useEffect(() => {
    let alive = true;
    repo.list()
      .then((list) => { if (alive) setRecords(list); })
      .catch((e: Error) => { if (alive) { setErr(`تعذّر تحميل المحتوى من ${repo.backend}: ${e.message}`); setRecords([]); } });
    return () => { alive = false; };
  }, [repo]);

  const filtered = (records ?? []).filter((r) =>
    (kind === "all" || r.entity.kind === kind) &&
    (status === "all" || r.status === status) &&
    (!search.trim() || `${r.entity.name} ${r.entity.nameEn ?? ""} ${r.entity.summary}`.includes(search.trim())));

  const allEntities = useMemo(() => KB.all().map((e) => ({ id: e.id, name: e.name })), []);

  const mutate = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); await reload(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const saveDraft = () => draft && mutate(async () => { await repo.save(draftToEntity(draft), { status: draft.isNew ? "draft" : undefined }); setDraft(null); });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of records ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [records]);

  return (
    <div className="flex flex-col gap-3">
      {/* الرأس + المزوّد */}
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="t-h3 flex-1" style={{ color: "var(--text)" }}>إدارة المحتوى</h2>
        <span className="t-caption font-mono-nums px-2.5 py-1 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>المزوّد: {repo.backend}</span>
        <button onClick={() => setDraft(emptyDraft())} className="t-caption font-black px-3.5 py-2 rounded-xl transition active:scale-95" style={{ background: "var(--accent)", color: "#fff" }}>＋ عنصر جديد</button>
      </div>

      {err && <p className="ds-card t-caption" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>{err}</p>}

      {/* فلاتر */}
      <div className="ds-card ds-stack-tight">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الملخّص…"
          className="w-full rounded-xl px-3.5 py-2.5 t-body outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
        <div className="flex items-center gap-1.5 flex-wrap">
          <select value={kind} onChange={(e) => setKind(e.target.value as EntityKind | "all")} className="t-caption rounded-lg px-2 py-1.5 outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="all">كل الأنواع</option>
            {(Object.keys(KIND_META) as EntityKind[]).map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
          </select>
          {(["all", ...STATUS_FLOW] as (ContentStatus | "all")[]).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className="t-caption font-bold px-2.5 py-1.5 rounded-lg transition"
              style={status === s ? { background: "var(--accent)", color: "#fff" } : { background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
              {s === "all" ? "الكل" : STATUS_LABEL[s]}{s !== "all" && counts[s] ? ` ${counts[s]}` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* القائمة */}
      {records === null ? (
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>جارٍ التحميل…</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>{filtered.length} عنصر</p>
          {filtered.slice(0, 100).map((r) => {
            const nx = nextStatus(r.status);
            return (
              <div key={r.entity.id} className="ds-card ds-card-tight flex items-center gap-2.5">
                <span className="text-[18px] flex-shrink-0">{KIND_META[r.entity.kind].icon}</span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="t-title" style={{ color: "var(--text)" }}>{r.entity.name}</span>
                  <span className="t-caption truncate" style={{ color: "var(--text-muted)" }}>{r.entity.summary}</span>
                </div>
                <span className="t-caption font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `color-mix(in srgb, ${STATUS_COLOR[r.status]} 16%, transparent)`, color: STATUS_COLOR[r.status] }}>{STATUS_LABEL[r.status]}</span>
                <button onClick={() => setDraft(draftFromRecord(r))} className="t-caption font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ background: "var(--surface2)", color: "var(--accent-light)" }}>تعديل</button>
                {nx && <button disabled={busy} onClick={() => mutate(() => repo.setStatus(r.entity.id, nx))} className="t-caption font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ background: `color-mix(in srgb, ${STATUS_COLOR[nx]} 16%, transparent)`, color: STATUS_COLOR[nx] }}>← {STATUS_LABEL[nx]}</button>}
                <button disabled={busy} onClick={() => { if (confirm(`حذف «${r.entity.name}»؟`)) void mutate(() => repo.remove(r.entity.id)); }} className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>حذف</button>
              </div>
            );
          })}
        </div>
      )}

      {/* المحرّر */}
      {draft && (
        <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.65)" }} onClick={() => setDraft(null)}>
          <div className="ds-card ds-card-lg w-full max-w-lg max-h-[88vh] overflow-y-auto flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <h3 className="t-h3 flex-1" style={{ color: "var(--text)" }}>{draft.isNew ? "عنصر جديد" : "تعديل"}</h3>
              <button onClick={() => setDraft(null)} className="t-caption" style={{ color: "var(--text-muted)" }}>✕</button>
            </div>
            {draft.isNew && (
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as EntityKind })} className="rounded-lg px-3 py-2 t-body outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {(Object.keys(KIND_META) as EntityKind[]).map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
              </select>
            )}
            <Field label="الاسم"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="ipt" /></Field>
            <Field label="الاسم بالإنجليزية (للمعرّف)"><input value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} className="ipt" placeholder="ohms-law" /></Field>
            <Field label="الملخّص"><textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={2} className="ipt" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="الأهمية (٠–١٠٠)"><input type="number" min={0} max={100} value={draft.importance} onChange={(e) => setDraft({ ...draft, importance: Number(e.target.value) })} className="ipt font-mono-nums" /></Field>
              {draft.kind === "concept" && <Field label="التكرار (٠–١٠٠)"><input type="number" min={0} max={100} value={draft.examFrequency} onChange={(e) => setDraft({ ...draft, examFrequency: e.target.value })} className="ipt font-mono-nums" /></Field>}
            </div>
            {draft.kind === "concept" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="المجال/المهارة"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="ipt" /></Field>
                  <Field label="الصعوبة">
                    <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Draft["difficulty"] })} className="ipt">
                      <option value="">—</option><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option>
                    </select>
                  </Field>
                </div>
                <Field label="التعريف"><textarea value={draft.definition} onChange={(e) => setDraft({ ...draft, definition: e.target.value })} rows={2} className="ipt" /></Field>
                <Field label="لماذا مهم"><textarea value={draft.whyImportant} onChange={(e) => setDraft({ ...draft, whyImportant: e.target.value })} rows={2} className="ipt" /></Field>
                <Field label="أمثلة (سطرٌ لكل مثال)"><textarea value={draft.examples} onChange={(e) => setDraft({ ...draft, examples: e.target.value })} rows={2} className="ipt" /></Field>
              </>
            )}

            {/* الروابط — من كيانات الرسم القائمة (لا معرّفات يدوية) */}
            <div className="flex flex-col gap-1.5">
              <span className="t-caption font-black" style={{ color: "var(--text-dim)" }}>الروابط في الرسم</span>
              {draft.relations.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="t-caption flex-1 truncate" style={{ color: "var(--text)" }}>{RELATION_LABEL[r.type]} → {allEntities.find((e) => e.id === r.to)?.name ?? r.to}</span>
                  <button onClick={() => setDraft({ ...draft, relations: draft.relations.filter((_, j) => j !== i) })} className="t-caption" style={{ color: "var(--text-muted)" }}>✕</button>
                </div>
              ))}
              <RelationAdder entities={allEntities} onAdd={(rel) => setDraft({ ...draft, relations: [...draft.relations, rel] })} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button disabled={busy || !draft.name.trim()} onClick={saveDraft} className="t-body font-black px-4 py-2.5 rounded-xl transition active:scale-95 flex-1 disabled:opacity-40" style={{ background: "var(--accent)", color: "#fff" }}>{draft.isNew ? "حفظ كمسوّدة" : "حفظ"}</button>
              <button onClick={() => setDraft(null)} className="t-body font-bold px-4 py-2.5 rounded-xl" style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      <style>{`.ipt{width:100%;border-radius:10px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);outline:none;font-size:0.9rem}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="t-caption" style={{ color: "var(--text-muted)" }}>{label}</span>{children}</label>;
}

function RelationAdder({ entities, onAdd }: { entities: { id: string; name: string }[]; onAdd: (r: { type: RelationType; to: string }) => void }) {
  const [type, setType] = useState<RelationType>("belongs_to");
  const [to, setTo] = useState("");
  return (
    <div className="flex items-center gap-1.5">
      <select value={type} onChange={(e) => setType(e.target.value as RelationType)} className="t-caption rounded-lg px-2 py-1.5 outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
        {REL_TYPES.map((t) => <option key={t} value={t}>{RELATION_LABEL[t]}</option>)}
      </select>
      <input list="kb-entities" value={to} onChange={(e) => setTo(e.target.value)} placeholder="اختر كياناً…" className="flex-1 min-w-0 t-caption rounded-lg px-2 py-1.5 outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
      <datalist id="kb-entities">{entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</datalist>
      <button onClick={() => { if (to) { onAdd({ type, to }); setTo(""); } }} className="t-caption font-black px-2.5 py-1.5 rounded-lg" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>ربط</button>
    </div>
  );
}
