"use client";
import { useState, useEffect, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import FriendsPanel from "@/components/FriendsPanel";
import { loadUser, loadList, saveList } from "@/lib/storage";
import { subjectsForTracks, TRACKS, type TrackId } from "@/lib/tracks";

/* ─── بيانات ─── */

interface ChatMessage {
  id: number;
  user: string;
  time: number;
  content: string;
  isOfficial?: boolean;
}

interface GroupChannel {
  id: "general" | "official";
  name: string;
  icon: string;
}

interface ChatGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
  trackId?: string;
}

const CHAT_GROUPS: ChatGroup[] = [
  { id: "general",  name: "عام",       icon: "💬", description: "نقاش عام لجميع الطلاب" },
  { id: "tahsili",  name: "تحصيلي",    icon: "📚", description: "طلاب مسار التحصيلي",          trackId: "تحصيلي" },
  { id: "qudurat",  name: "قدرات",     icon: "💡", description: "طلاب مسار القدرات",            trackId: "قدرات" },
  { id: "ielts",    name: "آيلتس",     icon: "🌍", description: "IELTS preparation group",      trackId: "ايلتس" },
  { id: "step",     name: "ستيب",      icon: "📖", description: "STEP & TOEFL group",           trackId: "ستيب" },
  { id: "cpc",      name: "CPC",       icon: "🏆", description: "Computer Programming Contest", trackId: "CPC" },
  { id: "duolingo", name: "دويلينقو",  icon: "🦉", description: "Duolingo English Test",        trackId: "دوليقو" },
];

const CHANNELS: GroupChannel[] = [
  { id: "general",  name: "عام",   icon: "💬" },
  { id: "official", name: "رسمي",  icon: "📢" },
];

/* ─── أداة الوقت ─── */
function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

/* ─── الصفحة ─── */
export default function CouncilPage() {
  /* ─ بيانات المستخدم ─ */
  const [userName] = useState<string>(() => {
    if (typeof window === "undefined") return "طالب";
    const u = loadUser();
    return u?.name ?? "طالب";
  });

  const [userTrackIds] = useState<TrackId[]>(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    return ids.length ? ids : [];
  });

  /* ─ حالة المجموعة النشطة ─ */
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [activeChannel, setActiveChannel] = useState<"general" | "official">("general");
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* ─ لوحة الأصدقاء ─ */
  const [showFriends, setShowFriends] = useState(false);

  /* ─ حالة الرسائل ─ */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [officialMessages, setOfficialMessages] = useState<ChatMessage[]>([]);
  const [msgText, setMsgText] = useState("");

  /* ─ التمرير ─ */
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ─ آخر رسائل لكل مجموعة (للمعاينة) ─ */
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage | null>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const map: Record<string, ChatMessage | null> = {};
    for (const g of CHAT_GROUPS) {
      const msgs = loadList<ChatMessage>(`darb_chat_${g.id}_general`);
      map[g.id] = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    }
    setLastMessages(map);
  }, []);

  /* ─ تحميل الرسائل عند تغيير المجموعة أو القناة ─ */
  useEffect(() => {
    if (!activeGroup) return;
    if (activeChannel === "general") {
      const key = `darb_chat_${activeGroup.id}_general`;
      setMessages(loadList<ChatMessage>(key));
    } else {
      setMessages(officialMessages);
    }
  }, [activeGroup, activeChannel, officialMessages]);

  /* ─ تحميل الإعلانات الرسمية عند فتح مجموعة ─ */
  useEffect(() => {
    if (!activeGroup) return;
    fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "getAnnouncements" }),
    })
      .then((r) => r.json())
      .then((d: { announcements?: { id: string; title: string; content: string; createdAt?: { seconds: number } }[] }) => {
        if (d.announcements) {
          setOfficialMessages(
            d.announcements.map((a) => ({
              id: parseInt(a.id) || a.createdAt?.seconds || Date.now(),
              user: "درب الرسمي",
              time: a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now(),
              content: `**${a.title}**\n${a.content}`,
              isOfficial: true,
            }))
          );
        }
      })
      .catch(() => {});
  }, [activeGroup]);

  /* ─ التمرير للأسفل عند وصول رسائل جديدة ─ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ─ إرسال رسالة ─ */
  const sendMessage = () => {
    if (!msgText.trim() || !activeGroup) return;
    const msg: ChatMessage = {
      id: Date.now(),
      user: userName,
      time: Date.now(),
      content: msgText.trim(),
    };
    const key = `darb_chat_${activeGroup.id}_general`;
    const updated = [...messages, msg];
    setMessages(updated);
    saveList(key, updated);
    setLastMessages((prev) => ({ ...prev, [activeGroup.id]: msg }));
    setMsgText("");
  };

  /* ─ فتح مجموعة ─ */
  const openGroup = (group: ChatGroup) => {
    setActiveGroup(group);
    setActiveChannel("general");
    setIsFullscreen(false);
    setMsgText("");
  };

  /* ─ إغلاق المجموعة ─ */
  const closeGroup = () => {
    setActiveGroup(null);
    setIsFullscreen(false);
  };

  /* ─ ترتيب المجموعات — مجموعات المسار أولاً ─ */
  const sortedGroups = [...CHAT_GROUPS].sort((a, b) => {
    const aInTrack = a.trackId ? (userTrackIds as string[]).includes(a.trackId) : false;
    const bInTrack = b.trackId ? (userTrackIds as string[]).includes(b.trackId) : false;
    if (aInTrack && !bInTrack) return -1;
    if (!aInTrack && bInTrack) return 1;
    return 0;
  });

  /* ══════════════════════════════════════════════════
     شاشة الدردشة الجماعية
  ══════════════════════════════════════════════════ */
  if (activeGroup) {
    const isMyTrack = activeGroup.trackId
      ? (userTrackIds as string[]).includes(activeGroup.trackId)
      : false;

    return (
      <>
        <div
          className="fixed flex flex-col"
          style={{
            inset: 0,
            zIndex: isFullscreen ? 9999 : 50,
            background: "var(--bg)",
          }}
        >
          {/* ─ الرأس ─ */}
          <div
            className="flex items-center gap-3 px-4 border-b flex-shrink-0"
            style={{
              paddingTop: "calc(12px + env(safe-area-inset-top))",
              paddingBottom: "12px",
              borderColor: "var(--border)",
              background: "var(--bg)",
            }}
          >
            <button
              onClick={closeGroup}
              className="flex items-center gap-1 font-bold text-sm min-h-[44px] px-1"
              style={{ color: "var(--accent-light)" }}
            >
              ← رجوع
            </button>
            <span className="text-xl">{activeGroup.icon}</span>
            <p className="font-bold flex-1 text-[16px]" style={{ color: "var(--text)" }}>
              {activeGroup.name}
            </p>
            {isMyTrack && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  color: "var(--accent-light)",
                  border: "1px solid var(--accent)",
                }}
              >
                مسارك
              </span>
            )}
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-lg"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
              aria-label={isFullscreen ? "إغلاق الشاشة الكاملة" : "شاشة كاملة"}
            >
              {isFullscreen ? "✕" : "⛶"}
            </button>
          </div>

          {/* ─ تبويبات القنوات ─ */}
          <div
            className="flex gap-1.5 px-3 py-2 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
          >
            <button
              onClick={() => setActiveChannel("general")}
              className="flex-1 rounded-xl py-2.5 font-bold text-sm transition"
              style={
                activeChannel === "general"
                  ? {
                      border: "1.5px solid var(--accent)",
                      color: "var(--accent-light)",
                      background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    }
                  : {
                      border: "1.5px solid var(--border)",
                      color: "var(--text-muted)",
                      background: "transparent",
                    }
              }
            >
              💬 عام
            </button>
            <button
              onClick={() => setActiveChannel("official")}
              className="flex-1 rounded-xl py-2.5 font-bold text-sm transition"
              style={
                activeChannel === "official"
                  ? {
                      border: "1.5px solid var(--gold)",
                      color: "var(--gold)",
                      background: "color-mix(in srgb, var(--gold) 12%, transparent)",
                    }
                  : {
                      border: "1.5px solid var(--border)",
                      color: "var(--text-muted)",
                      background: "transparent",
                    }
              }
            >
              📢 رسمي
            </button>
          </div>

          {/* ─ قائمة الرسائل ─ */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 py-16">
                <p className="text-4xl">{activeChannel === "official" ? "📢" : "💬"}</p>
                <p className="font-bold" style={{ color: "var(--text)" }}>
                  {activeChannel === "official" ? "لا توجد إعلانات رسمية بعد" : "ابدأ النقاش"}
                </p>
                {activeChannel === "general" && (
                  <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                    {activeGroup.description}
                  </p>
                )}
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex gap-2.5"
                  style={{
                    flexDirection: msg.user === userName ? "row-reverse" : "row",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-black text-white"
                    style={{
                      background: msg.isOfficial
                        ? "linear-gradient(135deg,var(--gold),var(--gold-light))"
                        : "linear-gradient(135deg,var(--accent-2),var(--accent-light))",
                    }}
                  >
                    {msg.isOfficial ? "📢" : msg.user.charAt(0)}
                  </div>
                  <div
                    className="flex flex-col gap-0.5"
                    style={{
                      maxWidth: "75%",
                      alignItems: msg.user === userName ? "flex-end" : "flex-start",
                    }}
                  >
                    {msg.user !== userName && (
                      <p
                        className="text-[11px] font-bold"
                        style={{ color: msg.isOfficial ? "var(--gold)" : "var(--accent-light)" }}
                      >
                        {msg.user}
                      </p>
                    )}
                    <div
                      className="rounded-2xl px-3 py-2.5"
                      style={{
                        background:
                          msg.user === userName
                            ? "color-mix(in srgb, var(--accent) 15%, var(--surface))"
                            : msg.isOfficial
                            ? "color-mix(in srgb, var(--gold) 10%, var(--surface))"
                            : "var(--surface)",
                        border: msg.isOfficial
                          ? "1px solid color-mix(in srgb, var(--gold) 40%, var(--border))"
                          : "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-[14px] leading-relaxed whitespace-pre-wrap"
                        style={{ color: "var(--text)" }}
                      >
                        {msg.content}
                      </p>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {timeAgo(msg.time)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ─ حقل الإدخال (القناة العامة فقط) ─ */}
          {activeChannel === "general" ? (
            <div
              className="px-3 py-3 border-t flex gap-2 flex-shrink-0"
              style={{
                borderColor: "var(--border)",
                paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
                background: "var(--bg)",
              }}
            >
              <input
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="اكتب رسالة..."
                className="flex-1 rounded-2xl px-4 py-3 text-[15px] outline-none"
                style={{
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  color: "var(--text)",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!msgText.trim()}
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white flex-shrink-0 text-lg transition"
                style={{
                  background: msgText.trim() ? "var(--accent)" : "var(--border)",
                }}
              >
                ↑
              </button>
            </div>
          ) : (
            <div
              className="px-4 py-3 border-t text-center flex-shrink-0"
              style={{
                borderColor: "var(--border)",
                paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
                background: "var(--bg)",
              }}
            >
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                قراءة فقط — القناة الرسمية لـ {activeGroup.name}
              </p>
            </div>
          )}
        </div>

        {/* BottomNav مخفية في وضع الشاشة الكاملة */}
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
        <h1 className="title-lg" style={{ color: "var(--text)" }}>
          المجلس
        </h1>
      </Dome>

      <div className="h-2" />

      {/* ─ مدخل الأصدقاء ─ */}
      <button
        onClick={() => setShowFriends(true)}
        className="flex items-center gap-3 px-5 py-4 text-right transition active:opacity-70 w-full"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            background: "color-mix(in srgb, var(--gold) 12%, var(--surface))",
            border: "1.5px solid color-mix(in srgb, var(--gold) 40%, var(--border))",
          }}
        >
          👥
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]" style={{ color: "var(--text)" }}>
            الأصدقاء
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            ابحث عن زملائك وأضفهم
          </p>
        </div>
        <span className="text-[var(--text-muted)] text-lg flex-shrink-0">‹</span>
      </button>

      {/* ─ قائمة المجموعات ─ */}
      <div className="flex flex-col">
        {sortedGroups.map((group) => {
          const isMyTrack = group.trackId
            ? (userTrackIds as string[]).includes(group.trackId)
            : false;
          const lastMsg = lastMessages[group.id];

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
              {/* أيقونة المجموعة */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{
                  background: isMyTrack
                    ? "color-mix(in srgb, var(--accent) 12%, var(--surface))"
                    : "var(--surface)",
                  border: isMyTrack
                    ? "1.5px solid color-mix(in srgb, var(--accent) 40%, var(--border))"
                    : "1px solid var(--border)",
                }}
              >
                {group.icon}
              </div>

              {/* التفاصيل */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className="font-bold text-[15px]"
                    style={{ color: "var(--text)" }}
                  >
                    {group.name}
                  </p>
                  {isMyTrack && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={{
                        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                        color: "var(--accent-light)",
                        border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                      }}
                    >
                      مسارك
                    </span>
                  )}
                </div>
                <p
                  className="text-[13px] truncate mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {lastMsg ? lastMsg.content : group.description}
                </p>
              </div>

              {/* نقطة الرسائل الجديدة */}
              {lastMsg && (
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: "var(--accent)" }}
                />
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
