"use client";
/* ─── تصدير بيانات الطالب المحلية كملف JSON ───
   يجمع كل مفاتيح درب من localStorage ويُنزّلها ملفاً واحداً.
   حق الطالب في بياناته (قابلية النقل) — لا خادم، كله في المتصفح. */

const DARB_PREFIX = "darb_";

export function exportData(): void {
  if (typeof window === "undefined") return;
  const data: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(DARB_PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (raw == null) continue;
      try { data[k] = JSON.parse(raw); } catch { data[k] = raw; }
    }
  } catch {}

  const payload = {
    app: "درب",
    exportedAt: new Date().toISOString(),
    version: 1,
    data,
  };

  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `darb-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {}
}
