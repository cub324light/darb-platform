"use client";
/* ─── الأصدقاء/الترتيب + الإحالات — مكوّن مكتفٍ ذاتياً (يحمّل بياناته) ─── */
import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { postSocial } from "@/lib/authFetch";
import { getReferral, claimRefReward, referralLink, REFERRAL_REWARD, type ReferralInfo } from "@/lib/referral";
import { n } from "@/lib/format";

const FriendsPanel = dynamic(() => import("@/components/FriendsPanel"), { ssr: false });

function ProfileSocialBase() {
  const [uid, setUid] = useState<string | null>(null);
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [ref, setRef] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => { unsub = onAuth((u) => setUid(u?.uid ?? null)); });
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    postSocial({ mode: "getFriends" }).then((r) => r.json())
      .then((d: { friends?: unknown[] }) => { if (alive && Array.isArray(d.friends)) setFriendsCount(d.friends.length); })
      .catch(() => {});
    postSocial({ mode: "leaderboard" }).then((r) => r.json())
      .then((d: { topHours?: { uid: string }[] }) => {
        if (!alive) return;
        const idx = (d.topHours ?? []).findIndex((x) => x.uid === uid);
        if (idx >= 0) setRank(idx + 1);
      })
      .catch(() => {});
    getReferral().then((info) => { if (alive) setRef(info); });
    return () => { alive = false; };
  }, [uid]);

  if (!uid) return null;

  const copyRefLink = () => {
    if (!ref) return;
    try { navigator.clipboard?.writeText(referralLink(ref.code)); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const claimRef = async () => {
    setClaiming(true);
    const got = await claimRefReward();
    if (got > 0) {
      setClaimMsg(`+${got} فضة 🎉`);
      setRef((p) => (p ? { ...p, pendingReward: 0 } : p));
      setTimeout(() => setClaimMsg(null), 2200);
    }
    setClaiming(false);
  };

  return (
    <>
      <button onClick={() => setShowFriends(true)} className="rounded-2xl p-5 text-right transition active:scale-[0.99] w-full"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div>
              <p className="font-mono-nums font-black text-2xl" style={{ color: "var(--accent-light)" }}>{friendsCount ?? "—"}</p>
              <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>👥 أصدقاء</p>
            </div>
            <div>
              <p className="font-mono-nums font-black text-2xl" style={{ color: "var(--gold)" }}>{rank ? `#${rank}` : "—"}</p>
              <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>🏆 ترتيبك</p>
            </div>
          </div>
          <span className="text-[15px] font-bold" style={{ color: "var(--accent-light)" }}>افتح ←</span>
        </div>
      </button>

      {ref && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="label">ادعُ أصدقاءك</p>
            <span className="text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>{n(ref.count)} انضمّوا عبرك</span>
          </div>
          <p className="text-[15px] mb-3" style={{ color: "var(--text-muted)" }}>
            شارك رابطك — تربح أنت وصديقك {REFERRAL_REWARD} فضة لكل من ينضم ويكمل التسجيل.
          </p>
          <button onClick={copyRefLink} className="w-full py-3 rounded-2xl font-black text-[16px] transition active:scale-[0.99] mb-2"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {copied ? "✓ تم نسخ الرابط" : "📋 انسخ رابط الدعوة"}
          </button>
          {ref.pendingReward > 0 && (
            <button onClick={claimRef} disabled={claiming}
              className="w-full py-3 rounded-2xl font-black text-[16px] transition active:scale-[0.99] disabled:opacity-50"
              style={{ background: "var(--gold)", color: "#1a1205" }}>
              {claiming ? "…" : `🎁 استلم ${ref.pendingReward} فضة من إحالاتك`}
            </button>
          )}
        </div>
      )}

      {claimMsg && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-black text-[17px]"
          style={{ background: "var(--gold)", color: "#1a1205" }}>{claimMsg}</div>
      )}

      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}
    </>
  );
}

export default memo(ProfileSocialBase);
