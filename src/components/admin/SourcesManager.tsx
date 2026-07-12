"use client";
/* ─── لوحة إدارة المصادر (قاعدة المعرفة) ───
   إضافة/تعديل/تعطيل أي مصدر بلا تعديل كود، كشف المصادر القديمة، وتعطيل
   المنتهي تلقائياً. مكوّن مكتفٍ ذاتياً يتصل بـ /api/admin/sources بكلمة المرور. */
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authFetch";
import { SOURCE_CATEGORIES, FETCH_METHODS, type Source, type FetchMethod, type SourceCategory } from "@/lib/kb/types";

type SourceRow = Source & { freshness?: { state: string; daysOverdue: number } };
const STATE_AR: Record<string, string> = { fresh: "حديث", due: "يحتاج مراجعة", stale: "قديم", expired: "منتهٍ" };
const STATE_COLOR: Record<string, string> = { fresh: "var(--success)", due: "var(--gold)", stale: "#F59E0B", expired: "var(--danger)" };

const empty = (): Partial<Source> => ({
  id: "", category: "qudurat", name: "", org: "", url: "", official: true,
  trust: 90, fetchMethod: "scrape", updateMode: "manual", reviewCadenceDays: 30, status: "active",
});

export default function SourcesManager({ pass }: { pass: string }) {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<Partial<Source> | null>(null);
  const [stale, setStale] = useState<{ id: string; name: string; state: string; daysOverdue: number }[]>([]);
  const [filter, setFilter] = useState<SourceCategory | "all">("all");

  const call = async (body: Record<string, unknown>) => {
    const res = await authedFetch("/api/admin/sources", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, password: pass }),
    });
    return { ok: res.ok, data: await res.json() as Record<string, unknown> };
  };

  const load = async () => {
    setBusy(true); setErr("");
    const { ok, data } = await call({ mode: "list" });
    if (ok) setRows((data.sources as SourceRow[]) ?? []);
    else setErr((data.error as string) ?? "تعذّر التحميل");
    setBusy(false);
  };

  /* تحميل مبدئي — نضع الجلب بعد await فلا setState متزامن داخل الـ effect */
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await authedFetch("/api/admin/sources", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "list", password: pass }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!alive) return;
      if (res.ok) setRows((data.sources as SourceRow[]) ?? []);
      else setErr((data.error as string) ?? "تعذّر التحميل");
      setBusy(false);
    })();
    return () => { alive = false; };
  }, [pass]);

  const save = async () => {
    if (!editing) return;
    setBusy(true); setErr("");
    const { ok, data } = await call({ mode: "upsertSource", source: editing });
    if (ok) { setEditing(null); await load(); }
    else { setErr((data.error as string) ?? "تعذّر الحفظ"); setBusy(false); }
  };

  const toggle = async (s: SourceRow) => {
    setBusy(true);
    await call({ mode: "upsertSource", source: { ...s, status: s.status === "active" ? "disabled" : "active" } });
    await load();
  };

  const scan = async () => {
    setBusy(true);
    const { ok, data } = await call({ mode: "scanStale" });
    if (ok) setStale((data.stale as typeof stale) ?? []);
    setBusy(false);
  };

  const autoExpire = async () => {
    setBusy(true);
    await call({ mode: "applyAutoExpire" });
    await load(); await scan();
  };

  const shown = rows.filter((r) => filter === "all" || r.category === filter);

  return (
    <div className="flex flex-col gap-3">
      {err && <p className="text-[15px]" style={{ color: "var(--danger)" }}>{err}</p>}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setEditing(empty())} className="px-3 py-1.5 rounded-xl text-[15px] font-bold"
          style={{ background: "var(--accent)", color: "#fff" }}>+ مصدر جديد</button>
        <button onClick={scan} disabled={busy} className="px-3 py-1.5 rounded-xl text-[15px] font-bold"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>🔍 افحص القديم</button>
        <button onClick={autoExpire} disabled={busy} className="px-3 py-1.5 rounded-xl text-[15px] font-bold"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>⏳ عطّل المنتهي تلقائياً</button>
        <select value={filter} onChange={(e) => setFilter(e.target.value as SourceCategory | "all")}
          className="px-3 py-1.5 rounded-xl text-[15px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="all">كل الأقسام</option>
          {SOURCE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      {stale.length > 0 && (
        <div className="rounded-xl p-3 text-[15px]" style={{ background: "color-mix(in srgb, var(--gold) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)" }}>
          <p className="font-bold mb-1" style={{ color: "var(--text)" }}>مصادر تحتاج انتباهاً ({stale.length}):</p>
          {stale.slice(0, 8).map((s) => (
            <p key={s.id} style={{ color: STATE_COLOR[s.state] }}>• {s.name} — {STATE_AR[s.state]} (+{s.daysOverdue} يوم)</p>
          ))}
        </div>
      )}

      {/* نموذج التحرير */}
      {editing && (
        <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--accent)" }}>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="المعرّف (id)" value={editing.id ?? ""} onChange={(e) => setEditing({ ...editing, id: e.target.value })} className="px-2 py-1.5 rounded-lg text-[15px]" style={inp} />
            <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as SourceCategory })} className="px-2 py-1.5 rounded-lg text-[15px]" style={inp}>
              {SOURCE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input placeholder="الاسم" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="px-2 py-1.5 rounded-lg text-[15px]" style={inp} />
            <input placeholder="الجهة" value={editing.org ?? ""} onChange={(e) => setEditing({ ...editing, org: e.target.value })} className="px-2 py-1.5 rounded-lg text-[15px]" style={inp} />
            <input placeholder="الرابط https://" value={editing.url ?? ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} className="px-2 py-1.5 rounded-lg text-[15px] col-span-2" style={inp} />
            <select value={editing.fetchMethod} onChange={(e) => setEditing({ ...editing, fetchMethod: e.target.value as FetchMethod })} className="px-2 py-1.5 rounded-lg text-[15px]" style={inp}>
              {Object.entries(FETCH_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={editing.updateMode} onChange={(e) => setEditing({ ...editing, updateMode: e.target.value as "auto" | "manual" })} className="px-2 py-1.5 rounded-lg text-[15px]" style={inp}>
              <option value="manual">تحديث يدوي</option>
              <option value="auto">تحديث تلقائي</option>
            </select>
            <label className="flex items-center gap-2 text-[15px]" style={{ color: "var(--text)" }}>
              <input type="checkbox" checked={editing.official ?? false} onChange={(e) => setEditing({ ...editing, official: e.target.checked })} /> رسمي
            </label>
            <input type="number" placeholder="الثقة 0-100" value={editing.trust ?? 90} onChange={(e) => setEditing({ ...editing, trust: Number(e.target.value) })} className="px-2 py-1.5 rounded-lg text-[15px]" style={inp} />
            <input type="number" placeholder="دورية المراجعة (يوم)" value={editing.reviewCadenceDays ?? 30} onChange={(e) => setEditing({ ...editing, reviewCadenceDays: Number(e.target.value) })} className="px-2 py-1.5 rounded-lg text-[15px]" style={inp} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="px-4 py-1.5 rounded-xl text-[15px] font-bold" style={{ background: "var(--accent)", color: "#fff" }}>حفظ</button>
            <button onClick={() => setEditing(null)} className="px-4 py-1.5 rounded-xl text-[15px]" style={{ color: "var(--text-muted)" }}>إلغاء</button>
          </div>
        </div>
      )}

      {/* قائمة المصادر */}
      <div className="flex flex-col gap-1.5">
        {shown.map((s) => (
          <div key={s.id} className="rounded-xl px-3 py-2 flex items-center gap-2 text-[15px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", opacity: s.status === "active" ? 1 : 0.55 }}>
            <span title={s.official ? "رسمي" : "موثوق غير رسمي"}>{s.official ? "🏛️" : "🔶"}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate" style={{ color: "var(--text)" }}>{s.name}</p>
              <p className="text-[12px] truncate" style={{ color: "var(--text-muted)" }}>
                {s.org} · ثقة {s.trust} · {FETCH_METHODS[s.fetchMethod].split(" ")[0]} · {s.updateMode === "auto" ? "تلقائي" : "يدوي"}
                {s.freshness && s.freshness.state !== "fresh" && <span style={{ color: STATE_COLOR[s.freshness.state] }}> · {STATE_AR[s.freshness.state]}</span>}
              </p>
            </div>
            <button onClick={() => setEditing(s)} className="px-2 py-1 rounded-lg text-[14px]" style={{ color: "var(--accent-light)" }}>تعديل</button>
            <button onClick={() => toggle(s)} className="px-2 py-1 rounded-lg text-[14px]" style={{ color: s.status === "active" ? "var(--danger)" : "var(--success)" }}>
              {s.status === "active" ? "تعطيل" : "تفعيل"}
            </button>
          </div>
        ))}
        {shown.length === 0 && !busy && <p className="text-[15px] text-center py-4" style={{ color: "var(--text-muted)" }}>لا مصادر في هذا القسم</p>}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" };
