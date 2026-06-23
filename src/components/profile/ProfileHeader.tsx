"use client";
/* ─── ترويسة الملف — الهوية + الأفاتار + السيرة + المستوى/XP + الباقة ───
   تحرير ذاتي للاسم/السيرة/الأفاتار، ويُبلِّغ الأب عبر onUserChange. */
import { memo, useState } from "react";
import type { DarbUser } from "@/lib/storage";
import type { Track } from "@/lib/tracks";
import type { Level } from "@/lib/xp";
import { PLAN_NAMES, PLAN_COLORS } from "@/lib/plan";
import type { PlanId } from "@/lib/types";

/* أفاتارات جاهزة — بلا رفع، بلا تكلفة تخزين */
export const PRESET_AVATARS = ["🦅", "🦉", "🐎", "🦁", "🐺", "🦊", "📚", "🚀", "⭐", "🌙", "🔥", "💎"];

interface Props {
  user: DarbUser;
  track: Track;
  level: Level & { next?: Level; progress: number };
  xp: number;
  streak: number;
  joinLabel: string;
  planId: PlanId;
  photoURL: string | null;
  onUserChange: (partial: Partial<DarbUser>) => void;
}

function Avatar({ avatar, photoURL, name }: { avatar?: string; photoURL: string | null; name: string }) {
  const base = "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0 overflow-hidden";
  if (avatar === "google" && photoURL) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoURL} alt="" className={base} style={{ objectFit: "cover" }} />;
  }
  if (avatar && avatar !== "google" && avatar !== "letter") {
    return <div className={base} style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>{avatar}</div>;
  }
  return (
    <div className={`${base} text-white`} style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
      {(name || "د").charAt(0)}
    </div>
  );
}

function ProfileHeaderBase({ user, track, level, xp, streak, joinLabel, planId, photoURL, onUserChange }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user.name ?? "");
  const [editingBio, setEditingBio] = useState(false);
  const [bioVal, setBioVal] = useState(user.bio ?? "");
  const [pickAvatar, setPickAvatar] = useState(false);

  const saveName = () => {
    const n = nameVal.trim();
    if (n && n !== user.name) onUserChange({ name: n });
    setEditingName(false);
  };
  const saveBio = () => {
    const b = bioVal.trim();
    if (b !== (user.bio ?? "")) onUserChange({ bio: b });
    setEditingBio(false);
  };
  const chooseAvatar = (a: string) => { onUserChange({ avatar: a }); setPickAvatar(false); };

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-4">
        <button onClick={() => setPickAvatar((v) => !v)} className="relative transition active:scale-95" aria-label="تغيير الصورة">
          <Avatar avatar={user.avatar} photoURL={photoURL} name={user.name} />
          <span className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
            style={{ background: "var(--accent)", color: "#fff", border: "2px solid var(--surface)" }} aria-hidden>✎</span>
        </button>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex gap-2">
              <input value={nameVal} onChange={(e) => setNameVal(e.target.value)} maxLength={20} autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                className="flex-1 min-w-0 rounded-xl px-3 py-2 text-base text-[var(--text)] outline-none"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)" }} />
              <button onClick={saveName} aria-label="حفظ الاسم" className="px-4 rounded-xl font-bold"
                style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }}>✓</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-black text-xl text-[var(--text)] truncate">{user.name || "—"}</p>
              <button onClick={() => { setNameVal(user.name ?? ""); setEditingName(true); }} aria-label="تعديل الاسم"
                className="text-[13px] text-[var(--accent-light)] font-semibold flex-shrink-0">✎</button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: track.color }}>🎯 {track.title}</span>
            {joinLabel && <span>📅 {joinLabel}</span>}
            <span>🔥 {streak} ستريك</span>
          </div>
        </div>
      </div>

      {/* اختيار الأفاتار */}
      {pickAvatar && (
        <div className="mt-4 rounded-2xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <div className="flex flex-wrap gap-2">
            {photoURL && (
              <button onClick={() => chooseAvatar("google")} aria-label="صورة Google"
                className="w-11 h-11 rounded-xl overflow-hidden transition active:scale-90"
                style={{ border: `2px solid ${user.avatar === "google" ? "var(--accent)" : "var(--border)"}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoURL} alt="" className="w-full h-full" style={{ objectFit: "cover" }} />
              </button>
            )}
            <button onClick={() => chooseAvatar("letter")} aria-label="الحرف الأول"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black transition active:scale-90"
              style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))", border: `2px solid ${(!user.avatar || user.avatar === "letter") ? "var(--accent)" : "transparent"}` }}>
              {(user.name || "د").charAt(0)}
            </button>
            {PRESET_AVATARS.map((a) => (
              <button key={a} onClick={() => chooseAvatar(a)} aria-label={`أفاتار ${a}`}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl transition active:scale-90"
                style={{ background: "var(--surface)", border: `2px solid ${user.avatar === a ? "var(--accent)" : "var(--border)"}` }}>
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* السيرة */}
      <div className="mt-3">
        {editingBio ? (
          <div className="flex flex-col gap-2">
            <textarea value={bioVal} onChange={(e) => setBioVal(e.target.value)} maxLength={160} rows={2} autoFocus
              placeholder="عرّف بنفسك بسطر — هدفك، مادتك المفضّلة، أو شعارك."
              className="w-full rounded-xl px-3 py-2 text-[14px] text-[var(--text)] outline-none resize-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--accent)" }} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingBio(false)} className="text-[13px] px-3 py-1.5 rounded-lg font-bold" style={{ color: "var(--text-muted)" }}>إلغاء</button>
              <button onClick={saveBio} className="text-[13px] px-3 py-1.5 rounded-lg font-bold"
                style={{ background: "var(--accent)", color: "#fff" }}>حفظ</button>
            </div>
          </div>
        ) : user.bio ? (
          <button onClick={() => { setBioVal(user.bio ?? ""); setEditingBio(true); }}
            className="text-[13.5px] text-right leading-snug w-full" style={{ color: "var(--text-dim)" }}>
            {user.bio}
          </button>
        ) : (
          <button onClick={() => { setBioVal(""); setEditingBio(true); }}
            className="text-[13px] font-semibold" style={{ color: "var(--accent-light)" }}>
            ＋ أضف سيرة قصيرة
          </button>
        )}
      </div>

      {/* المستوى + XP */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-black text-[14px] flex items-center gap-1.5" style={{ color: level.color }}>
            <span className="text-lg">{level.icon}</span> {level.name}
          </span>
          <span className="font-mono-nums text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>{xp.toLocaleString("ar")} XP</span>
        </div>
        <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "var(--border)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${level.progress}%`, background: level.color }} />
        </div>
        {level.next && (
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            {level.next.name} — يحتاج {level.next.minXp.toLocaleString("ar")} XP
          </p>
        )}
      </div>

      {/* الباقة */}
      <button onClick={() => { window.location.href = "/pricing"; }}
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 mt-4 text-right transition active:scale-[0.99]"
        style={{ background: `color-mix(in srgb, ${PLAN_COLORS[planId]} 10%, var(--surface2))`, border: `1.5px solid color-mix(in srgb, ${PLAN_COLORS[planId]} 45%, transparent)` }}>
        <span className="text-lg">{planId === "free" ? "○" : "✦"}</span>
        <span className="flex-1">
          <span className="block text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>باقتك الحالية</span>
          <span className="block font-black text-[15px]" style={{ color: PLAN_COLORS[planId] }}>{PLAN_NAMES[planId]}</span>
        </span>
        <span className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>{planId === "free" ? "ترقية ←" : "تغيير ←"}</span>
      </button>
    </div>
  );
}

export default memo(ProfileHeaderBase);
