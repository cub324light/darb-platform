"use client";
/* 📚 أخطائي — وحدةٌ واحدة تجمع كل ما يخصّ المراجعة في مكانٍ واحد (تقليل الصفحات).
   قسمان: «أخطائي» (سجلّ الأخطاء) و«المحفوظات» (بطاقات التكرار المتباعد). */
import { useState } from "react";
import Dome from "@/components/Dome";
import PageFooter from "@/components/PageFooter";
import ErrorsBody from "@/components/vault/ErrorsBody";
import SavedBody from "@/components/review/SavedBody";

type Tab = "errors" | "saved";

export default function AkhtaiPage({ initialTab = "errors" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const TABS: { key: Tab; label: string }[] = [
    { key: "errors", label: "أخطائي" },
    { key: "saved", label: "المحفوظات" },
  ];
  return (
    <div className="min-h-dvh pb-nav relative z-[1] desk-wide">
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg grad-title">📚 أخطائي</h1>
        </div>
      </Dome>

      {/* تبويبان: أخطائي · المحفوظات */}
      <div className="px-5 mt-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl p-1" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={on}
                className="py-2.5 rounded-xl font-bold t-body transition active:scale-[0.98]"
                style={on ? { background: "var(--accent)", color: "#fff" } : { background: "transparent", color: "var(--text-muted)" }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "errors" ? <ErrorsBody embedded /> : <SavedBody embedded />}

      <PageFooter />
    </div>
  );
}
