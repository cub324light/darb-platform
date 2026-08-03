"use client";
/* ═══════════ مدرّسوك ═══════════
   دليلٌ ودفتر: الاسمُ وموادُّه ووسائلُ التواصل، والفصولُ التي درّسك فيها مع تقييمك
   له في كلٍّ منها، وملاحظاتُك عنه، والمواقفُ التي حصلت معه.

   ▓ الملاحظاتُ هنا لا في «أخطائي»: تلك سجلُّ مراجعةٍ غرضُه ألّا يتكرّر الخطأ،
     وهذه معرفةٌ بالمدرّس. خلطُهما يفسد الاثنين.
   ▓ التقييمُ يُوضع **بعد نهاية الفصل** لا في أوّله — حكمٌ على تجربةٍ كاملة.
   ▓ كلُّ هذا في جهاز الطالب: لا يُرسَل إلى خادمٍ ولا إلى نموذجِ ذكاء. وهي بياناتُ
     شخصٍ ثالث، فأقلُّ ما نفعله ألّا نتصرّف فيها. */
import { useState } from "react";
import Sheet from "@/components/Sheet";
import {
  useTeachers, createTeacher, editTeacher, deleteTeacher, noteOnTeacher, deleteTeacherNote,
  addTeacherTerm, deleteTeacherTerm, rateTeacherTerm, momentOnTeacher, deleteTeacherMoment,
} from "@/lib/teachers/store";
import {
  sortedTeachers, notesOf, momentsOf, noteCount, avgRating, termLabel,
  contactHref, contactKind, teacherById, RATING_LABEL, LIMITS, type Teacher,
} from "@/lib/teachers/teachers";
import { dateShort, n } from "@/lib/format";

const GRADES = ["أول ثانوي", "ثاني ثانوي", "ثالث ثانوي", "متوسط", "جامعة"];
const TERMS = ["الفصل الأول", "الفصل الثاني", "الفصل الثالث"];

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
        موادُّ كلِّ مدرّس ووسائلُ التواصل معه، والفصولُ التي درّسك فيها وتقييمك له، وملاحظاتُك ومواقفُك.
      </p>

      {list.length === 0 ? (
        <p className="t-caption text-center py-3" style={{ color: "var(--text-muted)" }}>ما أضفتَ مدرّساً بعد.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((t) => {
            const avg = avgRating(t);
            return (
              <button key={t.id} onClick={() => setOpenId(t.id)}
                className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right transition active:scale-[0.99] w-full"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <span className="flex-1 min-w-0">
                  <span className="block t-body font-black truncate" style={{ color: "var(--text)" }}>{t.name}</span>
                  <span className="block t-caption truncate" style={{ color: "var(--text-muted)" }}>
                    {t.subjects.length > 0 ? t.subjects.join(" · ") : "بلا مادة"}
                    {noteCount(t) > 0 ? ` · ${n(noteCount(t))} ملاحظة` : ""}
                  </span>
                </span>
                {avg != null && (
                  <span className="t-caption font-black px-2 py-0.5 rounded-full flex-shrink-0 font-mono-nums"
                    style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}>
                    ★ {avg}
                  </span>
                )}
                <span className="t-body font-black flex-shrink-0" style={{ color: "var(--text-muted)" }}>←</span>
              </button>
            );
          })}
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

/* ── قائمةُ نصوصٍ قابلة للزيادة (مواد · وسائل تواصل) ── */
function TextList({ label, values, onChange, placeholder, max }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; max: number;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v) || values.length >= max) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="t-caption font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <span dir="auto">{v}</span>
              <button onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`حذف ${v}`}
                style={{ color: "var(--text-muted)" }}>✕</button>
            </span>
          ))}
        </div>
      )}
      {values.length < max && (
        <div className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            className="flex-1 min-w-0 rounded-xl px-4 py-3 t-body outline-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
          <button onClick={add} disabled={!draft.trim()}
            className="px-5 rounded-xl font-black t-body disabled:opacity-45"
            style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>＋</button>
        </div>
      )}
    </div>
  );
}

function AddTeacher({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    const r = createTeacher({ name, subjects, contacts });
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
        <label className="flex flex-col gap-1.5">
          <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>الاسم</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثل: أ. محمد الشمري" autoFocus
            className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        </label>
        <TextList label="المواد التي يدرّسك" values={subjects} onChange={setSubjects}
          placeholder="مثل: رياضيات" max={LIMITS.maxSubjects} />
        <TextList label="وسائل التواصل" values={contacts} onChange={setContacts}
          placeholder="جوّال أو بريد أو حساب" max={LIMITS.maxContacts} />
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

type Tab = "notes" | "terms" | "moments";

function TeacherSheet({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("notes");
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [name, setName] = useState(teacher.name);
  const [subjects, setSubjects] = useState<string[]>(teacher.subjects);
  const [contacts, setContacts] = useState<string[]>(teacher.contacts);
  const avg = avgRating(teacher);

  return (
    <Sheet onClose={onClose} title={teacher.name}>
      <div className="flex flex-col gap-3">
        {editing ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>الاسم</span>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
            </label>
            <TextList label="المواد" values={subjects} onChange={setSubjects} placeholder="مثل: فيزياء" max={LIMITS.maxSubjects} />
            <TextList label="وسائل التواصل" values={contacts} onChange={setContacts} placeholder="جوّال أو بريد أو حساب" max={LIMITS.maxContacts} />
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => { editTeacher(teacher.id, { name, subjects, contacts }); setEditing(false); }}
                className="rounded-2xl py-2.5 t-body font-black" style={{ background: "var(--accent)", color: "#fff" }}>حفظ</button>
              <button onClick={() => setEditing(false)}
                className="rounded-2xl py-2.5 t-body font-bold"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>إلغاء</button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl px-4 py-3 flex flex-col gap-2"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="t-caption" style={{ color: "var(--text-muted)" }}>
                  {teacher.subjects.length > 0 ? teacher.subjects.join(" · ") : "بلا مادة"}
                </p>
                {avg != null && (
                  <p className="t-caption mt-0.5" style={{ color: "var(--gold)" }}>
                    ★ <span className="font-mono-nums">{avg}</span> — {RATING_LABEL[Math.round(avg)] ?? ""}
                  </p>
                )}
              </div>
              <button onClick={() => setEditing(true)}
                className="t-caption font-black px-3 py-2 rounded-xl flex-shrink-0"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>تعديل</button>
            </div>
            {teacher.contacts.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {teacher.contacts.map((c) => {
                  const href = contactHref(c);
                  const kind = contactKind(c);
                  return href ? (
                    <a key={c} href={href} dir="ltr"
                      className="t-caption font-bold px-3 py-1.5 rounded-full no-underline"
                      style={{ background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)", color: "var(--accent-light)" }}>
                      {kind === "phone" ? "📞 " : "✉️ "}{c}
                    </a>
                  ) : (
                    <span key={c} dir="auto" className="t-caption font-bold px-3 py-1.5 rounded-full"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>{c}</span>
                  );
                })}
              </div>
            ) : (
              <p className="t-caption" style={{ color: "var(--text-muted)" }}>بلا وسيلة تواصل</p>
            )}
          </div>
        )}

        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "var(--surface2)" }}>
          {([["notes", "ملاحظات"], ["terms", "الفصول والتقييم"], ["moments", "مواقف"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} aria-pressed={tab === v}
              className="flex-1 py-2 rounded-xl t-caption font-black transition"
              style={tab === v ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-muted)" }}>
              {l}
            </button>
          ))}
        </div>

        {tab === "notes" && <NotesTab teacher={teacher} />}
        {tab === "terms" && <TermsTab teacher={teacher} />}
        {tab === "moments" && <MomentsTab teacher={teacher} />}

        {confirmDel ? (
          <div className="flex items-center gap-2">
            <span className="t-caption flex-1" style={{ color: "var(--text-muted)" }}>يُحذف هو وكلُّ ما تحته.</span>
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

/* ── تبويب: ملاحظات ── */
function NotesTab({ teacher }: { teacher: Teacher }) {
  const [note, setNote] = useState("");
  const add = () => { if (note.trim()) { noteOnTeacher(teacher.id, note); setNote(""); } };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="مثل: يركّز على أمثلة الكتاب"
          className="flex-1 min-w-0 rounded-xl px-4 py-3 t-body outline-none"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        <button onClick={add} disabled={!note.trim()}
          className="px-5 rounded-xl font-black t-body disabled:opacity-45"
          style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>＋</button>
      </div>
      {noteCount(teacher) === 0 ? (
        <p className="t-caption text-center py-4" style={{ color: "var(--text-muted)" }}>ما فيه ملاحظات بعد.</p>
      ) : notesOf(teacher).map((x) => (
        <Row key={x.id} text={x.text} at={x.at} onDelete={() => deleteTeacherNote(teacher.id, x.id)} />
      ))}
    </div>
  );
}

/* ── تبويب: الفصول والتقييم ── */
function TermsTab({ teacher }: { teacher: Teacher }) {
  const [grade, setGrade] = useState(GRADES[2]);
  const [term, setTerm] = useState(TERMS[0]);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <select value={grade} onChange={(e) => setGrade(e.target.value)}
          className="rounded-xl px-3 py-2.5 t-small outline-none"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
          {GRADES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)}
          className="rounded-xl px-3 py-2.5 t-small outline-none"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
          {TERMS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <button onClick={() => addTeacherTerm(teacher.id, grade, term)}
        className="rounded-xl py-2.5 t-caption font-black"
        style={{ background: "var(--surface2)", border: "1.5px dashed var(--border)", color: "var(--text)" }}>
        ＋ درّسني في هذا الفصل
      </button>

      {teacher.terms.length === 0 ? (
        <p className="t-caption text-center py-3" style={{ color: "var(--text-muted)" }}>ما حدّدتَ فصولاً بعد.</p>
      ) : teacher.terms.map((x) => (
        <div key={x.id} className="rounded-xl px-3 py-3 flex flex-col gap-2"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="t-small font-black flex-1" style={{ color: "var(--text)" }}>{termLabel(x)}</span>
            <button onClick={() => deleteTeacherTerm(teacher.id, x.id)} aria-label="حذف الفصل"
              className="t-caption px-1 tap-44" style={{ color: "var(--text-muted)" }}>✕</button>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((r) => (
              <button key={r} onClick={() => rateTeacherTerm(teacher.id, x.id, x.rating === r ? null : r)}
                aria-label={`${r} — ${RATING_LABEL[r]}`}
                className="flex-1 py-2 rounded-lg t-caption font-black transition active:scale-[0.96]"
                style={(x.rating ?? 0) >= r
                  ? { background: "color-mix(in srgb, var(--gold) 18%, transparent)", border: "1.5px solid var(--gold)", color: "var(--gold)" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                ★
              </button>
            ))}
          </div>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>
            {x.rating ? RATING_LABEL[x.rating] : "قيّمه بعد نهاية الفصل"}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── تبويب: مواقف ── */
function MomentsTab({ teacher }: { teacher: Teacher }) {
  const [text, setText] = useState("");
  const add = () => { if (text.trim()) { momentOnTeacher(teacher.id, text); setText(""); } };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="مثل: شرح لي الدرس بعد الحصة"
          className="flex-1 min-w-0 rounded-xl px-4 py-3 t-body outline-none"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        <button onClick={add} disabled={!text.trim()}
          className="px-5 rounded-xl font-black t-body disabled:opacity-45"
          style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>＋</button>
      </div>
      {teacher.moments.length === 0 ? (
        <p className="t-caption text-center py-4" style={{ color: "var(--text-muted)" }}>ما سجّلتَ موقفاً بعد.</p>
      ) : momentsOf(teacher).map((x) => (
        <Row key={x.id} text={x.text} at={x.at} onDelete={() => deleteTeacherMoment(teacher.id, x.id)} />
      ))}
    </div>
  );
}

function Row({ text, at, onDelete }: { text: string; at: number; onDelete: () => void }) {
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <div className="flex-1 min-w-0">
        <p className="t-small leading-relaxed" style={{ color: "var(--text)" }}>{text}</p>
        <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
          {dateShort(new Date(at).toISOString().slice(0, 10))}
        </p>
      </div>
      <button onClick={onDelete} aria-label="حذف" className="t-caption px-1 flex-shrink-0 tap-44"
        style={{ color: "var(--text-muted)" }}>✕</button>
    </div>
  );
}

