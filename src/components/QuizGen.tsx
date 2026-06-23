"use client";
import { useState } from "react";
import { recordQuiz } from "@/lib/storage";

interface QA { q: string; a: string }

/* يحلّل رد دويرب: أسطر «س:» و«ج:» إلى أزواج سؤال/جواب.
   إن فشل التحليل تماماً يرجع مصفوفة فارغة (نعرض النص الخام). */
function parseQuestions(text: string): QA[] {
  const out: QA[] = [];
  let cur: QA | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const qMatch = line.match(/^س\s*[:：.\-]\s*(.+)/);
    const aMatch = line.match(/^ج\s*[:：.\-]\s*(.+)/);
    if (qMatch) {
      if (cur) out.push(cur);
      cur = { q: qMatch[1].trim(), a: "" };
    } else if (aMatch && cur) {
      cur.a = cur.a ? `${cur.a} ${aMatch[1].trim()}` : aMatch[1].trim();
    } else if (cur && !cur.a) {
      /* استمرار نص السؤال على سطر ثانٍ */
      cur.q = `${cur.q} ${line}`;
    } else if (cur) {
      /* استمرار نص الإجابة */
      cur.a = `${cur.a} ${line}`;
    }
  }
  if (cur) out.push(cur);
  return out.filter((qa) => qa.q);
}

interface Props {
  subjects: { name: string; color: string }[];
}

export default function QuizGen({ subjects }: Props) {
  const [subject, setSubject] = useState(subjects[0]?.name ?? "");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QA[]>([]);
  const [raw, setRaw] = useState("");
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [err, setErr] = useState("");

  const color = subjects.find((s) => s.name === subject)?.color ?? "var(--accent)";

  const generate = async () => {
    if (!subject || loading) return;
    setLoading(true);
    setErr("");
    setQuestions([]);
    setRaw("");
    setRevealed(new Set());
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `ولّد أسئلة تدريب في مادة ${subject}`,
          subjects: [subject],
          mode: "questions",
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (data.error && !data.text) { setErr(data.error); return; }
      const text = (data.text ?? "").trim();
      const parsed = parseQuestions(text);
      if (parsed.length > 0) { setQuestions(parsed); recordQuiz(); }
      else setRaw(text || "لم يرجع رد، حاول مرة ثانية");
    } catch {
      setErr("تعذّر الاتصال — حاول مرة ثانية");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });

  return (
    <section className="card rise rise-3">
      <p className="title-md mb-1" style={{ color: "var(--text)" }}>أسئلة تدريب من دويرب</p>
      <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>
        اختر مادة ودع دويرب يولّد لك أسئلة تدريب — للتمرين فقط، مو من بنك رسمي.
      </p>

      <div className="flex gap-2">
        <select value={subject} onChange={(e) => setSubject(e.target.value)}
          className="flex-1 rounded-2xl px-4 py-3 text-[15px] outline-none min-h-[48px]"
          style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
          {subjects.map((s) => <option key={s.name}>{s.name}</option>)}
        </select>
        <button onClick={generate} disabled={loading || !subject}
          className="rounded-2xl px-5 font-bold text-[15px] transition min-h-[48px]"
          style={{
            background: loading || !subject ? "var(--surface2)" : "var(--accent)",
            color: loading || !subject ? "var(--text-muted)" : "white",
            border: "none",
          }}>
          {loading ? (
            <span className="inline-block w-4 h-4 rounded-full border-2 animate-spin align-middle"
              style={{ borderColor: "white", borderTopColor: "transparent" }} />
          ) : "دويرب: ولّد"}
        </button>
      </div>

      {err && (
        <p className="text-[13px] text-center mt-3 font-semibold" style={{ color: "var(--danger)" }}>{err}</p>
      )}

      {questions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2.5">
          {questions.map((qa, i) => (
            <div key={i} className="rounded-2xl px-4 py-3.5"
              style={{ background: "var(--surface2)", border: `1px solid ${color}33` }}>
              <p className="text-[15px] font-bold leading-relaxed" style={{ color: "var(--text)" }}>
                <span style={{ color }}>{i + 1}. </span>{qa.q}
              </p>
              {qa.a && (
                revealed.has(i) ? (
                  <p className="text-[14px] leading-relaxed mt-2 pt-2 border-t" style={{ color: "var(--text-dim)", borderColor: "var(--border)" }}>
                    {qa.a}
                  </p>
                ) : (
                  <button onClick={() => toggle(i)}
                    className="text-[13px] font-bold mt-2" style={{ color: "var(--accent-light)" }}>
                    اظهر الإجابة
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {raw && questions.length === 0 && (
        <div className="mt-3 rounded-2xl px-4 py-3.5"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{raw}</p>
        </div>
      )}
    </section>
  );
}
