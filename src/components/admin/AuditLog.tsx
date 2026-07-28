"use client";
/* ─── سجلّ التدقيق (Audit Log) ───
   كل عملية مشرف: مَن، ماذا، ما الذي تغيّر (قبل/بعد)، متى، IP، الجهاز.
   بحث وتصفية حسب القسم/المشرف/النطاق الزمني. يتصل بـ /api/admin/audit. */
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authFetch";
import type { AuditRow, AuditQuery } from "@/lib/admin/auditFilter";

const ACTION_AR: Record<string, string> = {
  set_role: "تعديل رتبة", set_plan: "تغيير باقة", block_user: "حظر", unblock_user: "فك حظر",
  block_user_timed: "إيقاف مؤقت", delete_user: "حذف مستخدم", reset_user: "تصفير تقدّم",
  report_delete: "حذف رسالة بلاغ", report_block: "حظر من بلاغ", report_dismiss: "تجاهل بلاغ",
  announce_create: "نشر إعلان", announce_edit: "تعديل إعلان", announce_pin: "تثبيت إعلان", announce_delete: "حذف إعلان",
  send_email: "إرسال بريد", upsert_source: "تعديل مصدر", delete_source: "حذف مصدر",
  upsert_entry: "تعديل معرفة", delete_entry: "حذف معرفة", auto_expire: "تعطيل تلقائي",
};
const actionLabel = (a: string) => ACTION_AR[a] ?? a;

function fmtTime(ms: number): string {
  try { return new Date(ms).toLocaleString("ar-SA-u-nu-latn", { dateStyle: "short", timeStyle: "short" }); }
  catch { return String(ms); }
}

export default function AuditLog({ pass }: { pass: string }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [areas, setAreas] = useState<{ id: string; label: string }[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [actor, setActor] = useState("");

  const call = async (query: AuditQuery, cur: number | null) => {
    const res = await authedFetch("/api/admin/audit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "log", query, cursor: cur, password: pass }),
    });
    return { ok: res.ok, data: await res.json() as Record<string, unknown> };
  };

  const run = async (reset: boolean) => {
    setBusy(true); setErr("");
    const cur = reset ? null : cursor;
    const { ok, data } = await call({ q: q || undefined, area: area || undefined, actor: actor || undefined }, cur);
    if (ok) {
      const newRows = (data.rows as AuditRow[]) ?? [];
      setRows((prev) => reset ? newRows : [...prev, ...newRows]);
      setCursor((data.nextCursor as number | null) ?? null);
      setHasMore((data.nextCursor as number | null) != null);
    } else setErr((data.error as string) ?? "تعذّر التحميل");
    setBusy(false);
  };

  /* تحميل مبدئي + قوائم التصفية (بعد await فلا setState متزامن في الـ effect) */
  useEffect(() => {
    let alive = true;
    (async () => {
      const post = (b: Record<string, unknown>) => authedFetch("/api/admin/audit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, password: pass }),
      });
      const meta = await post({ mode: "meta" }).then((r) => r.json()).catch(() => ({}));
      const res = await post({ mode: "log", query: {}, cursor: null });
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (!alive) return;
      setAreas((meta.areas as { id: string; label: string }[]) ?? []);
      if (res.ok) {
        setRows((data.rows as AuditRow[]) ?? []);
        setCursor((data.nextCursor as number | null) ?? null);
        setHasMore((data.nextCursor as number | null) != null);
      } else setErr((data.error as string) ?? "تعذّر التحميل");
      setBusy(false);
    })();
    return () => { alive = false; };
  }, [pass]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div>
        <p className="title-md" style={{ color: "var(--text)" }}>🛡️ سجلّ التدقيق</p>
        <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>كل عملية حسّاسة يقوم بها أي مشرف — من، ماذا، متى، ومن أين.</p>
      </div>

      {/* المرشّحات */}
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث (ملخّص/هدف/IP)…"
          className="px-3 py-2 rounded-xl text-[15px] flex-1 min-w-[160px]" style={inp} />
        <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="المشرف (إيميل/uid)"
          className="px-3 py-2 rounded-xl text-[15px]" style={inp} />
        <select value={area} onChange={(e) => setArea(e.target.value)} className="px-3 py-2 rounded-xl text-[15px]" style={inp}>
          <option value="">كل الأقسام</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <button onClick={() => run(true)} disabled={busy} className="px-4 py-2 rounded-xl text-[15px] font-bold"
          style={{ background: "var(--accent)", color: "#fff" }}>{busy ? "…" : "بحث"}</button>
      </div>

      {err && <p className="text-[15px]" style={{ color: "var(--danger)" }}>{err}</p>}

      {/* الجدول */}
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl px-3 py-2 text-[15px]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <button className="w-full flex items-center gap-2 text-right" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
              <span className="text-[12px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>{actionLabel(r.action)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate" style={{ color: "var(--text)" }}>{r.summary || r.action}</p>
                <p className="text-[12px] truncate" style={{ color: "var(--text-muted)" }}>
                  {r.actorEmail || r.actorUid} · {r.actorRole} · {fmtTime(r.at)}{r.ip ? ` · ${r.ip}` : ""}
                </p>
              </div>
              <span style={{ color: "var(--text-muted)" }}>{expanded === r.id ? "▲" : "▼"}</span>
            </button>
            {expanded === r.id && (
              <div className="mt-2 pt-2 flex flex-col gap-1 text-[14px]" style={{ borderTop: "1px solid var(--border)", color: "var(--text-dim)" }}>
                {r.targetId && <p>الهدف: <span style={{ color: "var(--text)" }}>{r.targetType ? `${r.targetType}/` : ""}{r.targetId}</span></p>}
                {r.before && <p>قبل: <span style={{ color: "var(--danger)" }}>{r.before}</span></p>}
                {r.after && <p>بعد: <span style={{ color: "var(--success)" }}>{r.after}</span></p>}
                {r.changes && r.changes.map((c, i) => <p key={i}>• {c.field}: <span style={{ color: "var(--danger)" }}>{c.before || "—"}</span> ← <span style={{ color: "var(--success)" }}>{c.after || "—"}</span></p>)}
                {r.device && <p className="truncate">الجهاز: {r.device}</p>}
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && !busy && <p className="text-center py-8 text-[15px]" style={{ color: "var(--text-muted)" }}>لا عمليات مسجّلة بعد</p>}
      </div>

      {hasMore && (
        <button onClick={() => run(false)} disabled={busy} className="self-center px-5 py-2 rounded-xl text-[15px] font-bold"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
          {busy ? "…" : "تحميل المزيد"}
        </button>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" };
