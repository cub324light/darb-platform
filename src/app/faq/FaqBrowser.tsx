"use client";
/* ─── متصفح الأسئلة الشائعة ───
   تبويب يفصل «القبول الجامعي» عن «منصة قبول»، وأسفله القوائم المرجعية
   (مع تنبيه «تتغير سنوياً» للموسومة) ثم النصائح. البيانات تصل props من
   الصفحة الخادمية — هذا المكوّن للتفاعل فقط (بلا أي جلب). */
import { useState } from "react";
import type { FaqDoc, ReferenceListDoc, TipDoc } from "@/lib/content/types";
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
  const [tab, setTab] = useState<"general" | "qubool">("general");
  const [openId, setOpenId] = useState<string | null>(null);

  const tabs = [
    { id: "general" as const, label: "القبول الجامعي", count: general.length },
    { id: "qubool" as const, label: "منصة قبول", count: qubool.length },
  ];
  const activeList = tab === "general" ? general : qubool;

  return (
    <div className="flex flex-col gap-10">
      {/* ═══ الأسئلة ═══ */}
      <section>
        {/* التبويب — شريط مقسّم بنمط المنصة */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setOpenId(null); }}
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-black text-[13.5px] transition active:scale-[0.98]"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
                  color: active ? "var(--accent-light)" : "var(--text-muted)",
                  border: active ? "1.5px solid color-mix(in srgb, var(--accent) 40%, transparent)" : "1.5px solid transparent",
                }}>
                {t.label}
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full font-mono-nums"
                  style={{
                    background: active ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--surface2)",
                    color: active ? "var(--accent-light)" : "var(--text-muted)",
                  }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5">
          {activeList.map((f) => (
            <AccordionItem key={f.id} title={f.question}
              open={openId === f.id}
              onToggle={() => setOpenId(openId === f.id ? null : f.id)}>
              <BulletText text={f.answer} />
            </AccordionItem>
          ))}
        </div>
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
