import { calendarPayload } from "@/lib/agent/catalog";
import { agentJson, OPTIONS as opt } from "@/lib/agent/respond";

export const dynamic = "force-static";
export const OPTIONS = opt;

export function GET() { return agentJson(calendarPayload()); }
