"use client";
/* ─── مُضيف الإشعارات الجماعية (Broadcast Host) ───
   يجلب إشعارات المستخدم المطابقة ويعرضها كتوست. التسليم يمرّ عبر نقل المحرّك
   الحالي (InAppTransport) ويُسجَّل في دورة حياة الإشعار (NotificationDelivered/
   Opened/Dismissed) — إعادة استخدام للمحرّك بلا تكرار منطقه. */
import { useEffect, useState } from "react";
import { fetchActiveBroadcasts, reportBroadcast, loadSeen, markSeen, type ActiveBroadcast } from "@/lib/broadcast/client";
import { BROADCAST_TYPES } from "@/lib/broadcast/types";
import { safeInternalPath } from "@/lib/server/sanitize";

const ICON: Record<string, string> = Object.fromEntries(BROADCAST_TYPES.map((t) => [t.id, t.icon]));
const ACCENT: Record<string, string> = {
  urgent: "var(--danger)", alert: "#F59E0B", announcement: "var(--accent)",
  reminder: "var(--accent-light)", news: "var(--success)", admin_message: "var(--gold)",
};

export default function BroadcastHost() {
  const [queue, setQueue] = useState<ActiveBroadcast[]>([]);

  /* إعادة استخدام محرّك الإشعار: التسليم عبر نقله + تسجيل حدث دورة الحياة */
  const deliverViaEngine = (b: ActiveBroadcast) => {
    import("@/lib/notifications").then(({ InAppTransport }) => {
      InAppTransport.deliver({ id: b.id, type: "duwairbAdvice", title: b.title, body: b.body, targetPage: b.targetPage ?? undefined });
    }).catch(() => {});
    import("@/lib/events").then(({ emit }) => {
      emit({ eventType: "NotificationDelivered", source: "system", actor: { kind: "system" }, metadata: { notificationId: b.id } });
    }).catch(() => {});
  };

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const active = await fetchActiveBroadcasts();
      if (!alive || active.length === 0) return;
      const seen = loadSeen();
      const fresh = active.filter((b) => !seen.has(b.id));
      if (fresh.length === 0) return;
      markSeen(fresh.map((b) => b.id));
      for (const b of fresh) { deliverViaEngine(b); reportBroadcast(b.id, "delivered"); }
      setQueue(fresh.slice(0, 3)); // نعرض حتى 3 دفعةً
    }, 2500); // بعد استقرار التحميل والمصادقة
    return () => { alive = false; clearTimeout(t); };
  }, []);

  const close = (b: ActiveBroadcast, opened: boolean) => {
    reportBroadcast(b.id, opened ? "opened" : "dismissed");
    import("@/lib/events").then(({ emit }) =>
      emit({ eventType: opened ? "NotificationOpened" : "NotificationDismissed", source: "ui", actor: { kind: "student" }, metadata: { notificationId: b.id } })
    ).catch(() => {});
    setQueue((q) => q.filter((x) => x.id !== b.id));
    /* M-2: لا ننتقل إلا لمسار داخلي آمن (يبدأ بـ«/»، بلا scheme/host خارجي) */
    if (opened) {
      const dest = safeInternalPath(b.targetPage);
      if (dest) { try { window.location.assign(dest); } catch { /* ignore */ } }
    }
  };

  if (queue.length === 0) return null;

  return (
    <div className="fixed z-[9990] bottom-4 inset-x-0 px-4 flex flex-col items-center gap-2 pointer-events-none">
      {queue.map((b) => {
        const accent = ACCENT[b.type] ?? "var(--accent)";
        return (
          <div key={b.id} className="pointer-events-auto w-full max-w-sm rounded-2xl p-3.5 flex items-start gap-3 shadow-lg fade-in"
            style={{ background: "var(--surface)", border: `1.5px solid ${accent}`, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
            <span className="text-[23px] flex-shrink-0">{ICON[b.type] ?? "🔔"}</span>
            <button className="flex-1 min-w-0 text-right" onClick={() => close(b, true)}>
              <p className="font-black text-[16px] truncate" style={{ color: "var(--text)" }}>{b.title}</p>
              <p className="text-[14px] leading-relaxed line-clamp-2" style={{ color: "var(--text-dim)" }}>{b.body}</p>
            </button>
            <button onClick={() => close(b, false)} aria-label="إغلاق"
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[15px]"
              style={{ color: "var(--text-muted)", background: "var(--bg)" }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}
