/* ملفّ مهارةٍ واحدة (SKILL.md) —
   يُقدَّم على /.well-known/agent-skills/:skill/SKILL.md عبر rewrite.
   البصمةُ المنشورة في الفهرس تُحسب من هذا النصّ نفسه. */
import { findSkill, AGENT_SKILLS } from "@/lib/agent/skills";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return AGENT_SKILLS.map((s) => ({ skill: s.id }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ skill: string }> }) {
  const { skill } = await ctx.params;
  const found = findSkill(skill);
  if (!found) {
    return new Response("لا مهارةَ بهذا الاسم\n", {
      status: 404,
      headers: { ...AGENT_HEADERS, "content-type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(found.body, {
    headers: { ...AGENT_HEADERS, "content-type": "text/markdown; charset=utf-8" },
  });
}
