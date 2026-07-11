"use client";
/* ─── لوحة الأدمن: Dashboard — حالة درب في ١٠ ثوانٍ ───
   لا قائمة محتوى: صورةٌ كاملة. عدّادات الحالة + ملخّص الجودة + آخر التعديلات وآخر
   المنشور + أعلى المفاهيم + بحثٌ عالمي عبر كل الأنواع. المصدر: المستودع + الرسم. */
import { useEffect, useMemo, useState } from "react";
import { KB } from "@/lib/kb/entities";
import { KIND_META } from "@/lib/kb/entities/schema";
import { getContentRepository, STATUS_LABEL, loadHistory, ACTION_LABEL, type ContentRecord } from "@/lib/kb/repo";
import { contentStats, contentQuality } from "@/lib/kb/repo/adminStats";

const STATUS_COLOR = { draft: "var(--text-muted)", review: "var(--gold)", published: "var(--success)", archived: "var(--danger)" } as const;

export default function AdminDashboard({ onGoto }: { onGoto?: (section: "content" | "review" | "quality") => void }) {
  const repo = useMemo(() => getContentRepository(), []);
  const [records, setRecords] = useState<ContentRecord[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    repo.list().then((r) => { if (alive) setRecords(r); }).catch(() => { if (alive) setRecords([]); });
    return () => { alive = false; };
  }, [repo]);

  const stats = useMemo(() => (records ? contentStats(records) : null), [records]);
  const quality = useMemo(() => contentQuality(), []);
  const history = useMemo(() => loadHistory().slice(0, 8), []);
  const results = useMemo(() => (q.trim() ? KB.search(q, 8) : []), [q]);
  const qualityCount = quality.issues.reduce((s, i) => s + i.items.length, 0) + quality.brokenLinks.length;

  if (!stats) return <p className="t-caption" style={{ color: "var(--text-muted)" }}>جارٍ التحميل…</p>;

  return (
    <div className="flex flex-col gap-3">
      {/* بحث عالمي */}
      <div className="ds-card ds-stack-tight">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحثٌ عالمي… (مفهوم/درس/سؤال/كتاب/مصدر)"
          className="w-full rounded-xl px-4 py-3 t-body outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
        {q.trim() && (
          <div className="flex flex-col gap-1">
            {results.length === 0 && <p className="t-caption" style={{ color: "var(--text-muted)" }}>لا نتائج.</p>}
            {results.map((e) => (
              <div key={e.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: "var(--surface2)" }}>
                <span>{KIND_META[e.kind].icon}</span>
                <span className="t-body font-black flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>{e.name}</span>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>{KIND_META[e.kind].label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* عدّادات الحالة */}
      <div className="grid grid-cols-2 min-[560px]:grid-cols-4 gap-2.5">
        {(["published", "review", "draft", "archived"] as const).map((s) => (
          <button key={s} onClick={() => onGoto?.(s === "review" ? "review" : "content")} className="ds-card ds-card-tight flex flex-col gap-0.5 text-right">
            <span className="t-caption" style={{ color: "var(--text-muted)" }}>{STATUS_LABEL[s]}</span>
            <span className="t-h2 font-mono-nums" style={{ color: STATUS_COLOR[s] }}>{stats.byStatus[s]}</span>
          </button>
        ))}
      </div>

      {/* ملخّص الجودة */}
      <button onClick={() => onGoto?.("quality")} className="ds-card ds-card-interactive flex items-center gap-3 text-right"
        style={{ borderColor: qualityCount > 0 ? "color-mix(in srgb, var(--gold) 30%, var(--border))" : "var(--border)" }}>
        <span className="text-[22px]">🩺</span>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="t-title" style={{ color: "var(--text)" }}>لوحة الجودة</span>
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>{qualityCount > 0 ? `${qualityCount} عنصرٌ يحتاج معالجة` : "لا مشاكل ظاهرة"}</span>
        </div>
        <span className="t-caption" style={{ color: "var(--accent-light)" }}>افتح ↗</span>
      </button>

      {/* الأنواع */}
      <section className="ds-card ds-stack-tight">
        <h3 className="t-h3" style={{ color: "var(--text)" }}>المحتوى حسب النوع</h3>
        <div className="flex flex-wrap gap-1.5">
          {stats.byKind.slice(0, 12).map((k) => (
            <span key={k.kind} className="t-caption px-2.5 py-1 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>{k.icon} {k.label} <span className="font-mono-nums" style={{ color: "var(--text-muted)" }}>{k.count}</span></span>
          ))}
        </div>
      </section>

      {/* آخر التعديلات + آخر المنشور */}
      <div className="grid grid-cols-1 min-[640px]:grid-cols-2 gap-3">
        <section className="ds-card ds-stack-tight">
          <h3 className="t-h3" style={{ color: "var(--text)" }}>آخر التعديلات</h3>
          {history.length === 0 ? <p className="t-caption" style={{ color: "var(--text-muted)" }}>لا تعديلات بعد.</p> : history.map((h) => (
            <div key={h.id} className="flex items-center gap-2 t-caption">
              <span className="font-black" style={{ color: "var(--accent-light)" }}>{ACTION_LABEL[h.action]}</span>
              <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-dim)" }}>{h.entityName}</span>
              <span style={{ color: "var(--text-muted)" }}>{h.by}</span>
            </div>
          ))}
        </section>
        <section className="ds-card ds-stack-tight">
          <h3 className="t-h3" style={{ color: "var(--text)" }}>آخر المنشور</h3>
          {stats.recentPublished.map((r) => (
            <div key={r.id} className="flex items-center gap-2 t-caption">
              <span>{r.icon}</span>
              <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-dim)" }}>{r.name}</span>
              <span className="font-mono-nums" style={{ color: "var(--text-muted)" }}>{r.at}</span>
            </div>
          ))}
        </section>
      </div>

      {/* أعلى المفاهيم */}
      <section className="ds-card ds-stack-tight">
        <h3 className="t-h3" style={{ color: "var(--text)" }}>أعلى المفاهيم أهميةً</h3>
        <div className="flex flex-wrap gap-1.5">
          {stats.topConcepts.map((c) => (
            <span key={c.id} className="t-caption px-2.5 py-1 rounded-lg" style={{ background: "var(--surface2)", color: "var(--text)" }}>{c.name} <span className="font-mono-nums" style={{ color: "var(--accent-light)" }}>{c.importance}</span></span>
          ))}
        </div>
      </section>

      {/* مقاييس المنصّة — بصدق: بعضها يحتاج تحليلات مستقبلية */}
      <section className="ds-card ds-stack-tight" style={{ opacity: 0.9 }}>
        <h3 className="t-h3" style={{ color: "var(--text)" }}>مقاييس المنصّة</h3>
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>
          عدد المستخدمين، النشطون اليوم، ساعات الدراسة، أكثر المواد/المفاهيم زيارة، وأكثر الأسئلة خطأً — تحتاج تجميع تحليلاتٍ من Firestore/الأحداث. تُوصَل هنا لاحقاً بلا بيانات تجريبية.
        </p>
      </section>
    </div>
  );
}
