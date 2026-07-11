"use client";
/* ─── تجربة الدرس للطالب — تقرأ من نموذج العالم (KB) ───
   أول تجربة تعليمية حقيقية في درب: الدرس كتلٌ مرنة (شرح/معادلة/صورة/فيديو/خطوات/
   مثال/تنبيه/خطأ شائع/نقاط) تُعرض بمكوّنٍ لكل نوع، ثم الأسئلة والمصادر والمفاهيم
   المرتبطة — كلّها من الرسم. لا مصطلحات، لا تعقيد. */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LessonBlock } from "@/lib/kb/entities/schema";
import { trackEvent } from "@/lib/analytics";

export interface LessonViewData {
  id: string;
  name: string;
  summary: string;
  durationMin?: number;
  level?: "easy" | "medium" | "hard";
  nextTeaser?: string;
  diagnostic?: { prompt: string; answer: string };
  outcomes: string[];
  blocks: LessonBlock[];
  concept?: { id: string; name: string; definition?: string; whyImportant?: string };
  questions: { id: string; prompt: string; answer?: string; difficulty?: string }[];
  resources: { id: string; name: string; summary: string; format?: string }[];
  /* «الخطوة التالية» — مُشتقّة من علاقات leads_to للمفهوم (مرتّبة بالأهمية، تربط لدرسها إن وُجد) */
  leadsTo: { id: string; name: string; lessonId?: string | null }[];
}

const LEVEL_AR: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };
const FORMAT_ICON: Record<string, string> = { video: "🎬", article: "📄", podcast: "🎧", pdf: "📑", course: "🎓" };

/* كتلة واحدة → عنصر بصري */
function Block({ b }: { b: LessonBlock }) {
  const [open, setOpen] = useState(false);
  switch (b.type) {
    case "heading":
      return <h2 className="t-h3 mt-2" style={{ color: "var(--text)" }}>{b.text}</h2>;
    case "text":
      return <p className="t-body" style={{ color: "var(--text-dim)", lineHeight: 1.9 }}>{b.text}</p>;
    case "analogy":
      return (
        <div className="ds-card flex items-start gap-2.5" style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 22%, var(--border))" }}>
          <span style={{ fontSize: "1.2rem" }}>💧</span>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="t-caption font-black" style={{ color: "var(--accent-light)" }}>تشبيه يقرّب الفكرة</span>
            <p className="t-body" style={{ color: "var(--text-dim)", lineHeight: 1.9 }}>{b.text}</p>
          </div>
        </div>
      );
    case "equation":
      return (
        <div className="ds-card flex flex-col items-center gap-1 py-4" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border))" }}>
          <span dir="ltr" className="font-mono-nums" style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--accent-light)", letterSpacing: "0.04em" }}>{b.latex}</span>
          {b.caption && <span className="t-caption" style={{ color: "var(--text-muted)" }}>{b.caption}</span>}
        </div>
      );
    case "image":
      return (
        <figure className="ds-card flex flex-col items-center gap-2 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.src} alt={b.alt} className="max-w-full h-auto" style={{ maxHeight: 240 }} />
          {b.caption && <figcaption className="t-caption text-center" style={{ color: "var(--text-muted)" }}>{b.caption}</figcaption>}
        </figure>
      );
    case "video":
      return (
        <a href={b.url} target="_blank" rel="noopener noreferrer"
          className="ds-card flex items-center gap-3 hover:brightness-110 transition"
          style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 24%, var(--border))" }}>
          <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: "var(--accent)", color: "white", fontSize: "1.1rem" }}>▶</span>
          <span className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{b.title ?? "شاهد الفيديو"}</span>
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>مصدر مرئي ↗</span>
        </a>
      );
    case "steps":
      return (
        <div className="ds-card ds-stack-tight">
          {b.title && <p className="t-body font-black" style={{ color: "var(--text)" }}>{b.title}</p>}
          <ol className="flex flex-col gap-2">
            {b.items.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="t-caption font-black font-mono-nums flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 24, height: 24, background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>{i + 1}</span>
                <span className="t-body" style={{ color: "var(--text-dim)", lineHeight: 1.7 }}>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "example":
      return (
        <div className="ds-card ds-stack-tight" style={{ borderColor: "color-mix(in srgb, var(--success) 30%, var(--border))" }}>
          <div className="flex items-center gap-2">
            <span className="t-caption font-black px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}>مثال محلول</span>
            {b.title && <span className="t-caption" style={{ color: "var(--text-muted)" }}>{b.title}</span>}
          </div>
          <p className="t-body" style={{ color: "var(--text)", lineHeight: 1.8 }}>{b.problem}</p>
          {open ? (
            <p className="t-body" style={{ color: "var(--success)", lineHeight: 1.8 }}>الحل: {b.solution}</p>
          ) : (
            <button onClick={() => setOpen(true)} className="t-caption font-black self-start px-3 py-1.5 rounded-lg transition hover:brightness-110" style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" }}>أظهر الحل</button>
          )}
        </div>
      );
    case "note":
      return (
        <div className="ds-card flex items-start gap-2.5" style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 22%, var(--border))" }}>
          <span style={{ fontSize: "1.1rem" }}>💡</span>
          <p className="t-body flex-1" style={{ color: "var(--text-dim)", lineHeight: 1.8 }}>{b.text}</p>
        </div>
      );
    case "warning":
      return (
        <div className="ds-card flex items-start gap-2.5" style={{ background: "color-mix(in srgb, var(--gold) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--gold) 30%, var(--border))" }}>
          <span style={{ fontSize: "1.1rem" }}>⚠️</span>
          <p className="t-body flex-1" style={{ color: "var(--text-dim)", lineHeight: 1.8 }}>{b.text}</p>
        </div>
      );
    case "whenToUse":
      return (
        <div className="ds-card ds-stack-tight" style={{ background: "color-mix(in srgb, var(--success) 7%, var(--surface))", borderColor: "color-mix(in srgb, var(--success) 26%, var(--border))" }}>
          <p className="t-body font-black" style={{ color: "var(--text)" }}>🎯 متى تستخدم قانون أوم؟</p>
          <div className="flex items-start gap-2">
            <span className="t-caption font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>في الاختبار</span>
            <p className="t-body flex-1" style={{ color: "var(--text-dim)", lineHeight: 1.8 }}>{b.exam}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="t-caption font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--gold) 18%, transparent)", color: "var(--gold)" }}>في الحياة</span>
            <p className="t-body flex-1" style={{ color: "var(--text-dim)", lineHeight: 1.8 }}>{b.life}</p>
          </div>
        </div>
      );
    case "keypoints":
      return (
        <div className="ds-card ds-stack-tight" style={{ background: "var(--surface2)" }}>
          <p className="t-caption font-black" style={{ color: "var(--accent-light)" }}>الخلاصة</p>
          <ul className="flex flex-col gap-1.5">
            {b.items.map((k, i) => (
              <li key={i} className="flex items-start gap-2">
                <span style={{ color: "var(--accent-light)" }}>◆</span>
                <span className="t-body" style={{ color: "var(--text-dim)", lineHeight: 1.7 }}>{k}</span>
              </li>
            ))}
          </ul>
        </div>
      );
  }
}

/* سؤال بكشف الإجابة */
function QuestionCard({ q }: { q: LessonViewData["questions"][number] }) {
  const [show, setShow] = useState(false);
  return (
    <div className="ds-card ds-stack-tight">
      <div className="flex items-start gap-2">
        <span style={{ color: "var(--accent-light)" }}>❓</span>
        <p className="t-body font-black flex-1" style={{ color: "var(--text)", lineHeight: 1.7 }}>{q.prompt}</p>
        {q.difficulty && <span className="t-caption px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>{LEVEL_AR[q.difficulty] ?? q.difficulty}</span>}
      </div>
      {show ? (
        <p className="t-body" style={{ color: "var(--success)", lineHeight: 1.7 }}>✓ {q.answer}</p>
      ) : (
        <button onClick={() => setShow(true)} className="t-caption font-black self-start px-3 py-1.5 rounded-lg transition hover:brightness-110" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>أظهر الإجابة</button>
      )}
    </div>
  );
}

export default function LessonView({ data }: { data: LessonViewData }) {
  const askDuwairb = () => window.dispatchEvent(new CustomEvent("darb:openDuirb", { detail: { tab: "explain" } }));
  /* تخمين الطالب لسؤال البداية يُرفَع هنا ليُقارَن به في النهاية (بلا درجات) */
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const primary = data.leadsTo[0];
  const rest = data.leadsTo.slice(1);

  /* دورة حياة الدرس للتحليلات (لوحة الأدمن): بدء عند الفتح، إكمال عند بلوغ
     الخاتمة «أنت الآن تستطيع»، هجر عند المغادرة قبلها. الإكمال معرّف على بلوغ
     الخاتمة (تُعرض دائماً) لا على التشخيص الاختياري — فيعمل لكل الدروس.
     نقرأ حالة الإكمال عبر ref لتفادي الإغلاق القديم في cleanup الهجر. */
  const endRef = useRef<HTMLElement | null>(null);
  const completedRef = useRef(false);
  useEffect(() => {
    completedRef.current = false;
    const props = { lessonKey: data.id, lessonName: data.name, concept: data.concept?.name ?? null };
    trackEvent("lesson_started", props);
    const el = endRef.current;
    let obs: IntersectionObserver | undefined;
    if (el && typeof IntersectionObserver !== "undefined") {
      obs = new IntersectionObserver((entries) => {
        if (!completedRef.current && entries.some((e) => e.isIntersecting)) {
          completedRef.current = true;
          trackEvent("lesson_completed", props);
          obs?.disconnect();
        }
      }, { threshold: 0.4 });
      obs.observe(el);
    }
    return () => {
      obs?.disconnect();
      if (!completedRef.current) trackEvent("lesson_abandoned", props);
    };
  }, [data.id, data.name, data.concept?.name]);

  return (
    <div className="flex flex-col gap-3">
      {/* ترويسة الدرس */}
      <header className="ds-card ds-card-lg flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="eyebrow" style={{ color: "var(--accent-light)" }}>درس</span>
          {data.durationMin && <span className="t-caption px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>⏱ {data.durationMin} دقائق</span>}
          {data.level && <span className="t-caption px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>{LEVEL_AR[data.level]}</span>}
          {data.concept && <span className="t-caption px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>💡 {data.concept.name}</span>}
        </div>
        <h1 className="t-h1" style={{ color: "var(--text)" }}>{data.name}</h1>
        <p className="t-body" style={{ color: "var(--text-dim)", lineHeight: 1.8 }}>{data.summary}</p>
        <button onClick={askDuwairb} className="t-caption font-black self-start px-3.5 py-2 rounded-xl transition hover:brightness-110 mt-1" style={{ background: "var(--accent)", color: "white" }}>🤖 اسأل دويرب عن هذا الدرس</button>
      </header>

      {/* اختبر نفسك — قبل الشرح (تحديد نقطة البداية، بلا درجات) */}
      {data.diagnostic && (
        <div className="ds-card ds-stack-tight" style={{ borderColor: "color-mix(in srgb, var(--accent) 26%, var(--border))" }}>
          <p className="t-body font-black" style={{ color: "var(--text)" }}>🧭 قبل أن نبدأ</p>
          <p className="t-body" style={{ color: "var(--text-dim)", lineHeight: 1.8 }}>{data.diagnostic.prompt}</p>
          <input
            value={guess} onChange={(e) => setGuess(e.target.value)}
            placeholder="اكتب تخمينك (اختياري)…"
            className="w-full rounded-xl px-3.5 py-2.5 t-body outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>خمّن الآن — سنعود لهذا السؤال في النهاية لترى تقدّمك بنفسك. لا درجات.</p>
        </div>
      )}

      {/* كتل الدرس */}
      <section className="flex flex-col gap-3">
        {data.blocks.map((b, i) => <Block key={i} b={b} />)}
      </section>

      {/* الأسئلة */}
      {data.questions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>اختبر فهمك</h2>
          {data.questions.map((q) => <QuestionCard key={q.id} q={q} />)}
        </section>
      )}

      {/* المصادر */}
      {data.resources.length > 0 && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>مصادر إضافية</h2>
          <div className="flex flex-col gap-2">
            {data.resources.map((r) => (
              <div key={r.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "var(--surface2)" }}>
                <span style={{ fontSize: "1.1rem" }}>{FORMAT_ICON[r.format ?? ""] ?? "🔗"}</span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="t-body font-black" style={{ color: "var(--text)" }}>{r.name}</span>
                  <span className="t-caption" style={{ color: "var(--text-muted)" }}>{r.summary}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* اختبر نفسك — بعد الشرح: نفس سؤال البداية ليرى الطالب أنه تعلّم */}
      {data.diagnostic && (
        <div className="ds-card ds-stack-tight" style={{ borderColor: "color-mix(in srgb, var(--accent) 26%, var(--border))" }}>
          <p className="t-body font-black" style={{ color: "var(--text)" }}>🔁 عُد لسؤال البداية</p>
          <p className="t-body" style={{ color: "var(--text-dim)", lineHeight: 1.8 }}>{data.diagnostic.prompt}</p>
          {guess.trim() && <p className="t-caption" style={{ color: "var(--text-muted)" }}>تخمينك في البداية: {guess}</p>}
          {revealed ? (
            <p className="t-body" style={{ color: "var(--success)", lineHeight: 1.8 }}>✓ {data.diagnostic.answer}</p>
          ) : (
            <button onClick={() => setRevealed(true)} className="t-caption font-black self-start px-3 py-1.5 rounded-lg transition hover:brightness-110" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>حلّها الآن</button>
          )}
          {revealed && <p className="t-caption" style={{ color: "var(--text-muted)" }}>تحلّها بسهولة الآن؟ هذا هو تقدّمك في هذا الدرس.</p>}
        </div>
      )}

      {/* الخاتمة — «أنت الآن تستطيع» + الخطوة التالية (تشعر الطالب بالتقدّم) */}
      <section ref={endRef} className="ds-card ds-card-lg flex flex-col gap-4" style={{ background: "color-mix(in srgb, var(--success) 10%, var(--surface))", borderColor: "color-mix(in srgb, var(--success) 32%, var(--border))" }}>
        {data.outcomes.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="t-h3" style={{ color: "var(--text)" }}>🎯 أنت الآن تستطيع:</h2>
            <ul className="flex flex-col gap-1.5">
              {data.outcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span style={{ color: "var(--success)" }}>✓</span>
                  <span className="t-body" style={{ color: "var(--text)", lineHeight: 1.7 }}>{o}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.nextTeaser && <p className="t-body" style={{ color: "var(--text-dim)", lineHeight: 1.9 }}>{data.nextTeaser}</p>}
        {primary && (
          <div className="flex flex-col gap-2">
            <p className="t-body font-black" style={{ color: "var(--text)" }}>🔓 الخطوة التالية:</p>
            {primary.lessonId ? (
              <Link href={`/lesson/${primary.lessonId.replace(/^lesson:/, "")}`} className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 transition hover:brightness-110" style={{ background: "var(--accent)", color: "white" }}>
                <span className="t-body font-black flex-1 min-w-0">{primary.name}</span>
                <span className="t-caption">ابدأ الدرس ↗</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--success)" }}>◆</span>
                <span className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{primary.name}</span>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>قريباً</span>
              </div>
            )}
            {rest.length > 0 && (
              <p className="t-caption" style={{ color: "var(--text-muted)" }}>ثم: {rest.map((c) => c.name).join(" · ")}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
