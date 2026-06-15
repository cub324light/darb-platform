"use client";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { loadUser, loadList, saveList } from "@/lib/storage";
import { subjectsForTracks, type TrackId } from "@/lib/tracks";

interface Reply {
  id: number;
  user: string;
  time: number;
  content: string;
}

interface Post {
  id: number;
  user: string;
  time: number;
  content: string;
  subject: string;
  likes: number;
  replies?: Reply[];
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt?: { seconds: number };
}

type Tab = "feed" | "channels" | "challenge";
type Difficulty = "easy" | "medium" | "hard" | "impossible";
type ChallengeMode = "setup" | "playing" | "done";

const POSTS_KEY = "darb_posts";

const BOT_CHANCE: Record<Difficulty, number> = {
  easy: 0.30,
  medium: 0.55,
  hard: 0.75,
  impossible: 0.95,
};

const DIFF_AR: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  impossible: "مستحيل",
};

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

export default function CouncilPage() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  /* ── بيانات المستخدم ── */
  const [posts, setPosts] = useState<Post[]>(() =>
    typeof window !== "undefined" ? loadList<Post>(POSTS_KEY) : []
  );
  const [trackSubjects] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const finalIds = ids.length ? ids : (["تحصيلي"] as TrackId[]);
    return subjectsForTracks(finalIds).map((s) => s.name);
  });
  const [userName] = useState(() => {
    const u = typeof window !== "undefined" ? loadUser() : null;
    return u?.name ?? "طالب";
  });
  const [vaultErrors] = useState<{ question: string; note?: string; subject?: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("darb_vault") ?? "[]"); } catch { return []; }
  });

  /* ── النقاشات ── */
  const [newPost, setNewPost] = useState("");
  const [newSubject, setNewSubject] = useState("عام");
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => { saveList(POSTS_KEY, posts); }, [posts]);

  const subjects = ["عام", ...trackSubjects];

  const publish = () => {
    if (!newPost.trim()) return;
    setPosts((p) => [{
      id: Date.now(), user: userName, time: Date.now(),
      content: newPost.trim(), subject: newSubject, likes: 0, replies: [],
    }, ...p]);
    setNewPost("");
  };

  const toggleLike = (id: number) => {
    const willRemove = likedPosts.has(id);
    setLikedPosts((p) => { const n = new Set(p); willRemove ? n.delete(id) : n.add(id); return n; });
    setPosts((ps) => ps.map((x) => (x.id === id ? { ...x, likes: Math.max(0, x.likes + (willRemove ? -1 : 1)) } : x)));
  };

  const addReply = (postId: number) => {
    if (!replyText.trim()) return;
    setPosts((ps) => ps.map((p) => p.id === postId ? {
      ...p,
      replies: [...(p.replies ?? []), { id: Date.now(), user: userName, time: Date.now(), content: replyText.trim() }],
    } : p));
    setReplyText(""); setReplyingTo(null);
  };

  /* ── القنوات الرسمية ── */
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "channels") return;
    setAnnouncementsLoading(true);
    fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "getAnnouncements" }),
    })
      .then((r) => r.json())
      .then((d: { announcements?: Announcement[] }) => { if (d.announcements) setAnnouncements(d.announcements); })
      .catch(() => {})
      .finally(() => setAnnouncementsLoading(false));
  }, [activeTab]);

  /* ── التحدي ── */
  const [challengePhase, setChallengePhase] = useState<ChallengeMode>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [useVault, setUseVault] = useState(false);
  const [questions, setQuestions] = useState<{ q: string; a: string }[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<"correct" | "wrong" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [botGotIt, setBotGotIt] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeErr, setChallengeErr] = useState("");

  const startChallenge = async () => {
    setChallengeLoading(true);
    setChallengeErr("");
    let qs: { q: string; a: string }[] = [];

    if (useVault && vaultErrors.length > 0) {
      const shuffled = [...vaultErrors].sort(() => Math.random() - 0.5).slice(0, 5);
      qs = shuffled.map((e) => ({ q: e.question, a: e.note || "راجع المفهوم" }));
    } else {
      try {
        const subjectNames = trackSubjects.join(", ") || "عام";
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "questions", prompt: subjectNames, subjects: trackSubjects }),
        });
        const data = (await res.json()) as { text?: string; message?: string };
        const raw = data.text ?? data.message ?? "";
        const lines = raw.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i].trim();
          if (l.startsWith("س:")) {
            const q = l.replace(/^س:/, "").trim();
            const next = lines[i + 1]?.trim() ?? "";
            const a = next.startsWith("ج:") ? next.replace(/^ج:/, "").trim() : "";
            if (q && a) qs.push({ q, a });
          }
        }
      } catch {
        setChallengeErr("تعذّر تحميل الأسئلة — تأكد من الاتصال");
      }
    }

    if (qs.length === 0 && !challengeErr) {
      setChallengeErr("لم يتم العثور على أسئلة — جرّب مرة أخرى");
    }

    if (qs.length > 0) {
      setQuestions(qs);
      setCurrentQ(0);
      setUserScore(0);
      setBotScore(0);
      setSelectedAnswer(null);
      setRevealed(false);
      setChallengePhase("playing");
    }
    setChallengeLoading(false);
  };

  const answerQuestion = (correct: boolean) => {
    if (revealed) return;
    setSelectedAnswer(correct ? "correct" : "wrong");
    const bot = Math.random() < BOT_CHANCE[difficulty];
    setBotGotIt(bot);
    if (correct) setUserScore((s) => s + 1);
    if (bot) setBotScore((s) => s + 1);
    setRevealed(true);
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setChallengePhase("done");
    } else {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setRevealed(false);
    }
  };

  const resetChallenge = () => {
    setChallengePhase("setup");
    setQuestions([]);
    setChallengeErr("");
  };

  /* ── تبويبات ── */
  const tabs: { id: Tab; label: string }[] = [
    { id: "feed",      label: "النقاشات" },
    { id: "channels",  label: "القنوات" },
    { id: "challenge", label: "التحدي" },
  ];

  return (
    <div className="min-h-dvh pb-nav relative z-[1]">
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg" style={{ color: "var(--text)" }}>المجلس</h1>
          <span className="dome-chip text-[17px] font-bold" style={{ color: "var(--text-dim)" }}>{posts.length} منشور</span>
        </div>
      </Dome>
      <div className="h-5" />

      {/* Tabs */}
      <div className="px-5 mb-4 rise rise-1">
        <div className="grid grid-cols-3 glass rounded-2xl p-1 gap-1">
          {tabs.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`py-3 rounded-xl text-base font-bold transition min-h-[48px] ${activeTab === id ? "text-[var(--accent-light)]" : "text-[var(--text-muted)]"}`}
              style={activeTab === id ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)" } : undefined}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── النقاشات ── */}
      {activeTab === "feed" && (
        <div className="px-5 space-y-4 rise rise-2">
          <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
            <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} rows={2}
              placeholder={`شارك سؤال أو فايدة يا ${userName}...`}
              className="w-full rounded-xl px-3 py-2.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
            <div className="flex gap-2.5">
              <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                className="rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none min-h-[48px]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                {subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button onClick={publish} disabled={!newPost.trim()}
                className="flex-1 rounded-xl font-bold text-base transition min-h-[48px]"
                style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)", opacity: newPost.trim() ? 1 : 0.4 }}>
                انشر
              </button>
            </div>
          </div>

          {posts.length === 0 && (
            <div className="text-center py-12">
              <p className="title-md text-[var(--text)] mb-2">المجلس هادئ</p>
              <p className="body-sm max-w-xs mx-auto">كن أول من يفتح النقاش — سؤال غلطت فيه، فايدة، أو تجربة مذاكرة.</p>
            </div>
          )}

          {posts.map((post) => (
            <div key={post.id} className="glass rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
                    {post.user.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--text)]">{post.user}</p>
                    <p className="text-[13px] text-[var(--text-muted)]">{timeAgo(post.time)}</p>
                  </div>
                  <span className="text-[13px] px-2.5 py-1 rounded-full font-medium"
                    style={{ background: "color-mix(in srgb, var(--accent) 13%, transparent)", color: "var(--accent-light)" }}>
                    {post.subject}
                  </span>
                </div>
                <p className="text-base text-[var(--text-dim)] leading-relaxed mb-3">{post.content}</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition min-h-[40px] ${likedPosts.has(post.id) ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
                    ♥ {post.likes}
                  </button>
                  <button onClick={() => { setReplyingTo(replyingTo === post.id ? null : post.id); setReplyText(""); }}
                    className="text-sm font-semibold min-h-[40px]"
                    style={{ color: replyingTo === post.id ? "var(--accent-light)" : "var(--text-muted)" }}>
                    رد {(post.replies?.length ?? 0) > 0 ? `(${post.replies!.length})` : ""}
                  </button>
                  {post.user === userName && (
                    <button onClick={() => setPosts((p) => p.filter((x) => x.id !== post.id))}
                      className="text-sm text-[var(--text-muted)] min-h-[40px] mr-auto">
                      حذف
                    </button>
                  )}
                </div>
              </div>
              {((post.replies?.length ?? 0) > 0 || replyingTo === post.id) && (
                <div className="border-t border-[var(--border)] px-4 py-3 flex flex-col gap-3"
                  style={{ background: "color-mix(in srgb, var(--surface2) 60%, transparent)" }}>
                  {post.replies?.map((r) => (
                    <div key={r.id} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
                        {r.user.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-[var(--text)]">{r.user}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">{timeAgo(r.time)}</span>
                        </div>
                        <p className="text-sm text-[var(--text-dim)] mt-0.5 leading-relaxed">{r.content}</p>
                      </div>
                    </div>
                  ))}
                  {replyingTo === post.id && (
                    <div className="flex gap-2 mt-1">
                      <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                        placeholder="اكتب رداً..." autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addReply(post.id); } }}
                        className="flex-1 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[44px]"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
                      <button onClick={() => addReply(post.id)} disabled={!replyText.trim()}
                        className="px-4 rounded-xl font-bold text-sm min-h-[44px]"
                        style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)", opacity: replyText.trim() ? 1 : 0.4 }}>
                        أرسل
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── القنوات الرسمية ── */}
      {activeTab === "channels" && (
        <div className="px-5 rise rise-2">
          {/* رأس القناة الرسمية */}
          <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}>
              📢
            </div>
            <div>
              <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>درب الرسمي</p>
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>إعلانات وأخبار المنصة</p>
            </div>
          </div>

          {announcementsLoading ? (
            <div className="text-center py-10">
              <div className="inline-block w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-bold text-[15px]" style={{ color: "var(--text)" }}>لا توجد إعلانات حتى الآن</p>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>تابع هنا لآخر أخبار وتحديثات المنصة</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {announcements.map((a) => (
                <div key={a.id} className="glass rounded-2xl p-4">
                  <p className="font-black text-[16px] mb-1" style={{ color: "var(--text)" }}>{a.title}</p>
                  <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-dim)" }}>{a.content}</p>
                  {a.createdAt && (
                    <p className="text-[12px] mt-2" style={{ color: "var(--text-muted)" }}>
                      {new Date(a.createdAt.seconds * 1000).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── التحدي ── */}
      {activeTab === "challenge" && (
        <div className="px-5 rise rise-2">
          {challengePhase === "setup" && (
            <div className="flex flex-col gap-4">
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-4xl mb-2">⚔️</p>
                <p className="font-black text-xl mb-1" style={{ color: "var(--text)" }}>تحدّ البوت</p>
                <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>أجب على ٥ أسئلة وقارن نتيجتك مع البوت</p>
              </div>

              {/* مستوى الصعوبة */}
              <div className="glass rounded-2xl p-4">
                <p className="text-[13px] font-black mb-3" style={{ color: "var(--text-muted)" }}>مستوى الصعوبة</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["easy", "medium", "hard", "impossible"] as Difficulty[]).map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className="py-3 rounded-xl font-bold text-[14px] transition"
                      style={difficulty === d
                        ? { background: "var(--accent)", color: "white", border: "1.5px solid var(--accent)" }
                        : { background: "var(--surface2)", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}>
                      {DIFF_AR[d]}
                      <span className="block text-[11px] mt-0.5 opacity-70">
                        {d === "easy" ? "البوت ٣٠٪" : d === "medium" ? "البوت ٥٥٪" : d === "hard" ? "البوت ٧٥٪" : "البوت ٩٥٪"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* استخدام الخزنة */}
              {vaultErrors.length > 0 && (
                <button onClick={() => setUseVault((v) => !v)}
                  className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3 text-right transition"
                  style={{ border: `1.5px solid ${useVault ? "var(--accent)" : "var(--border)"}` }}>
                  <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-white text-sm font-black`}
                    style={{ background: useVault ? "var(--accent)" : "var(--border)" }}>
                    {useVault ? "✓" : ""}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[14px]" style={{ color: "var(--text)" }}>
                      اسحب الأسئلة من خزنتي
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                      {vaultErrors.length} خطأ محفوظ · ميزة شاهين
                    </p>
                  </div>
                </button>
              )}

              {challengeErr && (
                <p className="text-[13px] font-semibold text-center px-4" style={{ color: "var(--danger)" }}>{challengeErr}</p>
              )}

              <button onClick={startChallenge} disabled={challengeLoading}
                className="btn-primary w-full py-4 text-[16px] font-black disabled:opacity-60">
                {challengeLoading ? "جاري التحميل..." : "ابدأ التحدي ⚔️"}
              </button>
            </div>
          )}

          {challengePhase === "playing" && questions[currentQ] && (
            <div className="flex flex-col gap-4">
              {/* النتيجة والتقدم */}
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--text-muted)" }}>
                    سؤال {currentQ + 1} من {questions.length}
                  </span>
                  <span className="text-[12px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)" }}>
                    {DIFF_AR[difficulty]}
                  </span>
                </div>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1px solid var(--success)" }}>
                    <p className="text-[11px] font-bold" style={{ color: "var(--success)" }}>أنت</p>
                    <p className="font-black text-xl" style={{ color: "var(--success)" }}>{userScore}</p>
                  </div>
                  <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", border: "1px solid var(--danger)" }}>
                    <p className="text-[11px] font-bold" style={{ color: "var(--danger)" }}>البوت</p>
                    <p className="font-black text-xl" style={{ color: "var(--danger)" }}>{botScore}</p>
                  </div>
                </div>
                <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${((currentQ) / questions.length) * 100}%`, background: "var(--accent)" }} />
                </div>
              </div>

              {/* السؤال */}
              <div className="glass rounded-2xl p-5">
                <p className="text-[11px] font-black mb-3" style={{ color: "var(--text-muted)" }}>السؤال</p>
                <p className="text-[16px] font-bold leading-relaxed" style={{ color: "var(--text)" }}>
                  {questions[currentQ].q}
                </p>
              </div>

              {/* أزرار الإجابة أو الكشف */}
              {!revealed ? (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => answerQuestion(true)}
                    className="py-4 rounded-2xl font-black text-[15px] transition active:scale-[0.97]"
                    style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", border: "1.5px solid var(--success)", color: "var(--success)" }}>
                    أعرفه ✓
                  </button>
                  <button onClick={() => answerQuestion(false)}
                    className="py-4 rounded-2xl font-black text-[15px] transition active:scale-[0.97]"
                    style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1.5px solid var(--danger)", color: "var(--danger)" }}>
                    ما أعرفه ✗
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* نتيجة الجولة */}
                  <div className="glass rounded-2xl p-4">
                    <p className="text-[11px] font-black mb-2" style={{ color: "var(--text-muted)" }}>الإجابة</p>
                    <p className="text-[15px] font-bold leading-relaxed" style={{ color: "var(--text)" }}>
                      {questions[currentQ].a}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <span className="text-[12px] px-2.5 py-1 rounded-full font-bold"
                        style={{
                          background: selectedAnswer === "correct" ? "color-mix(in srgb, var(--success) 15%, transparent)" : "color-mix(in srgb, var(--danger) 12%, transparent)",
                          color: selectedAnswer === "correct" ? "var(--success)" : "var(--danger)",
                        }}>
                        أنت: {selectedAnswer === "correct" ? "أصبت ✓" : "أخطأت ✗"}
                      </span>
                      <span className="text-[12px] px-2.5 py-1 rounded-full font-bold"
                        style={{
                          background: botGotIt ? "color-mix(in srgb, var(--danger) 12%, transparent)" : "color-mix(in srgb, var(--success) 15%, transparent)",
                          color: botGotIt ? "var(--danger)" : "var(--success)",
                        }}>
                        البوت: {botGotIt ? "أصاب ✓" : "أخطأ ✗"}
                      </span>
                    </div>
                  </div>
                  <button onClick={nextQuestion}
                    className="btn-primary w-full py-3.5 font-black text-[15px]">
                    {currentQ + 1 >= questions.length ? "عرض النتيجة" : "السؤال التالي ←"}
                  </button>
                </div>
              )}
            </div>
          )}

          {challengePhase === "done" && (
            <div className="flex flex-col gap-4">
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-5xl mb-3">
                  {userScore > botScore ? "🏆" : userScore === botScore ? "🤝" : "💪"}
                </p>
                <p className="font-black text-xl mb-1" style={{ color: "var(--text)" }}>
                  {userScore > botScore ? "فزت!" : userScore === botScore ? "تعادل!" : "خسرت هذه المرة"}
                </p>
                <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
                  {userScore > botScore ? "البوت ما وقف أمامك" : userScore === botScore ? "نتيجة متقاربة" : "البوت كان أقوى — حاول مجدداً"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-2xl p-4 text-center">
                  <p className="text-[12px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>أنت</p>
                  <p className="font-black text-4xl" style={{ color: "var(--success)" }}>{userScore}</p>
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>من {questions.length}</p>
                </div>
                <div className="glass rounded-2xl p-4 text-center">
                  <p className="text-[12px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>البوت</p>
                  <p className="font-black text-4xl" style={{ color: "var(--danger)" }}>{botScore}</p>
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>من {questions.length}</p>
                </div>
              </div>

              <button onClick={resetChallenge} className="btn-primary w-full py-4 font-black text-[15px]">
                تحدّ مرة أخرى ⚔️
              </button>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
