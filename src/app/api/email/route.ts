import { NextRequest, NextResponse } from "next/server";
import { sendEmail, sendTemplate, isEmailConfigured } from "@/lib/email";
import { TEMPLATES, type TemplateName, type TemplateProps } from "@/lib/email/templates";
import { authorizeAdmin, getAdminDb } from "@/lib/server/firebaseAdmin";
import { recordAudit } from "@/lib/server/audit";
import { checkRateLimit } from "@/lib/server/rateLimit";

/* Resend SDK يعمل على Node */
export const runtime = "nodejs";

/* جسم الطلب: إمّا قالب نوعي، أو بريد خام — كلاهما يتطلب كلمة الأدمن */
interface EmailRequestBody {
  password?: string;
  to?: string | string[];
  // مسار القالب:
  template?: string;
  props?: Record<string, unknown>;
  // مسار البريد الخام:
  subject?: string;
  html?: string;
  text?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  /* M-6: محدّد معدّل دائم — ١٠/دقيقة لكل IP */
  if (!(await checkRateLimit("email_" + ip, 10, 60_000))) {
    return NextResponse.json({ ok: false, error: "محاولات كثيرة — انتظر دقيقة" }, { status: 429 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: false, error: "خدمة البريد غير مهيّأة — اضبط RESEND_API_KEY" }, { status: 503 });
  }

  let body: EmailRequestBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "طلب غير صالح" }, { status: 400 }); }

  /* المصادقة عبر RBAC: كلمة المالك أو دور ≥ مشرف عام (admin) */
  const caller = await authorizeAdmin(req, body, "admin");
  if (!caller) {
    return NextResponse.json({ ok: false, error: "صلاحيات غير كافية" }, { status: 403 });
  }

  if (!body.to) {
    return NextResponse.json({ ok: false, error: "حقل المستلم (to) مطلوب" }, { status: 400 });
  }

  /* تدقيق: مَن أرسل، لمن، وأي قالب (أفضل-جهد، لا يُفشل الإرسال) */
  const auditSend = async () => {
    try {
      const db = await getAdminDb();
      const toList = Array.isArray(body.to) ? body.to : [body.to];
      await recordAudit(db, req, caller, {
        area: "email", action: "send_email", targetType: "email",
        targetId: toList.slice(0, 3).join(", "),
        after: { template: body.template ?? "raw", recipients: toList.length, subject: body.subject ?? null },
        summary: `إرسال بريد (${body.template ?? "مخصّص"}) لـ ${toList.length} مستلم`,
      });
    } catch { /* تجاهل */ }
  };

  /* مسار القالب النوعي */
  if (body.template) {
    if (!(body.template in TEMPLATES)) {
      return NextResponse.json({ ok: false, error: `قالب غير معروف: ${body.template}` }, { status: 400 });
    }
    const name = body.template as TemplateName;
    const result = await sendTemplate(
      body.to,
      name,
      (body.props ?? {}) as unknown as TemplateProps[typeof name],
    );
    if (result.ok) await auditSend();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  /* مسار البريد الخام */
  if (!body.subject || !body.html) {
    return NextResponse.json({ ok: false, error: "subject وhtml مطلوبان للبريد الخام" }, { status: 400 });
  }
  const result = await sendEmail({
    to: body.to,
    subject: body.subject,
    html: body.html,
    text: body.text,
  });
  if (result.ok) await auditSend();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
