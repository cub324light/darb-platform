"use client";
/* ─── لوحة الأدمن: الجودة — أين الفجوات (أهمّ من إضافة محتوى) ───
   من الرسم مباشرة: مفاهيم بلا شرح/أمثلة/أسئلة/مصادر، دروس بلا مصادر، أسئلة بلا
   إجابة، وروابط مكسورة. المصدر: knowledgeCoverage + KB.validate (أنظمة جاهزة). */
import { useMemo, useState } from "react";
import { contentQuality } from "@/lib/kb/repo/adminStats";

export default function AdminQuality() {
  const { issues, brokenLinks } = useMemo(() => contentQuality(), []);
  const [open, setOpen] = useState<string | null>(issues[0]?.key ?? null);
  const total = issues.reduce((s, i) => s + i.items.length, 0) + brokenLinks.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="ds-card flex items-center gap-3">
        <span className="text-[25px]">🩺</span>
        <div className="flex flex-col flex-1">
          <span className="t-h3" style={{ color: "var(--text)" }}>لوحة الجودة</span>
          <span className="t-caption" style={{ color: total > 0 ? "var(--gold)" : "var(--success)" }}>{total > 0 ? `${total} عنصرٌ يحتاج معالجة` : "المحتوى سليم — لا فجوات ظاهرة"}</span>
        </div>
      </div>

      {issues.map((iss) => (
        <section key={iss.key} className="ds-card ds-stack-tight">
          <button onClick={() => setOpen(open === iss.key ? null : iss.key)} className="flex items-center gap-2 text-right w-full">
            <span className="text-[20px]">{iss.icon}</span>
            <span className="t-title flex-1" style={{ color: "var(--text)" }}>{iss.label}</span>
            <span className="t-caption font-black px-2 py-0.5 rounded-full font-mono-nums" style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}>{iss.items.length}</span>
            <span style={{ color: "var(--text-muted)" }}>{open === iss.key ? "▾" : "▸"}</span>
          </button>
          {open === iss.key && (
            <div className="flex flex-wrap gap-1.5">
              {iss.items.slice(0, 60).map((it) => (
                <span key={it.id} className="t-caption px-2.5 py-1 rounded-lg" style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>{it.name}</span>
              ))}
              {iss.items.length > 60 && <span className="t-caption" style={{ color: "var(--text-muted)" }}>+{iss.items.length - 60}</span>}
            </div>
          )}
        </section>
      ))}

      <section className="ds-card ds-stack-tight" style={{ borderColor: brokenLinks.length ? "color-mix(in srgb, var(--danger) 30%, var(--border))" : "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[20px]">🔗</span>
          <span className="t-title flex-1" style={{ color: "var(--text)" }}>روابط مكسورة</span>
          <span className="t-caption font-black px-2 py-0.5 rounded-full font-mono-nums" style={{ background: `color-mix(in srgb, ${brokenLinks.length ? "var(--danger)" : "var(--success)"} 16%, transparent)`, color: brokenLinks.length ? "var(--danger)" : "var(--success)" }}>{brokenLinks.length}</span>
        </div>
        {brokenLinks.length === 0 ? (
          <p className="t-caption" style={{ color: "var(--success)" }}>الرسم سليم — لا حواف معلّقة ولا معرّفات مكرّرة.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {brokenLinks.slice(0, 40).map((m, i) => <span key={i} className="t-caption" style={{ color: "var(--text-dim)" }}>{m}</span>)}
          </div>
        )}
      </section>
    </div>
  );
}
