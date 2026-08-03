"use client";
/* ═══════════ متجرُ الفضة ═══════════
   الفضةُ تُكسَب في «تركيز» منذ زمن. هذا مصرفُها — **جماليّاتٌ فقط**: ألقابٌ
   وشارات. لا نبيع بها وظيفة: أن تصير المذاكرةُ شرطاً لاستعمال أدواتِ المذاكرة
   عقوبةٌ لا مكافأة. ولا تُشترى الفضةُ بمال.

   والمشتَرى لا يُلبَس تلقائياً — اللبسُ قرارٌ ثانٍ يملكه الطالب. */
import { useState } from "react";
import { useOwned, purchase, wear, takeOff, readBalance, readProgress } from "@/lib/economy/store";
import { CATALOG, SLOT_LABEL, itemsInSlot, type CosmeticSlot, type StoreItem } from "@/lib/economy/catalog";
import { isUnlocked, owns, type Progress } from "@/lib/economy/wallet";
import { n } from "@/lib/format";

const SLOTS: CosmeticSlot[] = ["title", "badge"];

/** ما ينقصه ليُفتح الصنف — نصٌّ صريح لا «مقفل» مبهمة. */
function lockedWhy(item: StoreItem, p: Progress): string {
  const r = item.requires;
  if (!r) return "";
  if (r.minStreak != null && p.streak < r.minStreak) return `يُفتح بعد ${n(r.minStreak)} أيامٍ متتالية (عندك ${n(p.streak)})`;
  if (r.minSessions != null && p.sessions < r.minSessions) return `يُفتح بعد ${n(r.minSessions)} جلسة (عندك ${n(p.sessions)})`;
  if (r.minFocusMins != null && p.focusMins < r.minFocusMins) {
    return `يُفتح بعد ${n(Math.round(r.minFocusMins / 60))} ساعةَ تركيز (عندك ${n(Math.round(p.focusMins / 60))})`;
  }
  return "";
}

export default function SilverStore() {
  const owned = useOwned();
  const [balance, setBalance] = useState(() => (typeof window === "undefined" ? 0 : readBalance()));
  const [progress] = useState<Progress>(() =>
    typeof window === "undefined" ? { sessions: 0, focusMins: 0, streak: 0 } : readProgress());
  const [msg, setMsg] = useState<string | null>(null);

  const buy = (item: StoreItem) => {
    const r = purchase(item.id);
    if (!r.ok) {
      setMsg(r.reason === "poor" ? `ينقصك ${n(r.short)} فضة.`
        : r.reason === "locked" ? "لم تبلغ شرطَه بعد."
        : r.reason === "owned" ? "تملكه أصلاً." : "غير متاح.");
      setTimeout(() => setMsg(null), 2400);
      return;
    }
    setBalance(r.balance);
    setMsg(`اشتريتَ «${item.label}» ✓`);
    setTimeout(() => setMsg(null), 2400);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="ds-card flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="t-h3" style={{ color: "var(--text)" }}>🛍️ متجر الفضة</p>
          <p className="t-caption mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            زينةٌ فقط — ألقابٌ وشارات تظهر جنب اسمك. لا نبيع بالفضة ميزةً تحتاجها للمذاكرة.
          </p>
        </div>
        <span className="t-title font-black flex items-center gap-1.5 flex-shrink-0"
          style={{ color: "var(--text)" }}>
          🥈 <span className="font-mono-nums">{n(balance)}</span>
        </span>
      </div>

      {SLOTS.map((slot) => {
        const items = itemsInSlot(CATALOG, slot);
        if (items.length === 0) return null;
        const wornId = owned.equipped[slot];
        return (
          <section key={slot} className="ds-card ds-stack-tight">
            <div className="flex items-center justify-between gap-2">
              <h2 className="t-h3" style={{ color: "var(--text)" }}>{SLOT_LABEL[slot]}</h2>
              {wornId && (
                <button onClick={() => takeOff(slot)} className="t-caption font-bold px-3 py-1.5 rounded-xl"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  اخلعه
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {items.map((item) => {
                const have = owns(owned, item.id);
                const open = isUnlocked(item, progress);
                const worn = wornId === item.id;
                const why = open ? "" : lockedWhy(item, progress);
                return (
                  <div key={item.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{
                      background: "var(--surface2)",
                      border: `1.5px solid ${worn ? "var(--gold)" : "var(--border)"}`,
                      opacity: open ? 1 : 0.6,
                    }}>
                    <div className="flex-1 min-w-0">
                      <p className="t-body font-black" style={{ color: "var(--text)" }}>{item.label}</p>
                      <p className="t-caption leading-snug" style={{ color: "var(--text-muted)" }}>
                        {why || item.desc}
                      </p>
                    </div>
                    {worn ? (
                      <span className="t-caption font-black px-3 py-1.5 rounded-full flex-shrink-0"
                        style={{ background: "color-mix(in srgb, var(--gold) 18%, transparent)", color: "var(--gold)" }}>
                        ملبوس ✓
                      </span>
                    ) : have ? (
                      <button onClick={() => wear(item.id)}
                        className="t-caption font-black px-3.5 py-2 rounded-xl flex-shrink-0"
                        style={{ background: "var(--accent)", color: "#fff" }}>البسه</button>
                    ) : (
                      <button onClick={() => buy(item)} disabled={!open}
                        className="t-caption font-black px-3.5 py-2 rounded-xl flex-shrink-0 disabled:opacity-50"
                        style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>
                        {item.price === 0 ? "خُذه" : <>🥈 <span className="font-mono-nums">{n(item.price)}</span></>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {msg && (
        <div className="fixed left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 t-caption font-bold z-50 rise"
          style={{ bottom: "calc(var(--nav-h) + 12px)", background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)", boxShadow: "var(--elev-2)" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
