/* ═══════════════════════════════════════════════════════════════════════
   Duwairb Orchestrator — التنسيق (لا يستبدل المحرّكات، ينسّقها)
   كل رد يتبع نفس خطّ العمل الحتمي:
     1) استقبل الطلب  2-6) استشر المحرّكات وابنِ السياق الموحّد
     7) وحّد السياق   8-9) أرسل الضروري فقط للنموذج وولّد الرد
     10) أطلق أحداثاً  11) حدّث الذاكرة (عبر الأحداث — لا كتابة مباشرة)
   ═══════════════════════════════════════════════════════════════════════ */
import type { EventEngine } from "../events/engine";
import type { LLMProvider } from "./llm";
import { type DuwairbContext, formatDuwairbContext } from "./context";

export interface DuwairbRequest {
  prompt: string;
  mode?: string;
  subjects?: string[];
  topic?: string;
  profile?: unknown;
  planning?: unknown;
  calendar?: unknown;
  images?: string[];
}

export interface DuwairbResult {
  text: string;
  contextBlock: string;
  context: DuwairbContext;
}

export interface OrchestratorDeps {
  provider: LLMProvider;
  events: EventEngine;
  buildContext: () => DuwairbContext;
  clock?: () => number;
}

export class DuwairbOrchestrator {
  constructor(private deps: OrchestratorDeps) {}

  async ask(req: DuwairbRequest): Promise<DuwairbResult> {
    const now = (this.deps.clock ?? (() => Date.now()))();

    // 2-7) استشر المحرّكات وابنِ السياق الموحّد
    const context = this.deps.buildContext();
    const contextBlock = formatDuwairbContext(context);

    // بداية المحادثة كحدث (سياق حيّ)
    this.deps.events.emit({
      eventType: "DuwairbConversationStarted",
      metadata: { topic: req.topic, tab: req.mode },
      actor: { kind: "student" }, source: "ui", timestamp: now,
    });

    // 8-9) أرسل الضروري فقط للنموذج (طبقة اللغة) وولّد الرد
    let text: string;
    try {
      text = await this.deps.provider.complete({
        prompt: req.prompt, mode: req.mode, subjects: req.subjects,
        context: contextBlock, profile: req.profile, planning: req.planning,
        calendar: req.calendar, images: req.images,
      });
    } catch (e) {
      // فشل النموذج لا يُسقط الخطّ — نُسجّله ونُعيد رميه للواجهة
      this.deps.events.emit({
        eventType: "DuwairbConversationFinished",
        metadata: { topic: req.topic, messages: 0 },
        actor: { kind: "system" }, source: "system", timestamp: now,
      });
      throw e;
    }

    // 10-11) أطلق حدث الانتهاء → MemoryReactor يحدّث الذاكرة (لا كتابة مباشرة)
    this.deps.events.emit({
      eventType: "DuwairbConversationFinished",
      metadata: { topic: req.topic ?? req.prompt.slice(0, 60), messages: 1 },
      actor: { kind: "student" }, source: "ui", timestamp: now,
    });

    return { text, contextBlock, context };
  }
}
