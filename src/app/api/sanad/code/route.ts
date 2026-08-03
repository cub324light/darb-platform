/* ─── سند: إصدارُ رمزِ اقتران ───
   الطالبُ وحده يُصدره، والخادمُ وحده يعرفه. كان الرمزُ يُولَّد في المتصفّح ويبقى
   فيه، فلا يستطيع والدٌ على جهازٍ آخرَ التحقّقَ منه — وهذا سببُ أنّ سند لم يكن
   يعمل إلا على جهاز الطالب. الآن يُولَّد هنا ويُخزَّن في `sanadCodes/{code}`
   الذي لا يقرؤه عميلٌ إطلاقاً (قواعدُ الأمان)، ويموت بعد عشر دقائق.

   الرمزُ الجديد يُبطل ما قبله: رمزٌ واحدٌ حيٌّ لكل طالب، فلا تتراكم أرقامٌ
   صالحةٌ نسيها صاحبُها. */
import { NextResponse } from "next/server";
import { getVerifiedUid, getAdminDbOptional } from "@/lib/server/firebaseAdmin";
import { checkUserRateLimit } from "@/lib/server/rateLimit";
import { CODE_ALPHABET, CODE_LEN, CODE_TTL_MS } from "@/lib/sanad/link";
import { randomInt } from "node:crypto";

export const runtime = "nodejs";

/* عشوائيةٌ مُعمّاة لا `Math.random`: الرمزُ مفتاحُ وصولٍ إلى ملخّص قاصر. */
function serverCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export async function POST(req: Request) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "سجّل دخولك أولاً" }, { status: 401 });

  if (!(await checkUserRateLimit(uid))) {
    return NextResponse.json({ error: "طلبات كثيرة، انتظر دقيقة" }, { status: 429 });
  }

  const db = await getAdminDbOptional();
  if (!db) {
    return NextResponse.json(
      { error: "الربط السحابي غير متاح الآن — حاول لاحقاً" },
      { status: 503 },
    );
  }

  const now = Date.now();
  const expiresAt = now + CODE_TTL_MS;

  try {
    /* أبطِل رموزَ هذا الطالب السابقة — واحدٌ حيٌّ لا أكثر */
    const old = await db.collection("sanadCodes").where("studentUid", "==", uid).get();
    const batch = db.batch();
    old.forEach((d) => batch.delete(d.ref));

    /* في حالٍ نادرةٍ يقع الرمزُ على رمزٍ حيّ — نعيد المحاولة لا نصطدم */
    let code = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const c = serverCode();
      const snap = await db.collection("sanadCodes").doc(c).get();
      if (!snap.exists || (snap.data()?.expiresAt ?? 0) < now) { code = c; break; }
    }
    if (!code) return NextResponse.json({ error: "تعذّر إصدار رمز — أعد المحاولة" }, { status: 503 });

    batch.set(db.collection("sanadCodes").doc(code), { studentUid: uid, issuedAt: now, expiresAt });
    await batch.commit();

    return NextResponse.json({ code, issuedAt: now, expiresAt });
  } catch {
    return NextResponse.json({ error: "تعذّر إصدار رمز — أعد المحاولة" }, { status: 500 });
  }
}
