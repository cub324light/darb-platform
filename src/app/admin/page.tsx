"use client";
import { useState, useEffect } from "react";
import { getAllUsers, type FirestoreUser } from "@/lib/firestore";

const ADMIN_PASS = "darb-admin-2026";

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

const TRACK_LABEL: Record<string, string> = {
  "قدرات": "قدرات",
  "تحصيلي": "تحصيلي",
  "CPC": "CPC",
};

export default function AdminPage() {
  const [pass, setPass]       = useState("");
  const [authed, setAuthed]   = useState(false);
  const [users, setUsers]     = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");

  const login = () => {
    if (pass === ADMIN_PASS) setAuthed(true);
    else setError("كلمة السر خاطئة");
  };

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    getAllUsers()
      .then((u) => setUsers(u.sort((a, b) => (b.lastSeen?.seconds ?? 0) - (a.lastSeen?.seconds ?? 0))))
      .catch(() => setError("خطأ في جلب البيانات"))
      .finally(() => setLoading(false));
  }, [authed]);

  const filtered = users.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.track?.includes(search)
  );

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="title-lg text-center" style={{ color: "var(--text)" }}>لوحة الأدمن</p>
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
          <button onClick={login} className="btn-primary">دخول</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-4 py-6" style={{ background: "var(--bg)" }}>
      {/* الهيدر */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="title-md" style={{ color: "var(--text)" }}>لوحة الإدارة</p>
          <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
            {loading ? "جاري التحميل..." : `${users.length} مستخدم مسجّل`}
          </p>
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
      <div className="max-w-4xl mx-auto grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
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

      {/* الجدول */}
      <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {/* رأس الجدول */}
        <div className="grid text-[13px] font-bold px-4 py-3"
          style={{ gridTemplateColumns: "1fr 80px 60px 70px 70px 90px 90px", background: "var(--surface2)", color: "var(--text-muted)" }}>
          <span>الاسم</span>
          <span className="text-center">المسار</span>
          <span className="text-center">ستريك</span>
          <span className="text-center">التركيز</span>
          <span className="text-center">الجلسات</span>
          <span className="text-center">تاريخ الدخول</span>
          <span className="text-center">آخر نشاط</span>
        </div>

        {/* الصفوف */}
        {loading ? (
          <div className="py-12 text-center text-[15px]" style={{ color: "var(--text-muted)" }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[15px]" style={{ color: "var(--text-muted)" }}>لا يوجد مستخدمون</div>
        ) : filtered.map((u, i) => (
          <div key={u.id}
            className="grid items-center px-4 py-3.5 text-[14px]"
            style={{
              gridTemplateColumns: "1fr 80px 60px 70px 70px 90px 90px",
              borderTop: i > 0 ? "1px solid var(--border)" : "none",
              background: i % 2 === 0 ? "var(--surface)" : "var(--bg)",
            }}>
            <span className="font-bold" style={{ color: "var(--text)" }}>{u.name || "—"}</span>
            <span className="text-center">
              <span className="px-2 py-0.5 rounded-full text-[12px] font-bold"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                {TRACK_LABEL[u.track] || u.track || "—"}
              </span>
            </span>
            <span className="text-center font-bold" style={{ color: u.streak > 0 ? "var(--gold)" : "var(--text-muted)" }}>
              {u.streak > 0 ? `${u.streak}` : "—"}
            </span>
            <span className="text-center" style={{ color: "var(--text-dim)" }}>{fmtHours(u.focusMins)}</span>
            <span className="text-center" style={{ color: "var(--text-dim)" }}>{u.sessions || 0}</span>
            <span className="text-center text-[12px]" style={{ color: "var(--text-muted)" }}>{fmt(u.joinedAt)}</span>
            <span className="text-center text-[12px]" style={{ color: "var(--text-muted)" }}>{fmt(u.lastSeen)}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-[13px] mt-6" style={{ color: "var(--text-muted)" }}>
        /admin — للإدارة فقط
      </p>
    </div>
  );
}
