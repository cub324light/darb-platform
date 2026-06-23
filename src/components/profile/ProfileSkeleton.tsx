"use client";
/* ─── حالة تحميل هيكلية للملف الشخصي — تستخدم .skeleton الموجود ─── */
import { memo } from "react";

const card = { background: "var(--surface)", border: "1px solid var(--border)" };

function Bar({ w, h = 14 }: { w: string; h?: number }) {
  return <span className="skeleton block rounded-md" style={{ width: w, height: h }} />;
}

function ProfileSkeletonBase() {
  return (
    <div className="px-5 py-5 max-w-lg mx-auto flex flex-col gap-5" aria-hidden>
      {/* الترويسة */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={card}>
        <div className="flex items-center gap-4">
          <span className="skeleton rounded-2xl flex-shrink-0" style={{ width: 64, height: 64 }} />
          <div className="flex-1 flex flex-col gap-2">
            <Bar w="55%" h={20} />
            <Bar w="80%" h={12} />
          </div>
        </div>
        <Bar w="100%" h={8} />
      </div>

      {/* التبويب */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className="skeleton rounded-full" style={{ width: 84, height: 34 }} />)}
      </div>

      {/* شبكة محتوى */}
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="skeleton rounded-2xl" style={{ height: 86 }} />
        ))}
      </div>
      <div className="rounded-2xl p-5 flex flex-col gap-3" style={card}>
        <Bar w="40%" h={14} />
        <Bar w="100%" h={12} />
        <Bar w="90%" h={12} />
      </div>
    </div>
  );
}

export default memo(ProfileSkeletonBase);
