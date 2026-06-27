/* ═══════════════════════════════════════════════════════════════════════
   Duwairb — طبقة الوصول (السطح العام للتنسيق)
   askDuwairb(req): يبني السياق الموحّد، يستدعي النموذج، ويُطلق الأحداث.
   المزوّد قابل للتبديل؛ تغييره لا يلمس بقية درب.
   ═══════════════════════════════════════════════════════════════════════ */
import { DuwairbOrchestrator, type DuwairbRequest, type DuwairbResult } from "./orchestrator";
import { GroqProvider, type LLMProvider } from "./llm";
import { buildDuwairbContext } from "./context";
import { events } from "../events";

let _orchestrator: DuwairbOrchestrator | null = null;
let _provider: LLMProvider = new GroqProvider();

/** يبدّل مزوّد النموذج (Groq/GPT/Claude/Gemini…) دون لمس المعمارية. */
export function setLLMProvider(p: LLMProvider): void {
  _provider = p;
  _orchestrator = null;
}

export function duwairb(): DuwairbOrchestrator {
  if (!_orchestrator) {
    _orchestrator = new DuwairbOrchestrator({
      provider: _provider,
      events: events(),
      buildContext: () => buildDuwairbContext(),
    });
  }
  return _orchestrator;
}

/** نقطة الدخول الموصى بها لأي ميزة محادثية في دويرب. */
export function askDuwairb(req: DuwairbRequest): Promise<DuwairbResult> {
  return duwairb().ask(req);
}

export function __resetDuwairb(): void { _orchestrator = null; _provider = new GroqProvider(); }

export { DuwairbOrchestrator } from "./orchestrator";
export { GroqProvider } from "./llm";
export { buildDuwairbContext, formatDuwairbContext } from "./context";
export type { LLMProvider, LLMRequest } from "./llm";
export type { DuwairbRequest, DuwairbResult, OrchestratorDeps } from "./orchestrator";
export type { DuwairbContext } from "./context";
