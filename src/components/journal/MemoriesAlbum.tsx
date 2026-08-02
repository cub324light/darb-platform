"use client";
/* ═══════════ ألبومُ الذكريات الدراسية — في جوّالك لا عندنا ═══════════
   الطالبُ يريد صوراً لمذاكرته. ولو خزّنّاها في المتصفّح لأكلت حصّةَ التخزين
   (~٥ ميغا للنطاق كلِّه، وصورةُ جوّالٍ واحدة ٣–٨) فتفشل بعدها كتابةُ الخطة
   والأخطاء والجدول **بصمت**.

   فالأفضل — وهو رأيُ المالك — أن نعلّمه صنعَ ألبومٍ في جوّاله: جودةٌ كاملة،
   ونسخٌ احتياطيّ عند آبل/جوجل، ويبقى معه لو ترك درب. نحن نُرشد، ولا نملك صورَه. */
import { useState } from "react";
import Sheet from "@/components/Sheet";

type Phone = "ios" | "android";

const STEPS: Record<Phone, { label: string; steps: string[]; extra?: string }> = {
  ios: {
    label: "آيفون",
    steps: [
      "افتح تطبيق «الصور»، ثم بويب «الألبومات» في الأسفل.",
      "اضغط ＋ في الأعلى، ثم «ألبوم جديد».",
      "سمّه «ذكرياتي الدراسية» واضغط «حفظ».",
      "اختر صورك ثم «تم» — وكل صورةٍ جديدة: مشاركة ← «إضافة إلى ألبوم» ← ذكرياتي الدراسية.",
    ],
    extra: "ولو صوّرتَ سبورةً أو ورقة: افتح «الكاميرا» ← وضع «مسح المستندات» في تطبيق «الملاحظات» يجعلها واضحةً ومستقيمة.",
  },
  android: {
    label: "أندرويد",
    steps: [
      "افتح «صور Google»، ثم «المكتبة» في الأسفل.",
      "اضغط «ألبوم جديد» (أو ＋ ← ألبوم).",
      "سمّه «ذكرياتي الدراسية» واضغط ✓.",
      "اختر صورك، وكل صورةٍ جديدة: اضغط عليها ← «إضافة إلى» ← ذكرياتي الدراسية.",
    ],
    extra: "و«Google Lens» داخل التطبيق يستخرج النصّ من صورة السبورة، فتنسخه إلى ورقة الكتابة هنا.",
  },
};

export default function MemoriesAlbum() {
  const [open, setOpen] = useState<Phone | null>(null);
  return (
    <section className="ds-card ds-stack-tight">
      <h2 className="t-h3" style={{ color: "var(--text)" }}>📸 ذكرياتك الدراسية</h2>
      <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
        صورُ مذاكرتك مكانُها ألبومٌ في جوّالك — جودةٌ كاملة، ونسخةٌ احتياطية عند آبل أو جوجل،
        وتبقى معك. لا نحفظها عندنا: صورةٌ واحدة تملأ مساحةَ المتصفّح فتضيع خطتُك وأخطاؤك.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {(["ios", "android"] as Phone[]).map((p) => (
          <button key={p} onClick={() => setOpen(p)}
            className="rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
            {STEPS[p].label}
          </button>
        ))}
      </div>

      {open && (
        <Sheet onClose={() => setOpen(null)} title={`ألبوم الذكريات — ${STEPS[open].label}`}>
          <ol className="flex flex-col gap-3">
            {STEPS[open].steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center t-caption font-black font-mono-nums"
                  style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>
                  {i + 1}
                </span>
                <span className="t-body leading-relaxed" style={{ color: "var(--text)" }}>{s}</span>
              </li>
            ))}
          </ol>
          {STEPS[open].extra && (
            <p className="t-caption leading-relaxed rounded-xl p-3 mt-4"
              style={{ background: "color-mix(in srgb, var(--gold) 10%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--gold) 26%, transparent)", color: "var(--text)" }}>
              💡 {STEPS[open].extra}
            </p>
          )}
        </Sheet>
      )}
    </section>
  );
}
