/* ─── خدمة البريد الموحّدة (Resend) ───
   استخدم sendEmail() لإرسال خام، أو sendTemplate() لإرسال نوعي بقالب.
   server-only: يعتمد على RESEND_API_KEY — لا يُستورَد في كود العميل. */

import { Resend } from "resend";
import type { SendEmailInput, SendEmailResult } from "./types";
import { TEMPLATES, type TemplateName, type TemplateProps } from "./templates";

/* المُرسِل الافتراضي:
   - بدون نطاق مُتحقَّق: استخدم onboarding@resend.dev (يرسل لإيميلك فقط).
   - مع نطاقك: اضبط RESEND_FROM مثل "درب <no-reply@your-domain.com>". */
const DEFAULT_FROM = process.env.RESEND_FROM || "درب <onboarding@resend.dev>";

/* عميل واحد مُعاد استخدامه (lazy) — يُنشأ فقط عند توفر المفتاح */
let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/* هل خدمة البريد مهيّأة؟ (للتحقق قبل الاعتماد عليها) */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/* إرسال بريد خام — لا يرمي أبداً، يُرجع نتيجة موحّدة */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getClient();
  if (!resend) return { ok: false, error: "خدمة البريد غير مهيّأة — اضبط RESEND_API_KEY" };
  try {
    const { data, error } = await resend.emails.send({
      from: input.from || DEFAULT_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      cc: input.cc,
      bcc: input.bcc,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطأ غير معروف في الإرسال" };
  }
}

/* إرسال بقالب نوعي — props مُتحقَّق منها حسب اسم القالب
   (سيصبح قابلاً للاستخدام تلقائياً عند تفعيل أول قالب في templates.ts) */
export async function sendTemplate<K extends TemplateName>(
  to: string | string[],
  template: K,
  props: TemplateProps[K],
  overrides?: Partial<Pick<SendEmailInput, "from" | "replyTo" | "cc" | "bcc">>,
): Promise<SendEmailResult> {
  const tpl = TEMPLATES[template];
  return sendEmail({
    to,
    subject: tpl.subject(props),
    html: tpl.html(props),
    text: tpl.text?.(props),
    ...overrides,
  });
}

export type { SendEmailInput, SendEmailResult } from "./types";
export type { TemplateName, TemplateProps } from "./templates";
