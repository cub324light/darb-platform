"use client";
/* ─── متصفح الأسئلة الشائعة ───
   بحث فوري عبر كل الأسئلة (العام + منصة قبول معاً)، وشرائح تصنيفات أفقية
   قابلة للتمرير (الكل + التصنيفات العشرة الموجودة فعلاً)، وأسفلها القوائم
   المرجعية (مع تنبيه «تتغير سنوياً» للموسومة) ثم النصائح. البيانات تصل props
   من الصفحة الخادمية — هذا المكوّن للتفاعل فقط (بلا أي جلب). */
import { useState } from "react";
import type { FaqDoc, ReferenceListDoc, TipDoc } from "@/lib/content/types";
import { faqCategoryKey, faqCategoryMeta, presentFaqCategories } from "@/lib/content/types";
import BulletText from "@/components/content/BulletText";

/* شارة «تتغير سنوياً» للقوائم الموسومة بالمراجعة السنوية */
function AnnualBadge() {
  return (
    <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md flex-shrink-0"
      style={{
        background: "color-mix(in srgb, var(--gold) 14%, transparent)",
        color: "var(--gold)",
        border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
      }}>
      ⚠️ تتغير سنوياً
    </span>
  );
}

/* شارة تصنيف السؤال — تظهر على كل نتيجة أثناء البحث */
function CategoryBadge({ category }: { category: string }) {
  const meta = faqCategoryMeta(category);
  return (
    <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md flex-shrink-0"
      style={{
        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
        color: "var(--accent-light)",
        border: "1px solid color-mix(in srgb, var(--accent) 32%, transparent)",
      }}>
      {meta.icon} {meta.label}
    </span>
  );
}

/* عنصر accordion واحد — الفتح/الإغلاق بانتقال grid-template-rows سلس */
function AccordionItem({
  title, open, onToggle, badge, children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surface)",
        border: open
          ? "1.5px solid color-mix(in srgb, var(--accent) 45%, var(--border))"
          : "1.5px solid var(--border)",
        transition: "border-color 0.25s ease",
      }}>
      <button onClick={onToggle} aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right">
        <span className="flex-1 font-bold text-[14.5px] leading-relaxed"
          style={{ color: open ? "var(--accent-light)" : "var(--text)", transition: "color 0.25s ease" }}>
          {title}
        </span>
        {badge}
        <span aria-hidden="true" className="flex-shrink-0 text-[13px]"
          style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}>
          ▼
        </span>
      </button>
      <div className="grid" style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function FaqBrowser({
  general, qubool, referenceLists, tips,
}: {
  general: FaqDoc[];
  qubool: FaqDoc[];
  referenceLists: ReferenceListDoc[];
  tips: TipDoc[];
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  /* كل الأسئلة معاً — كل قائمة تصل مفروزة بـ order من الخادم، والترقيم في
     البذرة كتل متجاورة لكل تصنيف فيتجمّع العرض تلقائياً */
  const all = [...general, ...qubool];
  const cats = presentFaqCategories(all);
  const byCat = new Map<string, FaqDoc[]>();
  for (const c of cats) byCat.set(c, []);
  for (const f of all) byCat.get(faqCategoryKey(f.category))?.push(f);

  /* البحث الفوري: سؤال + جواب، substring غير حساس للحالة — فلترة متزامنة
     رخيصة على عشرات الأسئلة (بلا debounce، قاعدة React Compiler محفوظة) */
  const q = query.trim().toLowerCase();
  const results = q === ""
    ? null
    : all.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));

  /* القائمة المعروضة خارج البحث: «الكل» بترتيب التصنيفات، أو تصنيف واحد */
  const shown = cat === "all" ? cats.flatMap((c) => byCat.get(c) ?? []) : (byCat.get(cat) ?? []);

  return (
    <div className="flex flex-col gap-10">
      {/* ═══ الأسئلة ═══ */}
      <section>
        {/* شريط البحث الفوري — بنمط شريط بحث المخزن */}
        <div className="relative mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في كل الأسئلة..."
            aria-label="ابحث في الأسئلة الشائعة"
            className="w-full rounded-2xl px-5 py-3.5 text-[14.5px] outline-none pr-11"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-5 h-5">
              <circle cx="9" cy="9" r="5.5" /><path strokeLinecap="round" d="M13.5 13.5l3 3" />
            </svg>
          </span>
        </div>

        {results !== null ? (
          /* ── نتائج البحث — مسطحة عبر كل التصنيفات مع شارة تصنيف كل نتيجة ── */
          results.length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: "var(--surface)", border: "1.5px dashed var(--border)" }}>
              <p className="text-[15px] font-black mb-1" style={{ color: "var(--text)" }}>ما لقينا سؤالاً يطابق بحثك</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                جرّب كلمة أقصر، أو امسح البحث وتصفح التصنيفات.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[12.5px] font-bold mb-3 font-mono-nums" style={{ color: "var(--text-muted)" }}>
                {results.length} نتيجة
              </p>
              <div className="flex flex-col gap-2.5">
                {results.map((f) => (
                  <AccordionItem key={f.id} title={f.question}
                    open={openId === f.id}
                    onToggle={() => setOpenId(openId === f.id ? null : f.id)}
                    badge={<CategoryBadge category={f.category} />}>
                    <BulletText text={f.answer} />
                  </AccordionItem>
                ))}
              </div>
            </>
          )
        ) : (
          <>
            {/* ── شرائح التصنيفات — أفقية قابلة للتمرير (بنمط فلتر مواد البطاقات) ── */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 -mx-5 px-5"
              style={{ scrollbarWidth: "thin" }}>
              {[
                { id: "all", icon: "✨", label: "الكل", count: all.length },
                ...cats.map((c) => ({ id: c, ...faqCategoryMeta(c), count: byCat.get(c)?.length ?? 0 })),
              ].map((chip) => {
                const active = cat === chip.id;
                return (
                  <button key={chip.id} onClick={() => { setCat(chip.id); setOpenId(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-black whitespace-nowrap flex-shrink-0 transition active:scale-95"
                    style={{
                      background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                      color: active ? "var(--accent-light)" : "var(--text-muted)",
                      border: active
                        ? "1.5px solid color-mix(in srgb, var(--accent) 55%, transparent)"
                        : "1.5px solid var(--border)",
                    }}>
                    <span aria-hidden="true">{chip.icon}</span>
                    {chip.label}
                    <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full font-mono-nums"
                      style={{
                        background: active ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--surface2)",
                        color: active ? "var(--accent-light)" : "var(--text-muted)",
                      }}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2.5">
              {shown.map((f) => (
                <AccordionItem key={f.id} title={f.question}
                  open={openId === f.id}
                  onToggle={() => setOpenId(openId === f.id ? null : f.id)}>
                  <BulletText text={f.answer} />
                </AccordionItem>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ═══ القوائم المرجعية ═══ */}
      <section>
        <p className="eyebrow mb-1" style={{ color: "var(--accent-light)" }}>مرجع سريع</p>
        <h2 className="font-black text-[19px] mb-1" style={{ color: "var(--text)" }}>قوائم مرجعية</h2>
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
          القوائم الموسومة بـ ⚠️ تتغير كل موسم قبول — تأكد دائماً من موقع الجامعة الرسمي قبل الاعتماد عليها.
        </p>
        <div className="flex flex-col gap-2.5">
          {referenceLists.map((r) => (
            <AccordionItem key={r.id} title={r.title}
              open={openId === r.id}
              onToggle={() => setOpenId(openId === r.id ? null : r.id)}
              badge={r.needsAnnualReview ? <AnnualBadge /> : undefined}>
              <BulletText text={r.content} dotColor="var(--gold)" />
            </AccordionItem>
          ))}
        </div>
      </section>

      {/* ═══ النصائح ═══ */}
      <section>
        <p className="eyebrow mb-1" style={{ color: "var(--accent-light)" }}>من تجارب الطلاب</p>
        <h2 className="font-black text-[19px] mb-4" style={{ color: "var(--text)" }}>نصائح تفيدك</h2>
        <div className="flex flex-col gap-3">
          {tips.map((t) => (
            <div key={t.id} className="rounded-2xl p-5 glow-card-hover"
              style={{
                background: "var(--surface)",
                border: "1.5px solid color-mix(in srgb, var(--success) 22%, var(--border))",
              }}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0"
                  style={{
                    background: "color-mix(in srgb, var(--success) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--success) 28%, transparent)",
                  }}
                  aria-hidden="true">
                  💡
                </span>
                <p className="font-black text-[15px]" style={{ color: "var(--text)" }}>{t.title}</p>
              </div>
              <BulletText text={t.content} dotColor="var(--success)" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
