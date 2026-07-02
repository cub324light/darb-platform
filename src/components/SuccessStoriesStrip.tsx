"use client";
/* ─── شريط قصص النجاح في صفحة الهبوط (social proof) ───
   يُحمَّل ديناميكياً (chunk منفصل) كي لا تدخل بذرة المحتوى في حزمة الهبوط
   الحرجة. له مراقب reveal خاص به لأن مراقب الصفحة يلتقط العناصر الموجودة
   عند التركيب فقط — عناصر chunk متأخر لا يراها فتبقى مخفية للأبد. */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { SEED_CONTENT, scoreColor } from "@/lib/content";

/* أبرز القصص: أول ثلاث قصص فيها درجات رقمية (أرقام بارزة تلفت النظر) */
const HIGHLIGHTS = SEED_CONTENT.success_stories
  .filter((s) => Object.values(s.scores).some((v) => typeof v === "number"))
  .slice(0, 3);

export default function SuccessStoriesStrip() {
  const rootRef = useRef<HTMLElement>(null);

  /* reveal ذاتي — مستمعون فقط، بلا setState (متوافق مع React Compiler) */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    const showAll = () => els.forEach((el) => el.classList.add("visible"));

    if (typeof IntersectionObserver === "undefined") { showAll(); return; }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.05 }
    );
    els.forEach((el) => io.observe(el));
    const fallback = setTimeout(showAll, 2000);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);

  if (HIGHLIGHTS.length === 0) return null;

  return (
    <section ref={rootRef} id="stories" className="px-5 py-16 max-w-2xl mx-auto">
      <div className="reveal text-center mb-8">
        <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>قصص نجاح</p>
        <h2 className="font-black text-2xl" style={{ color: "var(--text)" }}>طلاب وصلوا قبلك — بالأرقام</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {HIGHLIGHTS.map((story, i) => {
          const numericScores = Object.entries(story.scores)
            .filter((e): e is [string, number] => typeof e[1] === "number")
            .slice(0, 3);
          return (
            <div key={story.id}
              className={`reveal reveal-d${(i % 3) + 1} rounded-2xl p-5 glow-card-hover text-center`}
              style={{
                background: "var(--surface)",
                border: "1.5px solid color-mix(in srgb, var(--gold) 22%, var(--border))",
                boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
              }}>
              <p className="font-black text-[15px] mb-3" style={{ color: "var(--text)" }}>{story.name}</p>
              <div className="flex items-center justify-center gap-4 mb-2">
                {numericScores.map(([key, val]) => (
                  <div key={key} className="flex flex-col items-center">
                    <span className="font-black text-[26px] font-mono-nums leading-tight" style={{ color: scoreColor(key) }}>
                      {val}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>{key}</span>
                  </div>
                ))}
              </div>
              {story.note.trim() !== "" && (
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-dim)" }}>{story.note}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="reveal text-center">
        <Link href="/success-stories"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[14.5px] transition active:scale-[0.97]"
          style={{
            background: "color-mix(in srgb, var(--gold) 10%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--gold) 40%, transparent)",
            color: "var(--gold)",
            textDecoration: "none",
          }}>
          شوف كل القصص واستراتيجياتهم ←
        </Link>
      </div>
    </section>
  );
}
