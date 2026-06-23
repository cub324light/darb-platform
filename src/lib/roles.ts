/* ─── نظام الأدوار والصلاحيات (RBAC) ───
   مصدر الحقيقة للأدوار. يُستخدم في العميل والخادم وقواعد Firebase.

   التسلسل الهرمي (الأعلى يرث صلاحيات الأدنى):
     owner (المالك)     — صلاحيات كاملة، يُدير الأدوار. يُعرَّف بالإيميل (bootstrap).
     admin (مشرف عام)   — كل عمليات الإدارة عدا إدارة الأدوار.
     moderator (مشرف)   — قراءة لوحة الإدارة والإشراف الخفيف (بلا عمليات مدمّرة).
     user (مستخدم)      — مستخدم عادي بلا صلاحيات إدارية.

   قابل للتوسّع: أضِف دوراً هنا + رتبته، ووسّع PERMISSIONS لاحقاً. */

export type Role = "owner" | "admin" | "moderator" | "user";

export const ROLES: Role[] = ["owner", "admin", "moderator", "user"];

/* رتبة كل دور — للمقارنة الهرمية */
export const ROLE_RANK: Record<Role, number> = {
  owner: 3,
  admin: 2,
  moderator: 1,
  user: 0,
};

/* الاسم العربي للعرض */
export const ROLE_LABEL: Record<Role, string> = {
  owner: "المالك",
  admin: "مشرف عام",
  moderator: "مشرف",
  user: "مستخدم",
};

/* لون مميز لكل دور (للشارات) */
export const ROLE_COLOR: Record<Role, string> = {
  owner: "#F59E0B",
  admin: "#2563EB",
  moderator: "#8B5CF6",
  user: "#64748B",
};

export function isRole(x: unknown): x is Role {
  return typeof x === "string" && (ROLES as string[]).includes(x);
}

/* هل الدور role لا يقل عن الحد الأدنى min؟ */
export function atLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/* الأدوار التي يجوز للمالك إسنادها عبر اللوحة.
   «owner» لا يُسنَد عبر الـ API — يبقى عبر الإيميل (bootstrap) لمنع رفع الصلاحيات. */
export const ASSIGNABLE_ROLES: Role[] = ["admin", "moderator", "user"];

/* الحد الأدنى من الدور لكل عملية إدارية — مصدر واحد للقرار */
export type AdminAction =
  | "view"        // قراءة اللوحة والتحليلات
  | "moderate"    // إشراف خفيف: مراجعة البلاغات وحذف الرسائل
  | "manageUser"  // تغيير الباقة/الإيقاف/إعادة التعيين
  | "deleteUser"  // حذف نهائي
  | "announce"    // نشر/تعديل/حذف الإعلانات
  | "manageRoles";// إدارة الأدوار

export const ACTION_MIN_ROLE: Record<AdminAction, Role> = {
  view:        "moderator",
  moderate:    "moderator",
  manageUser:  "admin",
  deleteUser:  "admin",
  announce:    "admin",
  manageRoles: "owner",
};

export function canDo(role: Role, action: AdminAction): boolean {
  return atLeast(role, ACTION_MIN_ROLE[action]);
}
