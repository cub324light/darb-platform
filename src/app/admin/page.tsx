"use client";
import { useState } from "react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  track: string;
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
  durationDays: number | null;
  joinedAt: { seconds: number } | null;
  lastSeen: { seconds: number } | null;
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
  const [authed, setAuthed]   = useState(false);
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [pingMsg, setPingMsg] = useState("");
  const [pinging, setPinging] = useState(false);

  const callApi = async (mode?: string) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass, mode }),
    });
    const data = await res.json() as Record<string, unknown>;
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
    } catch { setError("خطأ في الاتصال"); }
    finally { setLoading(false); }
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
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم، إيميل، مسار، منطقة..."
          className="rounded-2xl px-4 py-3 text-[15px] outline-none"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)", width: "260px" }}
        />
      </div>

      {/* الإحصائيات */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "إجمالي المستخدمين",  val: users.length },
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
              className="grid items-center px-4 py-3 text-[12px]"
              style={{
                gridTemplateColumns: "160px 180px 80px 70px 60px 70px 70px 70px 70px 80px 100px 100px",
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
                background: i % 2 === 0 ? "var(--surface)" : "var(--bg)",
              }}>

              {/* الاسم + المعلومات الإضافية */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold truncate" style={{ color: "var(--text)" }}>{u.name || "—"}</span>
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
    </div>
  );
}
