"use client";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

interface Meteor {
  id: number;
  top: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

interface MeteorsProps {
  number?: number;
  className?: string;
}

/* ▓ سماءٌ ثابتةٌ عبر الصفحات.
   كان الحقلُ يُولَّد في أثرٍ عند كل تركيب، و`Dome` في **كل صفحة** — فالانتقالُ
   من مساري إلى المدرسة يُفرغ الشُّهبَ ثم يعيد رصفها في أماكنَ جديدة، فترتجف
   الترويسةُ حول عدّاد الفضة. صارت تُولَّد مرّةً لكل عددٍ وتُحفظ في الوحدة، وتُقرأ
   **في أول رسمةٍ بعد الترطيب** (لا في أثرٍ يأتي بعدها) — فلا وميضَ ولا إعادةَ رصف. */
const FIELDS = new Map<number, Meteor[]>();
const fieldFor = (number: number): Meteor[] => {
  let f = FIELDS.get(number);
  if (!f) {
    f = Array.from({ length: number }, (_, i) => ({
      id: i,
      top: Math.floor(Math.random() * 100),
      left: Math.floor(Math.random() * 100),
      delay: Math.random() * 8,
      duration: 3 + Math.random() * 4,
      size: 0.5 + Math.random() * 1,
    }));
    FIELDS.set(number, f);
  }
  return f;
};

const EMPTY: Meteor[] = [];
const noop = () => () => {};

export function Meteors({ number = 12, className }: MeteorsProps) {
  /* الخادمُ لا عشوائيَّ له، فيرسم فارغاً؛ والعميلُ يرسم الحقلَ من أول لحظة. */
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const meteors = mounted ? fieldFor(number) : EMPTY;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute animate-meteor"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            width: `${120 + m.size * 60}px`,
            height: `${m.size}px`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
            background: `linear-gradient(90deg, var(--accent-hi), transparent)`,
            borderRadius: "9999px",
            opacity: 0.25,
            transform: "rotate(-35deg)",
          }}
        />
      ))}
    </div>
  );
}
