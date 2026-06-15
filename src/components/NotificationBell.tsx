"use client";
import { useEffect, useRef, useState } from "react";

/* ─── إشعار = إعلان رسمي ─── */
interface Notif {
  id: string;
  title: string;
  content: string;
  createdAt: number; // ms
}

const SEEN_KEY = "darb_notif_seen";

/* ─ وقت نسبي (دالة وحدة — خارج المكوّن لتفادي قاعدة النقاء) ─ */
function timeAgo(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const h = Math.round(mins / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.round(h / 24)} يوم`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<number>(() =>
    typeof window !== "undefined" ? Number(localStorage.getItem(SEEN_KEY) ?? 0) : 0
  );
  const ref = useRef<HTMLDivElement>(null);

  /* ─ جلب الإعلانات الرسمية (كلها) ─ */
  useEffect(() => {
    fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "getAnnouncements" }),
    })
      .then((r) => r.json())
      .then((d: { announcements?: { id: string; title: string; content: string; createdAt?: { seconds: number } }[] }) => {
        if (d.announcements) {
          setItems(d.announcements.map((a) => ({
            id: a.id, title: a.title, content: a.content,
            createdAt: a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now(),
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ─ إغلاق عند الضغط خارجاً ─ */
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unread = items.filter((n) => n.createdAt > lastSeen).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && items.length) {
      const newest = Math.max(...items.map((n) => n.createdAt));
      localStorage.setItem(SEEN_KEY, String(newest));
      setLastSeen(newest);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label="الإشعارات"
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition"
        style={{ background: "color-mix(in srgb, var(--text-muted) 10%, transparent)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8a6 6 0 0 1 12 0c0 5 1.5 7 1.5 7H4.5S6 13 6 8z" />
          <path strokeLinecap="round" d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white"
            style={{ background: "#EF4444" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-[99] rounded-2xl shadow-xl overflow-hidden flex flex-col"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", width: "min(80vw, 300px)" }}>
          <div className="px-4 py-2.5 font-bold text-[13px] border-b"
            style={{ color: "var(--text)", borderColor: "var(--border)" }}>
            🔔 الإشعارات
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>...جاري التحميل</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>لا إشعارات بعد</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <p className="font-bold text-[13px]" style={{ color: "var(--accent-light)" }}>{n.title}</p>
                  <p className="text-[12px] mt-0.5 whitespace-pre-wrap" style={{ color: "var(--text-dim)" }}>{n.content}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{timeAgo(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
