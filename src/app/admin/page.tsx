"use client";
import { useState } from "react";
import { CHAT_GROUPS, groupName } from "@/lib/groups";

type PlanId = "free" | "shaheen" | "anqa";

interface Announcement {
  id: string;
  title: string;
  content: string;
  groupId: string;
  pinned: boolean;
  createdAt?: { seconds: number };
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  track: string;
  plan: PlanId;
  blocked: boolean;
  streak: number;
  focusMins: number;
  sessions: number;
  silver: number;
  taseesProgress: number;
  tadreebProgress: number;
  school: string;
  region: string;
  city: string;
  phone: string;
  age: string | number;
  studyLevel: string;
  grade: string;
  studyHours: string | number;
  durationDays: number | null;
  blockUntil: number | null;
  joinedAt: { seconds: number } | null;
  lastSeen: { seconds: number } | null;
}

const PLAN_AR: Record<PlanId, string> = { free: "مجاني", shaheen: "شاهين", anqa: "عنقاء" };
const PLAN_CLR: Record<PlanId, string> = { free: "#64748B", shaheen: "#2563EB", anqa: "#F59E0B" };

/* ── تكلفة الذكاء الاصطناعي ── */
interface AiModelUsage { label?: string; requests?: number; promptTokens?: number; completionTokens?: number }
interface AiUsageDay {
  date: string; requests: number; promptTokens: number; completionTokens: number;
  byModel: Record<string, AiModelUsage>;
}

/* تسعير Groq التقريبي — دولار لكل مليون توكن (إدخال/إخراج). قد يتغيّر من Groq. */
const AI_PRICING: { match: string; in: number; out: number }[] = [
  { match: "llama-4-scout", in: 0.11, out: 0.34 },
  { match: "llama-3.3-70b", in: 0.59, out: 0.79 },
];
const AI_PRICING_DEFAULT = { in: 0.5, out: 0.8 };
function modelPrice(label: string) {
  return AI_PRICING.find((p) => label.includes(p.match)) ?? AI_PRICING_DEFAULT;
}
function dayCostUsd(byModel: Record<string, AiModelUsage>): number {
  let usd = 0;
  for (const m of Object.values(byModel)) {
    const pr = modelPrice(m.label ?? "");
    usd += ((m.promptTokens ?? 0) / 1e6) * pr.in + ((m.completionTokens ?? 0) / 1e6) * pr.out;
  }
  return usd;
}
function fmtTokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function fmtUsd(n: number): string {
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

/* ── انتحال العرض (قراءة فقط) ── */
interface ImpView {
  name: string; email: string;
  user: Record<string, unknown>;
  stats: { silver?: number; totalFocusMins?: number; sessionsCount?: number; sessionDays?: string[] };
  vault: { question?: string; subject?: string; category?: string }[];
  cards: unknown[];
  lessons: { subject?: string; title?: string }[];
  results: { exam?: string; score?: string; date?: string }[];
}

function fmt(ts?: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("ar-SA", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtHours(mins: number): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}س${m > 0 ? ` ${m}د` : ""}` : `${m}د`;
}

function fmtDuration(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "اليوم";
  if (days < 7) return `${days} أيام`;
  if (days < 30) return `${Math.floor(days / 7)} أسابيع`;
  if (days < 365) return `${Math.floor(days / 30)} شهر`;
  return `${Math.floor(days / 365)} سنة`;
}

function ProgressCell({ pct }: { pct: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "#10B981" : "var(--accent)" }} />
      </div>
      <span className="text-[11px] font-mono-nums" style={{ color: pct > 0 ? "var(--text-dim)" : "var(--text-muted)" }}>{pct}%</span>
    </div>
  );
}

export default function AdminPage() {
  const [pass, setPass]       = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authed, setAuthed]   = useState(false);
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [pingMsg, setPingMsg] = useState("");
  const [pinging, setPinging] = useState(false);
  const [detail, setDetail]   = useState<AdminUser | null>(null);

  const callApi = async (mode?: string) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass, mode }),
    });
    /* نقرأ النص أولاً: لو الرد ليس JSON (صفحة خطأ من Vercel عند الانهيار
       أو تجاوز الوقت) نُظهر الكود الحقيقي بدل «خطأ في الاتصال» المبهم */
    const raw = await res.text();
    let data: Record<string, unknown>;
    try {
      data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      const snippet = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
      data = { error: `استجابة غير متوقعة (HTTP ${res.status})${snippet ? `: ${snippet}` : ""}` };
    }
    return { ok: res.ok, data };
  };

  const login = async () => {
    if (!pass.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const { ok, data } = await callApi();
      if (!ok) { setError(data.error as string ?? "حدث خطأ"); return; }
      setUsers((data.users as AdminUser[]) ?? []);
      setAuthed(true);
      loadAnnouncements();
    } catch (e) { setError(`تعذّر الوصول للخادم: ${e instanceof Error ? e.message : "تحقّق من الإنترنت"}`); }
    finally { setLoading(false); }
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const { ok, data } = await callApi();
      if (ok) setUsers((data.users as AdminUser[]) ?? []);
    } catch { /* تجاهل */ }
    finally { setRefreshing(false); }
  };

  const ping = async () => {
    if (!pass.trim() || pinging) return;
    setPinging(true); setPingMsg("");
    try {
      const { ok, data } = await callApi("ping");
      setPingMsg(ok ? `✅ ${data.msg}` : `❌ ${data.msg ?? data.error}`);
    } catch { setPingMsg("❌ خطأ في الاتصال"); }
    finally { setPinging(false); }
  };

  /* ── إجراءات المستخدم: تعيين باقة / إيقاف ── */
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg]   = useState("");

  /* ── قسم الإعلانات الرسمية ── */
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceContent, setAnnounceContent] = useState("");
  const [announceGroup, setAnnounceGroup] = useState("all");
  const [announcePinned, setAnnouncePinned] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [announceBusy, setAnnounceBusy] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState("");
  const [showAnnounce, setShowAnnounce] = useState(true);
  const [annList, setAnnList] = useState<Announcement[]>([]);

  /* ── تكلفة الذكاء الاصطناعي ── */
  const [aiDays, setAiDays] = useState<AiUsageDay[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [aiLoaded, setAiLoaded] = useState(false);

  const loadAiUsage = async () => {
    setAiLoading(true); setAiErr("");
    try {
      const { ok, data } = await callApi("aiUsage");
      if (ok) { setAiDays((data.days as AiUsageDay[]) ?? []); setAiLoaded(true); }
      else setAiErr((data.error as string) ?? "تعذّر الجلب");
    } catch { setAiErr("خطأ في الاتصال"); }
    finally { setAiLoading(false); }
  };

  const toggleAi = () => {
    const next = !showAi;
    setShowAi(next);
    if (next && !aiLoaded) loadAiUsage();
  };

  /* ── انتحال العرض (قراءة فقط للدعم) ── */
  const [impData, setImpData] = useState<ImpView | null>(null);
  const [impLoading, setImpLoading] = useState(false);

  const openImpersonate = async (u: AdminUser) => {
    setImpLoading(true); setImpData(null);
    try {
      const { ok, data } = await callAction("getUserData", { uid: u.id });
      if (ok) {
        const backup = (data.backup ?? {}) as Record<string, string>;
        function pick<T>(k: string, fb: T): T {
          try { return backup[k] ? (JSON.parse(backup[k]) as T) : fb; } catch { return fb; }
        }
        setImpData({
          name: u.name,
          email: (data.email as string) ?? u.email,
          user: pick("darb_user", {} as Record<string, unknown>),
          stats: pick("darb_stats", {}),
          vault: pick("darb_vault", []),
          cards: pick("darb_cards", []),
          lessons: pick("darb_lessons", []),
          results: pick("darb_results", []),
        });
      } else setActionMsg(`❌ ${data.error ?? "تعذّر جلب البيانات"}`);
    } catch { setActionMsg("❌ خطأ في الاتصال"); }
    finally { setImpLoading(false); }
  };

  /* جلب الإعلانات السابقة (قراءة عامة، بلا كلمة سر) */
  const loadAnnouncements = async () => {
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "getAnnouncements" }),
      });
      const data = await res.json() as { announcements?: Announcement[] };
      setAnnList(data.announcements ?? []);
    } catch { /* تجاهل */ }
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setAnnounceTitle(a.title);
    setAnnounceContent(a.content);
    setAnnounceGroup(a.groupId || "all");
    setAnnouncePinned(a.pinned);
    setAnnounceMsg("");
    setShowAnnounce(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAnnounceTitle(""); setAnnounceContent("");
    setAnnounceGroup("all"); setAnnouncePinned(false);
    setAnnounceMsg("");
  };

  const togglePin = async (a: Announcement) => {
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pinAnnouncement", password: pass, id: a.id, pinned: !a.pinned }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) loadAnnouncements();
      else setAnnounceMsg(`❌ ${data.error ?? "تعذّر التثبيت"}`);
    } catch { setAnnounceMsg("❌ خطأ في الاتصال"); }
  };

  const deleteAnnouncement = async (a: Announcement) => {
    if (!confirm(`حذف الإعلان «${a.title}»؟`)) return;
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "deleteAnnouncement", password: pass, id: a.id }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) { if (editingId === a.id) cancelEdit(); loadAnnouncements(); }
      else setAnnounceMsg(`❌ ${data.error ?? "تعذّر الحذف"}`);
    } catch { setAnnounceMsg("❌ خطأ في الاتصال"); }
  };

  const callAction = async (mode: string, extra: Record<string, unknown>) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass, mode, ...extra }),
    });
    return { ok: res.ok, data: (await res.json()) as Record<string, unknown> };
  };

  const applyLocal = (uid: string, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === uid ? { ...u, ...patch } : u)));
    setDetail((prev) => (prev && prev.id === uid ? { ...prev, ...patch } : prev));
  };

  const setUserPlan = async (uid: string, plan: PlanId) => {
    setActionBusy(true); setActionMsg("");
    try {
      const { ok, data } = await callAction("setPlan", { uid, plan });
      if (ok) { applyLocal(uid, { plan }); setActionMsg(`✅ تم تعيين باقة «${PLAN_AR[plan]}»`); }
      else setActionMsg(`❌ ${data.error ?? "تعذّر التعيين"}`);
    } catch { setActionMsg("❌ خطأ في الاتصال"); }
    finally { setActionBusy(false); }
  };

  const toggleBlock = async (uid: string, blocked: boolean) => {
    setActionBusy(true); setActionMsg("");
    try {
      const { ok, data } = await callAction("setBlocked", { uid, blocked });
      if (ok) { applyLocal(uid, { blocked, blockUntil: null }); setActionMsg(blocked ? "🚫 تم إيقاف المستخدم" : "✅ تم تفعيل المستخدم"); }
      else setActionMsg(`❌ ${data.error ?? "تعذّر التحديث"}`);
    } catch { setActionMsg("❌ خطأ في الاتصال"); }
    finally { setActionBusy(false); }
  };

  const timedBlock = async (uid: string, durationHours: number) => {
    setActionBusy(true); setActionMsg("");
    try {
      const { ok, data } = await callAction("setBlockedUntil", { uid, durationHours });
      if (ok) {
        const blockUntil = (data as { blockUntil?: number | null }).blockUntil ?? null;
        applyLocal(uid, { blocked: true, blockUntil });
        setActionMsg(durationHours === 0 ? "🚫 تم الإيقاف الدائم" : `🚫 موقوف لمدة ${durationHours < 24 ? `${durationHours}س` : `${Math.round(durationHours / 24)} يوم`}`);
      } else setActionMsg(`❌ ${(data as Record<string,string>).error ?? "تعذّر الإيقاف"}`);
    } catch { setActionMsg("❌ خطأ في الاتصال"); }
    finally { setActionBusy(false); }
  };

  const postAnnouncement = async () => {
    if (!announceTitle.trim() || !announceContent.trim()) return;
    setAnnounceBusy(true); setAnnounceMsg("");
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? {
          mode: "editAnnouncement",
          password: pass,
          id: editingId,
          title: announceTitle.trim(),
          content: announceContent.trim(),
          groupId: announceGroup,
        } : {
          mode: "announce",
          password: pass,
          title: announceTitle.trim(),
          content: announceContent.trim(),
          groupId: announceGroup,
          pinned: announcePinned,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setAnnounceMsg(editingId ? "✅ تم تعديل الإعلان" : "✅ تم نشر الإعلان بنجاح");
        setEditingId(null);
        setAnnounceTitle(""); setAnnounceContent("");
        setAnnounceGroup("all"); setAnnouncePinned(false);
        loadAnnouncements();
      } else {
        setAnnounceMsg(`❌ ${data.error ?? "تعذّر النشر"}`);
      }
    } catch { setAnnounceMsg("❌ خطأ في الاتصال"); }
    finally { setAnnounceBusy(false); }
  };

  /* تصدير كل المستخدمين إلى ملف CSV (يفتح في Excel) */
  const exportCsv = () => {
    const cols: { key: keyof AdminUser; label: string }[] = [
      { key: "name", label: "الاسم" },
      { key: "email", label: "الإيميل" },
      { key: "phone", label: "الجوال" },
      { key: "track", label: "المسار" },
      { key: "region", label: "المنطقة" },
      { key: "city", label: "المدينة" },
      { key: "school", label: "المدرسة" },
      { key: "age", label: "العمر" },
      { key: "studyLevel", label: "المرحلة" },
      { key: "grade", label: "الصف" },
      { key: "studyHours", label: "ساعات المذاكرة" },
      { key: "streak", label: "ستريك" },
      { key: "focusMins", label: "دقائق التركيز" },
      { key: "sessions", label: "الجلسات" },
      { key: "silver", label: "الفضة" },
      { key: "taseesProgress", label: "نسبة التأسيس" },
      { key: "tadreebProgress", label: "نسبة التدريب" },
      { key: "durationDays", label: "مدة الاستخدام (أيام)" },
    ];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.map((c) => c.label);
    const rows = users.map((u) => [
      ...cols.map((c) => esc(u[c.key])),
      esc(fmt(u.joinedAt)),
      esc(fmt(u.lastSeen)),
    ]);
    const csv = [
      [...header, "تاريخ الدخول", "آخر نشاط"].join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    /* BOM لضمان قراءة العربية في Excel */
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `darb-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = users.filter((u) =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.track?.includes(search) ||
    u.region?.includes(search) ||
    u.city?.includes(search) ||
    u.school?.includes(search)
  );

  /* إحصاءات سريعة */
  const withEmail = users.filter((u) => u.email).length;
  const paidCount = users.filter((u) => u.plan !== "free").length;
  const avgDuration = (() => {
    const ds = users.map((u) => u.durationDays ?? 0).filter((d) => d > 0);
    return ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0;
  })();

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm flex flex-col gap-4 scale-in">
          <p className="font-black text-5xl text-center mb-1 text-[var(--accent-light)]"
            style={{ filter: "drop-shadow(0 0 22px color-mix(in srgb, var(--accent) 40%, transparent))" }}>
            درب
          </p>
          <p className="title-md text-center" style={{ color: "var(--text)" }}>لوحة الإدارة</p>
          <div className="relative w-full">
            <input
              type={showPass ? "text" : "password"} value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="كلمة السر..."
              className="w-full rounded-2xl px-5 py-4 text-lg outline-none"
              style={{ background: "var(--surface)", border: "2px solid var(--border)", color: "var(--text)", paddingLeft: "52px" }}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5"
              style={{ color: "var(--text-muted)" }}
              tabIndex={-1}
              aria-label={showPass ? "إخفاء" : "إظهار"}
            >
              {showPass ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {error && (
            <div className="rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", border: "1.5px solid var(--danger)" }}>
              <p className="text-center text-[14px] font-semibold" style={{ color: "var(--danger)", whiteSpace: "pre-line", wordBreak: "break-word" }}>{error}</p>
            </div>
          )}
          {pingMsg && (
            <div className="rounded-xl px-4 py-3 text-right" dir="rtl"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <p className="text-[12.5px] font-semibold leading-relaxed"
                style={{ color: pingMsg.startsWith("✅") ? "#10B981" : "var(--danger)", whiteSpace: "pre-line", wordBreak: "break-word" }}>
                {pingMsg}
              </p>
            </div>
          )}
          <button onClick={login} disabled={loading} className="btn-primary" style={{ opacity: loading ? 0.5 : 1 }}>
            {loading ? "جاري التحقق..." : "دخول"}
          </button>
          <button onClick={ping} disabled={pinging || !pass.trim()}
            className="text-[14px] text-center py-2 font-semibold"
            style={{ color: "var(--text-muted)", opacity: pass.trim() ? 1 : 0.5 }}>
            {pinging ? "يتحقق..." : "تشخيص اتصال Firebase"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-4 py-6" style={{ background: "var(--bg)" }}>
      {/* الهيدر */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="title-md" style={{ color: "var(--text)" }}>لوحة الإدارة</p>
          <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>{users.length} مستخدم مسجّل</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم، إيميل، مسار، منطقة..."
            className="rounded-2xl px-4 py-3 text-[15px] outline-none"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)", width: "240px" }}
          />
          <button onClick={refresh} disabled={refreshing}
            className="rounded-2xl px-4 py-3 text-[14px] font-bold transition active:scale-[0.97]"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-dim)", opacity: refreshing ? 0.5 : 1 }}>
            {refreshing ? "..." : "↻ تحديث"}
          </button>
          <button onClick={exportCsv} disabled={!users.length}
            className="rounded-2xl px-4 py-3 text-[14px] font-bold transition active:scale-[0.97] text-white"
            style={{ background: "var(--accent)", opacity: users.length ? 1 : 0.5 }}>
            ⬇ تصدير CSV
          </button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "إجمالي المستخدمين",  val: users.length },
          { label: "مشتركين مدفوع",       val: paidCount },
          { label: "لديهم إيميل",         val: withEmail },
          { label: "متوسط مدة الاستخدام", val: fmtDuration(avgDuration || null) },
          { label: "مسار تحصيلي",          val: users.filter((u) => u.track === "تحصيلي").length },
          { label: "مسار قدرات",           val: users.filter((u) => u.track === "قدرات").length },
          { label: "مسار CPC",             val: users.filter((u) => u.track === "CPC").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="font-black text-2xl" style={{ color: "var(--accent-light)" }}>{s.val}</p>
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* قسم الإعلانات الرسمية */}
      <div className="max-w-7xl mx-auto mb-6">
        <button onClick={() => setShowAnnounce(v => !v)}
          className="flex items-center gap-2 mb-3 font-black text-[15px]"
          style={{ color: "var(--text)" }}>
          📢 الإعلانات الرسمية
          <span style={{ color: "var(--text-muted)" }}>{showAnnounce ? "▲" : "▼"}</span>
        </button>

        {showAnnounce && (
          <div className="flex flex-col gap-4">
            {/* نموذج النشر / التعديل */}
            <div className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: "var(--surface)", border: editingId ? "1.5px solid var(--accent)" : "1.5px solid var(--border)" }}>
              {editingId && (
                <p className="text-[13px] font-bold" style={{ color: "var(--accent-light)" }}>✏️ تعديل إعلان</p>
              )}
              <input value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)}
                placeholder="عنوان الإعلان..."
                className="w-full rounded-xl px-4 py-3 text-[15px] outline-none"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
              <textarea value={announceContent} onChange={e => setAnnounceContent(e.target.value)}
                placeholder="محتوى الإعلان..."
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-[15px] outline-none resize-none"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />

              {/* اختيار القروب + التثبيت */}
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-dim)" }}>
                  القروب:
                  <select value={announceGroup} onChange={e => setAnnounceGroup(e.target.value)}
                    className="rounded-xl px-3 py-2 text-[14px] outline-none"
                    style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
                    <option value="all">📣 الكل (يظهر بكل القروبات)</option>
                    {CHAT_GROUPS.map(g => (
                      <option key={g.id} value={g.id}>{g.icon} {g.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-[14px] font-semibold cursor-pointer" style={{ color: "var(--text-dim)" }}>
                  <input type="checkbox" checked={announcePinned} onChange={e => setAnnouncePinned(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "var(--gold)" }} />
                  📌 تثبيت
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={postAnnouncement} disabled={announceBusy || !announceTitle.trim() || !announceContent.trim()}
                  className="px-6 py-3 rounded-xl font-bold text-white transition"
                  style={{ background: "var(--accent)", opacity: (announceBusy || !announceTitle.trim() || !announceContent.trim()) ? 0.5 : 1 }}>
                  {announceBusy ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل ✓" : "نشر الإعلان 📢"}
                </button>
                {editingId && (
                  <button onClick={cancelEdit}
                    className="px-4 py-3 rounded-xl font-bold transition"
                    style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-dim)" }}>
                    إلغاء
                  </button>
                )}
              </div>
              {announceMsg && (
                <p className="text-[13px] font-semibold" style={{ color: announceMsg.startsWith("✅") ? "var(--success)" : "var(--danger)" }}>
                  {announceMsg}
                </p>
              )}
            </div>

            {/* قائمة الإعلانات السابقة */}
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>
                الإعلانات المنشورة ({annList.length})
              </p>
              {annList.length === 0 ? (
                <p className="text-[13px] py-4 text-center" style={{ color: "var(--text-muted)" }}>لا توجد إعلانات بعد</p>
              ) : annList.map(a => (
                <div key={a.id} className="rounded-2xl p-4 flex flex-col gap-2"
                  style={{ background: "var(--surface)", border: a.pinned ? "1.5px solid var(--gold)" : "1px solid var(--border)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                        {a.pinned && <span title="مثبّت">📌</span>}
                        <span className="truncate">{a.title}</span>
                      </p>
                      <p className="text-[13px] mt-1 whitespace-pre-wrap" style={{ color: "var(--text-dim)" }}>{a.content}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                      {groupName(a.groupId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => togglePin(a)}
                      className="text-[12px] font-bold px-3 py-1.5 rounded-lg transition"
                      style={{ background: "color-mix(in srgb, var(--gold) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--gold) 40%, var(--border))", color: "var(--gold)" }}>
                      {a.pinned ? "إلغاء التثبيت" : "📌 تثبيت"}
                    </button>
                    <button onClick={() => startEdit(a)}
                      className="text-[12px] font-bold px-3 py-1.5 rounded-lg transition"
                      style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))", color: "var(--accent-light)" }}>
                      ✏️ تعديل
                    </button>
                    <button onClick={() => deleteAnnouncement(a)}
                      className="text-[12px] font-bold px-3 py-1.5 rounded-lg transition"
                      style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
                      🗑 حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* تكلفة الذكاء الاصطناعي */}
      <div className="max-w-7xl mx-auto mb-6">
        <button onClick={toggleAi}
          className="flex items-center gap-2 mb-3 font-black text-[15px]"
          style={{ color: "var(--text)" }}>
          🤖 تكلفة الذكاء الاصطناعي
          <span style={{ color: "var(--text-muted)" }}>{showAi ? "▲" : "▼"}</span>
        </button>

        {showAi && (
          <div className="flex flex-col gap-4">
            {aiLoading && <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>جارٍ الجلب...</p>}
            {aiErr && <p className="text-[13px] font-semibold" style={{ color: "var(--danger)" }}>❌ {aiErr}</p>}

            {aiLoaded && !aiErr && (() => {
              const t = aiDays.reduce(
                (a, d) => ({
                  requests: a.requests + d.requests,
                  prompt: a.prompt + d.promptTokens,
                  completion: a.completion + d.completionTokens,
                  usd: a.usd + dayCostUsd(d.byModel),
                }),
                { requests: 0, prompt: 0, completion: 0, usd: 0 },
              );
              if (aiDays.length === 0) {
                return <p className="text-[13px] py-4 text-center" style={{ color: "var(--text-muted)" }}>لا يوجد استهلاك مسجّل بعد — استخدم دويرب ثم حدّث.</p>;
              }
              return (
                <>
                  {/* الإجماليات */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: `التكلفة (آخر ${aiDays.length} يوم)`, val: fmtUsd(t.usd), gold: true },
                      { label: "إجمالي الطلبات", val: String(t.requests) },
                      { label: "توكنز الإدخال", val: fmtTokens(t.prompt) },
                      { label: "توكنز الإخراج", val: fmtTokens(t.completion) },
                    ].map((s) => (
                      <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-1"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <p className="font-black text-2xl" style={{ color: s.gold ? "var(--gold)" : "var(--accent-light)" }}>{s.val}</p>
                        <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* تفصيل يومي */}
                  <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="grid text-[12px] font-bold px-4 py-2.5"
                      style={{ gridTemplateColumns: "100px 80px 90px 90px 90px", background: "var(--surface2)", color: "var(--text-muted)" }}>
                      <span>اليوم</span>
                      <span className="text-center">طلبات</span>
                      <span className="text-center">إدخال</span>
                      <span className="text-center">إخراج</span>
                      <span className="text-center">تكلفة</span>
                    </div>
                    {aiDays.map((d, i) => (
                      <div key={d.date} className="grid items-center px-4 py-2.5 text-[12px]"
                        style={{ gridTemplateColumns: "100px 80px 90px 90px 90px", borderTop: i > 0 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--surface)" : "var(--bg)" }}>
                        <span className="font-mono-nums" style={{ color: "var(--text-dim)" }}>{d.date}</span>
                        <span className="text-center" style={{ color: "var(--text-dim)" }}>{d.requests}</span>
                        <span className="text-center" style={{ color: "var(--text-muted)" }}>{fmtTokens(d.promptTokens)}</span>
                        <span className="text-center" style={{ color: "var(--text-muted)" }}>{fmtTokens(d.completionTokens)}</span>
                        <span className="text-center font-bold" style={{ color: "var(--gold)" }}>{fmtUsd(dayCostUsd(d.byModel))}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    التكلفة تقديرية حسب تسعير Groq المعلن (قد يتغيّر). يشمل دويرب: الجداول، الشرح، الأسئلة، استخراج المواضيع.
                  </p>
                  <button onClick={loadAiUsage} disabled={aiLoading}
                    className="self-start rounded-xl px-4 py-2 text-[13px] font-bold"
                    style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-dim)", opacity: aiLoading ? 0.5 : 1 }}>
                    ↻ تحديث
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* الجدول */}
      <div className="max-w-7xl mx-auto rounded-2xl overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
        <div style={{ minWidth: "1300px" }}>
          {/* رأس الجدول */}
          <div className="grid text-[12px] font-bold px-4 py-3"
            style={{
              gridTemplateColumns: "160px 180px 80px 70px 60px 70px 70px 70px 70px 80px 100px 100px",
              background: "var(--surface2)", color: "var(--text-muted)",
            }}>
            <span>الاسم</span>
            <span>الإيميل</span>
            <span className="text-center">المسار</span>
            <span className="text-center">المنطقة</span>
            <span className="text-center">ستريك</span>
            <span className="text-center">تركيز</span>
            <span className="text-center">جلسات</span>
            <span className="text-center">تأسيس</span>
            <span className="text-center">تدريب</span>
            <span className="text-center">مدة الاستخدام</span>
            <span className="text-center">تاريخ الدخول</span>
            <span className="text-center">آخر نشاط</span>
          </div>

          {/* الصفوف */}
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[15px]" style={{ color: "var(--text-muted)" }}>لا يوجد مستخدمون</div>
          ) : filtered.map((u, i) => (
            <div key={u.id}
              onClick={() => { setDetail(u); setActionMsg(""); }}
              className="grid items-center px-4 py-3 text-[12px] cursor-pointer transition hover:brightness-110"
              style={{
                gridTemplateColumns: "160px 180px 80px 70px 60px 70px 70px 70px 70px 80px 100px 100px",
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
                background: u.blocked ? "color-mix(in srgb, var(--danger) 7%, var(--surface))" : i % 2 === 0 ? "var(--surface)" : "var(--bg)",
                opacity: u.blocked ? 0.75 : 1,
              }}>

              {/* الاسم + المعلومات الإضافية */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="flex items-center gap-1.5 min-w-0">
                  {u.plan !== "free" && (
                    <span className="flex-shrink-0" style={{ color: PLAN_CLR[u.plan] }} title={PLAN_AR[u.plan]}>✦</span>
                  )}
                  {u.blocked && <span className="flex-shrink-0" title="موقوف">🚫</span>}
                  <span className="font-bold truncate" style={{ color: "var(--text)" }}>{u.name || "—"}</span>
                </span>
                {(u.school || u.city || u.phone) && (
                  <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                    {[u.school, u.city, u.phone].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>

              {/* الإيميل */}
              <span className="truncate text-[11px]" style={{ color: u.email ? "var(--text-dim)" : "var(--text-muted)" }}
                title={u.email || ""}>
                {u.email || "—"}
              </span>

              {/* المسار */}
              <span className="text-center">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                  {u.track || "—"}
                </span>
              </span>

              {/* المنطقة */}
              <span className="text-center text-[11px]" style={{ color: "var(--text-muted)" }}>{u.region || u.city || "—"}</span>

              {/* ستريك */}
              <span className="text-center font-bold" style={{ color: u.streak > 0 ? "var(--gold)" : "var(--text-muted)" }}>
                {u.streak > 0 ? u.streak : "—"}
              </span>

              {/* تركيز */}
              <span className="text-center" style={{ color: "var(--text-dim)" }}>{fmtHours(u.focusMins)}</span>

              {/* جلسات */}
              <span className="text-center" style={{ color: "var(--text-dim)" }}>{u.sessions || "—"}</span>

              {/* تأسيس */}
              <span className="flex justify-center"><ProgressCell pct={u.taseesProgress} /></span>

              {/* تدريب */}
              <span className="flex justify-center"><ProgressCell pct={u.tadreebProgress} /></span>

              {/* مدة الاستخدام */}
              <span className="text-center font-semibold"
                style={{ color: (u.durationDays ?? 0) > 30 ? "var(--accent-light)" : "var(--text-muted)" }}>
                {fmtDuration(u.durationDays)}
              </span>

              {/* تاريخ الدخول */}
              <span className="text-center text-[11px]" style={{ color: "var(--text-muted)" }}>{fmt(u.joinedAt)}</span>

              {/* آخر نشاط */}
              <span className="text-center text-[11px]" style={{ color: "var(--text-muted)" }}>{fmt(u.lastSeen)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[13px] mt-6" style={{ color: "var(--text-muted)" }}>
        /admin — للإدارة فقط
      </p>

      {/* تفاصيل مستخدم */}
      {detail && (
        <div className="fixed inset-0 z-[9999] flex p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className="relative m-auto w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-3xl p-6 flex flex-col gap-4"
            style={{ background: "var(--bg)", border: "1.5px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-black text-xl truncate" style={{ color: "var(--text)" }}>{detail.name || "بدون اسم"}</p>
                {detail.blocked && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "color-mix(in srgb, var(--danger) 16%, transparent)", color: "var(--danger)" }}>موقوف</span>
                )}
              </div>
              <button onClick={() => setDetail(null)} className="text-2xl font-bold px-2" style={{ color: "var(--text-muted)" }}>×</button>
            </div>

            {/* انتحال العرض — قراءة فقط */}
            <button onClick={() => openImpersonate(detail)} disabled={impLoading}
              className="rounded-xl px-4 py-2.5 text-[13px] font-bold transition active:scale-[0.98]"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid color-mix(in srgb, var(--accent) 40%, var(--border))", color: "var(--accent-light)", opacity: impLoading ? 0.5 : 1 }}>
              {impLoading ? "جارٍ الفتح..." : "👁 عرض كالطالب (قراءة فقط)"}
            </button>

            {/* ── الإجراءات: الباقة والإيقاف ── */}
            <div className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <p className="text-[12px] font-black" style={{ color: "var(--text-muted)" }}>الباقة</p>
              <div className="grid grid-cols-3 gap-2">
                {(["free", "shaheen", "anqa"] as PlanId[]).map((p) => {
                  const active = detail.plan === p;
                  return (
                    <button key={p} onClick={() => !active && !actionBusy && setUserPlan(detail.id, p)}
                      disabled={actionBusy}
                      className="py-2.5 rounded-xl text-[13px] font-bold transition disabled:opacity-60"
                      style={active
                        ? { background: PLAN_CLR[p], color: p === "anqa" ? "#1A1205" : "white", border: `1.5px solid ${PLAN_CLR[p]}` }
                        : { background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-dim)" }}>
                      {PLAN_AR[p]}{active ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>

              <p className="text-[12px] font-black mt-1" style={{ color: "var(--text-muted)" }}>الإيقاف</p>
              {detail.blocked && (
                <div className="rounded-xl px-3 py-2 text-[13px] font-bold" style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
                  {detail.blockUntil ? `موقوف حتى ${new Date(detail.blockUntil).toLocaleDateString("ar-SA")}` : "موقوف بشكل دائم"}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: "ساعة", hours: 1 },
                  { label: "٢٤ ساعة", hours: 24 },
                  { label: "٧ أيام", hours: 168 },
                  { label: "٣٠ يوماً", hours: 720 },
                  { label: "دائم", hours: 0 },
                ] as { label: string; hours: number }[]).map(({ label, hours }) => (
                  <button key={label} onClick={() => !actionBusy && timedBlock(detail.id, hours)}
                    disabled={actionBusy}
                    className="py-2 rounded-xl text-[12px] font-bold transition disabled:opacity-50"
                    style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1.5px solid var(--danger)", color: "var(--danger)" }}>
                    {label}
                  </button>
                ))}
                <button onClick={() => !actionBusy && toggleBlock(detail.id, false)}
                  disabled={actionBusy || !detail.blocked}
                  className="py-2 rounded-xl text-[12px] font-bold transition disabled:opacity-40"
                  style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1.5px solid var(--success)", color: "var(--success)" }}>
                  رفع الإيقاف
                </button>
              </div>

              {actionMsg && (
                <p className="text-[13px] font-bold text-center" style={{ color: "var(--text-dim)" }}>{actionMsg}</p>
              )}
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                التغييرات تُطبَّق على جهاز المستخدم عند فتحه التطبيق في المرة القادمة.
              </p>
            </div>

            {/* إعادة تعيين وحذف */}
            <div className="rounded-2xl p-4 flex flex-col gap-3 mt-2"
              style={{ background: "color-mix(in srgb, var(--danger) 6%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--danger) 30%, var(--border))" }}>
              <p className="text-[12px] font-black" style={{ color: "var(--danger)" }}>⚠️ منطقة خطر</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (!window.confirm(`إعادة تعيين كل تقدم ${detail.name}؟ (الحساب يبقى)`)) return;
                    void callAction("resetUser", { uid: detail.id });
                  }}
                  disabled={actionBusy}
                  className="py-2.5 rounded-xl text-[13px] font-bold transition disabled:opacity-50"
                  style={{ background: "color-mix(in srgb, #F59E0B 12%, transparent)", border: "1.5px solid #F59E0B", color: "#F59E0B" }}>
                  🔄 إعادة تعيين
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm(`حذف ${detail.name} نهائياً؟ لا يمكن التراجع!`)) return;
                    void callAction("deleteUser", { uid: detail.id }).then(() => setDetail(null));
                  }}
                  disabled={actionBusy}
                  className="py-2.5 rounded-xl text-[13px] font-bold transition disabled:opacity-50"
                  style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", border: "1.5px solid var(--danger)", color: "var(--danger)" }}>
                  🗑 حذف نهائي
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {([
                ["الإيميل", detail.email || "—"],
                ["الجوال", detail.phone || "—"],
                ["المسار", detail.track || "—"],
                ["المنطقة", detail.region || "—"],
                ["المدينة", detail.city || "—"],
                ["المدرسة", detail.school || "—"],
                ["العمر", detail.age ? String(detail.age) : "—"],
                ["المرحلة", detail.studyLevel || "—"],
                ["الصف", detail.grade || "—"],
                ["ساعات المذاكرة باليوم", detail.studyHours ? String(detail.studyHours) : "—"],
                ["ستريك", detail.streak ? `${detail.streak} يوم` : "—"],
                ["دقائق التركيز", fmtHours(detail.focusMins)],
                ["الجلسات", String(detail.sessions || 0)],
                ["الفضة", String(detail.silver || 0)],
                ["نسبة التأسيس", `${detail.taseesProgress}%`],
                ["نسبة التدريب", `${detail.tadreebProgress}%`],
                ["مدة الاستخدام", fmtDuration(detail.durationDays)],
                ["تاريخ التسجيل", fmt(detail.joinedAt)],
                ["آخر نشاط", fmt(detail.lastSeen)],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span className="text-[14px] font-semibold text-left" style={{ color: "var(--text)" }} dir="auto">{val}</span>
                </div>
              ))}
              <p className="text-[10px] mt-1 font-mono-nums" style={{ color: "var(--text-muted)" }}>ID: {detail.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* انتحال العرض — نسخة الطالب كما يراها (قراءة فقط) */}
      {impData && (
        <div className="fixed inset-0 z-[10000] flex p-4"
          style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setImpData(null)}>
          <div className="relative m-auto w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl p-6 flex flex-col gap-4"
            style={{ background: "var(--bg)", border: "1.5px solid var(--accent)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>👁 عرض كالطالب</span>
                <p className="font-black text-lg truncate" style={{ color: "var(--text)" }}>{impData.name || "بدون اسم"}</p>
              </div>
              <button onClick={() => setImpData(null)} className="text-2xl font-bold px-2" style={{ color: "var(--text-muted)" }}>×</button>
            </div>

            {/* ملخّص سريع */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "الفضة", val: String(impData.stats.silver ?? 0) },
                { label: "ساعات التركيز", val: fmtHours(impData.stats.totalFocusMins ?? 0) },
                { label: "الجلسات", val: String(impData.stats.sessionsCount ?? 0) },
                { label: "أيام نشطة", val: String(impData.stats.sessionDays?.length ?? 0) },
                { label: "أخطاء الخزنة", val: String(impData.vault.length) },
                { label: "بطاقات المراجعة", val: String(impData.cards.length) },
                { label: "الدروس", val: String(impData.lessons.length) },
                { label: "النتائج", val: String(impData.results.length) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 flex flex-col gap-0.5"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="font-black text-xl" style={{ color: "var(--accent-light)" }}>{s.val}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* الملف الشخصي */}
            <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[12px] font-black" style={{ color: "var(--text-muted)" }}>الملف</p>
              {([
                ["الإيميل", impData.email || "—"],
                ["المسار", String(impData.user.track ?? "—")],
                ["المسارات النشطة", Array.isArray(impData.user.activeTracks) ? (impData.user.activeTracks as string[]).join("، ") : "—"],
                ["تاريخ الاختبار", String(impData.user.examDate ?? "—")],
                ["المرحلة", String(impData.user.studyLevel ?? "—")],
                ["الصف", String(impData.user.grade ?? "—")],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 text-[13px]">
                  <span style={{ color: "var(--text-muted)" }}>{k}</span>
                  <span className="font-semibold text-left" style={{ color: "var(--text)" }} dir="auto">{v}</span>
                </div>
              ))}
            </div>

            {/* آخر النتائج */}
            {impData.results.length > 0 && (
              <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-[12px] font-black" style={{ color: "var(--text-muted)" }}>النتائج المسجّلة</p>
                {impData.results.slice(0, 8).map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-[13px]">
                    <span style={{ color: "var(--text-dim)" }}>{r.exam || "—"}{r.date ? ` · ${r.date}` : ""}</span>
                    <span className="font-bold" style={{ color: "var(--gold)" }}>{r.score ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}

            {/* آخر أخطاء الخزنة */}
            {impData.vault.length > 0 && (
              <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-[12px] font-black" style={{ color: "var(--text-muted)" }}>آخر أخطاء الخزنة</p>
                {impData.vault.slice(0, 8).map((v, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate" style={{ color: "var(--text-dim)" }}>{v.question || "—"}</span>
                    <span className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>{v.subject || "—"}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              عرض للقراءة فقط من نسخة الطالب السحابية — لا يعدّل أي بيانات.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
