"use client";
/* ═══════════ 📚 المصادر — روابط رسمية فقط (V2) ═══════════
   بحثٌ أعلى الصفحة (القائمة ستكبر) ثم تصنيفات، وكل عنصر: اسم الجهة · وصفٌ بسيط ·
   زر «فتح الموقع الرسمي». البيانات من officialLinks.ts (نطاقاتٌ موثّقة فقط). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { OFFICIAL_LINKS, LINK_CATEGORY_LABEL, LINK_CATEGORY_ORDER, searchLinks, type LinkCategory } from "@/lib/officialLinks";
import { recordResourceUse } from "@/lib/roadmap/resourceUse";
import { n } from "@/lib/format";

export default function ResourcesPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const found = searchLinks(OFFICIAL_LINKS, q);

  return (
    <div className="min-h-dvh pb-nav relative z-[1] page-enter">
      <div className="max-w-xl mx-auto w-full px-5 pt-7 pb-8 flex flex-col gap-4">
        <button onClick={() => router.push("/roadmap")} className="t-body font-bold self-start" style={{ color: "var(--text-muted)" }}>← الآن</button>
        <h1 className="t-h2 font-black -mt-2" style={{ color: "var(--text)" }}>📚 المصادر</h1>
        <p className="t-body -mt-2" style={{ color: "var(--text-muted)" }}>الجهات الرسمية فقط — بلا وسطاء.</p>

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث عن جامعة أو برنامج..."
          className="w-full rounded-2xl px-4 py-3.5 t-body font-bold outline-none min-h-[52px]"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }} />

        {found.length === 0 ? (
          <p className="t-body px-1 mt-2" style={{ color: "var(--text-muted)" }}>لا نتائج لـ«{q}» — جرّب اسماً آخر.</p>
        ) : (
          LINK_CATEGORY_ORDER.map((cat: LinkCategory) => {
            const items = found.filter((l) => l.category === cat);
            if (items.length === 0) return null;
            return (
              <section key={cat} className="flex flex-col gap-2.5">
                <p className="eyebrow px-1 mt-1">{LINK_CATEGORY_LABEL[cat]} · {n(items.length)}</p>
                {items.map((l) => (
                  <div key={l.id} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                    <p className="t-title font-black" style={{ color: "var(--text)" }}>{l.name}</p>
                    <p className="t-caption mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{l.desc}</p>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => recordResourceUse(l.id)}
                      className="inline-block t-caption font-black px-3.5 py-2 rounded-xl mt-3 no-underline"
                      style={{ color: "var(--accent-light)", border: "1.5px solid color-mix(in srgb, var(--accent) 35%, var(--border))" }}>
                      فتح الموقع الرسمي ↗
                    </a>
                  </div>
                ))}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
