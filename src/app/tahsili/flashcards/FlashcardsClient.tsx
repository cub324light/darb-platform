"use client";
/* ─── بطاقات حقائق التحصيلي — قلب ثلاثي الأبعاد + وضع «اختبر نفسك» ───
   كل بطاقة: وجهها الأمامي الموضوع والمادة، وخلفها قائمة الحقائق.
   الوجهان في نفس خلية grid (يتكيف الارتفاع مع الأطول) مع backface-visibility.
   في وضع اختبر نفسك يُخفى تطبيق كل حقيقة (ما بعد «→») حتى ينقر الطالب.
   ملوّنة حسب المادة بألوان tracks.ts نفسها. البيانات props — بلا أي جلب. */
import { useState } from "react";
import type { TahsiliFlashcardDoc } from "@/lib/content/types";
import { subjectMeta } from "@/lib/content/types";

/* حقيقة واحدة — تنشقّ على أول «→»: مفهوم (يظهر دائماً) وتطبيق (يُخفى في وضع الاختبار) */
function FactRow({
  fact, color, testMode, revealed, onReveal,
}: {
  fact: string;
  color: string;
  testMode: boolean;
  revealed: boolean;
  onReveal: () => void;
}) {
  const arrowAt = fact.indexOf("→");
  const concept = arrowAt === -1 ? fact : fact.slice(0, arrowAt).trim();
  const answer = arrowAt === -1 ? "" : fact.slice(arrowAt + 1).trim();
  const hideAnswer = testMode && answer !== "" && !revealed;

  return (
    <li className="flex items-start gap-2 text-[13.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[8px]" style={{ background: color }} aria-hidden="true" />
      <span className="flex-1">
        <span className="font-bold" style={{ color: "var(--text)" }}>{concept}</span>
        {answer !== "" && (
          <>
            <span aria-hidden="true" style={{ color: "var(--text-muted)" }}> ← </span>
            {hideAnswer ? (
              <button onClick={onReveal}
                className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[12px] font-black align-middle transition active:scale-95"
                style={{
                  background: `color-mix(in srgb, ${color} 12%, transparent)`,
                  border: `1px dashed color-mix(in srgb, ${color} 55%, transparent)`,
                  color,
                }}>
                أظهر الإجابة
              </button>
            ) : (
              <span style={{ color }}>{answer}</span>
            )}
          </>
        )}
      </span>
    </li>
  );
}

export default function FlashcardsClient({ cards }: { cards: TahsiliFlashcardDoc[] }) {
  const [testMode, setTestMode] = useState(false);
  /* البطاقات المقلوبة والإجابات المكشوفة (مفتاح: cardId أو cardId:index) */
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set());
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  const subjects = [...new Set(cards.map((c) => c.subject))];
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const visible = subjectFilter ? cards.filter((c) => c.subject === subjectFilter) : cards;

  const toggleFlip = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const reveal = (key: string) => {
    setRevealed((prev) => new Set(prev).add(key));
  };
  const toggleTestMode = () => {
    setTestMode((v) => !v);
    setRevealed(new Set()); // تصفير الكشف عند تبديل الوضع — جولة جديدة
  };

  return (
    <div className="flex flex-col gap-4">
      {/* شريط التحكم: فلتر المواد + مفتاح اختبر نفسك */}
      <div className="flex items-center gap-2 flex-wrap">
        {subjects.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {[null, ...subjects].map((s) => {
              const meta = s ? subjectMeta(s) : null;
              const active = subjectFilter === s;
              return (
                <button key={s ?? "all"} onClick={() => setSubjectFilter(s)}
                  className="px-3 py-1.5 rounded-full text-[12.5px] font-black transition active:scale-95"
                  style={{
                    background: active
                      ? `color-mix(in srgb, ${meta?.color ?? "var(--accent)"} 14%, transparent)`
                      : "var(--surface)",
                    color: active ? (meta?.color ?? "var(--accent-light)") : "var(--text-muted)",
                    border: active
                      ? `1.5px solid ${meta?.color ?? "var(--accent)"}`
                      : "1.5px solid var(--border)",
                  }}>
                  {meta ? `${meta.icon} ${meta.label}` : "الكل"}
                </button>
              );
            })}
          </div>
        )}
        <button onClick={toggleTestMode}
          className="mr-auto px-4 py-1.5 rounded-full text-[12.5px] font-black transition active:scale-95"
          aria-pressed={testMode}
          style={{
            background: testMode ? "color-mix(in srgb, var(--gold) 14%, transparent)" : "var(--surface)",
            color: testMode ? "var(--gold)" : "var(--text-muted)",
            border: testMode ? "1.5px solid var(--gold)" : "1.5px solid var(--border)",
          }}>
          🎯 اختبر نفسك {testMode ? "· شغّال" : ""}
        </button>
      </div>

      {/* شبكة البطاقات — عمودان على المتوسطة وثلاثة على سطح المكتب (≥1100px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 desk-grid-3 gap-3">
        {visible.map((card) => {
          const meta = subjectMeta(card.subject);
          const isFlipped = flipped.has(card.id);
          return (
            <div key={card.id} style={{ perspective: "1400px" }}>
              <div className="grid transition-transform duration-500"
                style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "none" }}>

                {/* ── الوجه الأمامي: الموضوع + المادة ──
                    الوجه غير الظاهر يُعطَّل بـ pointer-events + inert (يخفيه عن
                    القارئ الشاشي) بينما backface-visibility تتكفل بالإخفاء البصري
                    أثناء الدوران — فتبقى الحركة سلسة بلا اختفاء مفاجئ. */}
                <button onClick={() => toggleFlip(card.id)}
                  className="rounded-2xl p-5 text-right glow-card-hover flex flex-col gap-3 min-h-[150px]"
                  aria-label={`اقلب بطاقة ${card.topic}`}
                  inert={isFlipped || undefined}
                  style={{
                    gridArea: "1 / 1",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    background: "var(--surface)",
                    border: `1.5px solid color-mix(in srgb, ${meta.color} 30%, var(--border))`,
                    boxShadow: `0 2px 14px color-mix(in srgb, ${meta.color} 10%, transparent)`,
                    pointerEvents: isFlipped ? "none" : undefined,
                  }}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                        border: `1.5px solid color-mix(in srgb, ${meta.color} 28%, transparent)`,
                      }}
                      aria-hidden="true">
                      {meta.icon}
                    </span>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full font-mono-nums mr-auto"
                      style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                      {card.facts.length} حقيقة
                    </span>
                  </div>
                  <p className="font-black text-[15.5px] leading-relaxed flex-1" style={{ color: "var(--text)" }}>
                    {card.topic}
                  </p>
                  <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
                    اضغط للقلب ↺
                  </p>
                </button>

                {/* ── الوجه الخلفي: قائمة الحقائق ── */}
                <div className="rounded-2xl p-5 flex flex-col gap-3"
                  inert={!isFlipped || undefined}
                  style={{
                    gridArea: "1 / 1",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: `linear-gradient(160deg, color-mix(in srgb, ${meta.color} 7%, var(--surface)), var(--surface))`,
                    border: `1.5px solid color-mix(in srgb, ${meta.color} 30%, var(--border))`,
                    pointerEvents: isFlipped ? undefined : "none",
                  }}>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-[13.5px] flex-1" style={{ color: meta.color }}>{card.topic}</p>
                    <button onClick={() => toggleFlip(card.id)}
                      className="text-[11.5px] font-black px-2.5 py-1 rounded-lg flex-shrink-0 transition active:scale-95"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
                      اقلب ↺
                    </button>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {card.facts.map((fact, i) => (
                      <FactRow key={i} fact={fact} color={meta.color}
                        testMode={testMode}
                        revealed={revealed.has(`${card.id}:${i}`)}
                        onReveal={() => reveal(`${card.id}:${i}`)} />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
