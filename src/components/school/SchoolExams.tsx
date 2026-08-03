"use client";
/* ═══════════ اختباراتك المدرسية ═══════════
   كانت البطاقة تعرض مواعيدَ قياس وتسمّيها «الاختبارات القادمة»، وسؤالُ الطالب في
   المدرسة غيرُ ذلك: اختبار الرياضيات الأحد، والتحديد من الفصل الثالث إلى الخامس،
   والأستاذ قال إنه من الكتاب لا من الملزمة.

   فصارت: مادّةٌ وموعدٌ وتحديدٌ ومدرّسٌ وما قاله. والمدرّسُ يُختار من دليلك إن كان
   فيه — لا نُدخل الاسمَ مرّتين في نظامين. */
import { useState } from "react";
import Sheet from "@/components/Sheet";
import { useSchoolExams, createSchoolExam, editSchoolExam, deleteSchoolExam } from "@/lib/school/store";
import { upcomingExams, pastExams, whenLabel, isSoon, type SchoolExam } from "@/lib/school/exams";
import { useTeachers } from "@/lib/teachers/store";
import { sortedTeachers } from "@/lib/teachers/teachers";
import { dateFull, n } from "@/lib/format";

const today = () => new Date().toISOString().slice(0, 10);

export default function SchoolExams() {
  const exams = useSchoolExams();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const day = today();
  const up = upcomingExams(exams, day);
  const past = pastExams(exams, day);
  const open = openId ? exams.find((e) => e.id === openId) ?? null : null;

  return (
    <section className="ds-card ds-stack-tight">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>🧪 اختباراتك المدرسية</h2>
        {up.length > 0 && (
          <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{n(up.length)}</span>
        )}
      </div>

      {up.length === 0 ? (
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>
          ما فيه اختبار قادم — أضِف اختبارك بموعده وتحديده وما قاله المدرّس.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {up.map((e) => (
            <button key={e.id} onClick={() => setOpenId(e.id)}
              className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right transition active:scale-[0.99] w-full"
              style={{
                background: "var(--surface2)",
                border: `1.5px solid ${isSoon(day, e.date) ? "color-mix(in srgb, var(--gold) 45%, transparent)" : "var(--border)"}`,
              }}>
              <span className="flex-1 min-w-0">
                <span className="block t-body font-black truncate" style={{ color: "var(--text)" }}>{e.subject}</span>
                <span className="block t-caption truncate" style={{ color: "var(--text-muted)" }}>
                  {e.scope || "بلا تحديد بعد"}
                </span>
              </span>
              <span className="t-caption font-black flex-shrink-0"
                style={{ color: isSoon(day, e.date) ? "var(--gold)" : "var(--accent-light)" }}>
                {whenLabel(day, e.date)}
              </span>
            </button>
          ))}
        </div>
      )}

      <button onClick={() => setAdding(true)}
        className="w-full rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
        style={{ background: "var(--surface2)", border: "1.5px dashed var(--border)", color: "var(--text)" }}>
        ＋ أضف اختباراً
      </button>

      {past.length > 0 && (
        <details>
          <summary className="t-caption font-bold cursor-pointer py-1" style={{ color: "var(--text-muted)" }}>
            اختباراتٌ مضت ({n(past.length)})
          </summary>
          <div className="flex flex-col gap-1.5 mt-2">
            {past.slice(0, 20).map((e) => (
              <button key={e.id} onClick={() => setOpenId(e.id)}
                className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-right"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", opacity: 0.75 }}>
                <span className="t-small font-bold" style={{ color: "var(--text)" }}>{e.subject}</span>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>{dateFull(e.date, false)}</span>
              </button>
            ))}
          </div>
        </details>
      )}

      {adding && <ExamForm onClose={() => setAdding(false)} />}
      {open && <ExamForm exam={open} onClose={() => setOpenId(null)} />}
    </section>
  );
}

function ExamForm({ exam, onClose }: { exam?: SchoolExam; onClose: () => void }) {
  const teachers = sortedTeachers(useTeachers());
  const [subject, setSubject] = useState(exam?.subject ?? "");
  const [date, setDate] = useState(exam?.date ?? today());
  const [scope, setScope] = useState(exam?.scope ?? "");
  const [teacherId, setTeacherId] = useState(exam?.teacherId ?? "");
  const [teacherName, setTeacherName] = useState(exam?.teacherName ?? "");
  const [said, setSaid] = useState(exam?.teacherSaid ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const chosen = teachers.find((t) => t.id === teacherId);

  const save = () => {
    const payload = {
      subject, date, scope,
      teacherId: teacherId || undefined,
      teacherName: chosen ? chosen.name : teacherName,
      teacherSaid: said,
    };
    if (exam) { editSchoolExam(exam.id, payload); onClose(); return; }
    const r = createSchoolExam(payload);
    if (!r.ok) {
      setErr(r.reason === "empty" ? "اكتب اسم المادة."
        : r.reason === "bad-date" ? "اختر موعداً صحيحاً."
        : "امتلأت القائمة — احذف اختباراً قديماً.");
      return;
    }
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={exam ? exam.subject : "اختبار جديد"}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>المادة</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثل: رياضيات" autoFocus={!exam}
            className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>الموعد</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>التحديد — ماذا يدخل؟</span>
          <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2}
            placeholder="مثل: من الفصل الثالث إلى الخامس، بدون التمارين الإثرائية"
            className="w-full rounded-xl px-4 py-3 t-body outline-none resize-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>المدرّس</span>
          {teachers.length > 0 ? (
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
              <option value="">— اكتبه بنفسي —</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subjects[0] ? ` · ${t.subjects[0]}` : ""}</option>)}
            </select>
          ) : null}
          {!chosen && (
            <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="اسم المدرّس"
              className="w-full rounded-xl px-4 py-3 t-body outline-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>وش قال المدرّس؟</span>
          <textarea value={said} onChange={(e) => setSaid(e.target.value)} rows={2}
            placeholder="مثل: من الكتاب لا من الملزمة، وفيه سؤال مقاليّ"
            className="w-full rounded-xl px-4 py-3 t-body outline-none resize-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        </label>

        {err && <p className="t-caption font-bold" style={{ color: "var(--danger)" }}>{err}</p>}

        <button onClick={save} disabled={!subject.trim()}
          className="rounded-2xl py-3 t-body font-black disabled:opacity-45"
          style={{ background: "var(--accent)", color: "#fff" }}>حفظ</button>

        {exam && (confirmDel ? (
          <div className="flex items-center gap-2">
            <span className="t-caption flex-1" style={{ color: "var(--text-muted)" }}>يُحذف الاختبار وتفاصيلُه.</span>
            <button onClick={() => { deleteSchoolExam(exam.id); onClose(); }}
              className="t-caption font-black px-3 py-2 rounded-xl" style={{ background: "#EF4444", color: "#fff" }}>احذف</button>
            <button onClick={() => setConfirmDel(false)}
              className="t-caption font-bold px-3 py-2 rounded-xl"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>تراجع</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)}
            className="rounded-2xl py-2.5 t-body font-black"
            style={{ background: "transparent", border: "1.5px solid color-mix(in srgb, var(--danger) 40%, transparent)", color: "var(--danger)" }}>
            حذف الاختبار
          </button>
        ))}
      </div>
    </Sheet>
  );
}
