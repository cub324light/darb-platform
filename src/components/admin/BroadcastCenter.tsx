"use client";
/* ─── مركز الإشعارات (Broadcast Center) ───
   واجهة إدارية تُنشئ تعريفات الإشعارات الجماعية (نوع/جمهور/جدولة) وتعرض
   إحصاءاتها. التسليم يقوم به محرّك الإشعار في العميل — لا منطق محرّك هنا. */
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authFetch";
import {
  BROADCAST_TYPES, AUDIENCE_KINDS, BROADCAST_TEMPLATES, EMPTY_AUDIENCE,
  type Broadcast, type BroadcastType, type AudienceFilter, type AudienceKind,
} from "@/lib/broadcast/types";
import { describeAudience, validateAudience } from "@/lib/broadcast/audience";

const STAGES = ["ثانوي", "جامعي", "خريج"];
const GRADES = ["أول ثانوي", "ثاني ثانوي", "ثالث ثانوي"];
const STATUS_AR: Record<string, string> = { draft: "مسودة", scheduled: "مجدول", sent: "أُرسل", canceled: "ملغى" };
const STATUS_COLOR: Record<string, string> = { draft: "var(--text-muted)", scheduled: "var(--gold)", sent: "var(--success)", canceled: "var(--danger)" };

type Draft = {
  id?: string; type: BroadcastType; title: string; body: string; targetPage: string; audience: AudienceFilter;
};
const blank = (): Draft => ({ type: "announcement", title: "", body: "", targetPage: "", audience: { ...EMPTY_AUDIENCE } });

export default function BroadcastCenter({ pass }: { pass: string }) {
  const [list, setList] = useState<Broadcast[]>([]);
  const [draft, setDraft] = useState<Draft>(blank());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [estimate, setEstimate] = useState<number | null>(null);
  const [schedAt, setSchedAt] = useState("");

  const call = async (b: Record<string, unknown>) => {
    const res = await authedFetch("/api/admin/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, password: pass }),
    });
    return { ok: res.ok, data: await res.json() as Record<string, unknown> };
  };

  const load = async () => {
    const { ok, data } = await call({ mode: "list" });
    if (ok) setList((data.broadcasts as Broadcast[]) ?? []);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await authedFetch("/api/admin/broadcast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "list", password: pass }),
      });
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (alive && res.ok) setList((data.broadcasts as Broadcast[]) ?? []);
    })();
    return () => { alive = false; };
  }, [pass]);

  const setAud = (patch: Partial<AudienceFilter>) => setDraft((d) => ({ ...d, audience: { ...d.audience, ...patch } }));

  const doEstimate = async () => {
    setEstimate(null);
    const { ok, data } = await call({ mode: "estimate", audience: draft.audience });
    if (ok) setEstimate(Number(data.targeted ?? 0));
  };

  const save = async (asScheduled: boolean): Promise<string | null> => {
    const aErr = validateAudience(draft.audience);
    if (!draft.title.trim() || !draft.body.trim()) { setErr("العنوان والنص مطلوبان"); return null; }
    if (aErr) { setErr(aErr); return null; }
    setBusy(true); setErr(""); setMsg("");
    const scheduledAt = asScheduled && schedAt ? new Date(schedAt).getTime() : null;
    const { ok, data } = await call({
      mode: "save",
      broadcast: { ...draft, status: asScheduled ? "scheduled" : "draft", scheduledAt },
    });
    setBusy(false);
    if (!ok) { setErr((data.error as string) ?? "تعذّر الحفظ"); return null; }
    const b = data.broadcast as Broadcast;
    setDraft((d) => ({ ...d, id: b.id }));
    await load();
    return b.id;
  };

  const send = async () => {
    const id = draft.id ?? await save(false);
    if (!id) return;
    if (!confirm("إرسال هذا الإشعار الآن لكل الجمهور المطابق؟")) return;
    setBusy(true);
    const { ok, data } = await call({ mode: "send", id });
    setBusy(false);
    if (ok) { setMsg(`أُرسل لـ ${data.targeted} مستخدم`); setDraft(blank()); setEstimate(null); await load(); }
    else setErr((data.error as string) ?? "تعذّر الإرسال");
  };

  const schedule = async () => {
    if (!schedAt) { setErr("اختر وقت الجدولة"); return; }
    const id = draft.id ?? await save(true);
    if (!id) return;
    setBusy(true);
    const { ok, data } = await call({ mode: "schedule", id, scheduledAt: new Date(schedAt).getTime() });
    setBusy(false);
    if (ok) { setMsg("تمت الجدولة"); setDraft(blank()); await load(); }
    else setErr((data.error as string) ?? "تعذّر الجدولة");
  };

  const act = async (mode: string, id: string) => {
    if (mode === "delete" && !confirm("حذف هذا الإشعار؟")) return;
    await call({ mode, id });
    if (mode === "duplicate") setMsg("نُسخ كمسودة جديدة");
    await load();
  };

  const reuse = (b: Broadcast) => {
    setDraft({ id: undefined, type: b.type, title: b.title, body: b.body, targetPage: b.targetPage ?? "", audience: { ...b.audience } });
    setEstimate(null); setMsg("جاهز لإعادة الإرسال — عدّل ثم أرسل");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyTemplate = (id: string) => {
    const t = BROADCAST_TEMPLATES.find((x) => x.id === id);
    if (t) setDraft((d) => ({ ...d, type: t.type, title: t.title, body: t.body }));
  };

  const k = draft.audience.kind;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div>
        <p className="title-md" style={{ color: "var(--text)" }}>📢 مركز الإشعارات</p>
        <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>أنشئ إشعاراً، استهدف فئة، عاينه، ثم أرسله أو جدوله. التسليم عبر محرّك الإشعار.</p>
      </div>

      {/* المُنشئ */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {/* القوالب + النوع */}
        <div className="flex flex-wrap gap-2">
          <select onChange={(e) => e.target.value && applyTemplate(e.target.value)} value="" className="px-3 py-2 rounded-xl text-[13px]" style={inp}>
            <option value="">📋 قالب جاهز…</option>
            {BROADCAST_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as BroadcastType })} className="px-3 py-2 rounded-xl text-[13px]" style={inp}>
            {BROADCAST_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
        </div>

        <input placeholder="عنوان الإشعار" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="px-3 py-2 rounded-xl text-[14px] font-bold" style={inp} />
        <textarea placeholder="نص الإشعار" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={3} className="px-3 py-2 rounded-xl text-[13px]" style={inp} />
        <input placeholder="صفحة الوجهة (اختياري، مثل /dashboard)" value={draft.targetPage} onChange={(e) => setDraft({ ...draft, targetPage: e.target.value })} className="px-3 py-2 rounded-xl text-[12px]" style={inp} />

        {/* مُنشئ الجمهور */}
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <p className="text-[12px] font-bold" style={{ color: "var(--text)" }}>الجمهور المستهدف</p>
          <select value={k} onChange={(e) => setDraft({ ...draft, audience: { kind: e.target.value as AudienceKind } })} className="px-3 py-2 rounded-xl text-[13px]" style={inp}>
            {AUDIENCE_KINDS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>

          {k === "stage" && (
            <select value={draft.audience.stage ?? ""} onChange={(e) => setAud({ stage: e.target.value })} className="px-3 py-2 rounded-xl text-[13px]" style={inp}>
              <option value="">اختر المرحلة</option>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {k === "grade" && (
            <select value={draft.audience.grade ?? ""} onChange={(e) => setAud({ grade: e.target.value })} className="px-3 py-2 rounded-xl text-[13px]" style={inp}>
              <option value="">اختر الصف</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          {k === "university" && (
            <input placeholder="اسم الجامعة (مطابقة جزئية)" value={draft.audience.university ?? ""} onChange={(e) => setAud({ university: e.target.value })} className="px-3 py-2 rounded-xl text-[13px]" style={inp} />
          )}
          {k === "rank" && (
            <div className="flex gap-2">
              <input type="number" placeholder="RP من" value={draft.audience.minRp ?? ""} onChange={(e) => setAud({ minRp: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-2 rounded-xl text-[13px] flex-1" style={inp} />
              <input type="number" placeholder="RP إلى" value={draft.audience.maxRp ?? ""} onChange={(e) => setAud({ maxRp: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-2 rounded-xl text-[13px] flex-1" style={inp} />
            </div>
          )}
          {k === "inactive" && (
            <input type="number" placeholder="غير نشِط منذ (أيام)" value={draft.audience.inactiveDays ?? 7} onChange={(e) => setAud({ inactiveDays: Number(e.target.value) })} className="px-3 py-2 rounded-xl text-[13px]" style={inp} />
          )}
          {k === "score" && (
            <div className="flex gap-2">
              <select value={draft.audience.exam ?? "qudurat"} onChange={(e) => setAud({ exam: e.target.value as "qudurat" | "tahsili" })} className="px-2 py-2 rounded-xl text-[13px]" style={inp}>
                <option value="qudurat">القدرات</option><option value="tahsili">التحصيلي</option>
              </select>
              <select value={draft.audience.scoreOp ?? "gte"} onChange={(e) => setAud({ scoreOp: e.target.value as "gte" | "lte" })} className="px-2 py-2 rounded-xl text-[13px]" style={inp}>
                <option value="gte">≥</option><option value="lte">≤</option>
              </select>
              <input type="number" placeholder="الدرجة" value={draft.audience.scoreValue ?? ""} onChange={(e) => setAud({ scoreValue: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-2 rounded-xl text-[13px] flex-1" style={inp} />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={doEstimate} className="px-3 py-1.5 rounded-lg text-[12px] font-bold" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>تقدير العدد</button>
            {estimate != null && <span className="text-[12px]" style={{ color: "var(--accent-light)" }}>≈ {estimate} مستخدم</span>}
          </div>
        </div>

        {/* المعاينة */}
        <div className="rounded-xl p-3" style={{ background: "var(--bg)", border: "1px dashed var(--border)" }}>
          <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>معاينة · {describeAudience(draft.audience)}</p>
          <p className="font-black text-[14px]" style={{ color: "var(--text)" }}>{BROADCAST_TYPES.find((t) => t.id === draft.type)?.icon} {draft.title || "العنوان"}</p>
          <p className="text-[12.5px]" style={{ color: "var(--text-dim)" }}>{draft.body || "نص الإشعار…"}</p>
        </div>

        {err && <p className="text-[13px]" style={{ color: "var(--danger)" }}>{err}</p>}
        {msg && <p className="text-[13px]" style={{ color: "var(--success)" }}>{msg}</p>}

        {/* الإجراءات */}
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => save(false)} disabled={busy} className="px-4 py-2 rounded-xl text-[13px] font-bold" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>حفظ كمسودة</button>
          <button onClick={send} disabled={busy} className="px-4 py-2 rounded-xl text-[13px] font-bold" style={{ background: "var(--accent)", color: "#fff" }}>إرسال الآن</button>
          <input type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} className="px-2 py-2 rounded-xl text-[12px]" style={inp} />
          <button onClick={schedule} disabled={busy} className="px-4 py-2 rounded-xl text-[13px] font-bold" style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", border: "1px solid var(--gold)", color: "var(--gold)" }}>جدولة</button>
          {draft.id && <button onClick={() => { setDraft(blank()); setEstimate(null); }} className="px-3 py-2 text-[12px]" style={{ color: "var(--text-muted)" }}>جديد</button>}
        </div>
      </div>

      {/* السجل + الإحصاءات */}
      <div className="flex flex-col gap-2">
        <p className="font-black text-[14px]" style={{ color: "var(--text)" }}>سجل الإشعارات</p>
        {list.map((b) => (
          <div key={b.id} className="rounded-xl px-3 py-2.5 text-[13px]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[16px]">{BROADCAST_TYPES.find((t) => t.id === b.type)?.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate" style={{ color: "var(--text)" }}>{b.title}</p>
                <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{describeAudience(b.audience)}</p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `color-mix(in srgb, ${STATUS_COLOR[b.status]} 14%, transparent)`, color: STATUS_COLOR[b.status] }}>{STATUS_AR[b.status]}</span>
            </div>
            {b.status === "sent" && (
              <div className="flex gap-3 mt-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <span>📤 مُرسل: <b style={{ color: "var(--text)" }}>{b.stats.targeted}</b></span>
                <span>📥 وصل: <b style={{ color: "var(--accent-light)" }}>{b.stats.delivered}</b></span>
                <span>👁️ فُتح: <b style={{ color: "var(--success)" }}>{b.stats.opened}</b></span>
                <span>🚫 تُجوهِل: <b style={{ color: "var(--danger)" }}>{b.stats.dismissed}</b></span>
              </div>
            )}
            <div className="flex gap-2 mt-1.5">
              <button onClick={() => reuse(b)} className="text-[12px]" style={{ color: "var(--accent-light)" }}>إعادة استخدام</button>
              {(b.status === "scheduled" || b.status === "sent") && <button onClick={() => act("cancel", b.id)} className="text-[12px]" style={{ color: "var(--gold)" }}>إلغاء</button>}
              <button onClick={() => act("duplicate", b.id)} className="text-[12px]" style={{ color: "var(--text-muted)" }}>نسخ</button>
              {(b.status === "draft" || b.status === "canceled") && <button onClick={() => act("delete", b.id)} className="text-[12px]" style={{ color: "var(--danger)" }}>حذف</button>}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-[13px] text-center py-4" style={{ color: "var(--text-muted)" }}>لا إشعارات بعد</p>}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" };
