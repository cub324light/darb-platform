"use client";
/* ─── لوحة الأدمن: قائمة المراجعة (Review Queue) ───
   كل ما حالته «مراجعة» في مكانٍ واحد: افتح · اقبل (انشر) · ارفض (أعده مسوّدة).
   تتحدّث عبر المستودع فقط (History يسجّل تلقائياً). */
import { useEffect, useMemo, useState } from "react";
import { KIND_META } from "@/lib/kb/entities/schema";
import { getContentRepository, type ContentRecord } from "@/lib/kb/repo";

export default function AdminReview() {
  const repo = useMemo(() => getContentRepository(), []);
  const [items, setItems] = useState<ContentRecord[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const reload = () => { repo.list({ status: "review" }).then(setItems).catch(() => setItems([])); };
  useEffect(() => { let alive = true; repo.list({ status: "review" }).then((r) => { if (alive) setItems(r); }).catch(() => { if (alive) setItems([]); }); return () => { alive = false; }; }, [repo]);

  const act = async (id: string, status: "published" | "draft") => {
    setBusy(true);
    try { await repo.setStatus(id, status); reload(); } finally { setBusy(false); }
  };

  if (items === null) return <p className="t-caption" style={{ color: "var(--text-muted)" }}>جارٍ التحميل…</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="ds-card flex items-center gap-3">
        <span className="text-[22px]">🔎</span>
        <div className="flex flex-col flex-1">
          <span className="t-h3" style={{ color: "var(--text)" }}>قائمة المراجعة</span>
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>{items.length} عنصرٌ بانتظار القرار</span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="ds-card t-caption text-center" style={{ color: "var(--text-muted)" }}>لا عناصر في المراجعة — انقل عنصراً إلى «مراجعة» من إدارة المحتوى.</p>
      ) : items.map((r) => (
        <section key={r.entity.id} className="ds-card ds-stack-tight">
          <div className="flex items-center gap-2.5">
            <span className="text-[18px]">{KIND_META[r.entity.kind].icon}</span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="t-title" style={{ color: "var(--text)" }}>{r.entity.name}</span>
              <span className="t-caption truncate" style={{ color: "var(--text-muted)" }}>{KIND_META[r.entity.kind].label} · {r.entity.summary}</span>
            </div>
            <button onClick={() => setOpenId(openId === r.entity.id ? null : r.entity.id)} className="t-caption font-bold px-2 py-1 rounded-lg" style={{ background: "var(--surface2)", color: "var(--accent-light)" }}>{openId === r.entity.id ? "إخفاء" : "افتح"}</button>
          </div>
          {openId === r.entity.id && (
            <pre className="t-caption whitespace-pre-wrap rounded-lg p-3" style={{ background: "var(--surface2)", color: "var(--text-dim)", fontFamily: "inherit" }}>{KB_describe(r)}</pre>
          )}
          <div className="flex items-center gap-2">
            <button disabled={busy} onClick={() => act(r.entity.id, "published")} className="t-caption font-black px-3.5 py-2 rounded-lg flex-1" style={{ background: "var(--success)", color: "#fff" }}>✓ اقبل وانشر</button>
            <button disabled={busy} onClick={() => act(r.entity.id, "draft")} className="t-caption font-black px-3.5 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: "var(--danger)" }}>✕ ارفض</button>
          </div>
        </section>
      ))}
    </div>
  );
}

/* عرضٌ نصّي موجز للمراجعة (اسم/ملخّص/حقول المفهوم/الروابط) */
function KB_describe(r: ContentRecord): string {
  const e = r.entity;
  const lines = [`${e.name} — ${e.summary}`];
  if (e.kind === "concept") {
    if (e.category) lines.push(`المجال: ${e.category}`);
    if (e.body?.definition) lines.push(`التعريف: ${e.body.definition}`);
    if (e.body?.examples?.length) lines.push(`أمثلة: ${e.body.examples.join("، ")}`);
  }
  for (const rel of e.relations ?? []) lines.push(`↔ ${rel.type} → ${rel.to}`);
  return lines.join("\n");
}
