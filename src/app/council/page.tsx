"use client";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { loadUser, loadList, saveList } from "@/lib/storage";
import { getTrack, type Track } from "@/lib/tracks";

interface Post {
  id: number;
  user: string;
  time: number;
  content: string;
  subject: string;
  likes: number;
}

const POSTS_KEY = "darb_posts";

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

export default function CouncilPage() {
  const [activeTab, setActiveTab] = useState<"feed" | "clash">("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [userName, setUserName] = useState("");
  const [newPost, setNewPost] = useState("");
  const [newSubject, setNewSubject] = useState("عام");
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  useEffect(() => {
    const u = loadUser();
    setUserName(u?.name ?? "طالب");
    const t = getTrack(u?.track);
    setTrack(t);
    setPosts(loadList<Post>(POSTS_KEY));
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveList(POSTS_KEY, posts); }, [posts, loaded]);

  const subjects = ["عام", ...(track?.subjects.map((s) => s.name) ?? [])];

  const publish = () => {
    if (!newPost.trim()) return;
    setPosts((p) => [{
      id: Date.now(),
      user: userName,
      time: Date.now(),
      content: newPost.trim(),
      subject: newSubject,
      likes: 0,
    }, ...p]);
    setNewPost("");
  };

  const toggleLike = (id: number) => {
    setLikedPosts((p) => {
      const next = new Set(p);
      const delta = next.has(id) ? -1 : 1;
      if (next.has(id)) next.delete(id); else next.add(id);
      setPosts((ps) => ps.map((x) => (x.id === id ? { ...x, likes: Math.max(0, x.likes + delta) } : x)));
      return next;
    });
  };

  return (
    <div className="min-h-dvh pb-nav relative z-[1]">
      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg" style={{ color: "var(--text)" }}>المجلس</h1>
          <span className="dome-chip text-[13px] font-bold" style={{ color: "var(--text-dim)" }}>{posts.length} منشور</span>
        </div>
      </Dome>
      <div className="h-5" />

      {/* Tabs */}
      <div className="px-5 mb-4 rise rise-1">
        <div className="grid grid-cols-2 glass rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("feed")}
            className={`py-3 rounded-xl text-base font-bold transition min-h-[48px] ${activeTab === "feed" ? "text-[var(--accent-light)]" : "text-[var(--text-muted)]"}`}
            style={activeTab === "feed" ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)" } : undefined}
          >
            النقاشات
          </button>
          <button
            onClick={() => setActiveTab("clash")}
            className={`py-3 rounded-xl text-base font-bold transition min-h-[48px] ${activeTab === "clash" ? "text-[var(--accent-light)]" : "text-[var(--text-muted)]"}`}
            style={activeTab === "clash" ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1.5px solid var(--accent)" } : undefined}
          >
            Regional Clash
          </button>
        </div>
      </div>

      {activeTab === "feed" ? (
        <div className="px-5 space-y-4 rise rise-2">

          {/* صندوق الكتابة */}
          <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={2}
              placeholder={`شارك سؤال أو فايدة يا ${userName}...`}
              className="w-full rounded-xl px-3 py-2.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            />
            <div className="flex gap-2.5">
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none min-h-[48px]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              >
                {subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button
                onClick={publish}
                disabled={!newPost.trim()}
                className="flex-1 rounded-xl font-bold text-base transition min-h-[48px]"
                style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)", opacity: newPost.trim() ? 1 : 0.4 }}
              >
                انشر
              </button>
            </div>
          </div>

          {/* المنشورات */}
          {loaded && posts.length === 0 && (
            <div className="text-center py-12">
              <p className="title-md text-[var(--text)] mb-2">المجلس هادئ</p>
              <p className="body-sm max-w-xs mx-auto">كن أول من يفتح النقاش — سؤال غلطت فيه، فايدة، أو تجربة مذاكرة.</p>
            </div>
          )}

          {posts.map((post) => (
            <div key={post.id} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,var(--accent-2),var(--accent-light))" }}
                >
                  {post.user.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[var(--text)]">{post.user}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{timeAgo(post.time)}</p>
                </div>
                <span
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "color-mix(in srgb, var(--accent) 13%, transparent)", color: "var(--accent-light)" }}
                >
                  {post.subject}
                </span>
              </div>
              <p className="text-base text-[var(--text-dim)] leading-relaxed mb-3">{post.content}</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-sm transition min-h-[40px] ${likedPosts.has(post.id) ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}
                >
                  ♥ {post.likes}
                </button>
                <button
                  onClick={() => setPosts((p) => p.filter((x) => x.id !== post.id))}
                  className="text-sm text-[var(--text-muted)] min-h-[40px] mr-auto"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 rise rise-2">
          <div className="glass rounded-2xl p-8 text-center">
            <p className="font-black text-lg text-[var(--text)] mb-2">Regional Clash</p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xs mx-auto">
              تصنيف المناطق حسب ساعات التركيز الأسبوعية — يفتح تلقائياً عند انضمام طلاب من منطقتك.
              ساعاتك الحقيقية من Orbit هي اللي تحسب.
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
