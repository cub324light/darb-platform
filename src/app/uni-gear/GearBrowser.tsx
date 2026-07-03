"use client";
/* ─── متصفح أجهزة الجامعة ───
   ثلاثة صفوف شرائح فلترة (فئة الجهاز / التخصص / الميزانية) فوق بطاقات توصيات
   المواصفات من src/lib/gear — بيانات ثابتة من الكود، بلا أي جلب.
   تخصيص لطيف: لو للمستخدم تخصص محفوظ (هدف الجامعة أو نوع المسار) يصير فلتر
   التخصص الافتراضي بتهيئة كسولة — الزائر بلا بيانات يرى «الكل». */
import { useState } from "react";
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
    <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md flex-shrink-0"
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
      <p className="text-[11px] font-black mb-1.5" style={{ color: "var(--text-muted)" }}>{title}</p>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: "thin" }}>
        {chips.map((chip) => {
          const active = value === chip.id;
          return (
            <button key={chip.id} onClick={() => onChange(chip.id)} aria-pressed={active}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-black whitespace-nowrap flex-shrink-0 transition active:scale-95"
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
  return (
    <article className="rounded-2xl p-5 flex flex-col gap-3 glow-card-hover"
      style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
      <div className="flex items-start gap-2.5">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0"
          style={{
            background: "color-mix(in srgb, var(--accent) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 24%, transparent)",
          }}
          aria-hidden="true">
          {cat.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-[15px] leading-snug" style={{ color: "var(--text)" }}>{item.title}</h3>
          <p className="text-[11px] mt-1 font-bold" style={{ color: "var(--text-muted)" }}>
            يناسب: {fitLabels.join(" · ")}
          </p>
        </div>
        <BudgetBadge tier={item.budget} />
      </div>

      <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-dim)" }}>{item.reason}</p>

      <ul className="flex flex-col gap-1.5">
        {item.specs.map((s) => (
          <li key={s} className="flex items-start gap-2 text-[12.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
            <span className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0" style={{ background: "var(--accent)" }} aria-hidden="true" />
            {s}
          </li>
        ))}
      </ul>

      {item.examples && item.examples.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>أمثلة:</span>
          {item.examples.map((e) => (
            <span key={e} className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
              style={{ background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
              {e}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-1 flex items-baseline gap-1.5">
        <span className="font-mono-nums font-black text-[14.5px]" style={{ color: "var(--text)" }} dir="ltr">
          {formatPriceRange(item.priceRangeSAR)}
        </span>
        <span className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>ريال</span>
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

  /* فلترة متزامنة رخيصة على ٣٠ عنصراً ثابتاً — لا حاجة لأي حفظ يدوي */
  const shown = filterGear(GEAR_ITEMS, {
    category: category === "all" ? undefined : category,
    major: major === "all" ? undefined : major,
    budget: budget === "all" ? undefined : budget,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* ── صفوف الفلترة ── */}
      <div className="flex flex-col gap-3">
        <ChipRow title="الجهاز" value={category} onChange={setCategory} options={GEAR_CATEGORIES} />
        <ChipRow title="التخصص" value={major} onChange={setMajor} options={GEAR_MAJORS} />
        <ChipRow title="الميزانية" value={budget} onChange={setBudget} options={BUDGET_TIERS} />
      </div>

      <p className="text-[12.5px] font-bold -mb-3 font-mono-nums" style={{ color: "var(--text-muted)" }}>
        {shown.length} توصية
      </p>

      {shown.length === 0 ? (
        <div className="rounded-2xl p-8 text-center"
          style={{ background: "var(--surface)", border: "1.5px dashed var(--border)" }}>
          <p className="text-[15px] font-black mb-1" style={{ color: "var(--text)" }}>ما فيه توصية تطابق كل الفلاتر</p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            وسّع الميزانية أو رجّع أحد الفلاتر إلى «الكل».
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 desk-grid-3 gap-3">
          {shown.map((it) => <GearCard key={it.id} item={it} />)}
        </div>
      )}

      {/* تنويه ثابت — الأسعار للعرض التعليمي فقط */}
      <p className="text-[12px] text-center" style={{ color: "var(--text-muted)" }}>
        ⚠️ الأسعار استرشادية وتتغير — قارن قبل الشراء.
      </p>
    </div>
  );
}
