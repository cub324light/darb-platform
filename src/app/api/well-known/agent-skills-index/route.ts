/* فهرسُ اكتشاف المهارات (Agent Skills Discovery RFC v0.2.0) —
   يُقدَّم على /.well-known/agent-skills/index.json عبر rewrite.
   لكل مهارةٍ عنوانُ ملفّها وبصمةُ sha256 لمحتواه. */
import { SITE } from "@/lib/agent/catalog";
import { AGENT_SKILLS, skillDigest, skillUrl } from "@/lib/agent/skills";
import { AGENT_HEADERS } from "@/lib/agent/respond";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    $schema: "https://agentskills.io/schemas/v0.2.0/index.json",
    version: "0.2.0",
    provider: { name: SITE.name, url: SITE.url },
    skills: AGENT_SKILLS.map((s) => ({
      name: s.id,
      title: s.name,
      type: "skill-md",
      description: s.description,
      url: skillUrl(s),
      sha256: skillDigest(s),
    })),
  }, { headers: AGENT_HEADERS });
}
