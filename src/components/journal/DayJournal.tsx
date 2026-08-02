"use client";
/* ═══════════ دفترُ اليوم الدراسي ═══════════
   «وش صار لك في يومك؟» — والجوابُ ليس كتابةً دائماً: منهم من يرسم مخطّطاً،
   ومنهم من يفضّل جدولاً. فالورقةُ ثلاثةُ أنواع، والاختيارُ للطالب.

   الصورُ عمداً ليست هنا: مكانُها ألبومُ جوّالك (انظر `MemoriesAlbum`) — أفضلُ
   جودةً وأسرعُ ولا يأكل تخزينَ المتصفّح فيُفشل حفظَ خطتك وأخطائك. */
import { useState } from "react";
import Sheet from "@/components/Sheet";
import DrawPad, { StrokesPreview } from "./DrawPad";
import { useJournal, saveNote, deleteNote, newNoteId } from "@/lib/journal/store";
import {
  notesOn, journalDays, emptyTable, isBlank, setCell, setCol, addRow, addCol, removeRow,
  type JournalNote, type NoteKind, type Stroke, type TableData,
} from "@/lib/journal/journal";
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

  const day = today();
  const todayNotes = notesOn(notes, day);
  const pastDays = journalDays(notes).filter((d) => d !== day);

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

      {todayNotes.length === 0 ? (
        <p className="t-caption text-center py-3" style={{ color: "var(--text-muted)" }}>ما فيه ورقة لليوم بعد.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {todayNotes.map((x) => <NoteCard key={x.id} note={x} onOpen={() => setEditing(x)} />)}
        </div>
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
              <NoteCard key={x.id} note={x} onOpen={() => { setOpenDay(null); setEditing(x); }} />
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

/* ── بطاقةُ ورقةٍ في القائمة ── */
function NoteCard({ note, onOpen }: { note: JournalNote; onOpen: () => void }) {
  const meta = KIND_META[note.kind];
  return (
    <button onClick={onOpen} className="rounded-2xl p-3 text-right transition active:scale-[0.99] w-full"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span aria-hidden="true">{meta.icon}</span>
        <span className="t-caption font-black" style={{ color: "var(--text-dim)" }}>{note.title?.trim() || meta.label}</span>
      </div>
      {note.kind === "draw" && <StrokesPreview strokes={note.strokes ?? []} height={110} />}
      {note.kind === "table" && <MiniTable t={note.table} />}
      {note.kind === "text" && (
        <p className="t-small leading-relaxed line-clamp-3 whitespace-pre-wrap" style={{ color: "var(--text)" }}>{note.text}</p>
      )}
    </button>
  );
}

function MiniTable({ t }: { t?: TableData }) {
  if (!t) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {t.rows.slice(0, 3).map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="t-caption px-2 py-1 truncate"
                  style={{ border: "1px solid var(--border)", color: c ? "var(--text)" : "var(--text-muted)", maxWidth: 120 }}>
                  {c || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── محرّرُ الورقة ── */
function NoteEditor({ note, onClose }: { note: JournalNote; onClose: () => void }) {
  const [draft, setDraft] = useState<JournalNote>(note);
  const [err, setErr] = useState<string | null>(null);
  const meta = KIND_META[draft.kind];

  const save = () => {
    if (isBlank(draft)) { onClose(); return; }
    const r = saveNote({ ...draft, updatedAt: Date.now() });
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
    <Sheet onClose={onClose} title={`${meta.icon} ${meta.label}`}>
      <div className="flex flex-col gap-3">
        <input value={draft.title ?? ""} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="عنوان الورقة (اختياري) — مثل: درس المتجهات"
          className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />

        {draft.kind === "draw" && (
          <DrawPad value={draft.strokes ?? []} onChange={(s: Stroke[]) => setDraft((d) => ({ ...d, strokes: s }))} />
        )}

        {draft.kind === "text" && (
          <textarea value={draft.text ?? ""} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} rows={8}
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

        {err && <p className="t-caption font-bold" style={{ color: "var(--danger)" }}>{err}</p>}

        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={save} className="rounded-2xl py-3 t-body font-black"
            style={{ background: "var(--accent)", color: "#fff" }}>حفظ</button>
          <button onClick={() => { deleteNote(draft.id); onClose(); }}
            className="rounded-2xl py-3 t-body font-black"
            style={{ background: "transparent", border: "1.5px solid color-mix(in srgb, var(--danger) 40%, transparent)", color: "var(--danger)" }}>
            حذف
          </button>
        </div>
      </div>
    </Sheet>
  );
}
