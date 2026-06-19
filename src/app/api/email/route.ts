import { NextRequest, NextResponse } from "next/server";
import { sendEmail, sendTemplate, isEmailConfigured } from "@/lib/email";
import { TEMPLATES, type TemplateName, type TemplateProps } from "@/lib/email/templates";
import { authorizeAdmin } from "@/lib/server/firebaseAdmin";

/* Resend SDK يعمل على Node */
export const runtime = "nodejs";

/* منع إساءة الإرسال: 10 طلبات بالدقيقة لكل IP */
const attempts = new Map<string, { count: number; reset: number }>();
function allowAttempt(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.reset) {
    attempts.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

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
  if (!allowAttempt(ip)) {
    return NextResponse.json({ ok: false, error: "محاولات كثيرة — انتظر دقيقة" }, { status: 429 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: false, error: "خدمة البريد غير مهيّأة — اضبط RESEND_API_KEY" }, { status: 503 });
  }

  let body: EmailRequestBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "طلب غير صالح" }, { status: 400 }); }

  /* المصادقة عبر RBAC: كلمة المالك أو دور ≥ مشرف عام (admin) */
  if (!(await authorizeAdmin(req, body, "admin"))) {
    return NextResponse.json({ ok: false, error: "صلاحيات غير كافية" }, { status: 403 });
  }

  if (!body.to) {
    return NextResponse.json({ ok: false, error: "حقل المستلم (to) مطلوب" }, { status: 400 });
  }

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
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
