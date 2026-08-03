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

/** فصلٌ درسه معك: «ثالث ثانوي · الفصل الأول». */
export interface TeacherTerm {
  id: string;
  grade: string;    // أول ثانوي · ثاني ثانوي · ثالث ثانوي · …
  term: string;     // الفصل الأول · الثاني · الثالث
  /** تقييمُك له في هذا الفصل (١..٥) — يُوضع بعد نهايته. */
  rating?: number;
}

/** موقفٌ حصل معك — يُذكر بلا تقييم. */
export interface TeacherMoment {
  id: string;
  text: string;
  at: number;
}

export interface Teacher {
  id: string;
  name: string;
  /** موادُّه — قد يدرّسك أكثر من مادة. */
  subjects: string[];
  /** وسائلُ تواصله — جوّالٌ وبريدٌ وحسابٌ في منصّة. */
  contacts: string[];
  notes: TeacherNote[];
  /** الفصولُ التي درّسك فيها، ولكلٍّ تقييمُه. */
  terms: TeacherTerm[];
  /** مواقفُ حصلت معه. */
  moments: TeacherMoment[];
  createdAt: number;
}

export const LIMITS = {
  maxTeachers: 20,
  maxNotesPerTeacher: 60,
  maxNameLen: 60,
  maxNoteLen: 600,
  maxSubjects: 6,
  maxContacts: 4,
  maxTerms: 12,
  maxMoments: 40,
} as const;

export const RATING_LABEL: Record<number, string> = {
  1: "ضعيف", 2: "مقبول", 3: "جيّد", 4: "ممتاز", 5: "من أفضل من درّسني",
};

const clean = (s: string, max: number): string => s.trim().slice(0, max);

/* ── القراءة ── */

export const teacherById = (all: Teacher[], id: string): Teacher | null =>
  all.find((t) => t.id === id) ?? null;

/** أوّلُ موادّه — للعرض المختصر في القائمة. */
export const mainSubject = (t: Teacher): string | undefined => t.subjects[0];

/** مرتَّبون بالمادة الأولى ثم الاسم — ترتيبٌ ثابتٌ يجده الطالبُ حيث تركه. */
export const sortedTeachers = (all: Teacher[]): Teacher[] =>
  [...all].sort((a, b) =>
    (mainSubject(a) ?? "").localeCompare(mainSubject(b) ?? "", "ar") || a.name.localeCompare(b.name, "ar"));

export const noteCount = (t: Teacher): number => t.notes.length;

/** ملاحظاتُ مدرّسٍ — الأحدثُ أوّلاً. */
export const notesOf = (t: Teacher): TeacherNote[] => [...t.notes].sort((a, b) => b.at - a.at);

/** مواقفُه — الأحدثُ أوّلاً. */
export const momentsOf = (t: Teacher): TeacherMoment[] => [...t.moments].sort((a, b) => b.at - a.at);

/** متوسّطُ تقييماته عبر الفصول — `null` إن لم يُقيَّم بعد. */
export function avgRating(t: Teacher): number | null {
  const rs = t.terms.map((x) => x.rating).filter((r): r is number => typeof r === "number" && r >= 1 && r <= 5);
  if (rs.length === 0) return null;
  return Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 10) / 10;
}

export const termLabel = (x: TeacherTerm): string => `${x.grade} · ${x.term}`;

/* ── الكتابة ── */

export type AddResult = { ok: true; teachers: Teacher[] } | { ok: false; reason: "empty" | "full" | "duplicate" };

const dedupe = (xs: string[], max: number): string[] => {
  const out: string[] = [];
  for (const x of xs) {
    const v = clean(x, LIMITS.maxNameLen);
    if (v && !out.includes(v) && out.length < max) out.push(v);
  }
  return out;
};

export function addTeacher(all: Teacher[], i: {
  id: string; name: string; subjects?: string[]; contacts?: string[]; at: number;
}): AddResult {
  const name = clean(i.name, LIMITS.maxNameLen);
  if (!name) return { ok: false, reason: "empty" };
  if (all.length >= LIMITS.maxTeachers) return { ok: false, reason: "full" };
  const subjects = dedupe(i.subjects ?? [], LIMITS.maxSubjects);
  /* نفسُ الاسم مع نفس المادة الأولى تكرارٌ — أمّا الاسمُ نفسُه في مادّةٍ أخرى فمدرّسٌ آخر */
  if (all.some((t) => t.name === name && (mainSubject(t) ?? "") === (subjects[0] ?? ""))) {
    return { ok: false, reason: "duplicate" };
  }
  const t: Teacher = {
    id: i.id, name, subjects,
    contacts: dedupe(i.contacts ?? [], LIMITS.maxContacts),
    notes: [], terms: [], moments: [], createdAt: i.at,
  };
  return { ok: true, teachers: [...all, t] };
}

export function updateTeacher(all: Teacher[], id: string, patch: {
  name?: string; subjects?: string[]; contacts?: string[];
}): Teacher[] {
  return all.map((t) => {
    if (t.id !== id) return t;
    const name = patch.name !== undefined ? clean(patch.name, LIMITS.maxNameLen) : t.name;
    return {
      ...t,
      name: name || t.name,   // لا يُفرَّغ الاسم
      subjects: patch.subjects !== undefined ? dedupe(patch.subjects, LIMITS.maxSubjects) : [...t.subjects],
      contacts: patch.contacts !== undefined ? dedupe(patch.contacts, LIMITS.maxContacts) : [...t.contacts],
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

/* ── الفصول والتقييم ── */

export function addTerm(all: Teacher[], teacherId: string, term: { id: string; grade: string; term: string }): Teacher[] {
  const grade = clean(term.grade, LIMITS.maxNameLen);
  const t2 = clean(term.term, LIMITS.maxNameLen);
  if (!grade || !t2) return all;
  return all.map((t) => {
    if (t.id !== teacherId) return t;
    if (t.terms.length >= LIMITS.maxTerms) return t;
    /* الفصلُ نفسُه لا يُضاف مرّتين — وإلا صار له تقييمان متناقضان */
    if (t.terms.some((x) => x.grade === grade && x.term === t2)) return t;
    return { ...t, terms: [...t.terms, { id: term.id, grade, term: t2 }] };
  });
}

export const removeTerm = (all: Teacher[], teacherId: string, termId: string): Teacher[] =>
  all.map((t) => (t.id === teacherId ? { ...t, terms: t.terms.filter((x) => x.id !== termId) } : t));

/** تقييمُ فصلٍ (١..٥). خارجُ المدى يُتجاهَل، و`null` يمسح التقييم. */
export function rateTerm(all: Teacher[], teacherId: string, termId: string, rating: number | null): Teacher[] {
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return all;
  return all.map((t) => {
    if (t.id !== teacherId) return t;
    return {
      ...t,
      terms: t.terms.map((x) => {
        if (x.id !== termId) return x;
        if (rating === null) {
          /* حذفُ المفتاح لا تصفيرُه: `undefined` صريحةٌ تُكتب في JSON وتُربك `avgRating` */
          const rest: TeacherTerm = { id: x.id, grade: x.grade, term: x.term };
          return rest;
        }
        return { ...x, rating };
      }),
    };
  });
}

/* ── المواقف ── */

export function addMoment(all: Teacher[], teacherId: string, m: { id: string; text: string; at: number }): Teacher[] {
  const text = clean(m.text, LIMITS.maxNoteLen);
  if (!text) return all;
  return all.map((t) => {
    if (t.id !== teacherId) return t;
    if (t.moments.length >= LIMITS.maxMoments) return t;
    return { ...t, moments: [...t.moments, { id: m.id, text, at: m.at }] };
  });
}

export const removeMoment = (all: Teacher[], teacherId: string, momentId: string): Teacher[] =>
  all.map((t) => (t.id === teacherId ? { ...t, moments: t.moments.filter((x) => x.id !== momentId) } : t));

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
