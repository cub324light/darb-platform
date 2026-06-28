/* ─── سجلّ التدقيق (Audit Log) — مُسجِّل موحّد لكل عمليات المشرفين ───
   نقطة واحدة تكتب كل عملية حسّاسة في مجموعة audit_log: مَن، ماذا، ما الذي
   تغيّر (قبل/بعد)، متى، IP، والجهاز. خادمية فقط (Admin SDK). لا ترمي أبداً —
   فشل التسجيل لا يُفشل العملية، لكن يجب استدعاؤها لكل إجراء حسّاس. */

export interface AuditActor { uid: string; email: string | null; role: string; }

export interface AuditInput {
  area: AuditArea;
  action: string;
  targetType?: string;
  targetId?: string;
  summary?: string;                 // وصف بشري مختصر
  before?: unknown;                 // الحالة قبل (إن توفّرت)
  after?: unknown;                  // الحالة بعد (إن توفّرت)
  changes?: { field: string; before: string; after: string }[];
}

export type AuditArea =
  | "users" | "council" | "kb" | "email" | "arena"
  | "settings" | "broadcast" | "duwairb" | "auth";

export const AUDIT_AREAS: { id: AuditArea; label: string }[] = [
  { id: "users",     label: "المستخدمون" },
  { id: "council",   label: "المجلس" },
  { id: "kb",        label: "المصادر" },
  { id: "email",     label: "البريد" },
  { id: "arena",     label: "الرتب و1v1" },
  { id: "broadcast", label: "الإشعارات" },
  { id: "duwairb",   label: "دويرب" },
  { id: "settings",  label: "الإعدادات" },
  { id: "auth",      label: "الدخول" },
];

/* تقليص أي قيمة قبل/بعد إلى نص آمن محدود الحجم (يتفادى تخزين مخزونات ضخمة) */
function safeSnapshot(v: unknown): string | null {
  if (v == null) return null;
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > 2000 ? s.slice(0, 2000) + "…" : s;
  } catch {
    return null;
  }
}

/* يقرأ IP والجهاز من ترويسات الطلب */
export function requestMeta(req: Request): { ip: string | null; device: string | null } {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || null;
  const device = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  return { ip, device };
}

export async function recordAudit(
  db: FirebaseFirestore.Firestore,
  req: Request,
  actor: AuditActor,
  input: AuditInput,
): Promise<void> {
  try {
    const { ip, device } = requestMeta(req);
    await db.collection("audit_log").add({
      area: input.area,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      summary: input.summary ?? null,
      before: safeSnapshot(input.before),
      after: safeSnapshot(input.after),
      changes: input.changes ?? null,
      actorUid: actor.uid,
      actorEmail: actor.email ?? null,
      actorRole: actor.role,
      ip,
      device,
      at: Date.now(),
    });
  } catch {
    /* أفضل-جهد: لا نُفشل العملية إن تعذّر التسجيل */
  }
}
