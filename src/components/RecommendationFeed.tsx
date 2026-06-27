"use client";
/* ─── واجهة محرّك التوصيات — المنطقة العليا للوحة (مدفوعة بالبيانات) ───
   لا تقرّر هذه المنطقة ما تعرضه؛ تسأل محرّك التوصيات وتعرض الناتج مرتّباً.
   المسار الذهبي يُعرض ببطاقته الغنية؛ بقية التوصيات كبطاقات إجراء مع «لماذا». */
import { useEffect, useState } from "react";
import Link from "next/link";
import GoldenPathCard from "./GoldenPathCard";
import { loadRecommendations } from "@/lib/recommendationClient";
import { dismissRecommendation, type Recommendation } from "@/lib/recommendation";
import { emit } from "@/lib/events";
import { activateTrack } from "@/lib/storage";
import { getTrack } from "@/lib/tracks";

const toneColor = (t: Recommendation["tone"]): string =>
  ({
    urgent: "#EF4444",
    success: "var(--success)",
    gold: "#D4920A",
    accent: "var(--accent)",
    info: "var(--text-muted)",
  }[t] ?? "var(--accent)");

/* بطاقة توصية إجرائية (تلميح/تنبيه) */
function RecCard({ r, onDismiss, onAct, onAccept }: {
  r: Recommendation;
  onDismiss: (r: Recommendation) => void;
  onAct: (r: Recommendation) => void;
  onAccept: (r: Recommendation) => void;
}) {
  const c = toneColor(r.tone);
  const inner = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[15px] font-black" style={{ color: c }}>{r.title}</p>
        <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{r.reason}</p>
      </div>
      <span className="text-lg font-black flex-shrink-0" style={{ color: c }}>←</span>
    </div>
  );

  const style = {
    background: `color-mix(in srgb, ${c} 9%, transparent)`,
    border: `1px solid color-mix(in srgb, ${c} 28%, transparent)`,
    textDecoration: "none",
  } as const;

  return (
    <div className="rise relative rounded-2xl">
      {r.action.kind === "navigate" && r.action.href ? (
        <Link href={r.action.href} onClick={() => onAccept(r)} className="block rounded-2xl px-4 py-3.5 transition active:scale-[0.98]" style={style}>
          {inner}
        </Link>
      ) : (
        <button onClick={() => onAct(r)} className="w-full text-right rounded-2xl px-4 py-3.5 transition active:scale-[0.98]" style={style}>
          {inner}
        </button>
      )}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(r); }}
        aria-label="تجاهل"
        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
        ✕
      </button>
    </div>
  );
}

/* بطاقة ترقية (مثل القبول الجامعي) */
function PromoCard({ r, onAccept }: { r: Recommendation; onAccept: (r: Recommendation) => void }) {
  return (
    <Link href={r.action.href ?? "#"} onClick={() => onAccept(r)}
      className="rise block rounded-2xl px-5 py-4 transition active:scale-[0.98]"
      style={{
        background: "linear-gradient(135deg, color-mix(in srgb,#F5B40A 10%,transparent), color-mix(in srgb,var(--accent) 6%,transparent)), var(--surface)",
        border: "1.5px solid color-mix(in srgb,#F5B40A 30%,transparent)",
        textDecoration: "none",
      }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-black" style={{ color: "var(--text)" }}>{r.title}</p>
          {r.subtitle && <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>{r.subtitle}</p>}
          <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{r.reason}</p>
        </div>
        <span className="text-[22px] flex-shrink-0">🏛️</span>
      </div>
    </Link>
  );
}

export default function RecommendationFeed({ maxNudges = 3 }: { maxNudges?: number }) {
  const [recs, setRecs] = useState<Recommendation[]>(
    () => (typeof window !== "undefined" ? loadRecommendations() : [])
  );
  /* إعادة الحساب عند العودة للصفحة (قد تتغيّر البطاقات المستحقّة/الستريك) */
  useEffect(() => {
    const onFocus = () => setRecs(loadRecommendations());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  /* تجاهل → حدث RecommendationDismissed (يُغذّي ذاكرة السلوك عبر المُتفاعل) */
  const dismiss = (r: Recommendation) => {
    emit({ eventType: "RecommendationDismissed", metadata: { recId: r.id, source: r.source } });
    dismissRecommendation(r.id);
    setRecs((prev) => prev.filter((x) => x.id !== r.id));
  };

  /* قبول → حدث RecommendationAccepted */
  const accept = (r: Recommendation) => {
    emit({ eventType: "RecommendationAccepted", metadata: { recId: r.id, source: r.source, targetPage: r.targetPage } });
  };

  const act = (r: Recommendation) => {
    accept(r);
    if (r.action.kind === "activateTrack" && r.action.trackIds?.length) {
      const titles = r.action.trackIds.map((id) => getTrack(id).title).join(" و");
      if (!window.confirm(`بنفعّل ${titles} في مساراتك ونحدّث خطتك حسب أولويتك. تمام؟`)) return;
      for (const id of r.action.trackIds) activateTrack(id);
      window.location.reload();
    } else if (r.action.kind === "openDuwairb") {
      window.dispatchEvent(new CustomEvent("darb:openDuirb", r.action.event ? { detail: { tab: r.action.event } } : undefined));
    }
  };

  /* عرض مرتّب حسب أولوية المحرّك، مع سقف لعدد التلميحات/التنبيهات */
  const display: Recommendation[] = [];
  let nudgeCount = 0;
  for (const r of recs) {
    if (r.source === "goldenPath") display.push(r);
    else if (r.kind === "promote") display.push(r);
    else if ((r.kind === "nudge" || r.kind === "alert") && nudgeCount < maxNudges) {
      display.push(r);
      nudgeCount++;
    }
  }

  if (display.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {display.map((r) =>
        r.source === "goldenPath" ? <GoldenPathCard key={r.id} />
        : r.kind === "promote" ? <PromoCard key={r.id} r={r} onAccept={accept} />
        : <RecCard key={r.id} r={r} onDismiss={dismiss} onAct={act} onAccept={accept} />
      )}
    </div>
  );
}
