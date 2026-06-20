"use client";
/* ─── دويرب: استخرج مواضيع ───
   يختار الطالب مادة، ودويرب يستخرج مواضيعها من صورة فهرس/ملف،
   ثم تُحفظ كدروس في «مساري» (darb_lessons) فتظهر في الخريطة فوراً. */
import { useState } from "react";
import TopicExtractor from "@/components/TopicExtractor";
import { loadList, saveList } from "@/lib/storage";

interface CustomLesson { id: string; subject: string; title: string; }

interface Props {
  subjects: { name: string; color: string }[];
}

export default function TopicsTool({ subjects }: Props) {
  const [subject, setSubject] = useState(subjects[0]?.name ?? "");
  const [addedMsg, setAddedMsg] = useState("");

  const color = subjects.find((s) => s.name === subject)?.color ?? "var(--accent)";

  const handleAdd = (titles: string[]) => {
    const existing = loadList<CustomLesson>("darb_lessons");
    const next = [
      ...existing,
      ...titles.map((t, i) => ({ id: `${Date.now()}-${i}`, subject, title: t })),
    ];
    saveList("darb_lessons", next);
    setAddedMsg(`أُضيفت ${titles.length} مواضيع إلى «${subject}» في مساري ✓`);
  };

  if (subjects.length === 0) {
    return (
      <p className="text-[14px] text-center py-4" style={{ color: "var(--text-muted)" }}>
        فعّل مساراً أولاً عشان نعرف مادتك.
      </p>
    );
  }

  return (
    <div>
      <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>
        اختر المادة، صوّر فهرس الكتاب أو ارفع ملفاً، ودويرب يستخرج المواضيع ويضيفها لمساري.
      </p>

      <select value={subject} onChange={(e) => { setSubject(e.target.value); setAddedMsg(""); }}
        className="w-full rounded-2xl px-4 py-3 text-[15px] outline-none min-h-[48px] mb-3"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }}>
        {subjects.map((s) => <option key={s.name}>{s.name}</option>)}
      </select>

      <TopicExtractor subject={subject} color={color} onAdd={handleAdd} />

      {addedMsg && (
        <p className="text-[13px] text-center mt-3 font-bold" style={{ color: "var(--success)" }}>{addedMsg}</p>
      )}
    </div>
  );
}
