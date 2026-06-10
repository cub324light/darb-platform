"use client";
import { useEffect, useState } from "react";

/* ─── السماء الموحدة لكل الصفحات ───
   الليلي: نجوم متلألئة + قمر + شهاب يعبر كل فترة
   النهاري: شمس متوهجة + غيوم تنساب + أسراب تحلق بعيداً
   ثابتة خلف المحتوى ولا تستقبل أي لمسات */

interface Star {
  left: string;
  top: string;
  size: string;
  opacity: number;
  duration: string;
  delay: string;
}

export default function Sky() {
  const [stars, setStars] = useState<Star[]>([]);
  const [shootKey, setShootKey] = useState(0);

  useEffect(() => {
    // توليد النجوم مرة واحدة على العميل لتفادي اختلاف SSR
    setStars(
      Array.from({ length: 42 }).map(() => ({
        left: Math.random() * 100 + "%",
        top: Math.random() * 75 + "%",
        size: Math.random() * 2 + 1 + "px",
        opacity: Math.random() * 0.45 + 0.15,
        duration: 2 + Math.random() * 4 + "s",
        delay: Math.random() * 4 + "s",
      }))
    );
    // شهاب جديد كل 9 ثوانٍ
    const t = setInterval(() => setShootKey((k) => k + 1), 9000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="sky" aria-hidden="true">
      {/* ════ الليلي ════ */}
      <div className="sky-night">
        {stars.map((s, i) => (
          <span
            key={i}
            className="sky-star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDuration: s.duration,
              animationDelay: s.delay,
            }}
          />
        ))}

        {/* القمر — هلال بتوهج خفيف */}
        <svg className="sky-moon" viewBox="0 0 64 64" fill="none">
          <defs>
            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="55%" stopColor="#FCD34D" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="30" fill="url(#moonGlow)" />
          <path
            d="M40 12a20 20 0 1 0 10 36 16 16 0 1 1-10-36z"
            fill="#FCD34D"
            opacity="0.85"
          />
        </svg>

        {/* الشهاب — يعبر كل فترة */}
        <span key={shootKey} className="sky-shooting" />
      </div>

      {/* ════ النهاري ════ */}
      <div className="sky-day">
        {/* الشمس */}
        <svg className="sky-sun" viewBox="0 0 80 80" fill="none">
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="40" cy="40" r="38" fill="url(#sunGlow)" />
          <circle cx="40" cy="40" r="15" fill="#F59E0B" opacity="0.9" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={40 + Math.cos(a) * 21}
                y1={40 + Math.sin(a) * 21}
                x2={40 + Math.cos(a) * 28}
                y2={40 + Math.sin(a) * 28}
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.7"
              />
            );
          })}
        </svg>

        {/* غيوم تنساب */}
        <span className="sky-cloud sky-cloud-1" />
        <span className="sky-cloud sky-cloud-2" />
        <span className="sky-cloud sky-cloud-3" />

        {/* سرب بعيد في الأفق — خطوط V بسيطة */}
        <svg className="sky-flock" viewBox="0 0 120 40" fill="none">
          {[
            [12, 12],
            [30, 20],
            [52, 9],
            [74, 17],
            [96, 12],
          ].map(([x, y], i) => (
            <path
              key={i}
              d={`M${x - 6},${y} Q${x - 2},${y - 5} ${x},${y} Q${x + 2},${y - 5} ${x + 6},${y}`}
              stroke="#0F172A"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.45"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
