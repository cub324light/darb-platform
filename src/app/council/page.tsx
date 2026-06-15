"use client";
import { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, onSnapshot,
  orderBy, query, limit, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { onAuth } from "@/lib/cloud";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import FriendsPanel from "@/components/FriendsPanel";
import { loadUser } from "@/lib/storage";
import type { TrackId } from "@/lib/tracks";
import { CHAT_GROUPS, type ChatGroup } from "@/lib/groups";

/* ─── بيانات ─── */
interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  content: string;
  createdAt: number; // ms
  isOfficial?: boolean;
  pinned?: boolean;
}

/* ─── أداة الوقت ─── */
function timeAgo(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

/* ─── الصفحة ─── */
export default function CouncilPage() {
  /* ─ حالة المستخدم الحالي ─ */
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [userName] = useState<string>(() => {
    if (typeof window === "undefined") return "طالب";
    return loadUser()?.name ?? "طالب";
  });
  const [userTrackIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    return ids as string[];
  });

  useEffect(() => onAuth((u) => setAuthUid(u?.uid ?? null)), []);

  /* ─ فتح «عام» تلقائياً عند فتح الصفحة (مرة واحدة) ─ */
  useEffect(() => {
    const general = CHAT_GROUPS.find((g) => g.id === "general");
    if (general) {
      setActiveGroup(general);
      setActiveChannel("general");
      setIsFullscreen(true);
    }
  }, []);

  /* ─ حالة المجموعة النشطة ─ */
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [activeChannel, setActiveChannel] = useState<"general" | "official">("general");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  /* ─ رسائل عام (من Firestore) ─ */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);

  /* ─ رسائل رسمي (من API) ─ */
  const [officialMessages, setOfficialMessages] = useState<ChatMessage[]>([]);

  /* ─ حقل الإدخال ─ */
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

  /* ─ آخر رسالة لكل مجموعة (للمعاينة) — من الذاكرة المحلية ─ */
  const [lastMessages, setLastMessages] = useState<Record<string, { text: string; time: number } | null>>({});

  /* ─ التمرير للأسفل ─ */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, officialMessages]);

  /* ─ اشتراك Firestore + إعلانات عند تغيّر المجموعة النشطة ─ */
  useEffect(() => {
    if (!activeGroup) return;
    setMessages([]);
    setOfficialMessages([]);
    setMsgLoading(true);

    const q = query(
      collection(db, "chats", activeGroup.id, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt;
        const createdAt = ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : Date.now());
        return { id: d.id, uid: data.uid ?? "", name: data.name ?? "طالب", content: data.content ?? "", createdAt };
      });
      setMessages(msgs);
      setMsgLoading(false);
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        setLastMessages((prev) => ({ ...prev, [activeGroup.id]: { text: last.content, time: last.createdAt } }));
      }
    }, () => setMsgLoading(false));

    fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "getAnnouncements", groupId: activeGroup.id }),
    })
      .then((r) => r.json())
      .then((d: { announcements?: { id: string; title: string; content: string; pinned?: boolean; createdAt?: { seconds: number } }[] }) => {
        if (d.announcements) {
          setOfficialMessages(d.announcements.map((a) => ({
            id: a.id, uid: "official", name: "درب الرسمي",
            content: `${a.title}\n${a.content}`,
            createdAt: a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now(),
            isOfficial: true, pinned: a.pinned === true,
          })));
        }
      })
      .catch(() => {});

    return () => unsub();
  }, [activeGroup]);

  /* ─ فتح مجموعة ─ */
  const openGroup = (group: ChatGroup) => {
    setActiveGroup(group);
    setActiveChannel("general");
    setIsFullscreen(true);
    setMsgText("");
  };

  /* ─ إغلاق المجموعة ─ */
  const closeGroup = () => {
    setActiveGroup(null);
    setIsFullscreen(false);
    setMessages([]);
    setOfficialMessages([]);
  };

  /* ─ إرسال رسالة ─ */
  const sendMessage = async () => {
    const text = msgText.trim();
    if (!text || !activeGroup || !authUid || sending) return;
    setSending(true);
    setMsgText("");
    try {
      await addDoc(collection(db, "chats", activeGroup.id, "messages"), {
        uid: authUid,
        name: userName,
        content: text,
        createdAt: serverTimestamp(),
      });
    } catch {
      setMsgText(text);
    } finally {
      setSending(false);
    }
  };

  /* ─ الرسائل الحالية حسب القناة ─ */
  const displayedMessages = activeChannel === "official" ? officialMessages : messages;

  /* ─ ترتيب المجموعات — مجموعات المسار أولاً ─ */
  const sortedGroups = [...CHAT_GROUPS].sort((a, b) => {
    const aIn = a.trackId ? userTrackIds.includes(a.trackId) : false;
    const bIn = b.trackId ? userTrackIds.includes(b.trackId) : false;
    return aIn === bIn ? 0 : aIn ? -1 : 1;
  });

  /* ══════════════════════════════════════════════════
     شاشة المحادثة
  ══════════════════════════════════════════════════ */
  if (activeGroup) {
    const isMyTrack = activeGroup.trackId ? userTrackIds.includes(activeGroup.trackId) : false;
    const isGuest = !authUid;

    return (
      <>
        <div
          className="fixed flex flex-col"
          style={{ inset: 0, zIndex: isFullscreen ? 9999 : 50, background: "var(--bg)" }}
        >
          {/* ─ الرأس ─ */}
          <div
            className="flex items-center gap-3 px-4 flex-shrink-0"
            style={{
              paddingTop: "calc(12px + env(safe-area-inset-top))",
              paddingBottom: "12px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <button onClick={closeGroup}
              className="flex items-center gap-1 font-bold text-sm min-h-[44px] px-1"
              style={{ color: "var(--accent-light)" }}>
              ← رجوع
            </button>
            <span className="text-xl">{activeGroup.icon}</span>
            <p className="font-bold flex-1 text-[16px]" style={{ color: "var(--text)" }}>
              {activeGroup.name}
            </p>
            {isMyTrack && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  color: "var(--accent-light)",
                  border: "1px solid var(--accent)",
                }}>
                مسارك
              </span>
            )}
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-lg"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              aria-label={isFullscreen ? "إغلاق الشاشة الكاملة" : "شاشة كاملة"}
            >
              {isFullscreen ? "✕" : "⛶"}
            </button>
          </div>

          {/* ─ تبويبات القنوات ─ */}
          <div className="flex gap-1.5 px-3 py-2 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
            {(["general", "official"] as const).map((ch) => {
              const isActive = activeChannel === ch;
              return (
                <button key={ch} onClick={() => setActiveChannel(ch)}
                  className="flex-1 rounded-xl py-2.5 font-bold text-sm transition"
                  style={isActive ? {
                    border: `1.5px solid ${ch === "official" ? "var(--gold)" : "var(--accent)"}`,
                    color: ch === "official" ? "var(--gold)" : "var(--accent-light)",
                    background: `color-mix(in srgb, ${ch === "official" ? "var(--gold)" : "var(--accent)"} 12%, transparent)`,
                  } : {
                    border: "1.5px solid var(--border)",
                    color: "var(--text-muted)",
                    background: "transparent",
                  }}>
                  {ch === "general" ? "💬 عام" : "📢 رسمي"}
                </button>
              );
            })}
          </div>

          {/* ─ قائمة الرسائل ─ */}
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {msgLoading && activeChannel === "general" ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>جارٍ التحميل...</p>
              </div>
            ) : displayedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 py-16">
                <p className="text-4xl">{activeChannel === "official" ? "📢" : "💬"}</p>
                <p className="font-bold" style={{ color: "var(--text)" }}>
                  {activeChannel === "official" ? "لا توجد إعلانات رسمية بعد" : "ابدأ النقاش"}
                </p>
                {activeChannel === "general" && (
                  <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>{activeGroup.description}</p>
                )}
              </div>
            ) : (
              displayedMessages.map((msg) => {
                const isMine = msg.uid === authUid;
                return (
                  <div key={msg.id} className="flex gap-2.5"
                    style={{ flexDirection: isMine ? "row-reverse" : "row" }}>
                    {/* الأفاتار */}
                    <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-black text-white"
                      style={{
                        background: msg.isOfficial
                          ? "linear-gradient(135deg,var(--gold),var(--gold-light))"
                          : isMine
                          ? "linear-gradient(135deg,var(--accent-2),var(--accent-light))"
                          : "linear-gradient(135deg,#475569,#64748B)",
                      }}>
                      {msg.isOfficial ? "📢" : (msg.name?.charAt(0) || "؟")}
                    </div>
                    {/* الفقاعة */}
                    <div className="flex flex-col gap-0.5"
                      style={{ maxWidth: "75%", alignItems: isMine ? "flex-end" : "flex-start" }}>
                      {!isMine && (
                        <p className="text-[11px] font-bold"
                          style={{ color: msg.isOfficial ? "var(--gold)" : "var(--accent-light)" }}>
                          {msg.pinned ? "📌 " : ""}{msg.isOfficial ? "درب الرسمي" : msg.name}
                        </p>
                      )}
                      <div className="rounded-2xl px-3 py-2.5"
                        style={{
                          background: isMine
                            ? "color-mix(in srgb, var(--accent) 15%, var(--surface))"
                            : msg.isOfficial
                            ? "color-mix(in srgb, var(--gold) 10%, var(--surface))"
                            : "var(--surface)",
                          border: msg.isOfficial
                            ? "1px solid color-mix(in srgb, var(--gold) 40%, var(--border))"
                            : "1px solid var(--border)",
                        }}>
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                          {msg.content}
                        </p>
                      </div>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ─ حقل الإدخال ─ */}
          {activeChannel === "general" ? (
            isGuest ? (
              /* الزائر لا يستطيع الكتابة */
              <div className="px-4 py-3 border-t text-center flex-shrink-0"
                style={{
                  borderColor: "var(--border)",
                  paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
                  background: "var(--bg)",
                }}>
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  سجّل دخولك للمشاركة في النقاش
                </p>
              </div>
            ) : (
              <div className="px-3 py-3 border-t flex gap-2 flex-shrink-0"
                style={{
                  borderColor: "var(--border)",
                  paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
                  background: "var(--bg)",
                }}>
                <input
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="اكتب رسالة..."
                  maxLength={1000}
                  className="flex-1 rounded-2xl px-4 py-3 text-[15px] outline-none"
                  style={{
                    background: "var(--surface)",
                    border: "1.5px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!msgText.trim() || sending}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white flex-shrink-0 text-lg transition"
                  style={{ background: msgText.trim() && !sending ? "var(--accent)" : "var(--border)" }}
                >
                  {sending ? "⋯" : "↑"}
                </button>
              </div>
            )
          ) : (
            <div className="px-4 py-3 border-t text-center flex-shrink-0"
              style={{
                borderColor: "var(--border)",
                paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
                background: "var(--bg)",
              }}>
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                قراءة فقط — القناة الرسمية لـ {activeGroup.name}
              </p>
            </div>
          )}
        </div>

        {!isFullscreen && <BottomNav />}
      </>
    );
  }

  /* ══════════════════════════════════════════════════
     الشاشة الرئيسية — قائمة المجموعات
  ══════════════════════════════════════════════════ */
  return (
    <div className="min-h-dvh pb-nav">
      <Dome compact>
        <h1 className="title-lg" style={{ color: "var(--text)" }}>المجلس</h1>
      </Dome>

      <div className="h-2" />

      {/* ─ مدخل الأصدقاء ─ */}
      <button
        onClick={() => setShowFriends(true)}
        className="flex items-center gap-3 px-5 py-4 text-right transition active:opacity-70 w-full"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            background: "color-mix(in srgb, var(--gold) 12%, var(--surface))",
            border: "1.5px solid color-mix(in srgb, var(--gold) 40%, var(--border))",
          }}>
          👥
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]" style={{ color: "var(--text)" }}>الأصدقاء</p>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>ابحث عن زملائك وأضفهم</p>
        </div>
        <span className="text-[var(--text-muted)] text-lg flex-shrink-0">‹</span>
      </button>

      {/* ─ قائمة المجموعات ─ */}
      <div className="flex flex-col">
        {sortedGroups.map((group) => {
          const isMyTrack = group.trackId ? userTrackIds.includes(group.trackId) : false;
          const last = lastMessages[group.id];

          return (
            <button
              key={group.id}
              onClick={() => openGroup(group)}
              className="flex items-center gap-3 px-5 py-4 text-right transition active:opacity-70 w-full"
              style={{
                borderBottom: "1px solid var(--border)",
                background: isMyTrack
                  ? "color-mix(in srgb, var(--accent) 4%, transparent)"
                  : "transparent",
              }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{
                  background: isMyTrack
                    ? "color-mix(in srgb, var(--accent) 12%, var(--surface))"
                    : "var(--surface)",
                  border: isMyTrack
                    ? "1.5px solid color-mix(in srgb, var(--accent) 40%, var(--border))"
                    : "1px solid var(--border)",
                }}>
                {group.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[15px]" style={{ color: "var(--text)" }}>{group.name}</p>
                  {isMyTrack && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={{
                        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                        color: "var(--accent-light)",
                        border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                      }}>
                      مسارك
                    </span>
                  )}
                </div>
                <p className="text-[13px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {last ? last.text : group.description}
                </p>
              </div>
              {last && (
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: "var(--accent)" }} />
              )}
            </button>
          );
        })}
      </div>

      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}

      <BottomNav />
    </div>
  );
}
