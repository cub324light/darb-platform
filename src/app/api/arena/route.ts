import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getVerifiedUid } from "@/lib/server/firebaseAdmin";
import { isUserBlocked } from "@/lib/server/moderation";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { cleanId } from "@/lib/server/sanitize";
import {
  pickOpponent, scoreAnswers, decideWinner, seedFromMatchId,
  type QueueTicket,
} from "@/lib/arena/engine";
import { buildMatchQuestions, MATCH_QUESTION_COUNT } from "@/lib/arena/questions";
import { computeRpChange, rankFromRP, START_RP } from "@/lib/rank";
import type { TrackId } from "@/lib/tracks";

/* firebase-admin يحتاج Node APIs */
export const runtime = "nodejs";

/* ثوابت توقيت المباراة (تطابق العميل) */
const PER_QUESTION_MS = 18_000;          // 15s إجابة + هامش
const PLAY_BUFFER_MS = 10_000;           // مهلة سماح بعد آخر سؤال

const KNOWN_TRACKS = new Set<string>([
  "قدرات", "تحصيلي", "تحصيلي مبكر", "CPC", "ITC", "ايلتس", "ستيب", "توفل", "دوليقو", "مدرسه",
]);
function normTrack(t: unknown): TrackId {
  return (typeof t === "string" && KNOWN_TRACKS.has(t) ? t : "قدرات") as TrackId;
}

/* قراءة RP/السلسلة من وثيقة المستخدم مع افتراضات آمنة */
function readRp(data: FirebaseFirestore.DocumentData | undefined): number {
  const v = data?.rp;
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : START_RP;
}
function readStreak(data: FirebaseFirestore.DocumentData | undefined): number {
  const v = data?.winStreak;
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  /* M-6: محدّد معدّل دائم عبر كل instances — 40/دقيقة لكل IP */
  if (!(await checkRateLimit("arena_" + ip, 40, 60_000))) {
    return NextResponse.json({ error: "محاولات كثيرة — انتظر دقيقة" }, { status: 429 });
  }

  const uid = await getVerifiedUid(req);
  if (!uid) {
    return NextResponse.json({ error: "سجّل الدخول للعب 1v1" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  const { mode } = body as { mode?: string };

  let db: FirebaseFirestore.Firestore;
  try {
    db = await getAdminDb();
  } catch {
    return NextResponse.json({ error: "خدمة الأرينا غير مهيّأة على الخادم" }, { status: 503 });
  }
  const { FieldValue } = await import("firebase-admin/firestore");

  /* H1: المحظور لا يدخل الطابور ولا يلعب (يؤثر على RP خصومه) — فرض خادمي.
     لا يطال القراءة (leaderboard/me). */
  if (mode === "enqueue" || mode === "submit" || mode === "leave") {
    if (await isUserBlocked(db, uid)) {
      return NextResponse.json({ error: "الحساب موقوف" }, { status: 403 });
    }
  }

  try {
    /* ─────────── leaderboard: ترتيب عالمي حسب RP ─────────── */
    if (mode === "leaderboard") {
      const snap = await db.collection("users")
        .orderBy("rp", "desc")
        .limit(80)
        .select("name", "track", "rp", "isPrivate")
        .get();
      const rows = snap.docs
        .map((d) => {
          const x = d.data();
          return { uid: d.id, name: (x.name as string) ?? "لاعب", track: (x.track as string) ?? "", rp: Number(x.rp ?? 0), isPrivate: x.isPrivate === true };
        })
        .filter((r) => !r.isPrivate && r.rp > 0)
        .slice(0, 50)
        .map(({ uid: id, name, track, rp }) => ({ uid: id, name, track, rp, rank: rankFromRP(rp).label }));
      return NextResponse.json({ leaderboard: rows });
    }

    /* ─────────── me: رتبة اللاعب الحالي ─────────── */
    if (mode === "me") {
      const snap = await db.collection("users").doc(uid).get();
      const data = snap.data();
      const rp = readRp(data);
      return NextResponse.json({
        rp, winStreak: readStreak(data),
        wins: Number(data?.arenaWins ?? 0), losses: Number(data?.arenaLosses ?? 0),
        peakRp: Number(data?.peakRp ?? rp),
        rank: rankFromRP(rp).label,
      });
    }

    /* ─────────── enqueue: ادخل الطابور أو طابِق فوراً (ذرّي) ─────────── */
    if (mode === "enqueue") {
      const track = normTrack((body as { track?: unknown }).track);
      const now = Date.now();
      const meRef = db.collection("users").doc(uid);
      const myTicketRef = db.collection("matchQueue").doc(uid);

      const result = await db.runTransaction(async (tx) => {
        /* كل القراءات أولاً (شرط المعاملات) */
        const meSnap = await tx.get(meRef);
        const myRp = readRp(meSnap.data());
        const myName = (meSnap.data()?.name as string) ?? "لاعب";

        /* لو طُوبقتُ بالفعل (سباق نبضة البحث مع لحظة المطابقة) أعِد matchId
           بدل إعادة إدراجي في الطابور — يمنع الكتابة فوق تذكرة «matched». */
        const myTicketSnap = await tx.get(myTicketRef);
        const myTicket = myTicketSnap.data();
        if (myTicket?.status === "matched" && typeof myTicket.matchId === "string") {
          return { matched: true as const, matchId: myTicket.matchId };
        }

        const waitingSnap = await tx.get(
          db.collection("matchQueue").where("status", "==", "waiting").limit(25),
        );

        const me: QueueTicket = { uid, name: myName, rp: myRp, track, createdAt: now };
        const candidates: QueueTicket[] = waitingSnap.docs.map((d) => {
          const x = d.data();
          return { uid: d.id, name: (x.name as string) ?? "لاعب", rp: Number(x.rp ?? START_RP), track: (x.track as string) ?? "قدرات", createdAt: Number(x.createdAt ?? now) };
        });

        const opp = pickOpponent(me, candidates, now);

        if (!opp) {
          /* لا منافس الآن — حدّث/أنشئ تذكرتي (نحافظ على createdAt الأصلي لتوسيع النطاق) */
          const existing = candidates.find((c) => c.uid === uid);
          tx.set(myTicketRef, {
            uid, name: myName, rp: myRp, track,
            status: "waiting",
            createdAt: existing ? existing.createdAt : now,
            lastSeen: now,
          }, { merge: true });
          return { matched: false as const, createdAt: existing ? existing.createdAt : now };
        }

        /* وُجد منافس ⇒ أنشئ مباراة واحدة واحذف التذكرتين (ذرّياً) */
        const matchRef = db.collection("matches").doc();
        const matchId = matchRef.id;
        const qTrack = normTrack(opp.track); // أسئلة المنتظِر — متطابقة للطرفين فعادلة
        const { questions, key } = buildMatchQuestions(qTrack, seedFromMatchId(matchId));
        const playUntil = now + MATCH_QUESTION_COUNT * PER_QUESTION_MS + PLAY_BUFFER_MS;

        const oppRank = rankFromRP(opp.rp);
        const myRank = rankFromRP(myRp);

        tx.set(matchRef, {
          playerUids: [opp.uid, uid],
          players: {
            [opp.uid]: { name: opp.name, rp: opp.rp, rank: oppRank.label, track: opp.track },
            [uid]:     { name: myName,   rp: myRp,    rank: myRank.label,  track },
          },
          track: qTrack,
          questions,
          status: "active",
          createdAt: now,
          playUntil,
          submissions: {},
        });
        /* مفتاح الإجابات في وثيقة خاصة لا يقرؤها العميل (مقاومة الغش) */
        tx.set(matchRef.collection("private").doc("key"), { key });

        /* المنتظِر (opp) يكتشف المباراة عبر مراقبة تذكرته: نعلّمها «matched»
           ومعها matchId (لا نحذفها) — بلا فهرس مركّب ولا استعلام إضافي.
           حالتها لم تعد «waiting» فلا تُطابَق ثانيةً، وتُنظَّف لاحقاً. */
        tx.set(db.collection("matchQueue").doc(opp.uid),
          { status: "matched", matchId }, { merge: true });
        tx.delete(myTicketRef);

        return { matched: true as const, matchId };
      });

      return NextResponse.json(result);
    }

    /* ─────────── cancel: اخرج من الطابور ─────────── */
    if (mode === "cancel") {
      await db.collection("matchQueue").doc(uid).delete().catch(() => {});
      return NextResponse.json({ ok: true });
    }

    /* ─────────── submit / leave: حسم المباراة (مرة واحدة، خادمي) ─────────── */
    if (mode === "submit" || mode === "leave") {
      const matchId = cleanId((body as { matchId?: unknown }).matchId, 80); // M-1
      if (!matchId) {
        return NextResponse.json({ error: "matchId مفقود" }, { status: 400 });
      }
      const rawAnswers = (body as { answers?: unknown }).answers;
      const forfeit = mode === "leave";
      const answers: (number | null)[] = Array.isArray(rawAnswers)
        ? rawAnswers.slice(0, MATCH_QUESTION_COUNT).map((a) => (typeof a === "number" && Number.isInteger(a) && a >= 0 && a <= 5 ? a : null))
        : [];

      const matchRef = db.collection("matches").doc(matchId);
      const keyRef = matchRef.collection("private").doc("key");

      const out = await db.runTransaction(async (tx) => {
        const matchSnap = await tx.get(matchRef);
        if (!matchSnap.exists) return { error: "المباراة غير موجودة", status: 404 };
        const match = matchSnap.data()!;
        const playerUids = (match.playerUids as string[]) ?? [];
        if (!playerUids.includes(uid)) return { error: "لست في هذه المباراة", status: 403 };

        /* المعاملة فُضّت سابقاً ⇒ أعِد النتيجة كما هي (idempotent، لا تكرار RP) */
        if (match.status === "resolved") {
          return { resolved: true as const, result: match.result, alreadyResolved: true };
        }

        const keySnap = await tx.get(keyRef);
        const key = (keySnap.data()?.key as number[]) ?? [];
        const oppUid = playerUids.find((p) => p !== uid)!;

        /* اقرأ وثيقتَي اللاعبَين الآن (قبل أي كتابة) تحسّباً للحسم */
        const meRef = db.collection("users").doc(uid);
        const oppRef = db.collection("users").doc(oppUid);
        const [meSnap, oppSnap] = await Promise.all([tx.get(meRef), tx.get(oppRef)]);

        const submissions = { ...(match.submissions ?? {}) } as Record<string, { score: number; forfeit?: boolean; submittedAt: number }>;
        const now = Date.now();

        /* سجّل تسليمي (النتيجة تُحسب على الخادم من المفتاح — لا تُؤخذ من العميل) */
        const myScore = forfeit ? -1 : scoreAnswers(key, answers);
        submissions[uid] = { score: myScore, forfeit, submittedAt: now };

        const oppSubmitted = !!submissions[oppUid];
        const deadlinePassed = now > Number(match.playUntil ?? 0);

        /* نحسم عندما: سلّم الطرفان، أو انسحبتُ، أو انتهت المهلة (انقطاع الخصم) */
        const shouldResolve = oppSubmitted || forfeit || deadlinePassed;

        if (!shouldResolve) {
          tx.update(matchRef, { submissions });
          return { resolved: false as const, waiting: true };
        }

        const myFinal = submissions[uid];
        const oppFinal = submissions[oppUid] ?? { score: 0, submittedAt: now }; // غائب ⇒ 0

        /* انسحاب أحدهما يحسم لصالح الحاضر بغضّ النظر عن النقاط */
        let winnerSide: "a" | "b" | "draw";
        if (myFinal.forfeit && !oppFinal.forfeit) winnerSide = "b";       // a=أنا
        else if (oppFinal.forfeit && !myFinal.forfeit) winnerSide = "a";
        else winnerSide = decideWinner(myFinal.score, oppFinal.score);

        const myRp = readRp(meSnap.data());
        const oppRp = readRp(oppSnap.data());
        const myStreak = readStreak(meSnap.data());
        const oppStreak = readStreak(oppSnap.data());

        const draw = winnerSide === "draw";
        const iWon = winnerSide === "a";

        /* التعادل: لا تغيّر RP ولا للسلسلة. غيره: Elo + سلسلة. */
        const myChange = draw
          ? { delta: 0, newRP: myRp, newStreak: myStreak, promoted: false, demoted: false, streakBonus: 0, base: 0 }
          : computeRpChange({ myRP: myRp, oppRP: oppRp, won: iWon, winStreak: myStreak });
        const oppChange = draw
          ? { delta: 0, newRP: oppRp, newStreak: oppStreak, promoted: false, demoted: false, streakBonus: 0, base: 0 }
          : computeRpChange({ myRP: oppRp, oppRP: myRp, won: !iWon, winStreak: oppStreak });

        /* اكتب RP/الإحصاءات للطرفين — هذه الحقول لا يكتبها العميل إطلاقاً */
        const applyTo = (ref: FirebaseFirestore.DocumentReference, change: typeof myChange, won: boolean, lost: boolean) => {
          tx.set(ref, {
            rp: change.newRP,
            winStreak: change.newStreak,
            ...(won ? { arenaWins: FieldValue.increment(1) } : {}),
            ...(lost ? { arenaLosses: FieldValue.increment(1) } : {}),
            lastSeen: FieldValue.serverTimestamp(),
          }, { merge: true });
        };
        applyTo(meRef, myChange, !draw && iWon, !draw && !iWon);
        applyTo(oppRef, oppChange, !draw && !iWon, !draw && iWon);

        /* peakRp = أعلى ما وصله (نحسبه من القراءة الحالية) */
        tx.set(meRef, { peakRp: Math.max(Number(meSnap.data()?.peakRp ?? 0), myChange.newRP) }, { merge: true });
        tx.set(oppRef, { peakRp: Math.max(Number(oppSnap.data()?.peakRp ?? 0), oppChange.newRP) }, { merge: true });

        const winnerUid = draw ? null : (iWon ? uid : oppUid);
        const result = {
          winnerUid, draw,
          scores: { [uid]: Math.max(0, myFinal.score), [oppUid]: Math.max(0, oppFinal.score) },
          rp: {
            [uid]:    { oldRP: myRp,  newRP: myChange.newRP,  delta: myChange.delta,  promoted: myChange.promoted,  demoted: myChange.demoted,  streakBonus: myChange.streakBonus },
            [oppUid]: { oldRP: oppRp, newRP: oppChange.newRP, delta: oppChange.delta, promoted: oppChange.promoted, demoted: oppChange.demoted, streakBonus: oppChange.streakBonus },
          },
        };

        tx.update(matchRef, { submissions, status: "resolved", resolvedAt: now, result });
        return { resolved: true as const, result };
      });

      if ("error" in out) {
        return NextResponse.json({ error: out.error }, { status: out.status });
      }
      return NextResponse.json(out);
    }

    /* ─────────── cleanup: تنظيف التذاكر الميتة (أي مسجّل — عملية صيانة آمنة) ─────────── */
    if (mode === "cleanup") {
      const now = Date.now();
      const stale = await db.collection("matchQueue").where("createdAt", "<", now - 60_000).limit(200).get();
      const batch = db.batch();
      stale.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return NextResponse.json({ ok: true, cleaned: stale.size });
    }

    return NextResponse.json({ error: "mode غير مدعوم" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `خطأ في الأرينا: ${msg}` }, { status: 500 });
  }
}
