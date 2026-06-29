/* ─── إشراف خادمي: الحظر + بناء البلاغات + نموذج المهلة ───
   دوال نقية قابلة للاختبار، وغلاف IO يأخذ db كوسيط (بلا استيراد firebase-admin
   كي تبقى قابلة للاختبار عبر tsx). تُستعمل في الرواتات لفرض H1/C1/H3 خادمياً. */

/* ── H1: الحظر ── */
export interface UserBlockData { blocked?: boolean; blockUntil?: number | null }

/* هل المستخدم محظور الآن؟ يحترم انتهاء الإيقاف المؤقت (blockUntil في الماضي). */
export function isBlocked(data: UserBlockData | undefined | null, now: number): boolean {
  if (!data || data.blocked !== true) return false;
  if (typeof data.blockUntil === "number" && now >= data.blockUntil) return false; // انتهى المؤقت
  return true;
}

/* غلاف: يقرأ وثيقة المستخدم ويقرّر الحظر. fail-open عند تعذّر القراءة
   (لا نحبس مستخدماً شرعياً بسبب عطل بنية تحتية). */
export async function isUserBlocked(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now = Date.now(),
): Promise<boolean> {
  try {
    const snap = await db.collection("users").doc(uid).get();
    return isBlocked(snap.data() as UserBlockData | undefined, now);
  } catch {
    return false;
  }
}

/* ── C1: بناء البلاغ من الرسالة الحقيقية (لا من إدخال العميل) ── */
const REPORT_REASONS = new Set(["spam", "harassment", "offensive", "contact", "sensitive", "other"]);

export interface MessageDoc { uid?: string; name?: string; content?: string }
export interface ReportFields {
  groupId: string; messageId: string;
  reportedUid: string; reportedName: string; content: string;
  reporterUid: string; reason: string; note: string; status: "pending";
}

/* كل ما يُعرَض للطاقم (المُبلَّغ عنه/الاسم/المحتوى) يُشتق من وثيقة الرسالة —
   فلا يستطيع المهاجم تلفيق بلاغ عن ضحية أو حقن محتوى مزوّر. */
export function buildReportFields(opts: {
  groupId: string; messageId: string; msg: MessageDoc;
  reporterUid: string; reason: string; note?: string;
}): ReportFields {
  const reason = REPORT_REASONS.has(opts.reason) ? opts.reason : "other";
  return {
    groupId: opts.groupId,
    messageId: opts.messageId,
    reportedUid: typeof opts.msg.uid === "string" ? opts.msg.uid : "",
    reportedName: typeof opts.msg.name === "string" ? opts.msg.name.slice(0, 60) : "",
    content: typeof opts.msg.content === "string" ? opts.msg.content.slice(0, 1000) : "",
    reporterUid: opts.reporterUid,
    reason,
    note: (opts.note ?? "").slice(0, 300),
    status: "pending",
  };
}

/* ── H3: نموذج مهلة النشر (يطابق منطق قاعدة Firestore) ── */
export function cooldownOk(lastPostAtMs: number | null, nowMs: number, windowMs: number): boolean {
  if (lastPostAtMs == null) return true;
  return nowMs - lastPostAtMs >= windowMs;
}
