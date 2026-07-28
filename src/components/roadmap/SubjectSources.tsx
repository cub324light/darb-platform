"use client";
/* ═══════════ 📚 مصادري — مصادر مادةٍ واحدة داخل فضاء المذاكرة ═══════════
   الطالب لا يذاكر «لفظي» مجرّدةً، بل يذاكر من مصدر: دورةٌ أو كتاب. هنا يضيف مصدره،
   ويقسّمه أقساماً **غير متساوية** بأسماءٍ من عنده («القواعد 25 صفحة»)، ويسجّل تقدّمه
   **جزئياً** — لأن قسماً من 25 صفحة لا يُنجَز دفعةً واحدة. وإن عرف معدّله (صفحات/ساعة)
   حسبنا له كم أنجز في جلسةٍ زمنية وكم بقي من وقت. كل الحساب في `lib/roadmap/sources.ts`. */
import { useState } from "react";
import {
  sourceProgress, sourcesProgress, sectionProgress, toggleSection, buildSource, unitLabel,
  addSectionDone, renameSection, resizeSection, splitSection,
  unitsInMinutes, minutesForUnits, minsPerUnitFromRate, durationRangeText, remainingMinutes,
  type StudySource, type SourceKind, type SourceSection,
} from "@/lib/roadmap/sources";
import { loadSources, sourcesFor, addSource, updateSource, removeSource, newSourceId } from "@/lib/roadmap/sourceStore";
import { catalogFor, type CatalogSource } from "@/lib/sourceCatalog";
import { n, pct } from "@/lib/format";
import Sheet from "@/components/Sheet";

const DEFAULT_SECTIONS = 4;

export default function SubjectSources({ subject, examKey, color }: {
  subject: string; examKey?: string; color: string;
}) {
  const [all, setAll] = useState<StudySource[]>(() => (typeof window !== "undefined" ? loadSources() : []));
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ srcId: string; secId: string } | null>(null);

  const mine = sourcesFor(examKey ?? "", subject, all).filter(() => !!examKey);
  const total = sourcesProgress(mine);

  const save = (next: StudySource) => setAll(updateSource(next.id, next));

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <p className="eyebrow flex-1" style={{ color: "var(--text)" }}>📚 مصادري</p>
        {total.total > 0 && (
          <span className="t-caption font-black font-mono-nums" style={{ color }}>
            {n(total.done)} من {n(total.total)} — {pct(total.pct)}
          </span>
        )}
      </div>

      {mine.length === 0 ? (
        <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
          أضِف المصدر الذي تذاكر منه — دورةً أو كتاباً — وقسّمه كما تريد، وسجّل تقدّمك أوّلاً بأوّل.
        </p>
      ) : (
        mine.map((src) => {
          const p = sourceProgress(src);
          const isOpen = open === src.id;
          const left = remainingMinutes(src);
          return (
            <div key={src.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <button onClick={() => setOpen(isOpen ? null : src.id)} className="w-full p-4 text-right flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="t-body font-black truncate" style={{ color: "var(--text)" }}>{src.name}</span>
                    {src.builtin && (
                      <span className="t-caption font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>جاهز</span>
                    )}
                  </span>
                  <span className="block t-caption mt-1 font-mono-nums" style={{ color: "var(--text-muted)" }}>
                    {n(p.done)} من {n(p.total)} {unitLabel(src.kind, p.total)} — {pct(p.pct)}
                    {left > 0 && ` · بقي ~${n(Math.round(left / 60))} ساعة`}
                  </span>
                  <span className="block h-2 rounded-full overflow-hidden mt-2" style={{ background: "color-mix(in srgb, var(--text-muted) 20%, transparent)" }}>
                    <span className="block h-full rounded-full" style={{ width: `${p.pct}%`, background: color }} />
                  </span>
                </span>
                <span className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 flex flex-col gap-2">
                  {src.kind === "video" && src.minsPerUnit ? (
                    <p className="t-caption" style={{ color: "var(--text-dim)" }}>
                      🎬 الفيديو الواحد {durationRangeText(src.minsPerUnit, n)}
                    </p>
                  ) : null}

                  {src.sections.map((sec) => (
                    <SectionRow key={sec.id} src={src} sec={sec} color={color}
                      onSave={save}
                      onEdit={() => setEditing({ srcId: src.id, secId: sec.id })} />
                  ))}

                  <button onClick={() => { setAll(removeSource(src.id)); setOpen(null); }}
                    className="t-caption font-bold self-start mt-1" style={{ color: "var(--danger)" }}>حذف المصدر</button>
                </div>
              )}
            </div>
          );
        })
      )}

      <button onClick={() => setAdding(true)} className="rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
        style={{ background: "transparent", border: `1.5px dashed ${color}`, color }}>
        ＋ أضف مصدر
      </button>

      {adding && examKey && (
        <AddSourceSheet subject={subject} examKey={examKey} color={color}
          onClose={() => setAdding(false)}
          onAdd={(src) => { setAll(addSource(src)); setAdding(false); setOpen(src.id); }} />
      )}

      {editing && (() => {
        const src = mine.find((s) => s.id === editing.srcId);
        const sec = src?.sections.find((x) => x.id === editing.secId);
        if (!src || !sec) return null;
        return <SectionSheet src={src} sec={sec} color={color}
          onClose={() => setEditing(null)}
          onSave={(next) => { save(next); setEditing(null); }} />;
      })()}
    </section>
  );
}

/* صفُّ قسم: شطبٌ سريعٌ للصغير، وتسجيلٌ جزئيٌّ (+) للكبير، وضغطةٌ على الاسم للتفاصيل. */
function SectionRow({ src, sec, color, onSave, onEdit }: {
  src: StudySource; sec: SourceSection; color: string;
  onSave: (s: StudySource) => void; onEdit: () => void;
}) {
  const p = sectionProgress(sec);
  const full = p.done >= p.total;
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
      style={{ background: full ? `color-mix(in srgb, ${color} 10%, transparent)` : "var(--surface2)",
               border: `1.5px solid ${full ? `color-mix(in srgb, ${color} 40%, transparent)` : "var(--border)"}` }}>
      <button onClick={() => onSave(toggleSection(src, sec.id))} aria-label={full ? "إلغاء الإنجاز" : "أنجزتُ القسم كاملاً"}
        className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 transition active:scale-90"
        style={full ? { background: color } : { border: "2px solid var(--border)" }}>
        {full && <span className="text-white t-caption font-black">✓</span>}
      </button>

      <button onClick={onEdit} className="flex-1 min-w-0 text-right">
        <span className="block t-body font-bold truncate" style={{ color: full ? "var(--text-muted)" : "var(--text)" }}>{sec.title}</span>
        <span className="block t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>
          {n(p.done)}/{n(p.total)} {unitLabel(src.kind, p.total)}
        </span>
        {p.total > 0 && (
          <span className="block h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "color-mix(in srgb, var(--text-muted) 22%, transparent)" }}>
            <span className="block h-full rounded-full" style={{ width: `${p.pct}%`, background: color }} />
          </span>
        )}
      </button>

      {!full && (
        <button onClick={() => onSave(addSectionDone(src, sec.id, 1))} aria-label="سجّل وحدةً واحدة"
          className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 t-body font-black transition active:scale-90"
          style={{ background: "transparent", border: `1.5px solid ${color}`, color }}>＋</button>
      )}
    </div>
  );
}

/* ورقةُ القسم: اسمٌ · حجمٌ · تسجيلٌ بالوحدات أو بالوقت · شطرٌ إلى قسمين. */
function SectionSheet({ src, sec, color, onClose, onSave }: {
  src: StudySource; sec: SourceSection; color: string;
  onClose: () => void; onSave: (s: StudySource) => void;
}) {
  const [title, setTitle] = useState(sec.title);
  const [units, setUnits] = useState(String(sec.units));
  const [addUnits, setAddUnits] = useState("");
  const [addMins, setAddMins] = useState("");
  const [splitAt, setSplitAt] = useState("");

  const uLabel = unitLabel(src.kind, 2);
  const byTime = unitsInMinutes(src.ratePerHour, Number(addMins) || 0);

  const apply = () => {
    let next = src;
    if (title.trim() && title.trim() !== sec.title) next = renameSection(next, sec.id, title);
    const u = Number(units);
    if (Number.isFinite(u) && u >= 1 && u !== sec.units) next = resizeSection(next, sec.id, u);
    const add = Number(addUnits) || byTime;
    if (add > 0) next = addSectionDone(next, sec.id, add);
    const sp = Number(splitAt);
    if (Number.isFinite(sp) && sp >= 1 && sp < (Number(units) || sec.units)) next = splitSection(next, sec.id, sp);
    onSave(next);
  };

  return (
    <Sheet onClose={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 rise max-h-[86dvh] overflow-y-auto"
        style={{ background: "var(--surface)", borderTop: "1.5px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
        <p className="t-title font-black text-center mb-4" style={{ color: "var(--text)" }}>تفاصيل القسم</p>

        <label className="flex flex-col gap-1.5 mb-3">
          <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>اسم القسم</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: القواعد"
            className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px]"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        </label>

        <label className="flex flex-col gap-1.5 mb-4">
          <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>حجم القسم ({uLabel})</span>
          <input value={units} onChange={(e) => setUnits(e.target.value.replace(/\D/g, ""))} inputMode="numeric"
            className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        </label>

        <p className="t-caption font-black mb-2" style={{ color: "var(--text)" }}>سجّل ما أنجزتَه الآن</p>
        <div className="grid grid-cols-2 gap-2 mb-1">
          <label className="flex flex-col gap-1.5">
            <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>بال{uLabel}</span>
            <input value={addUnits} onChange={(e) => setAddUnits(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="5"
              className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>أو بالدقائق</span>
            <input value={addMins} onChange={(e) => setAddMins(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="60"
              className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
          </label>
        </div>
        {/* التحويل لا يظهر إلا بمعدّلٍ حقيقيّ — بلا معدّلٍ لا نخمّن */}
        <p className="t-caption mb-4" style={{ color: "var(--text-muted)" }}>
          {src.ratePerHour
            ? byTime > 0
              ? `بمعدّلك (${n(src.ratePerHour)} ${uLabel}/ساعة) ⇒ ${n(byTime)} ${unitLabel(src.kind, byTime)}`
              : `معدّلك ${n(src.ratePerHour)} ${uLabel} في الساعة.`
            : "أضِف معدّلك عند إنشاء المصدر لنحوّل الدقائق إلى إنجاز."}
        </p>

        {sec.units > 1 && (
          <label className="flex flex-col gap-1.5 mb-4">
            <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>اشطر القسم — الجزء الأول ({uLabel})</span>
            <input value={splitAt} onChange={(e) => setSplitAt(e.target.value.replace(/\D/g, ""))} inputMode="numeric"
              placeholder={`أقلّ من ${n(sec.units)}`}
              className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
              style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
          </label>
        )}

        <button onClick={apply} className="w-full rounded-2xl py-4 t-body font-black transition active:scale-[0.98]"
          style={{ background: color, color: "#fff", border: "none" }}>احفظ</button>
        <button onClick={onClose} className="w-full mt-2 py-3 t-body font-bold" style={{ color: "var(--text-muted)" }}>تراجع</button>
      </div>
    </Sheet>
  );
}

/* ورقةٌ سفليّة: اختر جاهزاً من الكتالوج أو أضِف مصدرك. العدد يسأله الطالب دائماً —
   أعداد الحلقات تتغيّر كل موسم ولا نملك مصدراً موثّقاً لها، فلا نملأها من عندنا. */
function AddSourceSheet({ subject, examKey, color, onClose, onAdd }: {
  subject: string; examKey: string; color: string;
  onClose: () => void; onAdd: (s: StudySource) => void;
}) {
  const catalog = catalogFor(examKey, subject);
  const [picked, setPicked] = useState<CatalogSource | null>(null);
  /* بلا كتالوج لا معنى لخيارٍ ثانٍ: نفتح على «مصدرٌ خاصّ بي» مباشرةً. */
  const [custom, setCustom] = useState(catalog.length === 0);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SourceKind>("video");
  const [units, setUnits] = useState("");
  const [sections, setSections] = useState(String(DEFAULT_SECTIONS));
  const [rate, setRate] = useState("");
  const [mins, setMins] = useState("");

  const chosenName = picked ? picked.name : name.trim();
  const unitsNum = Number(units);
  const sectionsNum = Number(sections);
  const rateNum = Number(rate) || 0;
  const minsNum = Number(mins) || 0;
  const valid = chosenName.length > 0 && Number.isFinite(unitsNum) && unitsNum > 0 && sectionsNum >= 1;

  /* متوسّط الفيديو يُشتقّ من المعدّل إن لم يُدخله الطالب — حسبةٌ لا اختراع. */
  const derivedMins = minsNum || minsPerUnitFromRate(rateNum);
  const totalMins = minutesForUnits({ ratePerHour: rateNum || undefined, minsPerUnit: derivedMins || undefined }, unitsNum || 0);

  const submit = () => {
    if (!valid) return;
    onAdd(buildSource({
      id: newSourceId(),
      examId: examKey, subject, name: chosenName, kind,
      totalUnits: unitsNum, sectionCount: sectionsNum, builtin: !!picked,
      ratePerHour: rateNum || undefined, minsPerUnit: derivedMins || undefined,
    }));
  };

  const pick = (c: CatalogSource) => { setPicked(c); setCustom(false); setKind(c.kind); if (c.totalUnits) setUnits(String(c.totalUnits)); };

  return (
    <Sheet onClose={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 rise max-h-[86dvh] overflow-y-auto"
        style={{ background: "var(--surface)", borderTop: "1.5px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
        <p className="t-title font-black text-center" style={{ color: "var(--text)" }}>مصدرٌ جديد في {subject}</p>
        <p className="t-caption text-center mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
          {catalog.length > 0 ? "اختر جاهزاً أو أضِف مصدرك الخاصّ." : "اكتب اسم دورتك أو كتابك."}
        </p>

        {catalog.length > 0 && (
          <>
            <div className="flex flex-col gap-2 mb-3">
              {catalog.map((c) => {
                const on = picked?.id === c.id;
                return (
                  <button key={c.id} onClick={() => pick(c)}
                    className="rounded-xl px-4 py-3 text-right transition active:scale-[0.99]"
                    style={{ background: on ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--surface2)",
                             border: `1.5px solid ${on ? color : "var(--border)"}` }}>
                    <span className="block t-body font-black" style={{ color: "var(--text)" }}>{c.name}</span>
                    <span className="block t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{c.desc}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => { setCustom(true); setPicked(null); }}
              className="w-full rounded-xl px-4 py-3 t-body font-bold text-right mb-3"
              style={{ background: custom ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--surface2)",
                       border: `1.5px solid ${custom ? color : "var(--border)"}`, color: "var(--text)" }}>
              ✏️ مصدرٌ خاصٌّ بي
            </button>
          </>
        )}

        {custom && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المصدر (دورة أو كتاب)..."
            className="w-full rounded-2xl px-4 py-3 t-body outline-none min-h-[52px] mb-3"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        )}

        {(picked || custom) && (
          <>
            <p className="t-caption font-bold mb-2" style={{ color: "var(--text-dim)" }}>نوع الوحدة</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["video", "pages"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)} className="rounded-xl py-2.5 t-body font-bold"
                  style={{ background: kind === k ? color : "var(--surface2)", color: kind === k ? "#fff" : "var(--text)",
                           border: `1.5px solid ${kind === k ? color : "var(--border)"}` }}>
                  {k === "video" ? "🎬 فيديوهات" : "📄 صفحات"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="flex flex-col gap-1.5">
                <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>العدد الكلّي</span>
                <input value={units} onChange={(e) => setUnits(e.target.value.replace(/\D/g, ""))} inputMode="numeric"
                  placeholder={kind === "video" ? "كم فيديو؟" : "كم صفحة؟"}
                  className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>عدد الأقسام</span>
                <input value={sections} onChange={(e) => setSections(e.target.value.replace(/\D/g, ""))} inputMode="numeric"
                  className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
              </label>
            </div>
            <p className="t-caption mb-3" style={{ color: "var(--text-muted)" }}>
              تقسيمٌ متساوٍ للبداية — تعدّل حجم كل قسمٍ واسمه بعد الإضافة.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <label className="flex flex-col gap-1.5">
                <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>
                  {kind === "video" ? "فيديوهات/ساعة" : "صفحات/ساعة"} (اختياري)
                </span>
                <input value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="5"
                  className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
              </label>
              {kind === "video" && (
                <label className="flex flex-col gap-1.5">
                  <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>دقائق الفيديو (اختياري)</span>
                  <input value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="60"
                    className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
                    style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
                </label>
              )}
            </div>
            {/* تقديرٌ يظهر فقط حين نملك ما نحسب به */}
            {totalMins > 0 && (
              <p className="t-caption mb-4" style={{ color: "var(--text-dim)" }}>
                ⏱️ التقدير: {n(Math.round(totalMins / 60))} ساعة تقريباً
                {kind === "video" && derivedMins > 0 ? ` · الفيديو ${durationRangeText(derivedMins, n)}` : ""}
              </p>
            )}
          </>
        )}

        <button onClick={submit} disabled={!valid}
          className="w-full rounded-2xl py-4 t-body font-black transition active:scale-[0.98]"
          style={{ background: valid ? color : "var(--surface2)", color: valid ? "#fff" : "var(--text-muted)", border: "none" }}>
          أضِف المصدر
        </button>
        <button onClick={onClose} className="w-full mt-2 py-3 t-body font-bold" style={{ color: "var(--text-muted)" }}>تراجع</button>
      </div>
    </Sheet>
  );
}
