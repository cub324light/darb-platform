import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, authorizeAdmin } from "@/lib/server/firebaseAdmin";
import { AUDIT_AREAS } from "@/lib/server/audit";
import { filterAudit, countByArea, type AuditRow, type AuditQuery } from "@/lib/admin/auditFilter";

export const runtime = "nodejs";

const PAGE = 200;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  /* قراءة السجلّ: مشرف فأعلى (view) */
  const caller = await authorizeAdmin(req, body as { password?: unknown }, "moderator");
  if (!caller) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  let db: FirebaseFirestore.Firestore;
  try { db = await getAdminDb(); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "خادم غير مهيّأ" }, { status: 503 }); }

  const { mode } = body as { mode?: string };

  /* قوائم التصفية الثابتة (لقوائم الواجهة) */
  if (mode === "meta") {
    return NextResponse.json({ areas: AUDIT_AREAS });
  }

  try {
    const q = (body as { query?: AuditQuery }).query ?? {};
    const cursor = typeof (body as { cursor?: number }).cursor === "number" ? (body as { cursor: number }).cursor : null;

    /* استعلام Firestore: ترتيب زمني تنازلي + نطاق زمني على نفس الحقل (بلا فهرس
       مركّب)، ثم بقية المرشّحات في الذاكرة. التصفّح عبر مؤشّر at. */
    let ref = db.collection("audit_log").orderBy("at", "desc") as FirebaseFirestore.Query;
    if (typeof q.to === "number") ref = ref.where("at", "<=", q.to);
    if (typeof q.from === "number") ref = ref.where("at", ">=", q.from);
    if (cursor != null) ref = ref.startAfter(cursor);
    ref = ref.limit(PAGE);

    const snap = await ref.get();
    const rows: AuditRow[] = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        area: (x.area as string) ?? "",
        action: (x.action as string) ?? "",
        targetType: (x.targetType as string) ?? null,
        targetId: (x.targetId as string) ?? null,
        summary: (x.summary as string) ?? null,
        before: (x.before as string) ?? null,
        after: (x.after as string) ?? null,
        changes: (x.changes as AuditRow["changes"]) ?? null,
        actorUid: (x.actorUid as string) ?? "",
        actorEmail: (x.actorEmail as string) ?? null,
        actorRole: (x.actorRole as string) ?? "",
        ip: (x.ip as string) ?? null,
        device: (x.device as string) ?? null,
        at: Number(x.at ?? 0),
      };
    });

    /* تصفية الذاكرة لبقية المرشّحات (area/action/actor/q) */
    const filtered = filterAudit(rows, { area: q.area, action: q.action, actor: q.actor, q: q.q });
    const nextCursor = snap.size === PAGE ? rows[rows.length - 1]?.at ?? null : null;

    return NextResponse.json({
      rows: filtered,
      scanned: snap.size,
      counts: countByArea(rows),
      nextCursor,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `تعذّر جلب السجلّ: ${msg}` }, { status: 500 });
  }
}
