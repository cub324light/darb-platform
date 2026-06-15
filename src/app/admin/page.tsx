"use client";
import { useState } from "react";

type PlanId = "free" | "shaheen" | "anqa";

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
  const [announceBusy, setAnnounceBusy] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState("");
  const [showAnnounce, setShowAnnounce] = useState(true);

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
        body: JSON.stringify({
          mode: "announce",
          password: pass,
          title: announceTitle.trim(),
          content: announceContent.trim(),
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setAnnounceMsg("✅ تم نشر الإعلان بنجاح");
        setAnnounceTitle(""); setAnnounceContent("");
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
          <input
            type="password" value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="كلمة السر..."
            className="w-full rounded-2xl px-5 py-4 text-lg outline-none"
            style={{ background: "var(--surface)", border: "2px solid var(--border)", color: "var(--text)" }}
          />
          {error && (
            <div className="rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", border: "1.5px solid var(--danger)" }}>
              <p className="text-center text-[14px] font-semibold" style={{ color: "var(--danger)" }}>{error}</p>
            </div>
          )}
          {pingMsg && (
            <p className="text-center text-[13px] font-semibold" style={{ color: pingMsg.startsWith("✅") ? "#10B981" : "var(--danger)" }}>{pingMsg}</p>
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
          <div className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
            <input value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)}
              placeholder="عنوان الإعلان..."
              className="w-full rounded-xl px-4 py-3 text-[15px] outline-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
            <textarea value={announceContent} onChange={e => setAnnounceContent(e.target.value)}
              placeholder="محتوى الإعلان..."
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-[15px] outline-none resize-none"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
            <button onClick={postAnnouncement} disabled={announceBusy || !announceTitle.trim() || !announceContent.trim()}
              className="px-6 py-3 rounded-xl font-bold text-white self-start transition"
              style={{ background: "var(--accent)", opacity: (announceBusy || !announceTitle.trim() || !announceContent.trim()) ? 0.5 : 1 }}>
              {announceBusy ? "جاري النشر..." : "نشر الإعلان 📢"}
            </button>
            {announceMsg && (
              <p className="text-[13px] font-semibold" style={{ color: announceMsg.startsWith("✅") ? "var(--success)" : "var(--danger)" }}>
                {announceMsg}
              </p>
            )}
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
    </div>
  );
}
