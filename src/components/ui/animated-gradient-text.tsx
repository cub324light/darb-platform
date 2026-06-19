"use client";
import { cn } from "@/lib/utils";
import React from "react";

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGradientText({ children, className }: AnimatedGradientTextProps) {
  return (
    <span
      className={cn(
        "animate-gradient bg-[length:200%_auto] bg-clip-text text-transparent",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--accent-hi), var(--gold), var(--accent-light), var(--accent-hi))",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        backgroundSize: "200% auto",
        animation: "gradientShift 4s linear infinite",
      }}
    >
      {children}
    </span>
  );
}
