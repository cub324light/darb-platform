"use client";
import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

const POSTS = [
  {
    id: 1,
    user: "الصقر ع.",
    bird: "🦅",
    time: "منذ 5 دقائق",
    content: "تجميع فيزياء 2025 كامل — الباب الأول والثاني حللتهم الليلة. شاركوني أي سؤال غلطتوا فيه",
    likes: 23,
    replies: 7,
    subject: "فيزياء",
    subjectColor: "#2563EB",
  },
  {
    id: 2,
    user: "الهدهد ر.",
    bird: "🦜",
    time: "منذ 20 دقيقة",
    content: "سؤال: كيف تفرقون بين حالات التفاعل الطارد والماص للحرارة في الأسئلة؟ دايم تخلط عليّ",
    likes: 12,
    replies: 15,
    subject: "كيمياء",
    subjectColor: "#10B981",
  },
  {
    id: 3,
    user: "البجعة س.",
    bird: "🦢",
    time: "منذ 1 ساعة",
    content: "نصيحة من قلبي: ما تذكروا القوانين منفصلة. افهموا العلاقة بينها. الفيزياء قصة واحدة مترابطة",
    likes: 45,
    replies: 3,
    subject: "فيزياء",
    subjectColor: "#2563EB",
  },
  {
    id: 4,
    user: "الغراب م.",
    bird: "🐦‍⬛",
    time: "منذ 2 ساعة",
    content: "7 أيام streak هذا الأسبوع والخزنة عندي 18 سؤال راجعتهم 3 مرات. الأسلوب يشتغل",
    likes: 67,
    replies: 11,
    subject: "عام",
    subjectColor: "#64748B",
  },
];

const REGIONAL = [
  { region: "بقيق", hours: 1240, students: 34 },
  { region: "الدمام", hours: 3850, students: 92 },
  { region: "الرياض", hours: 5120, students: 143 },
];

export default function CouncilPage() {
  const [activeTab, setActiveTab] = useState<"feed" | "clash">("feed");
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const isPlanFree = true;

  const toggleLike = (id: number) => {
    if (isPlanFree) return;
    setLikedPosts((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-[var(--bg)] pb-nav">
      <div className="page-header">
        <h1 className="font-black text-lg text-[var(--text)]">المجلس 💬</h1>
        <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 rounded-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-xs text-[var(--success)] font-bold">183</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-2 glass rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("feed")}
            className={`py-2 rounded-xl text-sm font-bold transition ${activeTab === "feed" ? "bg-[var(--blue)] text-white" : "text-[var(--text-muted)]"}`}
          >
            النقاشات
          </button>
          <button
            onClick={() => setActiveTab("clash")}
            className={`py-2 rounded-xl text-sm font-bold transition ${activeTab === "clash" ? "bg-[var(--blue)] text-white" : "text-[var(--text-muted)]"}`}
          >
            Regional Clash
          </button>
        </div>
      </div>

      {activeTab === "feed" ? (
        <div className="px-5 space-y-3">
          {/* Free user notice */}
          {isPlanFree && (
            <div
              className="rounded-2xl p-3 flex items-center gap-3"
              style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.15)" }}
            >
              <span className="text-lg">👁️</span>
              <div>
                <p className="text-xs text-[var(--text-dim)]">
                  أنت في وضع القراءة فقط.{" "}
                  <Link href="/pricing" className="text-[var(--blue-light)] underline">رقّي لشاهين</Link>
                  {" "}للمشاركة في النقاشات.
                </p>
              </div>
            </div>
          )}

          {POSTS.map((post) => (
            <div key={post.id} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{post.bird}</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[var(--text)]">{post.user}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{post.time}</p>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: post.subjectColor + "22", color: post.subjectColor }}
                >
                  {post.subject}
                </span>
              </div>
              <p className="text-sm text-[var(--text-dim)] leading-relaxed mb-3">{post.content}</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-xs transition ${isPlanFree ? "opacity-40 cursor-not-allowed" : "hover:text-[var(--danger)]"} ${likedPosts.has(post.id) ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}
                >
                  ♥ {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                </button>
                <button
                  className={`flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition ${isPlanFree ? "opacity-40 cursor-not-allowed" : "hover:text-[var(--blue-light)]"}`}
                >
                  💬 {post.replies}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 space-y-4">
          <div className="glass rounded-2xl p-4 text-center mb-2">
            <p className="font-black text-base text-[var(--text)] mb-1">Regional Clash</p>
            <p className="text-xs text-[var(--text-muted)]">تصنيف المناطق حسب ساعات التركيز هذا الأسبوع</p>
          </div>
          {REGIONAL.map((r, i) => (
            <div key={r.region} className="glass rounded-2xl p-4 flex items-center gap-4">
              <span className="font-mono-nums text-2xl font-black text-[var(--text-muted)]">#{i + 1}</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-[var(--text)]">{r.region}</p>
                <p className="text-xs text-[var(--text-muted)]">{r.students} طالب</p>
                <div className="h-1.5 bg-[var(--border)] rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: (r.hours / REGIONAL[REGIONAL.length - 1].hours) * 100 + "%",
                      background: i === 0 ? "#F59E0B" : i === 1 ? "#2563EB" : "#64748B",
                    }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="font-mono-nums font-black text-lg text-[var(--gold)]">{r.hours.toLocaleString()}</p>
                <p className="text-[9px] text-[var(--text-muted)]">ساعة</p>
              </div>
            </div>
          ))}
          <p className="text-center text-xs text-[var(--text-muted)] pt-2">
            قابل للتوسع: الرياض، جدة، المدينة...
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
