"use client";
/* ═══════════ دفترُ اليوم الدراسي ═══════════
   «وش صار لك في يومك؟» — والجوابُ ليس كتابةً دائماً: منهم من يرسم مخطّطاً،
   ومنهم من يفضّل جدولاً. فالورقةُ ثلاثةُ أنواع، والاختيارُ للطالب.

   الصورُ عمداً ليست هنا: مكانُها ألبومُ جوّالك (انظر `MemoriesAlbum`) — أفضلُ
   جودةً وأسرعُ ولا يأكل تخزينَ المتصفّح فيُفشل حفظَ خطتك وأخطائك. */
import { useState } from "react";
import Sheet from "@/components/Sheet";
import DrawPad, { exportPng } from "./DrawPad";
import FullPage from "./FullPage";
import { useJournal, saveNote, deleteNote, newNoteId, pinNote } from "@/lib/journal/store";
import {
  notesOn, journalDays, emptyTable, isBlank, setCell, setCol, addRow, addCol, removeRow,
  searchNotes, pinnedNotes,
  type JournalNote, type NoteKind, type Stroke, type TableData,
} from "@/lib/journal/journal";
import { useSubjectNames } from "@/lib/journal/subjects";
import { dateFull, n, sheets } from "@/lib/format";

const KIND_META: Record<NoteKind, { icon: string; label: string; hint: string }> = {
  draw:  { icon: "✏️", label: "رسم",   hint: "مخطّط، معادلة، خريطة ذهنية" },
  table: { icon: "📋", label: "جدول",  hint: "حصص اليوم وواجباتها" },
  text:  { icon: "📝", label: "كتابة", hint: "ماذا صار اليوم" },
};

const today = () => new Date().toISOString().slice(0, 10);

export default function DayJournal() {
  const notes = useJournal();
  const [editing, setEditing] = useState<JournalNote | null>(null);
  const [picking, setPicking] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const day = today();
  const todayNotes = notesOn(notes, day);
  const pastDays = journalDays(notes).filter((d) => d !== day);
  const found = searchNotes(notes, q);
  const pinned = pinnedNotes(notes).filter((x) => x.date !== day);

  const start = (kind: NoteKind) => {
    setPicking(false);
    setEditing({
      /* `updatedAt` تُختم عند الحفظ لا عند الفتح — ورقةٌ فُتحت ولم تُحفظ لا وقتَ لها */
      id: newNoteId(), date: day, kind, updatedAt: 0,
      ...(kind === "table" ? { table: emptyTable() } : {}),
      ...(kind === "draw" ? { strokes: [] } : {}),
      ...(kind === "text" ? { text: "" } : {}),
    });
  };

  return (
    <section className="ds-card ds-stack-tight">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>📓 دفتر يومك</h2>
        {todayNotes.length > 0 && (
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>{sheets(todayNotes.length)} اليوم</span>
        )}
      </div>
      <p className="t-caption" style={{ color: "var(--text-muted)" }}>
        اكتب ماذا صار في يومك، أو ارسم المخطّط الذي شرحوه، أو رتّب حصصك جدولاً.
      </p>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث في دفترك…"
        className="w-full rounded-xl px-4 py-2.5 t-small outline-none"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />

      {q.trim() ? (
        found.length === 0 ? (
          <p className="t-caption text-center py-3" style={{ color: "var(--text-muted)" }}>ما فيه ورقة تطابق «{q.trim()}».</p>
        ) : (
          <div className="flex flex-col gap-2">
            {found.map((x) => <NoteRow key={x.id} note={x} onOpen={() => setEditing(x)} showDate />)}
          </div>
        )
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="flex flex-col gap-2">
              {pinned.map((x) => <NoteRow key={x.id} note={x} onOpen={() => setEditing(x)} showDate />)}
            </div>
          )}
          {todayNotes.length === 0 ? (
            <p className="t-caption text-center py-3" style={{ color: "var(--text-muted)" }}>ما فيه ورقة لليوم بعد.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {todayNotes.map((x) => <NoteRow key={x.id} note={x} onOpen={() => setEditing(x)} />)}
            </div>
          )}
        </>
      )}

      <button onClick={() => setPicking(true)}
        className="w-full rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
        style={{ background: "var(--accent)", color: "#fff" }}>
        ＋ ورقة جديدة
      </button>

      {pastDays.length > 0 && (
        <details>
          <summary className="t-caption font-bold cursor-pointer py-1" style={{ color: "var(--text-muted)" }}>
            أيامٌ سابقة ({n(pastDays.length)})
          </summary>
          <div className="flex flex-col gap-1.5 mt-2">
            {pastDays.slice(0, 30).map((d) => (
              <button key={d} onClick={() => setOpenDay(d)}
                className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-right transition active:scale-[0.99]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <span className="t-small font-bold" style={{ color: "var(--text)" }}>{dateFull(d, false)}</span>
                <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{n(notesOn(notes, d).length)}</span>
              </button>
            ))}
          </div>
        </details>
      )}

      {/* اختيارُ نوع الورقة */}
      {picking && (
        <Sheet onClose={() => setPicking(false)} title="ورقة جديدة">
          <div className="flex flex-col gap-2">
            {(Object.keys(KIND_META) as NoteKind[]).map((k) => (
              <button key={k} onClick={() => start(k)}
                className="rounded-2xl px-4 py-3.5 flex items-center gap-3 text-right transition active:scale-[0.98]"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }}>
                <span className="text-[24px]" aria-hidden="true">{KIND_META[k].icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block t-body font-black" style={{ color: "var(--text)" }}>{KIND_META[k].label}</span>
                  <span className="block t-caption" style={{ color: "var(--text-muted)" }}>{KIND_META[k].hint}</span>
                </span>
                <span className="t-body font-black" style={{ color: "var(--accent-light)" }}>←</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* يومٌ سابق */}
      {openDay && (
        <Sheet onClose={() => setOpenDay(null)} title={dateFull(openDay, false)}>
          <div className="flex flex-col gap-2">
            {notesOn(notes, openDay).map((x) => (
              <NoteRow key={x.id} note={x} onOpen={() => { setOpenDay(null); setEditing(x); }} />
            ))}
          </div>
        </Sheet>
      )}

      {editing && (
        <NoteEditor note={editing} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}

/* ── سطرُ ورقةٍ في الدفتر: الاسمُ وحده ──
   كانت البطاقةُ تعرض الرسمةَ والجدولَ معاينةً، فيصير الدفترُ جداراً من الصور
   يطول التمريرُ فيه. صار كالفهرس: نوعٌ واسم، وتُفتح بضغطة. */
function NoteRow({ note, onOpen, showDate }: { note: JournalNote; onOpen: () => void; showDate?: boolean }) {
  const meta = KIND_META[note.kind];
  const sub = [meta.label, note.subject, showDate ? dateFull(note.date, false) : null].filter(Boolean).join(" · ");
  return (
    <button onClick={onOpen}
      className="rounded-2xl px-4 py-3.5 flex items-center gap-3 text-right transition active:scale-[0.99] w-full"
      style={{ background: "var(--surface2)", border: `1px solid ${note.pinned ? "color-mix(in srgb, var(--gold) 40%, transparent)" : "var(--border)"}` }}>
      <span className="text-[20px] flex-shrink-0" aria-hidden="true">{meta.icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block t-body font-black truncate" style={{ color: "var(--text)" }}>
          {note.pinned ? "📌 " : ""}{note.title?.trim() || meta.label}
        </span>
        <span className="block t-caption truncate" style={{ color: "var(--text-muted)" }}>{sub}</span>
      </span>
      <span className="t-body font-black flex-shrink-0" style={{ color: "var(--text-muted)" }}>←</span>
    </button>
  );
}

/* ── محرّرُ الورقة — شاشةٌ كاملة ──
   الاسمُ **مطلوب**: الدفترُ يُعرض أسماءً، فورقةٌ بلا اسمٍ سطرٌ لا يدلّ على شيء
   ويضطرّ الطالبُ لفتح كلِّ ورقةٍ ليعرف ما فيها. */
function NoteEditor({ note, onClose }: { note: JournalNote; onClose: () => void }) {
  const [draft, setDraft] = useState<JournalNote>(note);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ loading: boolean; text: string } | null>(null);
  const subjects = useSubjectNames();
  const meta = KIND_META[draft.kind];
  const named = (draft.title ?? "").trim().length > 0;
  const empty = isBlank(draft);
  const canSaveNow = named && !empty;

  const save = () => {
    if (!canSaveNow) return;
    const r = saveNote({ ...draft, title: draft.title!.trim(), updatedAt: Date.now() });
    if (!r.ok) {
      setErr(r.reason === "too-many-strokes"
        ? "الرسمة كبيرة جداً — امسح بعض الخطوط."
        : "الدفتر امتلأ — احذف ورقةً قديمة قبل الحفظ.");
      return;
    }
    onClose();
  };

  const t = draft.table ?? emptyTable();
  const setT = (next: TableData) => setDraft((d) => ({ ...d, table: next }));

  return (
    <FullPage
      title={`${meta.icon} ${meta.label}`}
      onClose={onClose}
      action={
        <button onClick={save} disabled={!canSaveNow}
          className="t-small font-black px-4 py-2 rounded-xl transition active:scale-[0.97] disabled:opacity-45"
          style={{ background: "var(--accent)", color: "#fff" }}>
          حفظ
        </button>
      }>
      <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full">
        <label className="flex flex-col gap-1.5">
          <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>اسم الورقة</span>
          <input value={draft.title ?? ""} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder={draft.kind === "draw" ? "مثل: مخطّط المتجهات" : draft.kind === "table" ? "مثل: حصص الأحد" : "مثل: ماذا صار اليوم"}
            autoFocus={!named}
            className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
            style={{ background: "var(--surface2)", border: `1.5px solid ${named ? "var(--border)" : "color-mix(in srgb, var(--accent) 45%, var(--border))"}`, color: "var(--text)" }} />
        </label>

        {draft.kind === "draw" && (
          <DrawPad value={draft.strokes ?? []} onChange={(s: Stroke[]) => setDraft((d) => ({ ...d, strokes: s }))} height={420} />
        )}

        {draft.kind === "text" && (
          <textarea value={draft.text ?? ""} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} rows={16}
            placeholder="وش صار لك اليوم؟ ماذا شرحوا، وما الذي ما فهمته…"
            className="w-full rounded-2xl px-4 py-3 t-body outline-none resize-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        )}

        {draft.kind === "table" && (
          <div className="flex flex-col gap-2">
            <div className="overflow-x-auto">
              <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                <thead>
                  <tr>
                    {t.cols.map((c, j) => (
                      <th key={j} style={{ border: "1px solid var(--border)", padding: 0, minWidth: 96 }}>
                        <input value={c} onChange={(e) => setT(setCol(t, j, e.target.value))}
                          className="w-full px-2 py-2 t-caption font-black outline-none text-center"
                          style={{ background: "var(--surface2)", color: "var(--text)", border: "none" }} />
                      </th>
                    ))}
                    <th style={{ width: 34 }} />
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((cell, j) => (
                        <td key={j} style={{ border: "1px solid var(--border)", padding: 0 }}>
                          <input value={cell} onChange={(e) => setT(setCell(t, i, j, e.target.value))}
                            className="w-full px-2 py-2 t-small outline-none"
                            style={{ background: "transparent", color: "var(--text)", border: "none" }} />
                        </td>
                      ))}
                      <td style={{ width: 34 }}>
                        <button onClick={() => setT(removeRow(t, i))} aria-label="حذف الصف"
                          className="w-full py-2 t-caption" style={{ color: "var(--text-muted)" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setT(addRow(t))} className="flex-1 rounded-xl py-2 t-caption font-black"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>＋ صف</button>
              <button onClick={() => setT(addCol(t))} className="flex-1 rounded-xl py-2 t-caption font-black"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>＋ عمود</button>
            </div>
          </div>
        )}

        {/* المادة — تُختار من موادّه لا من قائمةٍ جديدة، وتُبحث بها لاحقاً */}
        {subjects.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>المادة (اختياري)</span>
            <select value={draft.subject ?? ""} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value || undefined }))}
              className="w-full rounded-xl px-4 py-3 t-body outline-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
              <option value="">— بلا مادة —</option>
              {subjects.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
        )}

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { pinNote(draft.id); setDraft((d) => ({ ...d, pinned: !d.pinned })); }}
            className="flex-1 t-caption font-black py-2.5 rounded-xl"
            style={draft.pinned
              ? { background: "color-mix(in srgb, var(--gold) 16%, transparent)", border: "1.5px solid var(--gold)", color: "var(--gold)" }
              : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
            📌 {draft.pinned ? "مثبَّتة" : "ثبّتها"}
          </button>
          {draft.kind === "draw" && (draft.strokes?.length ?? 0) > 0 && (
            <button onClick={() => exportPng(draft.strokes ?? [], draft.title ?? "رسمة")}
              className="flex-1 t-caption font-black py-2.5 rounded-xl"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
              ⬇︎ صدّرها صورة
            </button>
          )}
        </div>

        {/* دويرب يقرأ الورقة **بإذنك وحدك** — لا قراءةَ تلقائية لما تكتبه في دفترك */}
        <AskDuwairb note={draft} state={ask} setState={setAsk} />

        {err && <p className="t-caption font-bold" style={{ color: "var(--danger)" }}>{err}</p>}
        {!canSaveNow && (
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>
            {!named ? "سمِّ الورقة أوّلاً — الدفترُ يعرض الأسماء." : "الورقة فارغة بعد."}
          </p>
        )}

        <button onClick={() => { deleteNote(draft.id); onClose(); }}
          className="rounded-2xl py-3 t-body font-black mt-2"
          style={{ background: "transparent", border: "1.5px solid color-mix(in srgb, var(--danger) 40%, transparent)", color: "var(--danger)" }}>
          حذف الورقة
        </button>
      </div>
    </FullPage>
  );
}

/* ── «اسأل دويرب عن هذه الورقة» ──
   الدفترُ مكانٌ يكتب فيه الطالبُ ما لم يفهمه وما ضايقه. إرسالُ ذلك إلى نموذجِ
   ذكاءٍ بلا علمه يخون الغرضَ من الدفتر. فالإرسالُ **بضغطةٍ منه**، ولا شيءَ
   يُرسَل قبلها. */
function AskDuwairb({ note, state, setState }: {
  note: JournalNote;
  state: { loading: boolean; text: string } | null;
  setState: (v: { loading: boolean; text: string } | null) => void;
}) {
  const summarize = (): string => {
    if (note.kind === "text") return note.text ?? "";
    if (note.kind === "table") {
      const t = note.table;
      if (!t) return "";
      return [t.cols.join(" | "), ...t.rows.map((r) => r.join(" | "))].join("\n");
    }
    return "";
  };
  const body = summarize().trim();
  /* الرسمةُ خطوطٌ لا نصّ — لا نرسل إحداثياتٍ إلى نموذجٍ ونسمّيه سؤالاً */
  if (note.kind === "draw") return null;
  if (!body) return null;

  const run = async () => {
    setState({ loading: true, text: "" });
    try {
      const { askDuwairb } = await import("@/lib/orchestrator");
      const { buildDuwairbProfile } = await import("@/lib/duwairb");
      const { profile } = buildDuwairbProfile();
      const prompt = `هذه ورقةٌ من دفتري الدراسيّ${note.subject ? ` في مادة ${note.subject}` : ""}` +
        `${note.title ? ` بعنوان «${note.title}»` : ""}:\n${body}\n\n` +
        `اشرح لي ما لم أفهمه فيها، واقترح كيف أذاكره.`;
      const { text } = await askDuwairb({ prompt, mode: "explain", topic: "ورقة من دفتري", profile });
      setState({ loading: false, text: (text || "تعذّر الشرح").trim() });
    } catch (e) {
      setState({ loading: false, text: e instanceof Error ? e.message : "تعذّر الاتصال — حاول مرة ثانية" });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button onClick={run} disabled={state?.loading}
        className="w-full rounded-2xl py-3 t-body font-black transition active:scale-[0.98] disabled:opacity-60"
        style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent-light)" }}>
        {state?.loading ? "…" : "🤖 اسأل دويرب عن هذه الورقة"}
      </button>
      <p className="t-caption" style={{ color: "var(--text-muted)" }}>
        لا يقرأ دفترك إلا بضغطتك هذه — ولا شيءَ يُرسَل قبلها.
      </p>
      {state && !state.loading && state.text && (
        <div className="rounded-2xl p-4"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}>
          <p className="t-caption font-bold mb-1.5" style={{ color: "var(--accent-light)" }}>شرح دويرب 🤖</p>
          <p className="t-body leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{state.text}</p>
        </div>
      )}
    </div>
  );
}
