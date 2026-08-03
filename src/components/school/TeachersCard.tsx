"use client";
/* ═══════════ مدرّسوك ═══════════
   دليلٌ ودفتر: الاسمُ والمادّةُ وطريقةُ التواصل، وتحت كلِّ مدرّسٍ ملاحظاتُك عنه —
   كيف يشرح، ما الذي يركّز عليه، ماذا وعد به. تُفتح بضغطة.

   الملاحظاتُ هنا لا في «أخطائي»: تلك سجلُّ مراجعةٍ غرضُه ألّا يتكرّر الخطأ،
   وهذه معرفةٌ بالمدرّس. خلطُهما يفسد الاثنين. */
import { useState } from "react";
import Sheet from "@/components/Sheet";
import { useTeachers, createTeacher, editTeacher, deleteTeacher, noteOnTeacher, deleteTeacherNote } from "@/lib/teachers/store";
import { sortedTeachers, notesOf, noteCount, contactHref, contactKind, teacherById, type Teacher } from "@/lib/teachers/teachers";
import { dateShort, n } from "@/lib/format";

export default function TeachersCard() {
  const teachers = useTeachers();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const list = sortedTeachers(teachers);
  const open = openId ? teacherById(teachers, openId) : null;

  return (
    <section className="ds-card ds-stack-tight">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>👩‍🏫 مدرّسوك</h2>
        {list.length > 0 && (
          <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{n(list.length)}</span>
        )}
      </div>
      <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
        اسمُ كل مدرّسٍ ومادّتُه وطريقةُ التواصل معه، وتحته ملاحظاتُك: كيف يشرح، وعلى ماذا يركّز.
      </p>

      {list.length === 0 ? (
        <p className="t-caption text-center py-3" style={{ color: "var(--text-muted)" }}>ما أضفتَ مدرّساً بعد.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((t) => (
            <button key={t.id} onClick={() => setOpenId(t.id)}
              className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right transition active:scale-[0.99] w-full"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <span className="flex-1 min-w-0">
                <span className="block t-body font-black truncate" style={{ color: "var(--text)" }}>{t.name}</span>
                <span className="block t-caption truncate" style={{ color: "var(--text-muted)" }}>
                  {t.subject || "بلا مادة"}{noteCount(t) > 0 ? ` · ${n(noteCount(t))} ملاحظة` : ""}
                </span>
              </span>
              <span className="t-body font-black flex-shrink-0" style={{ color: "var(--text-muted)" }}>←</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={() => setAdding(true)}
        className="w-full rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
        style={{ background: "var(--surface2)", border: "1.5px dashed var(--border)", color: "var(--text)" }}>
        ＋ أضف مدرّساً
      </button>

      {adding && <AddTeacher onClose={() => setAdding(false)} />}
      {open && <TeacherSheet teacher={open} onClose={() => setOpenId(null)} />}
    </section>
  );
}

function AddTeacher({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [contact, setContact] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    const r = createTeacher({ name, subject, contact });
    if (!r.ok) {
      setErr(r.reason === "duplicate" ? "هذا المدرّس مضافٌ في المادة نفسها."
        : r.reason === "full" ? "امتلأت القائمة — احذف مدرّساً أوّلاً."
        : "اكتب اسم المدرّس.");
      return;
    }
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="مدرّس جديد">
      <div className="flex flex-col gap-3">
        <Field label="الاسم" value={name} onChange={setName} placeholder="مثل: أ. محمد الشمري" autoFocus />
        <Field label="المادة (اختياري)" value={subject} onChange={setSubject} placeholder="مثل: رياضيات" />
        <Field label="التواصل (اختياري)" value={contact} onChange={setContact} placeholder="جوّال أو بريد أو حساب" />
        <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
          بياناتُ التواصل تبقى في جهازك — لا نرسلها لأحد ولا يقرؤها دويرب.
        </p>
        {err && <p className="t-caption font-bold" style={{ color: "var(--danger)" }}>{err}</p>}
        <button onClick={save} disabled={!name.trim()}
          className="rounded-2xl py-3 t-body font-black disabled:opacity-45"
          style={{ background: "var(--accent)", color: "#fff" }}>حفظ</button>
      </div>
    </Sheet>
  );
}

function TeacherSheet({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [name, setName] = useState(teacher.name);
  const [subject, setSubject] = useState(teacher.subject ?? "");
  const [contact, setContact] = useState(teacher.contact ?? "");
  const href = contactHref(teacher.contact);
  const kind = contactKind(teacher.contact);

  const addNoteNow = () => {
    if (!note.trim()) return;
    noteOnTeacher(teacher.id, note);
    setNote("");
  };

  return (
    <Sheet onClose={onClose} title={teacher.name}>
      <div className="flex flex-col gap-3">
        {editing ? (
          <>
            <Field label="الاسم" value={name} onChange={setName} />
            <Field label="المادة" value={subject} onChange={setSubject} />
            <Field label="التواصل" value={contact} onChange={setContact} />
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => { editTeacher(teacher.id, { name, subject, contact }); setEditing(false); }}
                className="rounded-2xl py-2.5 t-body font-black" style={{ background: "var(--accent)", color: "#fff" }}>حفظ</button>
              <button onClick={() => setEditing(false)}
                className="rounded-2xl py-2.5 t-body font-bold"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>إلغاء</button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <div className="flex-1 min-w-0">
              <p className="t-caption" style={{ color: "var(--text-muted)" }}>{teacher.subject || "بلا مادة"}</p>
              {teacher.contact ? (
                href ? (
                  <a href={href} className="t-body font-bold" dir="ltr" style={{ color: "var(--accent-light)" }}>{teacher.contact}</a>
                ) : (
                  <p className="t-body font-bold" style={{ color: "var(--text)" }}>{teacher.contact}</p>
                )
              ) : (
                <p className="t-caption" style={{ color: "var(--text-muted)" }}>بلا طريقة تواصل</p>
              )}
              {href && (
                <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {kind === "phone" ? "اضغط للاتصال" : "اضغط لإرسال بريد"}
                </p>
              )}
            </div>
            <button onClick={() => setEditing(true)}
              className="t-caption font-black px-3 py-2 rounded-xl flex-shrink-0"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>تعديل</button>
          </div>
        )}

        <div>
          <p className="eyebrow px-1 mb-2">ملاحظاتك عنه</p>
          <div className="flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addNoteNow(); }}
              placeholder="مثل: يركّز على أمثلة الكتاب"
              className="flex-1 min-w-0 rounded-xl px-4 py-3 t-body outline-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
            <button onClick={addNoteNow} disabled={!note.trim()}
              className="px-5 rounded-xl font-black t-body disabled:opacity-45"
              style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>＋</button>
          </div>

          {noteCount(teacher) === 0 ? (
            <p className="t-caption text-center py-4" style={{ color: "var(--text-muted)" }}>ما فيه ملاحظات بعد.</p>
          ) : (
            <div className="flex flex-col gap-2 mt-3">
              {notesOf(teacher).map((x) => (
                <div key={x.id} className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="t-small leading-relaxed" style={{ color: "var(--text)" }}>{x.text}</p>
                    <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{dateShort(new Date(x.at).toISOString().slice(0, 10))}</p>
                  </div>
                  <button onClick={() => deleteTeacherNote(teacher.id, x.id)} aria-label="حذف الملاحظة"
                    className="t-caption px-1 flex-shrink-0 tap-44" style={{ color: "var(--text-muted)" }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {confirmDel ? (
          <div className="flex items-center gap-2">
            <span className="t-caption flex-1" style={{ color: "var(--text-muted)" }}>يُحذف هو وملاحظاتُه.</span>
            <button onClick={() => { deleteTeacher(teacher.id); onClose(); }}
              className="t-caption font-black px-3 py-2 rounded-xl" style={{ background: "#EF4444", color: "#fff" }}>احذف</button>
            <button onClick={() => setConfirmDel(false)}
              className="t-caption font-bold px-3 py-2 rounded-xl"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>تراجع</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)}
            className="rounded-2xl py-2.5 t-body font-black"
            style={{ background: "transparent", border: "1.5px solid color-mix(in srgb, var(--danger) 40%, transparent)", color: "var(--danger)" }}>
            حذف المدرّس
          </button>
        )}
      </div>
    </Sheet>
  );
}

function Field({ label, value, onChange, placeholder, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
    </label>
  );
}
