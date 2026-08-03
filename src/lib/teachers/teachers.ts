/* ═══════════ مدرّسوك — المحرّك النقيّ ═══════════
   طلبان في واحد: **دليلٌ** (اسمٌ ومادّةٌ وطريقةُ تواصل) و**دفترٌ لكل مدرّس**
   (ملاحظاتٌ حرّة تتراكم تحته: كيف يشرح، ما الذي يركّز عليه، ماذا وعد به).

   ▓ لا نبني نظاماً ثانياً للملاحظات: ملاحظةُ المدرّس ليست خطأً دراسياً، فلا
     تُقحَم في «أخطائي» فتلوّث سجلّاً غرضُه المراجعة. لها مفتاحُها الواحد، وحقلُ
     `noteCount` لا يُخزَّن بل يُحسب.

   ▓ التواصلُ اختياريّ تماماً، ويبقى في جهاز الطالب: لا يُرسَل إلى خادمٍ ولا إلى
     نموذجِ ذكاء. وهو بياناتُ شخصٍ ثالث (المدرّس) فلا نتصرّف فيه.

   ▓ نقيّ: مُدخلاتٌ داخلة ونتيجةٌ خارجة. لا تخزين ولا نافذة ولا وقت. */

export interface TeacherNote {
  id: string;
  text: string;
  at: number;          // ms — وقتُ الكتابة
}

export interface Teacher {
  id: string;
  name: string;
  subject?: string;
  /** طريقةُ تواصلٍ واحدة كما كتبها الطالب — جوّال أو بريد أو حسابٌ في منصّة. */
  contact?: string;
  notes: TeacherNote[];
  createdAt: number;
}

export const LIMITS = {
  maxTeachers: 20,
  maxNotesPerTeacher: 60,
  maxNameLen: 60,
  maxNoteLen: 600,
} as const;

const clean = (s: string, max: number): string => s.trim().slice(0, max);

/* ── القراءة ── */

export const teacherById = (all: Teacher[], id: string): Teacher | null =>
  all.find((t) => t.id === id) ?? null;

/** مرتَّبون بالمادة ثم الاسم — ترتيبٌ ثابتٌ يجده الطالبُ حيث تركه. */
export const sortedTeachers = (all: Teacher[]): Teacher[] =>
  [...all].sort((a, b) =>
    (a.subject ?? "").localeCompare(b.subject ?? "", "ar") || a.name.localeCompare(b.name, "ar"));

export const noteCount = (t: Teacher): number => t.notes.length;

/** ملاحظاتُ مدرّسٍ — الأحدثُ أوّلاً. */
export const notesOf = (t: Teacher): TeacherNote[] => [...t.notes].sort((a, b) => b.at - a.at);

/* ── الكتابة ── */

export type AddResult = { ok: true; teachers: Teacher[] } | { ok: false; reason: "empty" | "full" | "duplicate" };

export function addTeacher(all: Teacher[], i: { id: string; name: string; subject?: string; contact?: string; at: number }): AddResult {
  const name = clean(i.name, LIMITS.maxNameLen);
  if (!name) return { ok: false, reason: "empty" };
  if (all.length >= LIMITS.maxTeachers) return { ok: false, reason: "full" };
  const subject = i.subject ? clean(i.subject, LIMITS.maxNameLen) : undefined;
  /* نفسُ الاسم في نفس المادة تكرارٌ — أمّا الاسمُ نفسُه في مادّةٍ أخرى فمدرّسٌ آخر */
  if (all.some((t) => t.name === name && (t.subject ?? "") === (subject ?? ""))) return { ok: false, reason: "duplicate" };
  const t: Teacher = {
    id: i.id, name, subject,
    contact: i.contact ? clean(i.contact, LIMITS.maxNameLen) : undefined,
    notes: [], createdAt: i.at,
  };
  return { ok: true, teachers: [...all, t] };
}

export function updateTeacher(all: Teacher[], id: string, patch: { name?: string; subject?: string; contact?: string }): Teacher[] {
  return all.map((t) => {
    if (t.id !== id) return t;
    const name = patch.name !== undefined ? clean(patch.name, LIMITS.maxNameLen) : t.name;
    return {
      ...t,
      name: name || t.name,   // لا يُفرَّغ الاسم
      subject: patch.subject !== undefined ? (clean(patch.subject, LIMITS.maxNameLen) || undefined) : t.subject,
      contact: patch.contact !== undefined ? (clean(patch.contact, LIMITS.maxNameLen) || undefined) : t.contact,
    };
  });
}

export const removeTeacher = (all: Teacher[], id: string): Teacher[] => all.filter((t) => t.id !== id);

export function addNote(all: Teacher[], teacherId: string, note: { id: string; text: string; at: number }): Teacher[] {
  const text = clean(note.text, LIMITS.maxNoteLen);
  if (!text) return all;
  return all.map((t) => {
    if (t.id !== teacherId) return t;
    if (t.notes.length >= LIMITS.maxNotesPerTeacher) return t;
    return { ...t, notes: [...t.notes, { id: note.id, text, at: note.at }] };
  });
}

export const removeNote = (all: Teacher[], teacherId: string, noteId: string): Teacher[] =>
  all.map((t) => (t.id === teacherId ? { ...t, notes: t.notes.filter((x) => x.id !== noteId) } : t));

/* ── التواصل ── */

export type ContactKind = "phone" | "email" | "other";

/** يستنتج نوعَ التواصل من شكله — فنفتح المُتّصل أو البريد، أو نتركه نصّاً. */
export function contactKind(v: string | undefined): ContactKind {
  const s = (v ?? "").trim();
  if (!s) return "other";
  if (s.includes("@") && /\.[a-z]{2,}$/i.test(s)) return "email";
  const digits = s.replace(/[\s\-()+]/g, "");
  if (/^\d{7,15}$/.test(digits)) return "phone";
  return "other";
}

/** رابطُ الفتح المناسب — أو `null` فلا نصنع رابطاً لا يعمل. */
export function contactHref(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  const k = contactKind(s);
  if (k === "phone") return `tel:${s.replace(/[\s\-()]/g, "")}`;
  if (k === "email") return `mailto:${s}`;
  return null;
}
