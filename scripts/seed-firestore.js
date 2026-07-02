#!/usr/bin/env node
/* ─── رفع المحتوى التعليمي العام إلى Firestore ───
   يقرأ src/lib/content/seed.json ويرفع كل مجموعة إلى collection بنفس اسمها
   مستخدماً حقل id كمعرّف الوثيقة — idempotent: كتابة set كاملة تستبدل الوثيقة،
   فإعادة تشغيله آمنة دائماً.

   التهيئة بنفس منطق src/lib/server/firebaseAdmin.ts:
   • FIREBASE_SERVICE_ACCOUNT (JSON كامل لمفتاح حساب الخدمة)، أو
   • GOOGLE_APPLICATION_CREDENTIALS مع projectId المشروع.

   التشغيل: npm run seed:content */

async function buildDb() {
  const { initializeApp, getApps, cert, applicationDefault } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  let app;
  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (sa) {
      let parsed;
      try { parsed = JSON.parse(sa); }
      catch { throw new Error("FIREBASE_SERVICE_ACCOUNT ليس JSON صالحاً — تأكد من النسخ الكامل"); }
      app = initializeApp({ credential: cert(parsed) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      app = initializeApp({ credential: applicationDefault(), projectId: "my-education-platform-a160e" });
    } else {
      throw new Error("FIREBASE_SERVICE_ACCOUNT غير مضبوط — اضبطه (أو GOOGLE_APPLICATION_CREDENTIALS) ثم أعد المحاولة");
    }
  }
  return getFirestore(app);
}

async function main() {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const seed = JSON.parse(readFileSync(join(__dirname, "..", "src", "lib", "content", "seed.json"), "utf8"));
  const db = await buildDb();

  let totalDocs = 0;
  let totalCollections = 0;
  for (const [name, items] of Object.entries(seed)) {
    if (!Array.isArray(items)) continue;
    /* دفعة واحدة لكل مجموعة تكفي (كل مجموعة ≤ 25 وثيقة، وحد الدفعة 500) */
    const batch = db.batch();
    for (const item of items) {
      if (!item || typeof item.id !== "string" || item.id.length === 0) {
        throw new Error(`عنصر بلا id صالح في مجموعة ${name}`);
      }
      batch.set(db.collection(name).doc(item.id), item); // استبدال كامل — idempotent
    }
    await batch.commit();
    totalDocs += items.length;
    totalCollections += 1;
    console.log(`✅ ${name}: ${items.length} وثيقة`);
  }
  console.log(`— اكتمل الرفع: ${totalDocs} وثيقة في ${totalCollections} مجموعات`);
}

main().catch((e) => {
  console.error("❌ فشل الرفع:", e && e.message ? e.message : e);
  process.exit(1);
});
