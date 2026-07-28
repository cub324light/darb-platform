"use client";
/* ─── متصفح أجهزة الجامعة ───
   ثلاثة صفوف شرائح فلترة (فئة الجهاز / التخصص / الميزانية) فوق بطاقات توصيات
   المواصفات من src/lib/gear — بيانات ثابتة من الكود، بلا أي جلب.
   تخصيص لطيف: لو للمستخدم تخصص محفوظ (هدف الجامعة أو نوع المسار) يصير فلتر
   التخصص الافتراضي بتهيئة كسولة — الزائر بلا بيانات يرى «الكل». */
import { useState } from "react";
import { CardGrid } from "@/components/ds";
import type { MajorCategory } from "@/lib/university";
import { findMajor } from "@/lib/university";
import { loadGoals, loadUser } from "@/lib/storage";
import type { BudgetTier, GearCategory, GearItem } from "@/lib/gear";
import {
  GEAR_ITEMS, GEAR_CATEGORIES, BUDGET_TIERS, GEAR_MAJORS,
  filterGear, formatPriceRange, budgetMeta, gearCategoryMeta,
} from "@/lib/gear";

/* شارة شريحة الميزانية — ملونة بلون الشريحة (أخضر/ذهبي/أحمر) */
function BudgetBadge({ tier }: { tier: BudgetTier }) {
  const meta = budgetMeta(tier);
  return (
    <span className="text-[12px] font-black px-2 py-0.5 rounded-md flex-shrink-0"
      style={{
        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
        color: meta.color,
        border: `1px solid color-mix(in srgb, ${meta.color} 40%, transparent)`,
      }}>
      {meta.label}
    </span>
  );
}

/* صف شرائح فلترة واحد: «الكل» + الخيارات — أفقي قابل للتمرير (بنمط شرائح الأسئلة الشائعة) */
function ChipRow<T extends string>({ title, value, onChange, options }: {
  title: string;
  value: T | "all";
  onChange: (v: T | "all") => void;
  options: ReadonlyArray<{ id: T; label: string; icon?: string }>;
}) {
  const chips: ReadonlyArray<{ id: T | "all"; label: string; icon?: string }> = [
    { id: "all", label: "الكل", icon: "✨" },
    ...options,
  ];
  return (
    <div>
      <p className="t-caption mb-1.5" style={{ color: "var(--text-muted)" }}>{title}</p>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: "thin" }}>
        {chips.map((chip) => {
          const active = value === chip.id;
          return (
            <button key={chip.id} onClick={() => onChange(chip.id)} aria-pressed={active}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-black whitespace-nowrap flex-shrink-0 transition active:scale-95"
              style={{
                background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                color: active ? "var(--accent-light)" : "var(--text-muted)",
                border: active
                  ? "1.5px solid color-mix(in srgb, var(--accent) 55%, transparent)"
                  : "1.5px solid var(--border)",
              }}>
              {chip.icon && <span aria-hidden="true">{chip.icon}</span>}
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* بطاقة توصية واحدة: العنوان والملاءمة والسبب والمواصفات والأمثلة والمدى السعري */
function GearCard({ item }: { item: GearItem }) {
  const cat = gearCategoryMeta(item.category);
  /* أسماء التخصصات الملائمة بترتيب العرض الثابت */
  const fitLabels = GEAR_MAJORS.filter((m) => item.fitsMajors.includes(m.id)).map((m) => m.label);
  /* البرامج وأدوات AI أسعارها اشتراك شهري؛ {0,0} = مجاني (كثير منها مجاني/طلابي) */
  const isSoftware = item.category === "software" || item.category === "ai";
  const isFree = item.priceRangeSAR.max === 0;
  return (
    /* بطاقة نظام موحّدة — متساوية الارتفاع داخل CardGrid (السعر يلتصق بالأسفل عبر mt-auto) */
    <article className="ds-card flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0"
          style={{
            background: "color-mix(in srgb, var(--accent) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 24%, transparent)",
          }}
          aria-hidden="true">
          {cat.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="t-body font-black leading-snug" style={{ color: "var(--text)" }}>{item.title}</h3>
          <p className="t-caption mt-1" style={{ color: "var(--text-muted)" }}>
            يناسب: {fitLabels.join(" · ")}
          </p>
        </div>
        <BudgetBadge tier={item.budget} />
      </div>

      <p className="t-body" style={{ color: "var(--text-dim)" }}>{item.reason}</p>

      <ul className="flex flex-col gap-1.5">
        {item.specs.map((s) => (
          <li key={s} className="flex items-start gap-2 t-caption" style={{ color: "var(--text-dim)" }}>
            <span className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0" style={{ background: "var(--accent)" }} aria-hidden="true" />
            {s}
          </li>
        ))}
      </ul>

      {item.examples && item.examples.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>أمثلة:</span>
          {item.examples.map((e) => (
            <span key={e} className="text-[12px] font-bold px-2 py-0.5 rounded-lg"
              style={{ background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
              {e}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-1 flex items-baseline gap-1.5">
        {isFree ? (
          <span className="font-black text-[16px]" style={{ color: "var(--success)" }}>مجاني</span>
        ) : (
          <>
            <span className="font-mono-nums font-black text-[16px]" style={{ color: "var(--text)" }} dir="ltr">
              {formatPriceRange(item.priceRangeSAR)}
            </span>
            <span className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>
              {isSoftware ? "ريال/شهر" : "ريال"}
            </span>
          </>
        )}
      </div>
    </article>
  );
}

export default function GearBrowser() {
  /* فلتر التخصص الافتراضي من بيانات المستخدم إن وُجدت — تهيئة كسولة فقط
     (لا setState داخل effect، بنمط صفحة الهبوط): هدف الجامعة أولاً ثم نوع المسار */
  const [major, setMajor] = useState<MajorCategory | "all">(() => {
    if (typeof window === "undefined") return "all";
    const fromGoals = findMajor(loadGoals().majorId)?.category;
    if (fromGoals) return fromGoals;
    const track = loadUser()?.trackType;
    return GEAR_MAJORS.some((m) => m.id === track) ? (track as MajorCategory) : "all";
  });
  const [category, setCategory] = useState<GearCategory | "all">("all");
  const [budget, setBudget] = useState<BudgetTier | "all">("all");

  /* فلترة متزامنة رخيصة على 30 عنصراً ثابتاً — لا حاجة لأي حفظ يدوي */
  const shown = filterGear(GEAR_ITEMS, {
    category: category === "all" ? undefined : category,
    major: major === "all" ? undefined : major,
    budget: budget === "all" ? undefined : budget,
  });

  return (
    /* ds-stack: إيقاع رأسي موحّد بين الفلاتر والنتائج (الصفحة تتنفّس) */
    <div className="ds-stack">
      {/* ── صفوف الفلترة ── */}
      <div className="ds-stack-tight">
        <ChipRow title="الجهاز" value={category} onChange={setCategory} options={GEAR_CATEGORIES} />
        <ChipRow title="التخصص" value={major} onChange={setMajor} options={GEAR_MAJORS} />
        <ChipRow title="الميزانية" value={budget} onChange={setBudget} options={BUDGET_TIERS} />
      </div>

      {/* تنويه أخلاقي — يظهر عند اختيار فئة أدوات AI: مساعدة للفهم لا غش */}
      {category === "ai" && (
        <div className="ds-card flex items-start gap-2.5"
          style={{
            background: "color-mix(in srgb, var(--gold) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--gold) 34%, transparent)",
          }}>
          <span className="text-[20px] flex-shrink-0" aria-hidden="true">⚖️</span>
          <p className="t-body" style={{ color: "var(--text-dim)" }}>
            استخدمها للفهم والمساعدة لا للغش — النزاهة الأكاديمية مسؤوليتك.
            خلّها تشرح لك لتتعلّم، وسلّم شغلك بيدك أنت.
          </p>
        </div>
      )}

      {/* العدد ملاصق لشبكته (ds-stack-tight) — التسمية قرب محتواها */}
      <div className="ds-stack-tight">
        <p className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>
          {shown.length} توصية
        </p>

        {shown.length === 0 ? (
          <div className="ds-card ds-card-lg text-center" style={{ borderStyle: "dashed" }}>
            <p className="t-body font-black mb-1" style={{ color: "var(--text)" }}>ما فيه توصية تطابق كل الفلاتر</p>
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>
              وسّع الميزانية أو رجّع أحد الفلاتر إلى «الكل».
            </p>
          </div>
        ) : (
          <CardGrid cols={3}>
            {shown.map((it) => <GearCard key={it.id} item={it} />)}
          </CardGrid>
        )}
      </div>

      {/* تنويه ثابت — الأسعار والاشتراكات للعرض التعليمي فقط */}
      <p className="t-caption text-center" style={{ color: "var(--text-muted)" }}>
        ⚠️ الأسعار والاشتراكات استرشادية وتتغير — كثير من البرامج مجاني أو له نسخة طلابية، تحقّق قبل الشراء.
      </p>
    </div>
  );
}
