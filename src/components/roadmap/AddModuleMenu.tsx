"use client";
/* ─── قائمة «+ إضافة» الهرمية — فئة ← عناصرها (لا قائمة طويلة) ───
   تُبنى كاملةً من examEligibility (القيد الوحيد): يسمح/يمنع ويشرح السبب وحالة النافذة.
   الإضافة تُفوَّض للـWorkspace (المكان الوحيد الذي يُنشئ وحدةً/عضواً). */
import { useState } from "react";
import { buildAddMenu, type AddTarget, type EligibilityContext, type Workspace } from "@/lib/modules";

export default function AddModuleMenu({ ws, ctx, onAdd, capReached = false, remaining }: {
  ws: Workspace;
  ctx: EligibilityContext;
  onAdd: (target: AddTarget) => void;
  capReached?: boolean;       // بلغ الحدّ الأقصى 3 اختبارات ⇒ يُمنع أي إضافةٍ جديدة
  remaining?: number;         // المتبقّي من الحدّ (لعرضٍ إرشاديّ)
}) {
  const [open, setOpen] = useState(false);
  const cats = buildAddMenu(ws, ctx);
  const CAP_MSG = "وصلت للحدّ الأقصى 3 اختبارات — احذف اختباراً لإضافة آخر.";

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full rounded-2xl py-3.5 px-4 flex items-center gap-3 transition active:scale-[0.98]"
        style={{ background: "var(--surface)", border: "1.5px dashed var(--border)", color: "var(--text)" }}>
        <span className="text-[22px]">➕</span>
        <span className="flex-1 text-right font-black t-body">إضافة اختبار</span>
        {typeof remaining === "number" && (
          <span className="t-caption font-bold font-mono-nums px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: "var(--surface2)", color: remaining > 0 ? "var(--accent-light)" : "#B45309" }}>
            {remaining > 0 ? `متبقّي ${remaining}` : "ممتلئ"}
          </span>
        )}
        <span className="text-[16px] font-black" style={{ color: "var(--text-muted)" }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 rounded-2xl p-4" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          {/* شريط الحدّ الأقصى — تركيزٌ على القليل: 3 اختبارات كحدّ */}
          {capReached && (
            <div className="rounded-xl px-3.5 py-2.5 t-caption font-bold" style={{ background: "color-mix(in srgb, #F59E0B 12%, var(--surface2))", color: "#B45309", border: "1.5px solid color-mix(in srgb, #F59E0B 30%, var(--border))" }}>
              🎯 {CAP_MSG}
            </div>
          )}
          {cats.map((cat) => (
            <div key={cat.id}>
              <p className="eyebrow mb-2 px-1">{cat.label}</p>
              <div className="flex flex-col gap-2">
                {cat.items.map((it) => {
                  const blockedByCap = capReached && !it.alreadyAdded; // الحدّ يمنع أي جديد
                  const disabled = !it.allowed || it.alreadyAdded || blockedByCap;
                  return (
                    <button key={`${it.target.kind}-${it.target.id}`}
                      onClick={() => { if (!disabled) { onAdd(it.target); setOpen(false); } }}
                      disabled={disabled}
                      className="w-full rounded-xl px-3.5 py-3 flex items-center gap-3 text-right transition"
                      style={{
                        background: it.alreadyAdded ? "color-mix(in srgb, #10B981 8%, var(--surface2))" : "var(--surface2)",
                        border: `1.5px solid ${it.allowed && !it.alreadyAdded && !blockedByCap ? "var(--accent)" : "var(--border)"}`,
                        opacity: (!it.allowed && !it.alreadyAdded) || blockedByCap ? 0.55 : 1,
                      }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold t-body" style={{ color: "var(--text)" }}>{it.label}</p>
                        {it.alreadyAdded ? (
                          <p className="t-caption mt-0.5" style={{ color: "#10B981" }}>مضاف ✓</p>
                        ) : blockedByCap ? (
                          <p className="t-caption mt-0.5" style={{ color: "#B45309" }}>محجوب — بلغت الحدّ الأقصى</p>
                        ) : it.allowed ? (
                          it.hint && <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{it.hint}</p>
                        ) : (
                          <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{it.reason}</p>
                        )}
                      </div>
                      {it.allowed && !it.alreadyAdded && !blockedByCap && <span className="text-[18px] font-black flex-shrink-0" style={{ color: "var(--accent)" }}>＋</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
