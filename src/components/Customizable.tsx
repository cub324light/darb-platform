"use client";
/* ═══════════ تخصيصُ الصفحة — وضعُ تعديلٍ داخل الصفحة نفسِها ═══════════
   كان «تخصيص» يفتح ورقةً فيها قائمةُ أسماء: الطالبُ يرتّب أسماءً ثم يُغلق الورقة
   ليرى الأثر. صار كما طلبه المالك: **وضعٌ يُفعَّل**، فتصير أقسامُ الصفحة نفسُها
   قابلةً للسحب والإخفاء في مكانها، ثم «حفظ».

   ▓ السحبُ بمقبضٍ لا بكامل القسم: القسمُ فيه أزرارُه وروابطُه، فلو سُحب كلُّه
     لتنازع السحبُ مع الضغط ومع تمرير الصفحة. المقبضُ يفصل النيّات،
     و`touch-action: none` عليه وحده.

   ▓ ومعه الكيبورد: المقبضُ زرٌّ حقيقيّ، والسهمان ↑↓ يحرّكان القسمَ وهو مركَّزٌ
     عليه. فمن لا يستطيع السحبَ لا يُحرَم الترتيب.

   ▓ لا يُكتب شيءٌ في التخزين قبل «حفظ»: «إلغاء» تُرجع كلَّ شيءٍ كما كان.

   ▓ التركيزُ وأخطائي خارج هذا عمداً: الأولُ شاشةُ مؤقّتٍ لا أقسامَ فيها،
     والثاني سجلٌّ ترتيبُه زمنيٌّ لا رأيَ للطالب فيه. */
import { Fragment, useState, useRef, useCallback, useEffect, type ReactNode, type PointerEvent as RPointerEvent } from "react";
import { moveSection, toggleSection, hiddenCount, isCustomized, defaultLayout, type SectionDef, type SectionState } from "@/lib/pageLayout";
import { useLayout, saveLayout, resetLayout } from "@/lib/pageLayoutStore";
import { n } from "@/lib/format";

export interface PageSection extends SectionDef {
  node: ReactNode;
}

export default function Customizable({
  page, sections, className,
}: {
  /** مفتاحُ الصفحة في التخزين — ثابتٌ لا يتغيّر (`school`، `dashboard`…). */
  page: string;
  sections: PageSection[];
  className?: string;
}) {
  const defs: SectionDef[] = sections.map(({ id, label, desc, fixed }) => ({ id, label, desc, fixed }));
  const saved = useLayout(page, defs);
  const byId = new Map(sections.map((s) => [s.id, s]));

  /* مسوّدةُ وضع التعديل — `null` يعني الوضع مطفأ */
  const [draft, setDraft] = useState<SectionState[] | null>(null);
  const editing = draft !== null;
  const view = draft ?? saved;
  const hidden = hiddenCount(saved);

  /* ── السحب ── */
  const [dragId, setDragId] = useState<string | null>(null);
  /* إزاحةُ الإصبع عن نقطة الإمساك — بها يتبع القسمُ الأصبعَ فيُرى السحب */
  const [dragDy, setDragDy] = useState(0);
  const live = useRef<{ y: number; index: number; order: SectionState[]; hs: number[] } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /* ▓ المستمعان على النافذة لا على المقبض: حين يُعاد ترتيبُ الأقسام يتحرّك
     المقبضُ في الـDOM فيفقد `setPointerCapture`، فيقف السحبُ بعد خطوةٍ واحدة. */
  const onDown = useCallback((e: RPointerEvent<HTMLButtonElement>, id: string) => {
    const order = live.current?.order ?? draft ?? saved;
    const i = order.findIndex((s) => s.id === id);
    if (i < 0) return;
    e.preventDefault();
    /* ارتفاعُ كلِّ قسمٍ الحقيقيّ — الأقسامُ متفاوتةٌ جداً، فالخطوةُ الثابتة تكذب */
    const hs = order.map((s) => rootRef.current?.querySelector<HTMLElement>(`[data-sec="${s.id}"]`)?.offsetHeight ?? 120);
    live.current = { y: e.clientY, index: i, order, hs };
    setDragId(id);
    setDragDy(0);

    const fixedIds = new Set(defs.filter((d) => d.fixed).map((d) => d.id));

    const move = (ev: PointerEvent) => {
      const st = live.current;
      if (!st) return;
      ev.preventDefault();
      const cur = st.order.findIndex((s) => s.id === id);
      const dy = ev.clientY - st.y;
      setDragDy(dy);
      /* نمشي بالارتفاعات الحقيقية: كم قسماً تجاوزه الإصبعُ فعلاً؟ */
      let target = cur;
      if (dy > 0) {
        let acc = 0;
        for (let k = cur + 1; k < st.order.length; k++) {
          acc += (st.hs[k] ?? 120) / 2;
          if (dy > acc) target = k; else break;
          acc += (st.hs[k] ?? 120) / 2;
        }
      } else if (dy < 0) {
        let acc = 0;
        for (let k = cur - 1; k >= 0; k--) {
          acc += (st.hs[k] ?? 120) / 2;
          if (-dy > acc) target = k; else break;
          acc += (st.hs[k] ?? 120) / 2;
        }
      }
      /* ولا يعبر ثابتاً: الثابتُ لا يتحرّك فلا يُزاح عن مكانه بغيره */
      let lo = 0, hi = st.order.length - 1;
      for (let k = cur - 1; k >= 0; k--) if (fixedIds.has(st.order[k].id)) { lo = k + 1; break; }
      for (let k = cur + 1; k < st.order.length; k++) if (fixedIds.has(st.order[k].id)) { hi = k - 1; break; }
      target = Math.max(lo, Math.min(hi, target));
      if (cur === target) return;
      const next = [...st.order];
      const [moved] = next.splice(cur, 1);
      next.splice(target, 0, moved);
      /* نُعيد ضبط نقطة الأصل على الوضع الجديد فلا تتراكم القفزات */
      live.current = { ...st, order: next, index: target, y: ev.clientY };
      setDragDy(0);          // الصفُّ استقرّ في مكانه الجديد — تعود الإزاحة صفراً
      setDraft(next);
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setDragId(null);
      setDragDy(0);
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }, [draft, saved, defs]);

  /* شريطُ التعديل يغطّي أسفل الشاشة — نترك له مكاناً فلا يحجب آخرَ قسم.
     ونُعلِم الصفحةَ كلَّها أنّنا في وضع التعديل عبر سِمةٍ على `body`: زرُّ دويرب
     العائم يقع في الزاوية نفسها فيركب على «حفظ»، ومن ضغط طرفَه فتح دويرب بدل
     أن يحفظ. ويخفيه CSS ما دام الوضعُ مفعَّلاً — والصفحةُ محجوبةٌ عن التفاعل
     أصلاً في هذا الوضع، فلا يُفقَد به شيء. السِّمةُ لا حالةَ React: الزرُّ في
     شجرةٍ أخرى، ولا داعيَ لسياقٍ يربط بينهما. */
  useEffect(() => {
    if (!editing) return;
    const prevPad = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "132px";
    document.body.dataset.customizing = "1";
    return () => {
      document.body.style.paddingBottom = prevPad;
      delete document.body.dataset.customizing;
    };
  }, [editing]);

  const dirty = editing && draft!.some((s, i) => s.id !== saved[i]?.id || s.visible !== saved[i]?.visible);

  return (
    <div className={className ?? "flex flex-col gap-3"} ref={rootRef}>
      {!editing && (
        <div className="flex items-center justify-end gap-2 px-0.5">
          {hidden > 0 && (
            <span className="t-caption" style={{ color: "var(--text-muted)" }}>
              {hidden === 1 ? "قسمٌ مخفيّ" : hidden === 2 ? "قسمان مخفيّان" : `${n(hidden)} أقسامٍ مخفيّة`}
            </span>
          )}
          <button onClick={() => setDraft(saved)}
            className="t-caption font-black px-3 py-1.5 rounded-xl transition active:scale-95"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            ✥ تخصيص
          </button>
        </div>
      )}

      {view.map((s, i) => {
        const sec = byId.get(s.id);
        if (!sec) return null;
        /* خارج وضع التعديل: المخفيُّ لا يُرسم أصلاً. داخله: يُرسم باهتاً ليُعاد. */
        if (!editing && !s.visible) return null;
        if (!editing) return <Fragment key={s.id}>{sec.node}</Fragment>;

        const isDragging = dragId === s.id;
        return (
          <div key={s.id} data-sec={s.id} className="relative rounded-2xl"
            style={{
              outline: `1.5px dashed ${isDragging ? "var(--accent)" : "color-mix(in srgb, var(--accent) 35%, transparent)"}`,
              outlineOffset: 4,
              opacity: s.visible ? (isDragging ? 0.95 : 1) : 0.42,
              /* ▓ الحركةُ هي التي تجعل السحبَ مفهوماً: المسحوبُ يتبع الإصبع
                 لحظةً بلحظة، والبقيةُ تنزلق إلى مكانها الجديد. بلا هذا يبدو
                 التخصيصُ معطّلاً وإن كان يعمل — وهذا ما وقع. */
              transform: isDragging ? `translateY(${dragDy}px) scale(1.02)` : "none",
              boxShadow: isDragging ? "0 16px 40px rgba(0,0,0,.4)" : "none",
              zIndex: isDragging ? 30 : 1,
              transition: isDragging
                ? "box-shadow .15s ease"
                : "transform .22s cubic-bezier(.2,.8,.3,1), opacity .18s ease",
              willChange: isDragging ? "transform" : undefined,
            }}>
            {/* حاجزٌ يمنع الضغط على ما بداخل القسم أثناء التعديل */}
            <div className="absolute inset-0 z-10 rounded-2xl" style={{ background: "transparent" }} aria-hidden="true" />

            {/* ▓ الصفُّ يمتدّ عرضَ القسم كلَّه لا يتكوّم في زاويةٍ واحدة: المقبضُ
               والرقمُ يميناً، والسالبُ الأحمر **أقصى اليسار** — طرفانِ متقابلان،
               فلا تُخفي قسماً وأنت تقصد سحبَه. والوسطُ لا يلتقط لمسةً. */}
            <div className="absolute -top-3 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5 pointer-events-auto">
              {sec.fixed ? (
                <span className="t-caption font-black px-2 py-1 rounded-lg flex items-center gap-1"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>🔒 ثابت</span>
              ) : (
                <button
                    onPointerDown={(e) => onDown(e, s.id)}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                      e.preventDefault();
                      setDraft((d) => moveSection(d ?? saved, defs, s.id, e.key === "ArrowUp" ? -1 : 1));
                    }}
                    aria-label={`اسحب لترتيب ${sec.label} — أو استعمل السهمين`}
                    className="w-8 h-8 rounded-lg grid place-items-center t-small font-black cursor-grab active:cursor-grabbing"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", touchAction: "none" }}>
                    ⠿
                </button>
              )}
              <span className="t-caption font-mono-nums px-1.5 py-1 rounded-lg"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>{n(i + 1)}</span>
              </div>

              {/* سالبٌ أحمر يخفي، وزائدٌ أخضر يُرجع — علامتان تُفهمان بلا قراءة.
                  والثابتُ لا سالبَ له: لا يُخفى أصلاً. */}
              {!sec.fixed && (
              <button onClick={() => setDraft((d) => toggleSection(d ?? saved, defs, s.id))}
                aria-pressed={s.visible} aria-label={`${s.visible ? "أخفِ" : "أظهر"} ${sec.label}`}
                className="w-8 h-8 rounded-full grid place-items-center font-black leading-none pointer-events-auto"
                style={{
                  fontSize: "1.25rem",
                  background: s.visible
                    ? "color-mix(in srgb, var(--danger) 16%, var(--surface))"
                    : "color-mix(in srgb, var(--success) 16%, var(--surface))",
                  border: `1.5px solid ${s.visible ? "var(--danger)" : "var(--success)"}`,
                  color: s.visible ? "var(--danger)" : "var(--success)",
                }}>
                {s.visible ? "−" : "+"}
              </button>
              )}
            </div>

            <div style={{ pointerEvents: "none" }}>{sec.node}</div>
          </div>
        );
      })}

      {/* شريطُ الحفظ — فوق شريط التنقّل، ثابتٌ ما دام الوضع مفعَّلاً */}
      {editing && (
        <div className="fixed left-0 right-0 z-40 px-5 pt-3 pb-3"
          style={{ bottom: "var(--nav-h)", background: "var(--surface)", backdropFilter: "blur(18px)", borderTop: "1px solid var(--border)" }}>
          <div className="max-w-xl mx-auto w-full flex flex-col gap-2">
            <p className="t-caption text-center" style={{ color: "var(--text-muted)" }}>
              اسحب من المقبض ⠿ لترتيب الأقسام، واضغط − لإخفاء ما لا يعنيك.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDraft(null)}
                className="flex-1 rounded-2xl py-3 t-body font-black"
                style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                إلغاء
              </button>
              {isCustomized(defs, draft!) && (
                <button onClick={() => setDraft(defaultLayout(defs))}
                  className="rounded-2xl px-4 py-3 t-caption font-black"
                  style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                  الأصليّ
                </button>
              )}
              <button onClick={() => {
                  if (isCustomized(defs, draft!)) saveLayout(page, draft!);
                  else resetLayout(page);
                  setDraft(null);
                }}
                className="flex-1 rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
                style={{ background: "var(--accent)", color: "#fff", opacity: dirty ? 1 : 0.6 }}>
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
