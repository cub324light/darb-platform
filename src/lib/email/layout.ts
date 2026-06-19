/* ─── قالب التغليف الموحّد لكل رسائل البريد ───
   كل قالب يمرّر «المحتوى» فقط، وهذا الغلاف يضيف الهوية (RTL، شعار درب،
   الألوان، التذييل). تعديل واحد هنا يحدّث شكل جميع الرسائل. */

const BRAND = "#2563EB";
const BG = "#F8F4EC";
const SURFACE = "#FFFFFF";
const TEXT = "#1A1A22";
const MUTED = "#6B7280";

export interface LayoutOptions {
  /* عنوان ما قبل العرض (preheader) — يظهر بجانب الموضوع في صندوق الوارد */
  preheader?: string;
}

/* يلفّ محتوى HTML داخل هيكل رسالة كامل بهوية درب */
export function layout(bodyHtml: string, opts: LayoutOptions = {}): string {
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;text-align:right">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${SURFACE};border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
        <!-- الرأس -->
        <tr><td style="background:${BRAND};padding:28px 32px;text-align:center">
          <span style="font-size:30px;font-weight:900;color:#fff;letter-spacing:1px">درب</span>
        </td></tr>
        <!-- المحتوى -->
        <tr><td style="padding:32px;color:${TEXT};font-size:15px;line-height:1.8">
          ${bodyHtml}
        </td></tr>
        <!-- التذييل -->
        <tr><td style="padding:20px 32px;border-top:1px solid #ECECEC;text-align:center">
          <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6">
            منصة درب — رفيقك في رحلة الاختبارات<br>
            هذه رسالة آلية، لا داعي للرد عليها.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* مكوّنات صغيرة جاهزة للقوالب — تحافظ على اتساق الشكل */
export function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:21px;font-weight:900;color:${TEXT}">${escapeHtml(text)}</h1>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;color:${TEXT};font-size:15px;line-height:1.8">${escapeHtml(text)}</p>`;
}

export function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr><td style="border-radius:12px;background:${BRAND}">
    <a href="${encodeURI(url)}" style="display:inline-block;padding:13px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

/* تهريب HTML — يمنع حقن وسوم من بيانات المستخدم */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
