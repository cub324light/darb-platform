import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, authorizeAdmin, getVerifiedRole, isOwnerEmail } from "@/lib/server/firebaseAdmin";
import { ACTION_MIN_ROLE, ASSIGNABLE_ROLES, isRole, type AdminAction, type Role } from "@/lib/roles";

/* ربط كل وضع بأقل صلاحية مطلوبة (مصدر القرار في lib/roles) */
const ACTION_BY_MODE: Record<string, AdminAction> = {
  ping:           "view",
  analytics:      "view",
  aiUsage:        "view",
  getUserData:    "view",
  setPlan:        "manageUser",
  setBlocked:     "manageUser",
  setBlockedUntil:"manageUser",
  resetUser:      "manageUser",
  deleteUser:     "deleteUser",
  setRole:        "manageRoles",
};

/* firebase-admin يحتاج Node APIs — نمنع تجميعه على Edge، ونمدّد المهلة
   لأن مسح كل المستخدمين (Auth + Firestore) قد يتجاوز الافتراضي */
export const runtime = "nodejs";

/* حماية من تخمين كلمة السر: 5 محاولات بالدقيقة لكل IP */
const attempts = new Map<string, { count: number; reset: number }>();
function allowAttempt(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.reset) {
    attempts.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (e.count >= 5) return false;
  e.count++;
  return true;
}

/* تهيئة firebase-admin عبر استيراد ديناميكي — أي فشل في تحميل المكتبة
   أو غياب المفتاح يصبح خطأً قابلاً للالتقاط (JSON) بدل انهيار الموديول (500). */
async function adminApp() {
  const { initializeApp, getApps, cert, applicationDefault } = await import("firebase-admin/app");
  if (getApps().length > 0) return getApps()[0]!;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    let parsed: object;
    try { parsed = JSON.parse(sa); }
    catch { throw new Error("FIREBASE_SERVICE_ACCOUNT ليس JSON صالحاً — تأكد من نسخ الملف كاملاً"); }
    return initializeApp({ credential: cert(parsed as Parameters<typeof cert>[0]) });
  }
  /* الاعتماد الافتراضي يصلح محلياً فقط (GOOGLE_APPLICATION_CREDENTIALS) */
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault(), projectId: "my-education-platform-a160e" });
  }
  throw new Error("FIREBASE_SERVICE_ACCOUNT غير مضبوط — أضفه في إعدادات Vercel (Environment Variables) ثم أعد النشر");
}

async function adminDb() {
  const app = await adminApp();
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(app);
}

async function adminAuth() {
  const app = await adminApp();
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(app);
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!allowAttempt(ip)) {
      return NextResponse.json({ error: "محاولات كثيرة — انتظر دقيقة" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const { mode } = (body ?? {}) as { password?: string; mode?: string };

    /* whoami: يرجع دور المتصل (لأي مستخدم) — تستخدمه الواجهة لبوابة الدخول */
    if (mode === "whoami") {
      if (checkAdminPassword((body as { password?: unknown })?.password)) {
        return NextResponse.json({ role: "owner", email: null, via: "password" });
      }
      const who = await getVerifiedRole(req);
      return NextResponse.json({ role: who?.role ?? "user", email: who?.email ?? null, via: "token" });
    }

    /* بوابة RBAC: لكل وضع حد أدنى من الدور — يُصرَّح بكلمة المالك أو بدور كافٍ */
    const action: AdminAction = ACTION_BY_MODE[mode ?? "__list__"] ?? "view";
    const caller = await authorizeAdmin(req, (body ?? {}) as { password?: unknown }, ACTION_MIN_ROLE[action]);
    if (!caller) {
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    }

    /* إدارة الأدوار — للمالك فقط (مضمون عبر البوابة: manageRoles = owner) */
    if (mode === "setRole") {
      const { uid, role } = (body ?? {}) as { uid?: string; role?: string };
      if (typeof uid !== "string" || !uid) {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }
      if (!isRole(role) || !ASSIGNABLE_ROLES.includes(role as Role)) {
        return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
      }
      try {
        const fbAuth = await adminAuth();
        const target = await fbAuth.getUser(uid).catch(() => null);
        if (target && isOwnerEmail(target.email)) {
          return NextResponse.json({ error: "لا يمكن تغيير دور المالك" }, { status: 400 });
        }
        // custom claim هو مصدر الحقيقة الأمني (يُقرأ في القواعد والخادم)
        await fbAuth.setCustomUserClaims(uid, { role });
        // مرآة في Firestore للعرض/الفلترة فقط
        const db = await adminDb();
        await db.collection("users").doc(uid).set({ role }, { merge: true });
        return NextResponse.json({ ok: true, uid, role });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `تعذّر تعيين الدور: ${msg}` }, { status: 500 });
      }
    }

    /* وضع التشخيص — يطبع كل مرحلة على حدة ليتّضح أين يفشل بالضبط */
    if (mode === "ping") {
      const steps: string[] = [];
      try {
        const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
        steps.push(sa ? `① المفتاح موجود (${sa.length} حرف)` : "① المفتاح غير موجود ❌ — أضف FIREBASE_SERVICE_ACCOUNT في Vercel");
        if (!sa) {
          return NextResponse.json({ ok: false, msg: steps.join("\n") }, { status: 200 });
        }
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(sa) as Record<string, unknown>;
          steps.push("② صيغة JSON صحيحة ✓");
        } catch {
          steps.push("② JSON غير صالح ❌ — انسخ ملف الـ service account كاملاً من { إلى }");
          return NextResponse.json({ ok: false, msg: steps.join("\n") }, { status: 200 });
        }
        steps.push(`③ المشروع: ${parsed.project_id ?? "؟ مفقود"}`);
        steps.push(`④ الحساب: ${parsed.client_email ?? "؟ مفقود"}`);
        steps.push(typeof parsed.private_key === "string" && parsed.private_key.includes("PRIVATE KEY")
          ? "⑤ المفتاح الخاص موجود ✓"
          : "⑤ المفتاح الخاص ناقص أو تالف ❌");
        const db = await adminDb();
        steps.push("⑥ تهيئة Firebase ✓");
        const snap = await db.collection("users").limit(1).get();
        steps.push(`⑦ الاتصال بـ Firestore ✓ (عيّنة: ${snap.size} وثيقة)`);
        return NextResponse.json({ ok: true, msg: steps.join("\n") });
      } catch (e) {
        steps.push(`✖ فشل: ${e instanceof Error ? e.message : String(e)}`);
        return NextResponse.json({ ok: false, msg: steps.join("\n") }, { status: 200 });
      }
    }

    /* تكلفة الذكاء الاصطناعي — آخر 30 يوماً من مجموعة ai_usage */
    if (mode === "aiUsage") {
      try {
        const db = await adminDb();
        const snap = await db.collection("ai_usage").orderBy("date", "desc").limit(30).get();
        const days = snap.docs.map((d) => {
          const x = d.data();
          return {
            date: (x.date as string) ?? d.id,
            requests: Number(x.requests ?? 0),
            promptTokens: Number(x.promptTokens ?? 0),
            completionTokens: Number(x.completionTokens ?? 0),
            byModel: (x.byModel ?? {}) as Record<string, { label?: string; requests?: number; promptTokens?: number; completionTokens?: number }>,
          };
        });
        return NextResponse.json({ days });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `تعذّر جلب الاستهلاك: ${msg}` }, { status: 500 });
      }
    }

    /* نظرة عامة — تحليلات اليوم من مجموعتي events + users */
    if (mode === "analytics") {
      try {
        const db = await adminDb();
        const { Timestamp } = await import("firebase-admin/firestore");

        /* بداية اليوم بتوقيت UTC — يطابق طريقة بقية المنصة في حساب «اليوم» */
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const todayTs = Timestamp.fromMillis(startOfDay.getTime());

        /* عدّ مجمّع — أرخص من جلب كل الوثائق */
        const [totalSnap, regSnap, activeSnap] = await Promise.all([
          db.collection("users").count().get(),
          db.collection("users").where("joinedAt", ">=", todayTs).count().get(),
          db.collection("users").where("lastSeen", ">=", todayTs).count().get(),
        ]);
        const totalUsers      = totalSnap.data().count;
        const registeredToday = regSnap.data().count;
        const activeToday      = activeSnap.data().count;

        /* أحداث اليوم — للزوار والصفحات ومدة الجلسة ومستخدمي الذكاء */
        const evSnap = await db.collection("events")
          .where("ts", ">=", todayTs)
          .limit(8000)
          .get();

        const visitors = new Set<string>();
        const pageCounts: Record<string, number> = {};
        const aiUsers = new Set<string>();
        let durSum = 0, durCount = 0;

        for (const d of evSnap.docs) {
          const e = d.data();
          const name = e.name as string;
          const props = (e.props ?? {}) as Record<string, unknown>;
          const uid = (e.uid ?? null) as string | null;

          if (name === "page_view") {
            const vid = (props.visitorId as string) || uid || "";
            if (vid) visitors.add(vid);
            const path = (props.path as string) || "/";
            pageCounts[path] = (pageCounts[path] ?? 0) + 1;
          } else if (name === "session_completed") {
            const m = Number(props.focusMins);
            if (Number.isFinite(m) && m > 0) { durSum += m; durCount++; }
          } else if (name === "ai_plan_generated" || name === "ai_explain_requested" || name === "ai_quiz_generated") {
            if (uid) aiUsers.add(uid);
          }
        }

        const visitorsToday = visitors.size;
        const topPages = Object.entries(pageCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([path, count]) => ({ path, count }));
        const avgSessionMins = durCount > 0 ? Math.round(durSum / durCount) : 0;
        const aiUsersToday   = aiUsers.size;
        /* نسبة التحويل: المسجلون اليوم ÷ الزوار اليوم */
        const conversion = visitorsToday > 0
          ? Math.min(100, Math.round((registeredToday / visitorsToday) * 100))
          : 0;

        return NextResponse.json({
          analytics: {
            visitorsToday, registeredToday, conversion,
            avgSessionMins, aiUsersToday, topPages,
            totalUsers, activeToday,
            eventsScanned: evSnap.size,
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `تعذّر جلب التحليلات: ${msg}` }, { status: 500 });
      }
    }

    /* انتحال العرض: جلب نسخة بيانات الطالب الكاملة (قراءة فقط للدعم) */
    if (mode === "getUserData") {
      const { uid } = (body ?? {}) as { uid?: string };
      if (typeof uid !== "string" || !uid) {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }
      try {
        const db = await adminDb();
        const doc = await db.collection("users").doc(uid).get();
        if (!doc.exists) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
        const data = doc.data()!;
        return NextResponse.json({
          backup: (data.backup ?? {}) as Record<string, string>,
          email: (data.email ?? null) as string | null,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `تعذّر الجلب: ${msg}` }, { status: 500 });
      }
    }

    /* تعيين باقة لمستخدم */
    if (mode === "setPlan") {
      const { uid, plan } = (body ?? {}) as { uid?: string; plan?: string };
      if (typeof uid !== "string" || !uid) {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }
      if (plan !== "free" && plan !== "shaheen" && plan !== "anqa") {
        return NextResponse.json({ error: "باقة غير صالحة" }, { status: 400 });
      }
      try {
        const db = await adminDb();
        await db.collection("users").doc(uid).set({ plan }, { merge: true });
        return NextResponse.json({ ok: true, uid, plan });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `تعذّر التعيين: ${msg}` }, { status: 500 });
      }
    }

    /* إيقاف مؤقت لمدة محددة */
    if (mode === "setBlockedUntil") {
      const { uid, durationHours } = (body ?? {}) as { uid?: string; durationHours?: number };
      if (typeof uid !== "string" || !uid) {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }

      let blockUntil: number | null = null;
      let blocked = false;

      if (durationHours !== null && durationHours !== undefined && durationHours > 0) {
        blockUntil = Date.now() + durationHours * 3600 * 1000;
        blocked = true;
      }
      // durationHours === 0 means permanent block (no expiry)
      if (durationHours === 0) {
        blocked = true;
        blockUntil = null;
      }

      try {
        const db = await adminDb();
        await db.collection("users").doc(uid).set(
          { blocked, blockUntil: blockUntil ?? null },
          { merge: true }
        );
        return NextResponse.json({ ok: true, uid, blocked, blockUntil });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `تعذّر الإيقاف: ${msg}` }, { status: 500 });
      }
    }

    /* إيقاف / تفعيل مستخدم */
    if (mode === "setBlocked") {
      const { uid, blocked } = (body ?? {}) as { uid?: string; blocked?: boolean };
      if (typeof uid !== "string" || !uid) {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }
      try {
        const db = await adminDb();
        await db.collection("users").doc(uid).set({ blocked: !!blocked }, { merge: true });
        return NextResponse.json({ ok: true, uid, blocked: !!blocked });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `تعذّر التحديث: ${msg}` }, { status: 500 });
      }
    }

    /* حذف مستخدم (Firestore + Auth) */
    if (mode === "deleteUser") {
      const { uid } = (body ?? {}) as { uid?: string };
      if (typeof uid !== "string" || !uid) {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }
      try {
        const db = await adminDb();
        const fbAuth = await adminAuth();
        // حماية: لا يُحذف حساب المالك أبداً
        const target = await fbAuth.getUser(uid).catch(() => null);
        if (target && isOwnerEmail(target.email)) {
          return NextResponse.json({ error: "لا يمكن حذف حساب المالك" }, { status: 400 });
        }
        await db.collection("users").doc(uid).delete();
        try { await fbAuth.deleteUser(uid); } catch { /* قد لا يوجد في Auth */ }
        return NextResponse.json({ ok: true, uid });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `تعذّر الحذف: ${msg}` }, { status: 500 });
      }
    }

    /* إعادة تعيين بيانات مستخدم (مسح التقدم، يبقى الحساب) */
    if (mode === "resetUser") {
      const { uid } = (body ?? {}) as { uid?: string };
      if (typeof uid !== "string" || !uid) {
        return NextResponse.json({ error: "uid مفقود" }, { status: 400 });
      }
      try {
        const db = await adminDb();
        await db.collection("users").doc(uid).set({
          streak: 0, focusMins: 0, sessions: 0, silver: 0,
          taseesProgress: 0, tadreebProgress: 0,
          backup: {},
        }, { merge: true });
        return NextResponse.json({ ok: true, uid });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `تعذّر الإعادة: ${msg}` }, { status: 500 });
      }
    }

    const db  = await adminDb();
    const fbAuth = await adminAuth();

    /* جلب مستخدمي Firebase Auth (للإيميلات) */
    const authEmailMap = new Map<string, string>();
    const authCreatedMap = new Map<string, number>(); // uid → createdAt ms
    const authLastSignInMap = new Map<string, number>(); // uid → lastSignInTime ms
    try {
      let pageToken: string | undefined;
      do {
        const result = await fbAuth.listUsers(1000, pageToken);
        for (const u of result.users) {
          if (u.email) authEmailMap.set(u.uid, u.email);
          if (u.metadata.creationTime)
            authCreatedMap.set(u.uid, new Date(u.metadata.creationTime).getTime());
          if (u.metadata.lastSignInTime)
            authLastSignInMap.set(u.uid, new Date(u.metadata.lastSignInTime).getTime());
        }
        pageToken = result.pageToken;
      } while (pageToken);
    } catch {
      /* لو فشل جلب Auth users، نكمل بدونه */
    }

    /* جلب مستخدمي Firestore */
    const snap = await db.collection("users").get();
    const now  = Date.now();

    const users = snap.docs.map((d) => {
      const data = d.data();
      const uid  = d.id;

      /* نسخة المستخدم الكاملة من backup (للحقول غير المرفوعة كأعمدة عليا) */
      let prof: Record<string, unknown> = {};
      try {
        const raw = data.backup?.darb_user;
        if (typeof raw === "string") prof = JSON.parse(raw) as Record<string, unknown>;
      } catch { /* تجاهل backup تالف */ }
      const pick = (key: string) =>
        (data[key] ?? prof[key] ?? "") as string;

      /* الإيميل: من Firestore أولاً (المستخدمون الجدد)، ثم من Auth Map (لو الـ id هو Auth UID) */
      const email = data.email || authEmailMap.get(uid) || "";

      const joinedMs  = data.joinedAt?.seconds  ? data.joinedAt.seconds  * 1000 : null;
      const lastSeenMs = data.lastSeen?.seconds ? data.lastSeen.seconds * 1000 : null;

      /* مدة الاستخدام: من أول تسجيل حتى الآن (بالأيام) */
      const durationDays = joinedMs ? Math.max(0, Math.floor((now - joinedMs) / 86_400_000)) : null;

      const planVal = (data.plan ?? prof.plan ?? "free") as string;
      const activeTracks = Array.isArray(prof.activeTracks)
        ? (prof.activeTracks as string[])
        : ((data.track || prof.track) ? [String(data.track ?? prof.track)] : []);

      return {
        id:              uid,
        name:            data.name ?? prof.name ?? "",
        email,
        track:           data.track ?? prof.track ?? "",
        activeTracks,
        plan:            planVal === "shaheen" || planVal === "anqa" ? planVal : "free",
        role:            isOwnerEmail(email) ? "owner" : (isRole(data.role) ? data.role : "user"),
        blocked:         data.blocked === true,
        streak:          data.streak    ?? 0,
        focusMins:       data.focusMins ?? 0,
        sessions:        data.sessions  ?? 0,
        silver:          data.silver    ?? 0,
        taseesProgress:  data.taseesProgress  ?? 0,
        tadreebProgress: data.tadreebProgress ?? 0,
        school:          pick("school"),
        region:          pick("region"),
        city:            pick("city"),
        phone:           pick("phone"),
        age:             (data.age ?? prof.age ?? "") as string | number,
        studyLevel:      pick("studyLevel"),
        grade:           pick("grade"),
        studyHours:      (data.studyHours ?? prof.studyHours ?? "") as string | number,
        durationDays,
        blockUntil: typeof data.blockUntil === "number" ? data.blockUntil : null,
        joinedAt:  joinedMs  ? { seconds: data.joinedAt.seconds  } : null,
        lastSeen:  lastSeenMs ? { seconds: data.lastSeen.seconds } : null,
      };
    });

    users.sort((a, b) => (b.lastSeen?.seconds ?? 0) - (a.lastSeen?.seconds ?? 0));
    return NextResponse.json({ users });
  } catch (e) {
    /* شبكة أمان نهائية — أي خطأ غير متوقع يرجع JSON واضح بدل انهيار 500 */
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `خطأ في الخادم: ${msg}` }, { status: 500 });
  }
}
