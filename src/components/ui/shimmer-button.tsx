"use client";
import React, { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  children: React.ReactNode;
  as?: "button" | "a";
  href?: string;
}

export function ShimmerButton({
  shimmerColor = "rgba(255,255,255,0.12)",
  shimmerSize = "0.1em",
  borderRadius = "14px",
  shimmerDuration = "2.4s",
  background = "var(--accent)",
  className,
  children,
  style,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={
        {
          "--shimmer-color": shimmerColor,
          "--shimmer-duration": shimmerDuration,
          "--border-radius": borderRadius,
          "--shimmer-size": shimmerSize,
          background,
          borderRadius,
          ...style,
        } as CSSProperties
      }
      className={cn(
        "group relative overflow-hidden whitespace-nowrap px-6 py-3",
        "font-bold text-white",
        "transition-all duration-300 active:scale-[0.97]",
        "[--shimmer-color:rgba(255,255,255,0.12)]",
        className,
      )}
      {...props}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius }}
      >
        <div
          className="absolute inset-0 animate-shimmer"
          style={{
            background: `conic-gradient(from 90deg at 40% -25%, transparent 50%, ${shimmerColor} 60%, transparent 70%)`,
            animation: `shimmer ${shimmerDuration} linear infinite`,
            backgroundSize: "200% 200%",
          }}
        />
      </div>
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
