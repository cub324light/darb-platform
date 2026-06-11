"use client";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "./ThemeProvider";

const STAR_DATA = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  w: 1 + (i * 7 % 3),
  left: (i * 37 + 3) % 100,
  top: (i * 53 + 7) % 85,
  opacity: 0.15 + (i % 5) * 0.1,
  dur: 2.5 + (i % 6) * 0.6,
  delay: (i % 8) * 0.5,
}));

const BIRD_DATA = [
  { left: 15, top: 12, delay: 0,   dur: 9 },
  { left: 55, top: 22, delay: 3,   dur: 11 },
  { left: 78, top: 8,  delay: 6.5, dur: 8 },
];

function ShootingStar({ onDone }: { onDone: () => void }) {
  const left = 30 + Math.random() * 50;
  const top  = 5  + Math.random() * 25;
  useEffect(() => {
    const t = setTimeout(onDone, 1300);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="shooting-star"
      style={{ left: `${left}%`, top: `${top}%`, width: 3 }}
    />
  );
}

export default function Stars() {
  const { theme } = useTheme();
  const [showStar, setShowStar] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (theme !== "dark") return;
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        setShowStar(true);
        timerRef.current = setTimeout(() => {
          setShowStar(false);
          schedule();
        }, 1400);
      }, 6000 + Math.random() * 6000);
    };
    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [theme]);

  if (theme === "light") {
    return (
      <div className="stars-bg">
        {/* Sun */}
        <div
          className="sun-pulse absolute rounded-full"
          style={{
            width: 56, height: 56,
            top: 20, left: 20,
            background: "radial-gradient(circle, #FCD34D 30%, #F59E0B 70%)",
          }}
        />
        {/* Sun rays */}
        {[0,45,90,135,180,225,270,315].map((deg) => (
          <div
            key={deg}
            className="absolute"
            style={{
              width: 2, height: 14,
              top: 48 - 7 + 28 * Math.sin((deg * Math.PI) / 180),
              left: 48 - 1 + 28 * Math.cos((deg * Math.PI) / 180),
              background: "#F59E0B",
              borderRadius: 2,
              opacity: 0.5,
              transform: `rotate(${deg}deg)`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="stars-bg">
      {/* Stars */}
      {STAR_DATA.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            width: s.w, height: s.w,
            left: `${s.left}%`,
            top: `${s.top}%`,
            opacity: s.opacity,
            animation: `twinkle ${s.dur}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {/* Moon */}
      <div
        className="moon-float absolute"
        style={{ top: 16, left: 22, width: 36, height: 36 }}
      >
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M28 18C28 23.52 23.52 28 18 28C12.48 28 8 23.52 8 18C8 12.48 12.48 8 18 8C14 10 12 14 12 18C12 22 14 26 18 28C22 26 24 22 24 18C24 14 22 10 18 8C23.52 8 28 12.48 28 18Z"
            fill="#FCD34D"
            opacity="0.7"
          />
        </svg>
      </div>
      {/* Shooting star */}
      {showStar && <ShootingStar onDone={() => setShowStar(false)} />}
    </div>
  );
}
