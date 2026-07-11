"use client";
/* ─── هيكل لوحة الإدارة الموحّد (Admin Shell) ───
   Sidebar احترافي بأقسام واضحة، مُقيّد حسب رتبة المشرف، ومتناسق مع تصميم
   المنصة. يلفّ محتوى القسم النشط. الأقسام غير المبنية بعد تظهر «قريباً». */
import { ROLE_RANK, ROLE_LABEL, ROLE_COLOR, type Role } from "@/lib/roles";

export type AdminSection =
  | "dashboard" | "overview" | "content" | "graph" | "review" | "quality" | "audit" | "broadcast" | "ranked" | "duwairb" | "settings";

interface NavItem { id: AdminSection; label: string; icon: string; min: Role; ready: boolean; }

const NAV: NavItem[] = [
  { id: "dashboard", label: "لوحة القيادة",      icon: "🚀", min: "moderator", ready: true },
  { id: "content",   label: "إدارة المحتوى",     icon: "📚", min: "admin",     ready: true },
  { id: "graph",     label: "الرسم التفاعلي",     icon: "🕸️", min: "admin",     ready: true },
  { id: "review",    label: "المراجعة",          icon: "🔎", min: "admin",     ready: true },
  { id: "quality",   label: "الجودة",            icon: "🩺", min: "admin",     ready: true },
  { id: "overview",  label: "نظرة عامة",        icon: "📊", min: "moderator", ready: true },
  { id: "audit",     label: "سجلّ التدقيق",      icon: "🛡️", min: "moderator", ready: true },
  { id: "broadcast", label: "مركز الإشعارات",    icon: "📢", min: "admin",     ready: true },
  { id: "ranked",    label: "الرتب و1v1",        icon: "🏆", min: "admin",     ready: false },
  { id: "duwairb",   label: "إدارة دويرب",       icon: "🤖", min: "admin",     ready: false },
  { id: "settings",  label: "إعدادات المنصة",    icon: "⚙️", min: "owner",     ready: false },
];

const atLeast = (role: Role, min: Role) => ROLE_RANK[role] >= ROLE_RANK[min];

export default function AdminShell({
  role, active, onNavigate, children,
}: {
  role: Role;
  active: AdminSection;
  onNavigate: (s: AdminSection) => void;
  children: React.ReactNode;
}) {
  const items = NAV.filter((n) => atLeast(role, n.min));

  return (
    <div className="min-h-dvh flex" style={{ background: "var(--bg)" }}>
      {/* الشريط الجانبي */}
      <aside className="flex-shrink-0 w-[68px] sm:w-[210px] sticky top-0 h-dvh overflow-y-auto py-4 px-2 sm:px-3 flex flex-col gap-1"
        style={{ background: "var(--surface)", borderInlineEnd: "1px solid var(--border)" }}>
        <div className="px-1 sm:px-2 mb-3">
          <p className="font-black text-[16px] hidden sm:block" style={{ color: "var(--text)" }}>لوحة درب</p>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full inline-block mt-1"
            style={{ background: `color-mix(in srgb, ${ROLE_COLOR[role]} 16%, transparent)`, color: ROLE_COLOR[role] }}>
            {ROLE_LABEL[role]}
          </span>
        </div>

        {items.map((n) => {
          const isActive = active === n.id;
          return (
            <button key={n.id} onClick={() => n.ready && onNavigate(n.id)} disabled={!n.ready}
              title={n.label}
              className="flex items-center gap-2.5 rounded-xl px-2 sm:px-3 py-2.5 text-[13.5px] font-bold transition text-right"
              style={{
                background: isActive ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                color: isActive ? "var(--accent-light)" : n.ready ? "var(--text-dim)" : "var(--text-muted)",
                border: isActive ? "1px solid color-mix(in srgb, var(--accent) 40%, transparent)" : "1px solid transparent",
                opacity: n.ready ? 1 : 0.55,
                cursor: n.ready ? "pointer" : "default",
              }}>
              <span className="text-[17px] flex-shrink-0">{n.icon}</span>
              <span className="hidden sm:inline flex-1">{n.label}</span>
              {!n.ready && <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>قريباً</span>}
            </button>
          );
        })}
      </aside>

      {/* محتوى القسم */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
