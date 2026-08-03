"use client";
/* ─── «الرسميّ» — ما لا يملك الطالبُ تغييرَه، في بطاقةٍ واحدة ───
   كانت ثلاثَ بطاقاتٍ تجيب سؤالاً واحداً («وش الجاي رسمياً؟»): «قريباً» و«آخر
   التحديثات» و«الاختبارات القادمة» — تأخذ نحوَ نصفِ الصفحة وفيها تكرار.

   ▓ و«آخر التحديثات» لم تكن تحديثاتٍ أصلاً: خمسةُ روابطَ ثابتةٍ في الكود، لكلٍّ
   تاريخُ «آخر تحديث» **واحدٌ مكتوبٌ بيدنا** (2026-07-01) لخمستها. فكانت الصفحةُ
   تخبر الطالبَ أنّ قياس ووزارة التعليم وأرامكو حدّثت شيئاً في أوّل يوليو — ونحن
   لم نتحقّق من ذلك قطّ. وهذا تاريخٌ لم تُعلنه جهةٌ رسمية، فحُذف عرضُه: صارت
   **دليلَ جهاتٍ** بلا ادّعاءِ حداثة، وهو ما كانت عليه حقيقةً.

   الترتيب: اختباراتُك (تخصُّك) ← مواعيدُ معلنة (إن وُجدت) ← روابطُ الجهات. */
import { useState } from "react";
import Link from "next/link";
import { loadUser, localDayKey } from "@/lib/storage";
import { upcomingMilestones, officialUpdates, milestoneIcon, type Milestone, type OfficialUpdate } from "@/lib/home/homeSignals";
import { n } from "@/lib/format";
import { currentRegistrationStatus } from "@/lib/examProvider";
import type { TrackId } from "@/lib/tracks";

interface SignalsData {
  soon: Milestone[];
  entities: OfficialUpdate[];
  exams: { track: string; daysUntil: number | null; regOpen: boolean }[];
}

function build(): SignalsData | null {
  if (typeof window === "undefined") return null;
  const u = loadUser();
  const today = localDayKey(new Date());
  const pending = u?.pendingResults ?? [];
  const soon = upcomingMilestones({ today, horizonDays: 120, pending, limit: 4 });

  const examMs = upcomingMilestones({ today, horizonDays: 365, pending, limit: 30 }).filter((m) => m.kind === "exam");
  const byTrack = new Map<string, Milestone>();
  for (const m of examMs) if (!byTrack.has(m.track)) byTrack.set(m.track, m);
  const tracks = (u?.activeTracks ?? []).filter((t) => t === "قدرات" || t === "تحصيلي" || t === "ستيب" || t === "تحصيلي مبكر");

  /* «لم يُعلن الموعد» و«ما حدّدت موعدك» ليسا شيئاً واحداً. القدرات وستيب
     تسجيلُهما مفتوحٌ طوال السنة (المحوسب)، فقولُ «لم يُعلن» عنهما كذبٌ يُقعِد
     الطالبَ عن التسجيل وهو يستطيعه اليوم. */
  const exams = tracks.map((t) => ({
    track: t,
    daysUntil: byTrack.get(t)?.daysUntil ?? null,
    regOpen: currentRegistrationStatus(t as TrackId, today) === "open",
  }));

  return { soon, entities: officialUpdates(), exams };
}

export default function HomeSignals() {
  const [d] = useState(build);
  if (!d) return null;

  return (
    <section className="ds-card ds-card-tight flex flex-col gap-3.5">
      <div>
        <p className="t-title font-black" style={{ color: "var(--text)" }}>الرسميّ</p>
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>مواعيدُ الجهات الرسمية — لا نعرض تاريخاً لم تُعلنه.</p>
      </div>

      {/* ── اختباراتُك: أقربُ ما يخصُّه ── */}
      {d.exams.length > 0 && (
        <div className="flex flex-col gap-2">
          {d.exams.map((e) => (
            <div key={e.track} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <span className="t-body font-black flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>{e.track}</span>
              <span className="t-caption font-mono-nums flex-shrink-0"
                style={{ color: e.daysUntil != null ? "var(--accent-light)" : e.regOpen ? "var(--success)" : "var(--text-muted)" }}>
                {e.daysUntil != null ? `بعد ${n(e.daysUntil)} يوم`
                  : e.regOpen ? "التسجيل مفتوح" : "لم يُعلن الموعد"}
              </span>
              <Link href="/review" className="t-caption font-bold no-underline flex-shrink-0 px-2.5 py-1 rounded-full tap-44"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>مراجعة</Link>
            </div>
          ))}
        </div>
      )}

      {/* ── مواعيدُ معلنة قادمة: تُعرض إن وُجدت فقط، ولا بطاقةَ فارغةً لها ── */}
      {d.soon.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>قريباً</p>
          {d.soon.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <span className="text-[16px] flex-shrink-0">{milestoneIcon(m.kind)}</span>
              <span className="t-body font-bold flex-1 min-w-0" style={{ color: "var(--text)" }}>{m.title}</span>
              <span className="t-caption font-black font-mono-nums flex-shrink-0 px-2 py-0.5 rounded-full"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                {m.daysUntil === 0 ? "اليوم" : `بعد ${n(m.daysUntil)} يوم`}
              </span>
            </div>
          ))}
        </div>
      )}

      {d.exams.length === 0 && d.soon.length === 0 && (
        <p className="t-body" style={{ color: "var(--text-muted)" }}>
          لا مواعيدَ معلنةً تخصُّك الآن. اختر اختباراتك في مساري لنتابعها لك.
        </p>
      )}

      {/* ── دليلُ الجهات: روابطُ للمصادر، بلا تواريخَ ندّعيها ── */}
      <div>
        <p className="t-caption font-bold mb-2" style={{ color: "var(--text-muted)" }}>المصادر الرسمية</p>
        <div className="flex flex-wrap gap-1.5">
          {d.entities.map((u) => (
            <a key={u.id} href={u.url} target="_blank" rel="noopener noreferrer" title={u.title}
              className="t-caption font-bold no-underline px-2.5 py-1.5 rounded-full tap-44"
              style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent-light)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)" }}>
              {u.entity} ↗
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
