"use client";
/* ═══════════ 📚 المصادر — روابط رسمية فقط (V2) ═══════════
   بحثٌ أعلى الصفحة (القائمة ستكبر) ثم تصنيفات، وكل عنصر: اسم الجهة · وصفٌ بسيط ·
   زر «فتح الموقع الرسمي». البيانات من officialLinks.ts (نطاقاتٌ موثّقة فقط). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { OFFICIAL_LINKS, LINK_CATEGORY_LABEL, LINK_CATEGORY_ORDER, searchLinks, type LinkCategory } from "@/lib/officialLinks";
import { recordResourceUse } from "@/lib/roadmap/resourceUse";
import { findUniversity, qsRankText } from "@/lib/university";
import { n, year } from "@/lib/format";

export default function ResourcesPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const found = searchLinks(OFFICIAL_LINKS, q);

  return (
    <div className="min-h-dvh pb-nav relative z-[1] page-enter">
      <div className="max-w-xl mx-auto w-full px-5 pt-7 pb-8 flex flex-col gap-4">
        <div className="self-start"><BackButton href="/roadmap" label="مساري" /></div>
        <h1 className="t-h2 font-black -mt-2" style={{ color: "var(--text)" }}>📚 المصادر</h1>
        <p className="t-body -mt-2" style={{ color: "var(--text-dim)" }}>الجهات الرسمية فقط — بلا وسطاء.</p>

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث عن جامعة أو برنامج..."
          className="w-full rounded-2xl px-4 py-3.5 t-body font-bold outline-none min-h-[54px]"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }} />

        {found.length === 0 ? (
          <p className="t-body px-1 mt-2" style={{ color: "var(--text-muted)" }}>لا نتائج لـ«{q}» — جرّب اسماً آخر.</p>
        ) : (
          LINK_CATEGORY_ORDER.map((cat: LinkCategory) => {
            const items = found.filter((l) => l.category === cat);
            if (items.length === 0) return null;
            return (
              <section key={cat} className="flex flex-col gap-2.5">
                <p className="t-title font-black px-1 mt-2" style={{ color: "var(--text)" }}>{LINK_CATEGORY_LABEL[cat]} <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>({n(items.length)})</span></p>
                {items.map((l) => {
                  const uni = l.uniId ? findUniversity(l.uniId) : undefined;
                  return (
                    <div key={l.id} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                      <p className="t-h3 font-black leading-snug" style={{ color: "var(--text)" }}>{l.name}</p>
                      {/* الترتيب العالميّ يظهر قبل الضغط — ولا يظهر إن لم يكن موثّقاً */}
                      {uni?.qsRank != null && (
                        <span className="inline-block t-caption font-black px-2.5 py-1 rounded-full mt-2 font-mono-nums"
                          style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold-light)" }}>
                          🌍 التصنيف العالمي QS: {qsRankText(uni, n)}{uni.qsYear ? ` (${year(uni.qsYear)})` : ""}
                        </span>
                      )}
                      <p className="t-body mt-1.5 leading-relaxed" style={{ color: "var(--text-dim)" }}>{l.desc}</p>
                      <div className="flex flex-wrap gap-2 mt-3.5">
                        {l.uniId && (
                          <button onClick={() => router.push(`/universities/${l.uniId}`)}
                            className="t-body font-black px-4 py-2.5 rounded-xl"
                            style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                            تعريف الجامعة ←
                          </button>
                        )}
                        <a href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => recordResourceUse(l.id)}
                          className="inline-block t-body font-black px-4 py-2.5 rounded-xl no-underline"
                          style={{ color: "var(--accent-light)", border: "1.5px solid color-mix(in srgb, var(--accent) 35%, var(--border))" }}>
                          الموقع الرسمي ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
