"use client";
import { useState, useEffect, useRef } from "react";
import {
  collection, doc, writeBatch, addDoc, onSnapshot,
  orderBy, query, limit, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
/* onAuth مُستورَد ديناميكياً أسفل */
import BottomNav from "@/components/BottomNav";
import PageFooter from "@/components/PageFooter";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import FriendsPanel from "@/components/FriendsPanel";
import { loadUser } from "@/lib/storage";
import type { TrackId } from "@/lib/tracks";
import { CHAT_GROUPS, type ChatGroup } from "@/lib/groups";
import { detectContact } from "@/lib/contactFilter";
import { trackEvent } from "@/lib/events";
import { EmailVerifyNotice } from "@/components/EmailVerify";

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

/* ─── حدود الإرسال (منع الإغراق) ───
   مهلة بين الرسائل + سقف يومي. الفرض النهائي على الخادم في firestore.rules
   (وثيقة rate/{uid} تُحدَّث مع كل رسالة وتُفحص قبل قبول التالية). */
const SEND_COOLDOWN_MS = 4000;
const DAILY_LIMIT = 80;
function dailyKey(): string { return `darb_council_count_${new Date().toISOString().slice(0, 10)}`; }
function getDailyCount(): number {
  try { return parseInt(localStorage.getItem(dailyKey()) ?? "0", 10) || 0; } catch { return 0; }
}
function bumpDailyCount(): void {
  try { localStorage.setItem(dailyKey(), String(getDailyCount() + 1)); } catch { /* تجاهل */ }
}

/* ─── أسباب الإبلاغ عن رسالة ─── */
const REPORT_REASONS = [
  { id: "spam",       label: "إزعاج / تكرار" },
  { id: "harassment", label: "تنمّر / مضايقة" },
  { id: "offensive",  label: "ألفاظ مسيئة" },
  { id: "contact",    label: "مشاركة وسائل تواصل" },
  { id: "other",      label: "أخرى" },
] as const;

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
  const [emailVerified, setEmailVerified] = useState(false);
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

  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => {
      unsub = onAuth((u) => { setAuthUid(u?.uid ?? null); setEmailVerified(u?.emailVerified ?? false); });
    });
    return () => { unsub?.(); };
  }, []);

  /* ─ حالة المجموعة النشطة — تبدأ بالقائمة (لا ندخل «العام» تلقائياً) ─ */
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [activeChannel, setActiveChannel] = useState<"general" | "official">("general");
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showFriends, setShowFriends] = useState(false);

  /* ─ رسائل عام (من Firestore) ─ */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);

  /* ─ رسائل رسمي (من API) ─ */
  const [officialMessages, setOfficialMessages] = useState<ChatMessage[]>([]);

  /* ─ حقل الإدخال ─ */
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendWarn, setSendWarn] = useState<string | null>(null);

  /* ─ آخر رسالة لكل مجموعة (للمعاينة) — من الذاكرة المحلية ─ */
  const [lastMessages, setLastMessages] = useState<Record<string, { text: string; time: number } | null>>({});

  /* ─ مهلة الإرسال (آخر وقت إرسال ناجح) ─ */
  const lastSentRef = useRef(0);

  /* ─ الإبلاغ عن رسالة ─ */
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState<string>("spam");
  const [reportNote, setReportNote] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const openReport = (msg: ChatMessage) => {
    setReportTarget(msg);
    setReportReason("spam");
    setReportNote("");
    setReportDone(false);
    setReportBusy(false);
  };

  const submitReport = async () => {
    if (!reportTarget || !authUid || reportBusy) return;
    setReportBusy(true);
    try {
      await addDoc(collection(db, "reports"), {
        messageId: reportTarget.id,
        groupId: activeGroup?.id ?? "",
        reportedUid: reportTarget.uid,
        reportedName: reportTarget.name,
        content: reportTarget.content.slice(0, 1000),
        reason: reportReason,
        note: reportNote.trim().slice(0, 300),
        reporterUid: authUid,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setReportDone(true);
      trackEvent("council_message_reported", { reason: reportReason });
      setTimeout(() => { setReportTarget(null); setReportDone(false); }, 1300);
    } catch {
      setReportBusy(false);
    }
  };

  /* ─ التمرير للأسفل ─ */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, officialMessages]);

  /* ─ تصفير الرسائل عند تبديل المجموعة (نمط React: ضبط الحالة أثناء العرض) ─ */
  const [loadedGroupId, setLoadedGroupId] = useState<string | null>(null);
  if (activeGroup && activeGroup.id !== loadedGroupId) {
    setLoadedGroupId(activeGroup.id);
    setMessages([]);
    setOfficialMessages([]);
    setMsgLoading(true);
  }

  /* ─ اشتراك Firestore + إعلانات عند تغيّر المجموعة النشطة ─ */
  useEffect(() => {
    if (!activeGroup) return;

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
    /* توثيق البريد إلزامي للمشاركة — حساب Google موثّق تلقائياً */
    if (!emailVerified) {
      setSendWarn("✉️ وثّق بريدك أولاً للمشاركة في المجلس");
      return;
    }
    /* مهلة بين الرسائل — تمنع الإغراق السريع */
    const now = Date.now();
    if (now - lastSentRef.current < SEND_COOLDOWN_MS) {
      const wait = Math.ceil((SEND_COOLDOWN_MS - (now - lastSentRef.current)) / 1000);
      setSendWarn(`⏳ تمهّل ${wait} ثانية بين الرسائل`);
      return;
    }
    /* سقف يومي — يمنع الإزعاج المستمر */
    if (getDailyCount() >= DAILY_LIMIT) {
      setSendWarn("📨 وصلت حدّك اليومي من الرسائل — عُد غداً");
      return;
    }
    /* منع مشاركة وسائل التواصل — مع تسجيل المخالفة للمراقبة */
    const violation = detectContact(text);
    if (violation) {
      setSendWarn(`🚫 ممنوع مشاركة ${violation} — حفاظاً على أمان الجميع`);
      trackEvent("council_contact_blocked", { reason: violation, group: activeGroup.id });
      return;
    }
    setSendWarn(null);
    setSending(true);
    setMsgText("");
    try {
      /* كتابة مجمّعة: الرسالة + تحديث وثيقة المهلة (rate/{uid}) معاً —
         قواعد Firestore تفحص rate/{uid} لفرض المهلة على الخادم. */
      const batch = writeBatch(db);
      const msgRef = doc(collection(db, "chats", activeGroup.id, "messages"));
      batch.set(msgRef, {
        uid: authUid,
        name: userName,
        content: text,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, "rate", authUid), { lastPostAt: serverTimestamp() });
      await batch.commit();
      lastSentRef.current = Date.now();
      bumpDailyCount();
    } catch {
      setMsgText(text);
      setSendWarn("تعذّر الإرسال — حاول بعد لحظات");
    } finally {
      setSending(false);
    }
  };

  /* ─ الرسائل الحالية حسب القناة ─ */
  const displayedMessages = activeChannel === "official" ? officialMessages : messages;

  /* ─ ترتيب القائمة: «العام» أولاً، ثم الأصدقاء، ثم مجموعات مسارك، ثم الباقي ─ */
  const generalGroup = CHAT_GROUPS.find((g) => g.id === "general") ?? null;
  const restGroups = CHAT_GROUPS
    .filter((g) => g.id !== "general")
    .sort((a, b) => {
      const aIn = a.trackId ? userTrackIds.includes(a.trackId) : false;
      const bIn = b.trackId ? userTrackIds.includes(b.trackId) : false;
      return aIn === bIn ? 0 : aIn ? -1 : 1;
    });

  /* ─ زر مجموعة واحد (يُعاد استخدامه للعام وللباقي) ─ */
  const renderGroup = (group: ChatGroup) => {
    const isMyTrack = group.trackId ? userTrackIds.includes(group.trackId) : false;
    const isGeneral = group.id === "general";
    const last = lastMessages[group.id];
    const highlight = isGeneral || isMyTrack;
    return (
      <button
        key={group.id}
        onClick={() => openGroup(group)}
        className="flex items-center gap-3 px-5 py-4 text-right transition active:opacity-70 w-full"
        style={{
          borderBottom: "1px solid var(--border)",
          background: highlight ? "color-mix(in srgb, var(--accent) 4%, transparent)" : "transparent",
        }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            background: highlight ? "color-mix(in srgb, var(--accent) 12%, var(--surface))" : "var(--surface)",
            border: highlight
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
        {last && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />}
      </button>
    );
  };

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
                      <div className="flex items-center gap-2">
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {timeAgo(msg.createdAt)}
                        </p>
                        {!isMine && !msg.isOfficial && authUid && (
                          <button onClick={() => openReport(msg)}
                            className="text-[11px] transition active:opacity-60"
                            style={{ color: "var(--text-muted)" }}
                            aria-label="إبلاغ عن هذه الرسالة">
                            ⚐ إبلاغ
                          </button>
                        )}
                      </div>
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
            ) : !emailVerified ? (
              /* مسجّل دخوله ببريد غير موثّق — يوثّق قبل الكتابة */
              <div className="px-3 py-3 border-t flex-shrink-0"
                style={{
                  borderColor: "var(--border)",
                  paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
                  background: "var(--bg)",
                }}>
                <EmailVerifyNotice message="وثّق بريدك للمشاركة في المجلس" />
              </div>
            ) : (
              <div className="px-3 py-3 border-t flex flex-col gap-2 flex-shrink-0"
                style={{
                  borderColor: "var(--border)",
                  paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
                  background: "var(--bg)",
                }}>
                {sendWarn && (
                  <div className="rounded-xl px-3 py-2 text-[12px] font-bold text-center"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#EF4444" }}>
                    {sendWarn}
                  </div>
                )}
                <div className="flex gap-2">
                <input
                  value={msgText}
                  onChange={(e) => { setMsgText(e.target.value); if (sendWarn) setSendWarn(null); }}
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

        {/* ─ نافذة الإبلاغ ─ */}
        {reportTarget && (
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4"
            style={{ zIndex: 10000, background: "rgba(0,0,0,0.6)" }}
            onClick={() => !reportBusy && setReportTarget(null)}>
            <div className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: "var(--bg)", border: "1.5px solid var(--border)" }}
              onClick={(e) => e.stopPropagation()}>
              {reportDone ? (
                <p className="text-center font-bold py-4" style={{ color: "var(--success)" }}>
                  ✓ تم الإبلاغ — شكراً، سيراجعه المشرفون
                </p>
              ) : (
                <>
                  <p className="font-black text-[16px]" style={{ color: "var(--text)" }}>الإبلاغ عن رسالة</p>
                  <div className="rounded-xl px-3 py-2 text-[13px] line-clamp-3"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    {reportTarget.content}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {REPORT_REASONS.map((r) => (
                      <button key={r.id} onClick={() => setReportReason(r.id)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-right transition"
                        style={{
                          background: reportReason === r.id ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface)",
                          border: `1.5px solid ${reportReason === r.id ? "var(--accent)" : "var(--border)"}`,
                        }}>
                        <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ border: `2px solid ${reportReason === r.id ? "var(--accent)" : "var(--border)"}` }}>
                          {reportReason === r.id && <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />}
                        </span>
                        <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{r.label}</span>
                      </button>
                    ))}
                  </div>
                  <input value={reportNote} onChange={(e) => setReportNote(e.target.value)}
                    placeholder="ملاحظة (اختياري)" maxLength={300}
                    className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none"
                    style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setReportTarget(null)} disabled={reportBusy}
                      className="px-4 py-2.5 rounded-xl text-[14px] font-bold"
                      style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      إلغاء
                    </button>
                    <button onClick={submitReport} disabled={reportBusy}
                      className="flex-1 py-2.5 rounded-xl text-[14px] font-black text-white transition active:scale-[0.98]"
                      style={{ background: "var(--danger)", opacity: reportBusy ? 0.6 : 1 }}>
                      {reportBusy ? "..." : "إرسال البلاغ"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">المجلس</h1>
        </div>
      </Dome>

      <div className="h-2" />

      {/* ١) العام أولاً */}
      <div className="flex flex-col">
        {generalGroup && renderGroup(generalGroup)}
      </div>

      {/* ٢) مدخل الأصدقاء */}
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

      {/* ٣) مجموعات مسارك ثم ٤) الباقي */}
      <div className="flex flex-col">
        {restGroups.map((group) => renderGroup(group))}
      </div>

      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}

      <PageFooter />
      <BottomNav />
    </div>
  );
}
