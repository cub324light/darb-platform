/* ─── محوّل الاستهلاك (Workspace → مواد/مهارات) — المصدر الواحد للمستهلكين ───
   بدل أن تقرأ الصفحات activeTracks (نظام Track القديم)، تقرأ الـWorkspace وحده عبر
   هذا المحوّل. تعيين الوحدة/العضو → مفردات كتالوجات المحتوى (globalSkills و
   subjectsForTracks المُفهرَسة داخلياً بمعرّفات المسارات القديمة) *محوّلٌ مشتقّ*
   من الـWorkspace لحظياً — ليس مصدرَ حقيقةٍ ثانياً ولا حالةً مخزّنة. نقيّ. */

import type { Workspace } from "./workspace";
import type { SubjectDef } from "./descriptor";
import { moduleContent, memberContent } from "./descriptor";
import { isGroup } from "./registry";
import type { ModuleId, ExamMemberId } from "./types";

/* الوحدة/العضو → معرّف الكتالوج القديم (مفتاح داخلي في globalSkills/TRACKS فقط). */
const MODULE_TRACK: Partial<Record<ModuleId, string>> = { qudurat: "قدرات", tahsili: "تحصيلي" };
const MEMBER_TRACK: Partial<Record<ExamMemberId, string>> = {
  step: "ستيب", ielts: "ايلتس", toefl: "توفل", duolingo: "دوليقو", aramco: "CPC", itc: "ITC",
};

export interface WorkspaceStudy {
  subjects: SubjectDef[]; // مواد المذاكرة (من الواصف — دون تكرار)
  trackIds: string[];     // مفاتيح الكتالوجات القديمة (globalSkills/subjectsForTracks)
}

/* يجمّع مواد/مفاتيح المذاكرة من وحدات/أعضاء الـWorkspace الدراسية (study فقط). */
export function workspaceStudy(ws: Workspace): WorkspaceStudy {
  const subjMap = new Map<string, SubjectDef>();
  const trackIds: string[] = [];
  const add = (subs: SubjectDef[] | undefined, track?: string) => {
    for (const s of subs ?? []) if (!subjMap.has(s.name)) subjMap.set(s.name, s);
    if (track && !trackIds.includes(track)) trackIds.push(track);
  };
  for (const m of ws.modules) {
    if (isGroup(m.id)) {
      for (const mem of m.members ?? []) add(memberContent(mem.id).subjects, MEMBER_TRACK[mem.id]);
    } else {
      const c = moduleContent(m.id);
      if (c.kind === "study") add(c.subjects, MODULE_TRACK[m.id]);
    }
  }
  return { subjects: [...subjMap.values()], trackIds };
}

export const workspaceSubjects = (ws: Workspace): SubjectDef[] => workspaceStudy(ws).subjects;
export const workspaceTrackIds = (ws: Workspace): string[] => workspaceStudy(ws).trackIds;

/* بديلٌ افتراضي حين لا وحدات دراسية بعد (يطابق سلوك الفولباك القديم: مواد التحصيلي). */
export const defaultStudySubjects = (): SubjectDef[] => moduleContent("tahsili").subjects ?? [];
