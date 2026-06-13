"use client";
import { useState } from "react";

interface AdminUser {
  id: string;
  name: string;
  track: string;
  streak: number;
  focusMins: number;
  sessions: number;
  silver: number;
  taseesProgress: number;
  tadreebProgress: number;
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
  if (!mins) return "0 د";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}س ${m > 0 ? m + "د" : ""}`.trim() : `${m}د`;
}

function ProgressCell({ pct }: { pct: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
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

  const login = async () => {
    if (!pass.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ");
        return;
      }
      setUsers(data.users ?? []);
      setAuthed(true);
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.track?.includes(search)
  );

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
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="كلمة السر..."
            className="w-full rounded-2xl px-5 py-4 text-lg outline-none"
            style={{ background: "var(--surface)", border: "2px solid var(--border)", color: "var(--text)" }}
          />
          {error && <p className="text-center text-[15px]" style={{ color: "var(--danger)" }}>{error}</p>}
          <button onClick={login} disabled={loading} className="btn-primary" style={{ opacity: loading ? 0.5 : 1 }}>
            {loading ? "جاري التحقق..." : "دخول"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-4 py-6" style={{ background: "var(--bg)" }}>
      {/* الهيدر */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="title-md" style={{ color: "var(--text)" }}>لوحة الإدارة</p>
          <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>{users.length} مستخدم مسجّل</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم أو مسار..."
          className="rounded-2xl px-4 py-3 text-[15px] outline-none"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)", width: "220px" }}
        />
      </div>

      {/* الإحصائيات */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        {[
          { label: "إجمالي المستخدمين", val: users.length },
          { label: "مسار تحصيلي", val: users.filter((u) => u.track === "تحصيلي").length },
          { label: "مسار قدرات", val: users.filter((u) => u.track === "قدرات").length },
          { label: "مسار CPC", val: users.filter((u) => u.track === "CPC").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="font-black text-2xl" style={{ color: "var(--accent-light)" }}>{s.val}</p>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* الجدول — يتمرر أفقياً على الجوال */}
      <div className="max-w-5xl mx-auto rounded-2xl overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
        <div style={{ minWidth: "780px" }}>
          {/* رأس الجدول */}
          <div className="grid text-[13px] font-bold px-4 py-3"
            style={{ gridTemplateColumns: "1fr 80px 60px 70px 70px 80px 80px 90px 90px", background: "var(--surface2)", color: "var(--text-muted)" }}>
            <span>الاسم</span>
            <span className="text-center">المسار</span>
            <span className="text-center">ستريك</span>
            <span className="text-center">التركيز</span>
            <span className="text-center">الجلسات</span>
            <span className="text-center">التأسيس</span>
            <span className="text-center">التدريب</span>
            <span className="text-center">تاريخ الدخول</span>
            <span className="text-center">آخر نشاط</span>
          </div>

          {/* الصفوف */}
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[15px]" style={{ color: "var(--text-muted)" }}>لا يوجد مستخدمون</div>
          ) : filtered.map((u, i) => (
            <div key={u.id}
              className="grid items-center px-4 py-3.5 text-[14px]"
              style={{
                gridTemplateColumns: "1fr 80px 60px 70px 70px 80px 80px 90px 90px",
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
                background: i % 2 === 0 ? "var(--surface)" : "var(--bg)",
              }}>
              <span className="font-bold" style={{ color: "var(--text)" }}>{u.name || "—"}</span>
              <span className="text-center">
                <span className="px-2 py-0.5 rounded-full text-[12px] font-bold"
                  style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                  {u.track || "—"}
                </span>
              </span>
              <span className="text-center font-bold" style={{ color: u.streak > 0 ? "var(--gold)" : "var(--text-muted)" }}>
                {u.streak > 0 ? `${u.streak}` : "—"}
              </span>
              <span className="text-center" style={{ color: "var(--text-dim)" }}>{fmtHours(u.focusMins)}</span>
              <span className="text-center" style={{ color: "var(--text-dim)" }}>{u.sessions || 0}</span>
              <span className="flex justify-center"><ProgressCell pct={u.taseesProgress} /></span>
              <span className="flex justify-center"><ProgressCell pct={u.tadreebProgress} /></span>
              <span className="text-center text-[12px]" style={{ color: "var(--text-muted)" }}>{fmt(u.joinedAt)}</span>
              <span className="text-center text-[12px]" style={{ color: "var(--text-muted)" }}>{fmt(u.lastSeen)}</span>
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
