import Link from "next/link";

/* ─── تخطيط مستندات قانونية موحّد (خصوصية/شروط/اشتراك) — بلا تكرار بنية ─── */

export interface LegalSection {
  h: string;
  p?: string | string[];
  list?: string[];
}

const LEGAL_LINKS: { href: string; label: string }[] = [
  { href: "/privacy", label: "الخصوصية" },
  { href: "/terms", label: "شروط الاستخدام" },
  { href: "/subscription", label: "الاشتراك والاسترجاع" },
];

export default function LegalDoc({
  title,
  intro,
  sections,
  lastUpdated,
  active,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  lastUpdated: string;
  active: string; // المسار الحالي لإبراز الرابط
}) {
  return (
    <div className="min-h-dvh app-col">
      <div className="px-5 py-4 flex items-center justify-between glass border-b border-[var(--border)] sticky top-0 z-10">
        <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition">
          ← الرئيسية
        </Link>
        <span className="font-black text-[var(--text)]">{title}</span>
        <span className="w-12" />
      </div>

      <div className="px-5 py-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-black text-[var(--text)] mb-2">{title}</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed">{intro}</p>

        <div className="space-y-5">
          {sections.map((s) => (
            <div
              key={s.h}
              className="rounded-2xl p-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2 className="font-bold text-[19px] text-[var(--text)] mb-2">{s.h}</h2>
              {s.p &&
                (Array.isArray(s.p) ? s.p : [s.p]).map((para, i) => (
                  <p key={i} className="text-[17px] text-[var(--text-dim)] leading-relaxed mb-2 last:mb-0">
                    {para}
                  </p>
                ))}
              {s.list && (
                <ul className="mt-1 space-y-1.5">
                  {s.list.map((item, i) => (
                    <li key={i} className="text-[17px] text-[var(--text-dim)] leading-relaxed flex gap-2">
                      <span style={{ color: "var(--accent-light)" }} className="flex-shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* تنقّل بين المستندات القانونية */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-8">
          {LEGAL_LINKS.map((l) =>
            l.href === active ? (
              <span key={l.href} className="text-xs font-bold" style={{ color: "var(--accent-light)" }}>
                {l.label}
              </span>
            ) : (
              <Link key={l.href} href={l.href} className="text-xs" style={{ color: "var(--text-muted)" }}>
                {l.label}
              </Link>
            )
          )}
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center mt-4">آخر تحديث: {lastUpdated}</p>
      </div>
    </div>
  );
}
