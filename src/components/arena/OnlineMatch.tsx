"use client";
/* ─── مباراة 1v1 حقيقية عبر الإنترنت ───
   بحث (طابور مشترك) → لعب (أسئلة المباراة من الخادم) → حسم خادمي مع RP.
   كل المنطق والكتابة على الخادم؛ هذا المكوّن واجهة + مراقبة فورية فقط. */
import { useEffect, useRef, useState } from "react";
import Confetti from "@/components/Confetti";
import RankBadge from "@/components/RankBadge";
import {
  enqueue, cancelQueue, watchTicket, watchMatch, submitMatch, leaveMatch,
  type MatchDoc, type MatchResult,
} from "@/lib/arena/client";
import { SEARCH_TIMEOUT_MS } from "@/lib/arena/engine";

type Phase = "searching" | "timedout" | "playing" | "waiting" | "result" | "error";
const ANSWER_SECONDS = 15;

export default function OnlineMatch({ track, onExit }: { track: string; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("searching");
  const [errMsg, setErrMsg] = useState("");
  const [waited, setWaited] = useState(0);

  const [uid, setUid] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchDoc | null>(null);

  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(ANSWER_SECONDS);
  const [result, setResult] = useState<MatchResult | null>(null);

  /* مراجع للتنظيف وعدم الازدواج */
  const matchedRef = useRef(false);
  const unsubTicket = useRef<(() => void) | null>(null);
  const unsubMatch = useRef<(() => void) | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const answersRef = useRef<(number | null)[]>([]);
  const matchIdRef = useRef<string | null>(null);
  const resolvedRef = useRef(false);

  /* ─── حسم وإرسال النتيجة (تُحسب على الخادم) ─── */
  async function finishAndSubmit(finalAnswers: (number | null)[]) {
    if (submittedRef.current || !matchIdRef.current) return;
    submittedRef.current = true;
    setPhase("waiting");
    try {
      const r = await submitMatch(matchIdRef.current, finalAnswers);
      if (r.resolved && r.result && !resolvedRef.current) {
        resolvedRef.current = true; setResult(r.result); setPhase("result");
      } else if (!r.resolved) {
        /* ننتظر الخصم عبر watchMatch؛ شبكة أمان: نعيد الإرسال بعد مهلة
           ليحسم الخادم بانتهاء المدة (تعامُل مع انقطاع الخصم). */
        setTimeout(async () => {
          if (resolvedRef.current || !matchIdRef.current) return;
          try {
            const r2 = await submitMatch(matchIdRef.current, finalAnswers);
            if (r2.resolved && r2.result && !resolvedRef.current) {
              resolvedRef.current = true; setResult(r2.result); setPhase("result");
            }
          } catch { /* تُحسم عبر watchMatch */ }
        }, 12000);
      }
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "تعذّر إرسال النتيجة");
      setPhase("error");
    }
  }

  /* الانتقال للسؤال التالي بعد تسجيل الإجابة. لا يعتمد على كائن match
     (يُحدَّث مع كل لقطة) — يستعمل عدد الأسئلة الثابت من المرجع. */
  function advance(choice: number | null) {
    const total = answersRef.current.length || 4;
    const next = [...answersRef.current];
    next[qIndex] = choice;
    answersRef.current = next;
    if (qIndex + 1 >= total) {
      finishAndSubmit(next);
    } else {
      setQIndex((i) => i + 1);
      setPicked(null);
      setTimeLeft(ANSWER_SECONDS);
    }
  }

  /* ─── الدخول إلى مباراة (من ردّ enqueue أو من مراقبة التذكرة) ─── */
  async function enterMatch(mid: string) {
    if (matchedRef.current) return;
    matchedRef.current = true;
    matchIdRef.current = mid;

    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    unsubTicket.current?.(); unsubTicket.current = null;
    cancelQueue();

    unsubMatch.current = await watchMatch(mid, (m) => {
      setMatch(m);
      if (m.status === "resolved" && m.result && !resolvedRef.current) {
        resolvedRef.current = true;
        setResult(m.result);
        setPhase("result");
      }
    });

    const blank = new Array(4).fill(null);
    answersRef.current = blank;
    setQIndex(0); setPicked(null); setTimeLeft(ANSWER_SECONDS);
    setPhase("playing");
  }

  /* ─── بدء/إعادة البحث ─── */
  async function startSearch() {
    matchedRef.current = false; resolvedRef.current = false; submittedRef.current = false;
    setMatch(null); setResult(null); matchIdRef.current = null;
    setWaited(0); setPhase("searching");
    try {
      const meUser = await import("@/lib/cloud").then((m) => m.currentUser());
      const myUid = meUser?.uid ?? null;
      setUid(myUid);

      const res = await enqueue(track);
      if (res.matched && res.matchId) { await enterMatch(res.matchId); return; }

      if (myUid) unsubTicket.current = await watchTicket(myUid, (mid) => enterMatch(mid));
      pollRef.current = setInterval(async () => {
        if (matchedRef.current) return;
        try {
          const r = await enqueue(track);
          if (r.matched && r.matchId) enterMatch(r.matchId);
        } catch { /* تجاهل نبضة فاشلة */ }
      }, 3000);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "تعذّر البحث");
      setPhase("error");
    }
  }
  /* مراجع تحمل أحدث نسخة من الدوال للمؤقّتات/التركيب — تُحدَّث داخل effect
     (لا أثناء العرض) كي تستدعيها المؤقّتات بلا إدراجها في قوائم التبعيات. */
  const advanceRef = useRef<(c: number | null) => void>(() => {});
  const startSearchRef = useRef<() => void>(() => {});
  useEffect(() => { advanceRef.current = advance; startSearchRef.current = startSearch; });

  /* انطلاق أول بحث عند التركيب (مرة واحدة) */
  useEffect(() => { startSearchRef.current(); }, []);

  /* عدّاد البحث + مهلة 30 ثانية */
  useEffect(() => {
    if (phase !== "searching") return;
    const t = setInterval(() => {
      setWaited((w) => {
        const next = w + 1;
        if (next * 1000 >= SEARCH_TIMEOUT_MS && !matchedRef.current) {
          setPhase("timedout");
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  /* تنظيف شامل عند الخروج: ألغِ الطابور أو انسحب من المباراة غير المحسومة */
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      unsubTicket.current?.();
      unsubMatch.current?.();
      cancelQueue();
      if (matchIdRef.current && !resolvedRef.current) leaveMatch(matchIdRef.current);
    };
  }, []);

  /* عدّاد السؤال أثناء اللعب (يستدعي advance عبر المرجع) */
  useEffect(() => {
    if (phase !== "playing" || picked !== null) return;
    if (timeLeft <= 0) { advanceRef.current(null); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, picked]);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setTimeout(() => advanceRef.current(i), 650);
  };

  /* ─── العرض ─── */
  const oppUid = match && uid ? match.playerUids.find((p) => p !== uid) ?? null : null;
  const me = match && uid ? match.players[uid] : null;
  const opp = match && oppUid ? match.players[oppUid] : null;

  if (phase === "searching" || phase === "timedout") {
    const timedOut = phase === "timedout";
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-5">
        {!timedOut ? (
          <>
            <span className="inline-block w-12 h-12 rounded-full border-[3px] border-[var(--accent)] border-t-transparent animate-spin" />
            <div>
              <p className="font-black text-xl text-[var(--text)] mb-1">جاري البحث عن منافس…</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>نطابقك مع لاعب قريب من رتبتك ({waited}s)</p>
            </div>
            <button onClick={onExit} className="px-6 py-3 rounded-2xl font-bold text-sm"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              إلغاء البحث
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "color-mix(in srgb, var(--gold) 12%, transparent)", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, transparent)" }}>⏳</div>
            <div>
              <p className="font-black text-xl text-[var(--text)] mb-1">ما فيه منافس الحين</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>جرّب مرة ثانية أو العب ضد البوت لين يدخل أحد.</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button onClick={startSearch} className="w-full py-3.5 rounded-2xl font-bold glow-gold"
                style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid #F59E0B", color: "#F59E0B" }}>
                🔁 ابحث من جديد
              </button>
              <button onClick={onExit} className="w-full py-3 text-base" style={{ color: "var(--text-muted)" }}>
                رجوع
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-4">
        <p className="font-black text-lg text-[var(--text)]">تعذّر إكمال المباراة</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{errMsg}</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button onClick={startSearch} className="w-full py-3.5 rounded-2xl font-bold"
            style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid #F59E0B", color: "#F59E0B" }}>حاول مجدداً</button>
          <button onClick={onExit} className="w-full py-3" style={{ color: "var(--text-muted)" }}>رجوع</button>
        </div>
      </div>
    );
  }

  if (phase === "result" && result && uid && oppUid) {
    const won = result.winnerUid === uid;
    const draw = result.draw;
    const myScore = result.scores[uid] ?? 0;
    const oppScore = result.scores[oppUid] ?? 0;
    const myRp = result.rp[uid];
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-3">
        {won && <Confetti />}
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black text-white"
          style={{ background: won ? "linear-gradient(135deg,var(--accent-2),var(--accent-light))" : draw ? "linear-gradient(135deg,#92400e,#F59E0B)" : "linear-gradient(135deg,#7f1d1d,#EF4444)" }}>
          {won ? "🏆" : draw ? "🤝" : "💪"}
        </div>
        <h2 className="font-black text-3xl text-[var(--text)]">{won ? "فزت!" : draw ? "تعادل!" : "المرة القادمة!"}</h2>

        <div className="flex justify-center gap-8 my-1">
          <div><p className="font-mono-nums text-3xl font-black text-[var(--accent-light)]">{myScore}</p><p className="text-xs text-[var(--text-muted)]">أنت</p></div>
          <div><p className="font-mono-nums text-3xl font-black text-[var(--danger)]">{oppScore}</p><p className="text-xs text-[var(--text-muted)]">{opp?.name ?? "الخصم"}</p></div>
        </div>

        {myRp && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <RankBadge rp={myRp.newRP} size="md" showRp />
              <span className="font-mono-nums font-black text-[15px]"
                style={{ color: myRp.delta >= 0 ? "var(--success)" : "var(--danger)" }}>
                {myRp.delta >= 0 ? "+" : ""}{myRp.delta} RP
              </span>
            </div>
            {myRp.streakBonus > 0 && <p className="text-[12px]" style={{ color: "var(--gold)" }}>🔥 مكافأة سلسلة +{myRp.streakBonus}</p>}
            {myRp.promoted && <p className="text-[13px] font-black" style={{ color: "var(--success)" }}>⬆️ ترقية رتبة!</p>}
            {myRp.demoted && <p className="text-[13px] font-black" style={{ color: "var(--danger)" }}>⬇️ خفض رتبة</p>}
          </div>
        )}

        <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
          <button onClick={startSearch} className="w-full py-4 rounded-2xl font-bold glow-gold"
            style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid #F59E0B", color: "#F59E0B" }}>مباراة أخرى</button>
          <button onClick={onExit} className="w-full py-3 text-base" style={{ color: "var(--text-muted)" }}>رجوع للأرينا</button>
        </div>
      </div>
    );
  }

  /* phase playing / waiting */
  const qs = match?.questions ?? [];
  const q = qs[qIndex];
  const oppDone = match && oppUid ? !!match.submissions?.[oppUid] : false;

  if (phase === "waiting" || !q) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-4">
        <span className="inline-block w-10 h-10 rounded-full border-[3px] border-[var(--accent)] border-t-transparent animate-spin" />
        <p className="font-black text-lg text-[var(--text)]">{oppDone ? "نحسب النتيجة…" : "بانتظار الخصم ينهي…"}</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>لو انقطع الخصم تُحسم المباراة لصالحك تلقائياً.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* رأس النتيجة + الرتب (قبل/أثناء المباراة) */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>{(me?.name ?? "؟").charAt(0)}</div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[var(--text-muted)] truncate">{me?.name ?? "أنت"}</p>
            {me && <RankBadge rp={me.rp} size="xs" showLabel={false} showRp />}
          </div>
        </div>
        <span className="font-mono-nums font-black text-[var(--text)]">{qIndex + 1}/{qs.length}</span>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <div className="min-w-0 text-left">
            <p className="text-[11px] font-bold text-[var(--text-muted)] truncate">{opp?.name ?? "الخصم"}{oppDone ? " ✓" : ""}</p>
            {opp && <RankBadge rp={opp.rp} size="xs" showLabel={false} showRp />}
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7f1d1d,#EF4444)" }}>{(opp?.name ?? "؟").charAt(0)}</div>
        </div>
      </div>

      <div className="px-5 flex-1 flex flex-col justify-center">
        <div className="glass rounded-3xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs px-2.5 py-1 rounded-full glass text-[var(--accent-light)]">{q.subject}</span>
            <span className="font-mono-nums font-black text-lg" style={{ color: timeLeft <= 5 ? "#EF4444" : "var(--gold)" }}>{timeLeft}s</span>
          </div>
          <p className="text-lg font-bold text-[var(--text)] leading-relaxed">{q.q}</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {q.options.map((opt, i) => {
            const isPicked = picked === i;
            return (
              <button key={i} onClick={() => pick(i)} disabled={picked !== null}
                className="py-4 px-4 rounded-2xl font-bold text-base text-right transition active:scale-[0.98] disabled:cursor-default min-h-[56px] flex items-center justify-between gap-2"
                style={{
                  background: isPicked ? "color-mix(in srgb, var(--accent) 18%, var(--surface))" : "var(--surface)",
                  border: `1.5px solid ${isPicked ? "var(--accent)" : "var(--border)"}`,
                  color: isPicked ? "var(--accent-light)" : "var(--text)",
                }}>
                <span className="flex-1">{opt}</span>
                {isPicked && <span>●</span>}
              </button>
            );
          })}
        </div>
        <p className="text-center text-[12px] mt-3" style={{ color: "var(--text-muted)" }}>
          تُكشف النتيجة بعد انتهاء الجولة — جاوب بسرعة ودقة.
        </p>
      </div>
    </div>
  );
}
