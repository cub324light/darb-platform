"use client";
import { useState, useEffect, useCallback } from "react";
import { onAuth } from "@/lib/cloud";
import { postSocial } from "@/lib/authFetch";

/* ─── الأنواع ─── */
interface Person {
  uid: string;
  name: string;
  track: string;
}

interface Profile {
  uid: string;
  name: string;
  track: string;
  isPrivate: boolean;
  streak: number;
  focusMins: number;
  sessions: number;
  silver: number;
  lastSeen: number | null;
}

/* ─── لوحة الأصدقاء — بحث + قائمة + إضافة/حذف ─── */
export default function FriendsPanel({ onClose }: { onClose: () => void }) {
  const [uid, setUid] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [friends, setFriends] = useState<Person[]>([]);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* ─ بروفايل مفتوح ─ */
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  /* ─ معرّف المستخدم الحالي — نراقب حالة المصادقة حتى تثبت ─ */
  useEffect(() => onAuth((u) => setUid(u?.uid ?? null)), []);

  /* ─ جلب قائمة الأصدقاء ─ */
  const loadFriends = useCallback(() => {
    if (!uid) return;
    postSocial({ mode: "getFriends" })
      .then((r) => r.json())
      .then((d: { friends?: Person[] }) => {
        if (d.friends) setFriends(d.friends);
      })
      .catch(() => {});
  }, [uid]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  /* ─ رسالة عابرة ─ */
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  /* ─ البحث ─ */
  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) {
      flash("اكتب حرفين على الأقل");
      return;
    }
    setSearching(true);
    setSearched(false);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "search", query: q }),
      });
      const data = (await res.json()) as { results?: Person[] };
      // استبعد نفسي ومن هم أصدقاء أصلاً من نتائج البحث
      const friendIds = new Set(friends.map((f) => f.uid));
      setResults(
        (data.results ?? []).filter((r) => r.uid !== uid && !friendIds.has(r.uid))
      );
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  /* ─ إضافة صديق ─ */
  const addFriend = async (target: Person) => {
    if (!uid) return;
    setBusyUid(target.uid);
    try {
      const res = await postSocial({ mode: "addFriend", targetUid: target.uid });
      const d = await res.json();
      if (d.ok) {
        setFriends((prev) => [...prev, target]);
        setResults((prev) => prev.filter((r) => r.uid !== target.uid));
        flash(`أضفت ${target.name}`);
      } else {
        flash(d.error ?? "تعذّرت الإضافة");
      }
    } catch {
      flash("تعذّر الاتصال");
    } finally {
      setBusyUid(null);
    }
  };

  /* ─ حذف صديق ─ */
  const removeFriend = async (target: Person) => {
    if (!uid) return;
    setBusyUid(target.uid);
    try {
      await postSocial({ mode: "removeFriend", targetUid: target.uid });
      setFriends((prev) => prev.filter((f) => f.uid !== target.uid));
    } catch {
      flash("تعذّر الحذف");
    } finally {
      setBusyUid(null);
    }
  };

  /* ─ فتح بروفايل صديق + إحصاءاته ─ */
  const openProfile = async (p: Person) => {
    setProfile(null);
    setProfileLoading(true);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "getProfile", targetUid: p.uid }),
      });
      const d = (await res.json()) as { profile?: Profile };
      if (d.profile) setProfile(d.profile);
      else flash("تعذّر فتح البروفايل");
    } catch {
      flash("تعذّر الاتصال");
    } finally {
      setProfileLoading(false);
    }
  };

  /* ─ بطاقة شخص ─ */
  const personRow = (p: Person, action: "add" | "remove") => (
    <div
      key={p.uid}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <button
        onClick={() => openProfile(p)}
        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-white"
        style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}
        aria-label={`بروفايل ${p.name}`}
      >
        {p.name.charAt(0) || "؟"}
      </button>
      <button onClick={() => openProfile(p)} className="flex-1 min-w-0 text-right">
        <p className="font-bold text-[15px] truncate" style={{ color: "var(--text)" }}>
          {p.name || "طالب"}
        </p>
        {p.track && (
          <p className="text-[12px] truncate" style={{ color: "var(--text-muted)" }}>
            {p.track}
          </p>
        )}
      </button>
      {action === "add" ? (
        <button
          onClick={() => addFriend(p)}
          disabled={busyUid === p.uid}
          className="px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0 disabled:opacity-50"
          style={{
            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
            border: "1.5px solid var(--accent)",
            color: "var(--accent-light)",
          }}
        >
          {busyUid === p.uid ? "..." : "+ إضافة"}
        </button>
      ) : (
        <button
          onClick={() => removeFriend(p)}
          disabled={busyUid === p.uid}
          className="px-3 py-2 rounded-xl font-bold text-sm flex-shrink-0 disabled:opacity-50"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {busyUid === p.uid ? "..." : "حذف"}
        </button>
      )}
    </div>
  );

  return (
    <div
      className="fixed flex flex-col"
      style={{ inset: 0, zIndex: 60, background: "var(--bg)" }}
    >
      {/* الرأس */}
      <div
        className="flex items-center gap-3 px-4 border-b flex-shrink-0"
        style={{
          paddingTop: "calc(12px + env(safe-area-inset-top))",
          paddingBottom: "12px",
          borderColor: "var(--border)",
        }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1 font-bold text-sm min-h-[44px] px-1"
          style={{ color: "var(--accent-light)" }}
        >
          ← رجوع
        </button>
        <span className="text-xl">👥</span>
        <p className="font-bold flex-1 text-[16px]" style={{ color: "var(--text)" }}>
          الأصدقاء
        </p>
      </div>

      {/* لزائر بلا حساب */}
      {!uid ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-4xl">🔒</p>
          <p className="font-bold" style={{ color: "var(--text)" }}>
            سجّل دخولك لإضافة الأصدقاء
          </p>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            البحث عن الأصدقاء وإضافتهم متاح للحسابات المسجّلة فقط — وضع الزائر محلي.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
          {/* صندوق البحث */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="ابحث باسم الطالب..."
                className="flex-1 rounded-2xl px-4 py-3 text-[15px] outline-none"
                style={{
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  color: "var(--text)",
                }}
              />
              <button
                onClick={runSearch}
                disabled={searching}
                className="px-5 rounded-2xl font-bold text-white flex-shrink-0 disabled:opacity-50"
                style={{ background: "var(--accent)" }}
              >
                {searching ? "..." : "بحث"}
              </button>
            </div>

            {/* نتائج البحث */}
            {searched && results.length === 0 && (
              <p className="text-[13px] text-center py-2" style={{ color: "var(--text-muted)" }}>
                ما لقينا أحد بهذا الاسم
              </p>
            )}
            {results.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
                  نتائج البحث
                </p>
                {results.map((p) => personRow(p, "add"))}
              </div>
            )}
          </div>

          {/* قائمة الأصدقاء */}
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
              أصدقائي ({friends.length})
            </p>
            {friends.length === 0 ? (
              <div
                className="rounded-2xl px-4 py-6 text-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  ما عندك أصدقاء بعد — ابحث وأضف زملاءك
                </p>
              </div>
            ) : (
              friends.map((p) => personRow(p, "remove"))
            )}
          </div>
        </div>
      )}

      {/* بروفايل صديق */}
      {(profile || profileLoading) && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center px-4 pb-6"
          style={{ zIndex: 80, background: "rgba(0,0,0,0.55)" }}
          onClick={() => { setProfile(null); setProfileLoading(false); }}>
          <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-4"
            style={{ background: "var(--bg)", border: "1.5px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}>
            {profileLoading || !profile ? (
              <p className="py-8 font-bold" style={{ color: "var(--text-muted)" }}>...جاري التحميل</p>
            ) : (
              <>
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-3xl"
                  style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
                  {profile.name.charAt(0) || "؟"}
                </div>
                <div className="text-center">
                  <p className="font-black text-xl" style={{ color: "var(--text)" }}>
                    {profile.name || "طالب"}
                  </p>
                  {profile.track && <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>{profile.track}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {([
                    { label: "🔥 الستريك", value: `${profile.streak} يوم` },
                    { label: "⏱ دقائق التركيز", value: `${profile.focusMins}` },
                    { label: "✅ الجلسات", value: `${profile.sessions}` },
                    { label: "🪙 الفضّيات", value: `${profile.silver}` },
                  ]).map((s) => (
                    <div key={s.label} className="rounded-2xl px-3 py-3 text-center"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <p className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                      <p className="font-black text-lg mt-0.5" style={{ color: "var(--accent-light)" }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => setProfile(null)}
                  className="w-full py-3 rounded-2xl font-bold text-sm transition"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  إغلاق
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* رسالة عابرة */}
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
          style={{
            bottom: "calc(24px + env(safe-area-inset-bottom))",
            background: "var(--accent)",
            zIndex: 70,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
