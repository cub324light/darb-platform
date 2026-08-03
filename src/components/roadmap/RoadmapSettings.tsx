"use client";
/* ═══════════ إعدادات مساري ═══════════
   كان زرُّ الترس يعرض «قيد التطوير» — وعدٌ مكشوفٌ للطالب. والغريبُ أن كلَّ ما
   يحتاجه مبنيٌّ منذ زمن: `Workspace` يملك `hidden` و`priority` و`order`، و
   `AddModuleMenu` مكتوبٌ كاملاً بقائمته الهرمية وأسباب المنع — ولا يستدعيه أحد.
   فهذه الورقةُ واجهةٌ فوق نظامٍ قائم، لا نظامٌ جديد.

   ما تفعله: تضيف اختباراً (بقيود الأهلية والنوافذ الرسمية)، وتثبّت اختبارَ
   الأولوية، وتُخفي ما لا تريده الآن دون أن تفقد تقدّمك فيه، وتحذفه إن أردت. */
import { useState } from "react";
import Sheet from "@/components/Sheet";
import AddModuleMenu from "./AddModuleMenu";
import {
  addModule, addMember, removeModule, removeMember, hideModule, setPriority,
  orderedModules, groupMembers, isGroup, moduleView, memberView, examCount,
  type AddTarget, type EligibilityContext, type Workspace, type ModuleId, type ExamMemberId,
} from "@/lib/modules";
import { readPriorityExam } from "@/lib/roadmap/nowRead";
import { updateRoadmapConfig, loadRoadmapConfig } from "@/lib/roadmap/store";
import { setPriorityOrder, onExamRemoved, priorityLock, setExamPlanMode, examPlanLock, setOverlapSplit } from "@/lib/roadmap/model";
import { OVERLAP_SPLIT_LABEL, type ExamPlanMode, type OverlapSplit } from "@/lib/roadmap/examPlan";
import { n, days } from "@/lib/format";

/** الحدُّ الأقصى — مصدرُه `AddModuleMenu` نفسُه (٣ اختبارات: تركيزٌ على القليل). */
const EXAM_CAP = 3;

interface Row {
  key: string;
  /** معرّفُ الاختبار كما يعرفه `readPriorityExam` — وحدةً كان أو عضواً. */
  id: string;
  moduleId?: ModuleId;   // للوحدات المفردة فقط (الإخفاء وعلَم الأولوية عليها)
  label: string;
  icon?: string;
  color: string;
  hidden: boolean;
  /** الحذفُ والإخفاء يفترقان: العضوُ يُحذف من مجموعته، والوحدةُ من الجذر. */
  onRemove: () => Workspace;
}

export default function RoadmapSettings({ ws, ctx, onChange, onClose }: {
  ws: Workspace;
  ctx: EligibilityContext;
  onChange: (next: Workspace) => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  const count = examCount(ws);
  /* الأولويةُ الحقيقية — تلك التي يقرؤها «اختبارك» وجلسةُ اليوم */
  const priorityId = readPriorityExam(ws)?.id ?? null;
  const cfg = loadRoadmapConfig();
  const lock = priorityLock(cfg);
  const planMode: ExamPlanMode = cfg.examPlanMode ?? "sequential";
  const planLock = examPlanLock(cfg);
  const split: OverlapSplit = cfg.overlapSplit ?? "priority";

  const add = (t: AddTarget) => {
    onChange(t.kind === "module" ? addModule(ws, t.id as ModuleId) : addMember(ws, t.id as ExamMemberId));
  };

  /* ▓ فخٌّ حقيقيّ: في المشروع «أولويتان» لا واحدة — علَمُ `ModuleInstance.priority`
     يرتّب بطاقاتِ الصفحة، و`RoadmapConfig.examMeta[id].priority` هو الذي يقرؤه
     `readPriorityExam` فيقرّر «اختبارك» وجلسةَ اليوم وعدّادَ الأيام. لو كتبنا
     الأول وحده لضغط الطالبُ «اجعله أولويتك» فلا يتغيّر شيءٌ ممّا يراه. فنكتبهما
     معاً: الترتيبُ مصدرُ الحقيقة، والعلَمُ يتبعه حتى لا تتناقض البطاقات. */
  const makePriority = (row: Row) => {
    const others = rows.map((x) => x.id).filter((x) => x !== row.id);
    updateRoadmapConfig((c) => setPriorityOrder(c, [row.id, ...others]));
    let next = ws;
    for (const m of ws.modules) {
      if (m.kind === "core" || isGroup(m.id)) continue;
      next = setPriority(next, m.id, m.id === row.moduleId);
    }
    /* المخفيُّ لا يُقرأ أولويةً (`readAllExams` يمرّ على الظاهر وحده)، فاختيارُه
       أولويةً وهو مخفيٌّ لا يُغيّر شيئاً يراه الطالب. فنُظهره معه. */
    if (row.moduleId && row.hidden) next = hideModule(next, row.moduleId, false);
    onChange(next);
  };

  /* الحذفُ ينظّف ميتاداتا الاختبار أيضاً، وإلا بقي المحذوفُ «أولويةً» في الإعداد */
  const remove = (row: Row) => {
    updateRoadmapConfig((c) => onExamRemoved(c, row.id));
    onChange(row.onRemove());
  };

  /* صفوفُ العرض: الوحداتُ المفردة، وأعضاءُ المجموعات (فالعضوُ هو الاختبار لا الحاوية).
     الـCore (الجامعة) لا يُدار هنا — ليس اختباراً يختاره الطالب. */
  const rows: Row[] = [];
  for (const m of orderedModules(ws)) {
    if (m.kind === "core") continue;
    if (isGroup(m.id)) {
      for (const mem of groupMembers(ws, m.id)) {
        const v = memberView(mem.id);
        rows.push({
          key: `member-${mem.id}`, id: mem.id, label: v.label, color: v.color,
          hidden: m.hidden,
          onRemove: () => removeMember(ws, mem.id),
        });
      }
    } else {
      const v = moduleView(m.id);
      rows.push({
        key: `module-${m.id}`, id: m.id, moduleId: m.id, label: v.label, icon: v.icon, color: v.color,
        hidden: m.hidden,
        onRemove: () => removeModule(ws, m.id),
      });
    }
  }

  return (
    <Sheet onClose={onClose} title="إعدادات مساري">
      <div className="flex flex-col gap-4">
        <AddModuleMenu ws={ws} ctx={ctx} onAdd={add} capReached={count >= EXAM_CAP} />

        {/* نمطُ التوزيع — سؤالُ من عنده أكثر من اختبار. كان جواباً يقوله دويرب
            في المحادثة فيضيع بانتهائها؛ صار إعداداً يقود جلسةَ اليوم فعلاً. */}
        {rows.length > 1 && (
          <div>
            <p className="eyebrow px-1 mb-2">كيف تذاكرها؟</p>
            <div className="flex flex-col gap-2">
              {([
                ["sequential", "واحداً بعد واحد", "تُنهي اختبارَ أولويتك ثم تبدأ الذي يليه — تركيزٌ أعمق."],
                ["staged", "متداخل", "الأوّلُ وحده مدّة، ثم يدخل الثاني معه فترةً مشتركة، فإذا اختبرتَ الأوّل تفرّغتَ للثاني."],
                ["together", "كلَّها معاً", "يومُك يُقسَم بين اختباراتك من اليوم الأوّل."],
              ] as const).map(([v, label, desc]) => {
                const on = planMode === v;
                const blocked = planLock.locked && !on;
                return (
                  <button key={v} onClick={() => { updateRoadmapConfig((c) => setExamPlanMode(c, v)); onChange(ws); }}
                    disabled={blocked} aria-pressed={on}
                    className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right transition active:scale-[0.98]"
                    style={{
                      background: on ? "color-mix(in srgb, var(--accent) 10%, var(--surface2))" : "var(--surface2)",
                      border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                      opacity: blocked ? 0.5 : 1,
                    }}>
                    <span className="flex-1 min-w-0">
                      <span className="block t-body font-black" style={{ color: "var(--text)" }}>{label}</span>
                      <span className="block t-caption leading-snug" style={{ color: "var(--text-muted)" }}>{desc}</span>
                    </span>
                    <span className="t-body font-black flex-shrink-0" style={{ color: on ? "var(--accent-light)" : "var(--text-muted)" }}>
                      {on ? "✓" : blocked ? "🔒" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* توزيعُ الفترة المشتركة — يظهر لمن اختار المتداخل وحده، ولا يُقفل:
                تعديلُ النسبة لا يقلب الخطّة رأساً على عقب. */}
            {planMode === "staged" && (
              <div className="mt-3">
                <p className="t-caption font-bold px-1 mb-1.5" style={{ color: "var(--text-muted)" }}>في الفترة المشتركة</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(["even", "priority", "nearest"] as OverlapSplit[]).map((v) => (
                    <button key={v} onClick={() => { updateRoadmapConfig((c) => setOverlapSplit(c, v)); onChange(ws); }}
                      aria-pressed={split === v}
                      className="t-caption font-black px-3 py-2 rounded-xl transition active:scale-[0.97]"
                      style={split === v
                        ? { background: "color-mix(in srgb, var(--accent) 16%, transparent)", border: "1.5px solid var(--accent)", color: "var(--accent-light)" }
                        : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      {OVERLAP_SPLIT_LABEL[v]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {planLock.locked && (
              <p className="t-caption mt-2 px-3 py-2 rounded-xl leading-relaxed"
                style={{ background: "color-mix(in srgb, var(--gold) 10%, var(--surface2))", color: "var(--text)", border: "1px solid color-mix(in srgb, var(--gold) 26%, transparent)" }}>
                🔒 النمط مقفل {days(planLock.daysLeft)} — الجدولُ يحتاج وقتاً ليُثمر، وتغييرُه كل يومٍ يبدأ من الصفر.
              </p>
            )}
          </div>
        )}

        <div>
          <p className="eyebrow px-1 mb-2">اختباراتك ({n(count)})</p>
          {rows.length === 0 ? (
            <p className="t-caption text-center py-4" style={{ color: "var(--text-muted)" }}>
              ما أضفتَ اختباراً بعد — ابدأ من «إضافة اختبار» فوق.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((r) => (
                <div key={r.key} className="rounded-2xl p-3.5 flex flex-col gap-2.5"
                  style={{ background: "var(--surface2)", border: `1.5px solid ${r.id === priorityId ? r.color : "var(--border)"}`, opacity: r.hidden ? 0.6 : 1 }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[20px] flex-shrink-0" aria-hidden="true">{r.icon ?? "📄"}</span>
                    <span className="t-body font-black flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>{r.label}</span>
                    {r.id === priorityId && (
                      <span className="t-caption font-black px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `color-mix(in srgb, ${r.color} 18%, transparent)`, color: r.color }}>أولويتك</span>
                    )}
                    {r.hidden && (
                      <span className="t-caption font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>مخفيّ</span>
                    )}
                  </div>

                  {confirming === r.key ? (
                    <div className="flex items-center gap-2">
                      <span className="t-caption flex-1" style={{ color: "var(--text-muted)" }}>
                        يُحذف من مساري. تقدّمُك في دروسه يبقى محفوظاً.
                      </span>
                      <button onClick={() => { remove(r); setConfirming(null); }}
                        className="t-caption font-black px-3 py-2 rounded-xl"
                        style={{ background: "#EF4444", color: "#fff" }}>احذف</button>
                      <button onClick={() => setConfirming(null)}
                        className="t-caption font-bold px-3 py-2 rounded-xl"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>تراجع</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => makePriority(r)} disabled={r.id === priorityId || lock.locked}
                        aria-pressed={r.id === priorityId}
                        className="flex-1 t-caption font-black py-2 rounded-xl transition active:scale-[0.97] disabled:opacity-100"
                        style={r.id === priorityId
                          ? { background: `color-mix(in srgb, ${r.color} 16%, transparent)`, border: `1.5px solid ${r.color}`, color: r.color }
                          : { background: "var(--surface)", border: "1px solid var(--border)", color: lock.locked ? "var(--text-muted)" : "var(--text)", opacity: lock.locked ? 0.5 : 1 }}>
                        {r.id === priorityId ? "★ أولويتك" : lock.locked ? "🔒 مقفلة" : "☆ اجعله أولويتك"}
                      </button>
                      {r.moduleId && (
                        <button onClick={() => onChange(hideModule(ws, r.moduleId!, !r.hidden))}
                          className="flex-1 t-caption font-black py-2 rounded-xl transition active:scale-[0.97]"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                          {r.hidden ? "أظهِره" : "أخفِه"}
                        </button>
                      )}
                      <button onClick={() => setConfirming(r.key)} aria-label={`حذف ${r.label}`}
                        className="t-caption font-black px-3 py-2 rounded-xl transition active:scale-[0.97]"
                        style={{ background: "transparent", border: "1px solid color-mix(in srgb, #EF4444 40%, transparent)", color: "#EF4444" }}>
                        حذف
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* القفلُ يُطبَّق: اختيارُ الأولوية قرارُ أسبوع لا مزاجُ يوم. ثلاثةُ أيامٍ
              مدّةٌ كافيةٌ ليظهر أثرُ التركيز، وقصيرةٌ فلا تحبس من غيّر ظرفُه. */}
          {lock.locked && rows.length > 1 && (
            <p className="t-caption mt-2.5 px-3 py-2 rounded-xl leading-relaxed"
              style={{ background: "color-mix(in srgb, var(--gold) 10%, var(--surface2))", color: "var(--text)", border: "1px solid color-mix(in srgb, var(--gold) 26%, transparent)" }}>
              🔒 أولويتك مقفلة {days(lock.daysLeft)} — التنقّل بين الاختبارات كل يومٍ يضيّع التركيز. تفتح تلقائياً بعدها.
            </p>
          )}
          <p className="t-caption mt-2.5 px-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            «أخفِه» يزيله من بطاقاتك ويبقي تقدّمك — تُظهره متى شئت. و«أولويتك» يقرّر
            أيَّ اختبارٍ يبني حوله دويرب جلسةَ اليوم.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
