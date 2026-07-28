"use client";
/* ═══════════ سلّم ساعات اليوم بخطّ «الآن» ═══════════
   مكوّنٌ عرضيٌّ محايد الشكل: يستقبل فتراتٍ بساعاتٍ عشرية ولا يعرف من أين جاءت.
   ▸ «خطتي» تُسقِط عليه `ScheduleEvent` (fromHour/toHour) و«التقويم» يُسقِط `CalendarEvent`
     (start/end نصوصاً) — كما تفعل `Calendar` عبر `getDayInfo` بالضبط، فلا تُفرَّع نسخةٌ ثانية.
   ▸ النطاق يتمدّد ليشمل أبكر فترةٍ وأحدثها والساعة الآن، فلا يُقصّ شيء. */
import { useState, useEffect } from "react";
import { time } from "@/lib/format";
import { ladderRange, type Slot } from "@/lib/dayLadder";

export type { Slot };

interface Props {
  slots: Slot[];
  /** فتراتٌ تملأ اليوم كلّه (سفرٌ مثلاً) — تُعرض فوق السلّم لا داخله. */
  allDay?: { id: string; title: string; color: string; icon?: string }[];
  /** ارتفاع الساعة الواحدة بالبكسل. */
  rowHeight?: number;
  onSlotClick?: (id: string) => void;
}

export default function DayLadder({ slots, allDay = [], rowHeight = 44, onSlotClick }: Props) {
  /* يُستورَد هذا المكوّن بـ`ssr:false` فلا عرضَ على الخادم ⇒ المُهيّئ الكسول آمنٌ هنا
     (لا اختلافَ بين عرضٍ خادميّ وآخر عميل). */
  const [now, setNow] = useState<Date | null>(() => (typeof window === "undefined" ? null : new Date()));
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const nowH = now ? now.getHours() + now.getMinutes() / 60 : -1;
  const { from, to, hours } = ladderRange(slots, nowH);
  const y = (h: number) => (h - from) * rowHeight;

  return (
    <div>
      {allDay.map((ev) => (
        <div key={ev.id} className="rounded-xl px-3 py-2 mb-2 flex items-center gap-2"
          style={{ background: `color-mix(in srgb, ${ev.color} 12%, var(--surface))`, border: "1.5px solid var(--border)" }}>
          {ev.icon && <span aria-hidden="true">{ev.icon}</span>}
          <span className="t-body font-bold" style={{ color: "var(--text)" }}>{ev.title}</span>
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>يومٌ كامل</span>
        </div>
      ))}

      <div className="rounded-3xl p-3 relative overflow-hidden"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
        <div className="relative" style={{ height: `${(to - from) * rowHeight + 8}px` }}>
          {hours.map((h) => (
            <div key={h} className="absolute flex items-center gap-2"
              style={{ top: `${y(h)}px`, insetInlineStart: 0, insetInlineEnd: 0 }}>
              <span className="t-caption font-mono-nums w-12 flex-shrink-0 text-left" style={{ color: "var(--text-dim)" }}>
                {time(h)}
              </span>
              <span className="flex-1 block" style={{ height: "1px", background: "var(--border)" }} />
            </div>
          ))}

          {slots.map((s) => {
            const top = y(s.fromHour);
            const h = Math.max(26, (s.toHour - s.fromHour) * rowHeight - 4);
            const past = nowH >= 0 && s.toHour <= nowH;
            const live = nowH >= s.fromHour && nowH < s.toHour;
            const Tag = onSlotClick ? "button" : "div";
            return (
              <Tag key={s.id} {...(onSlotClick ? { onClick: () => onSlotClick(s.id), type: "button" as const } : {})}
                className="absolute rounded-xl px-2.5 py-1.5 overflow-hidden text-right"
                style={{
                  top: `${top}px`, height: `${h}px`, insetInlineStart: "58px", insetInlineEnd: "6px",
                  background: `color-mix(in srgb, ${s.color} ${live ? 26 : 16}%, var(--surface))`,
                  borderInlineStart: `3px solid ${s.color}`,
                  opacity: past ? 0.55 : 1,
                }}>
                <p className="t-caption font-black truncate" style={{ color: "var(--text)" }}>
                  {s.icon ? `${s.icon} ` : ""}{s.title}
                </p>
                <p className="t-caption truncate" style={{ color: "var(--text-muted)" }}>
                  {time(s.fromHour)} – {time(s.toHour)}
                </p>
              </Tag>
            );
          })}

          {/* خطّ الساعة الآن — يبدأ بعد عمود الساعات كالفترات تماماً، والرقاقة في أقصى
              الطرف المقابل. (RTL: أوّل ابنٍ في الصفّ يقع يميناً، فالنقطة أوّلاً ثم الرقاقة.) */}
          {nowH >= from && nowH <= to && (
            <div className="absolute flex items-center gap-1 pointer-events-none"
              style={{ top: `${y(nowH)}px`, insetInlineStart: "58px", insetInlineEnd: "6px", transform: "translateY(-50%)" }}>
              <i className="block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "var(--danger)" }} />
              <span className="flex-1 block" style={{ height: "2px", background: "var(--danger)" }} />
              <span className="font-black px-1.5 rounded flex-shrink-0"
                style={{ background: "var(--danger)", color: "#fff", fontSize: "0.7rem", lineHeight: 1.6 }}>الآن</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
