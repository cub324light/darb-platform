"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PageFooter from "@/components/PageFooter";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import { ERROR_CATEGORIES } from "@/lib/constants";
import { subjectsForTracks, colorForSubject, type TrackId } from "@/lib/tracks";
import { loadUser, loadList, saveList } from "@/lib/storage";
import { buildDuwairbProfile } from "@/lib/duwairb";
import { trackEvent } from "@/lib/events";
import { getPlan, VAULT_FREE_LIMIT } from "@/lib/plan";
import type { VaultError, VaultDifficulty, ReviewCard } from "@/lib/types";

const PER_SUBJECT_LIMIT = VAULT_FREE_LIMIT;
const VAULT_KEY = "darb_vault";

export default function VaultPage() {
  const [activeIds] = useState<TrackId[]>(() => {
    if (typeof window === "undefined") return ["تحصيلي"] as TrackId[];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    return ids.length ? ids : (["تحصيلي"] as TrackId[]);
  });
  const [subjectList] = useState<{ name: string; color: string }[]>(() => {
    if (typeof window === "undefined") return [];
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const finalIds = ids.length ? ids : (["تحصيلي"] as TrackId[]);
    return subjectsForTracks(finalIds);
  });
  const [errors, setErrors] = useState<VaultError[]>(() =>
    typeof window !== "undefined" ? loadList<VaultError>(VAULT_KEY) : []
  );
  const [showAdd, setShowAdd] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>("الكل");
  const [filterCat, setFilterCat] = useState<string>("الكل");
  const [sortBy, setSortBy] = useState<"recent" | "priority">("recent");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [undoItem, setUndoItem] = useState<VaultError | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newQ, setNewQ] = useState("");
  const [newSubject, setNewSubject] = useState(() => {
    if (typeof window === "undefined") return "";
    const u = loadUser();
    const ids = (u?.activeTracks?.length ? u.activeTracks : (u?.track ? [u.track] : [])) as TrackId[];
    const finalIds = ids.length ? ids : (["تحصيلي"] as TrackId[]);
    return subjectsForTracks(finalIds)[0]?.name ?? "";
  });
  const [newCat, setNewCat] = useState<string>(ERROR_CATEGORIES[0]);
  const [newDiff, setNewDiff] = useState<VaultDifficulty>("متوسط");
  const [newNote, setNewNote] = useState("");
  /* شرح دويرب لكل خطأ (تخزين مؤقت بالـ id) */
  const [explainById, setExplainById] = useState<Record<string, string>>({});
  const [explainLoadingId, setExplainLoadingId] = useState<string | null>(null);

  /* ── الربط مع بطاقاتي: نمنع تكرار نفس السؤال في القائمتين ──
     نحفظ نصوص أسئلة البطاقات الموجودة، ونحوّل أي خطأ لبطاقة بضغطة. */
  const CARDS_KEY = "darb_cards";
  const [cardQuestions, setCardQuestions] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(loadList<ReviewCard>(CARDS_KEY).map((c) => c.question.trim())); }
    catch { return new Set(); }
  });
  const [cardMsg, setCardMsg] = useState<string | null>(null);

  const convertToCard = (error: VaultError) => {
    const q = error.question.trim();
    if (cardQuestions.has(q)) {
      setCardMsg("موجودة في بطاقاتي مسبقاً ✓");
      setTimeout(() => setCardMsg(null), 2200);
      return;
    }
    const answer = (explainById[error.id] || error.note || "اكتب الإجابة الصحيحة هنا").trim();
    const cards = loadList<ReviewCard>(CARDS_KEY);
    cards.unshift({
      id: Date.now().toString(), question: q, answer, subject: error.subject,
      interval: 1, repetitions: 0, easeFactor: 2.5,
      dueDate: Date.now(), createdAt: Date.now(),
    } as ReviewCard);
    saveList(CARDS_KEY, cards);
    setCardQuestions((p) => new Set(p).add(q));
    setCardMsg("أُضيفت إلى بطاقاتي ✓");
    setTimeout(() => setCardMsg(null), 2200);
  };

  /* حفظ تلقائي عند أي تغيير */
  useEffect(() => { saveList(VAULT_KEY, errors); }, [errors]);

  const [now] = useState<number>(Date.now);
  const [isPlanFree] = useState(() => getPlan() === "free");
  const subjects = subjectList.map((s) => s.name);
  const countForSubject = (subj: string) => errors.filter((e) => e.subject === subj).length;
  /* الحد لكل مادة على حدة — كل مادة لها 25 مكاناً مستقلاً */
  const atLimit = isPlanFree && countForSubject(newSubject) >= PER_SUBJECT_LIMIT;

  const filtered = errors
    .filter((e) => {
      if (filterSubject !== "الكل" && e.subject !== filterSubject) return false;
      if (filterCat !== "الكل" && e.category !== filterCat) return false;
      if (searchQ.trim()) {
        const q = searchQ.trim().toLowerCase();
        if (!e.question.toLowerCase().includes(q) && !(e.note ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy !== "priority") return b.createdAt - a.createdAt;
      /* الأهم: الأصعب أولاً، ثم الأقل مراجعةً */
      const rank: Record<string, number> = { "صعب": 3, "متوسط": 2, "سهل": 1 };
      const dr = (rank[b.difficulty ?? "متوسط"] ?? 2) - (rank[a.difficulty ?? "متوسط"] ?? 2);
      return dr !== 0 ? dr : a.reviewCount - b.reviewCount;
    });

  const addError = () => {
    if (!newQ.trim() || atLimit) return;
    setErrors((p) => [{
      id: Date.now().toString(), question: newQ.trim(),
      subject: newSubject, category: newCat,
      note: newNote.trim(), createdAt: Date.now(), reviewCount: 0,
      difficulty: newDiff,
    }, ...p]);
    setNewQ(""); setNewNote(""); setNewDiff("متوسط"); setShowAdd(false);
  };

  const deleteError = (id: string) => {
    const item = errors.find((e) => e.id === id);
    if (!item) return;
    setErrors((p) => p.filter((e) => e.id !== id));
    setExpandedId(null);
    setUndoItem(item);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => { setUndoItem(null); }, 3500);
  };

  const undoDelete = () => {
    if (!undoItem) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setErrors((p) => [undoItem, ...p]);
    setUndoItem(null);
  };

  const categoryCount = (cat: string) => errors.filter((e) => e.category === cat).length;
  const colorOf = (subj: string) => colorForSubject(activeIds, subj);

  /* اطلب من دويرب شرح خطأ — نتيجة مخزّنة مؤقتاً حتى لا تتكرر الطلبات */
  const explainError = async (error: VaultError) => {
    if (explainById[error.id] || explainLoadingId) return;
    setExplainLoadingId(error.id);
    try {
      const promptText =
        `السؤال أو المفهوم: ${error.question}\nالمادة: ${error.subject}\nتصنيف الخطأ: ${error.category}` +
        (error.note ? `\nملاحظة الطالب: ${error.note}` : "");
      const { profile, personalized } = buildDuwairbProfile();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, subjects, mode: "explain", profile }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      setExplainById((p) => ({ ...p, [error.id]: (data.text ?? data.error ?? "تعذّر الشرح").trim() }));
      if (!data.error) trackEvent("ai_explain_requested", { personalized, source: "vault" });
    } catch {
      setExplainById((p) => ({ ...p, [error.id]: "تعذّر الاتصال — حاول مرة ثانية" }));
    } finally {
      setExplainLoadingId(null);
    }
  };

  return (
    <div className="page">

      <PageGuide pageKey="vault" steps={[
        { title: "أخطائي", desc: "أي سؤال تغلط فيه — احفظه هنا فوراً. الهدف: تراجع كل خطأ مرتين قبل الاختبار حتى ما يتكرر." },
        { title: "صنّف وفلتر", desc: "كل خطأ له مادة وتصنيف (فهم، حفظ، سرعة...). الفلاتر فوق تساعدك تركز على نوع معين قبل الاختبار." },
        { title: "راجعها بانتظام", desc: "افتح أي خطأ واضغط (راجعته) كل ما رجعت له. زر الترتيب فوق يعرض لك الأقل مراجعة أولاً." },
      ]} />

      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg grad-title">أخطائي</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy((s) => s === "recent" ? "priority" : "recent")}
              className="dome-chip text-[15px] font-bold transition"
              style={{ color: sortBy === "priority" ? "var(--gold)" : "var(--text-dim)" }}>
              {sortBy === "priority" ? "أولوية" : "أحدث"}
            </button>
            <div className="dome-chip">
              <span className="num-hero text-base" style={{ color: "var(--gold-light)" }}>{errors.length}</span>
              <span className="text-[15px] font-semibold" style={{ color: "var(--text-dim)" }}>خطأ</span>
            </div>
          </div>
        </div>
      </Dome>
      <div className="h-5" />

      {/* ── شريط البحث ── */}
      <div className="px-5 mb-5 rise rise-1">
        <div className="relative">
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="ابحث في أخطائك..."
            className="w-full rounded-2xl px-5 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[52px] pr-11"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-5 h-5">
              <circle cx="9" cy="9" r="5.5" /><path strokeLinecap="round" d="M13.5 13.5l3 3" />
            </svg>
          </span>
          {searchQ && (
            <button
              onClick={() => setSearchQ("")}
              aria-label="مسح البحث"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-sm"
              style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
            >×</button>
          )}
        </div>
      </div>

      {/* ── شريط الحد — لكل مادة ٢٥ خطأً مستقلة ── */}
      {isPlanFree && (() => {
        const isAll = filterSubject === "الكل";
        const cap = isAll ? subjects.length * PER_SUBJECT_LIMIT : PER_SUBJECT_LIMIT;
        const used = isAll ? errors.length : countForSubject(filterSubject);
        const full = cap > 0 && used >= cap;
        return (
          <div className="px-5 mb-7 rise rise-1">
            <div className="flex justify-between mb-2">
              <span className="body-sm">{isAll ? "إجمالي الأخطاء" : `أخطاء ${filterSubject}`}</span>
              <span className="body-sm">{used} / {cap}</span>
            </div>
            <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: (cap === 0 ? 0 : Math.min(100, (used / cap) * 100)) + "%",
                  background: full ? "#EF4444" : "#F59E0B",
                }} />
            </div>
            {!isAll && full && (
              <p className="text-sm text-[var(--danger)] mt-2 text-center">
                وصلت ٢٥ خطأ في {filterSubject}.{" "}
                <Link href="/pricing" className="text-[var(--accent-light)] underline font-semibold">رقّي لشاهين</Link>
              </p>
            )}
          </div>
        );
      })()}

      {/* ── تصنيفات الخطأ ── */}
      <div className="px-5 mb-7 rise rise-2">
        <p className="text-base font-black text-[var(--text)] mb-4">تصنيف الخطأ</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {["الكل", ...ERROR_CATEGORIES].map((cat) => {
            const count = cat === "الكل" ? errors.length : categoryCount(cat);
            const active = filterCat === cat;
            return (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className="flex-shrink-0 px-6 py-3.5 rounded-2xl text-base font-bold transition min-h-[52px]"
                style={active
                  ? { background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1.5px solid #F59E0B", boxShadow: "0 4px 14px rgba(245,158,11,0.3)" }
                  : { background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-dim)" }}>
                {cat}{count > 0 && <span className="mr-1 text-sm opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── مواد مسارك ── */}
      <div className="px-5 mb-7 rise rise-3">
        <p className="text-base font-black text-[var(--text)] mb-4">المادة</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {["الكل", ...subjects].map((s) => {
            const active = filterSubject === s;
            const color = s === "الكل" ? "#64748B" : colorOf(s);
            return (
              <button key={s} onClick={() => setFilterSubject(s)}
                className="flex-shrink-0 px-6 py-3.5 rounded-2xl text-base font-bold transition min-h-[52px]"
                style={active
                  ? { background: "var(--surface)", border: `2px solid ${color}`, boxShadow: `0 0 10px ${color}35`, color: color }
                  : { background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── زر الإضافة — متاح دائماً (الحد لكل مادة على حدة) ── */}
      <div className="px-5 mb-6 rise rise-4">
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)}
              className="w-full py-5 rounded-2xl text-lg font-bold text-[var(--text-dim)] transition min-h-[60px]"
              style={{ background: "var(--surface)", border: "1.5px dashed var(--border)" }}>
              + أضف خطأً جديداً
            </button>
          ) : (
            <div className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1.5px solid rgba(245,158,11,0.35)" }}>
              <p className="font-bold text-base text-[var(--gold)]">خطأ جديد في أخطائي</p>

              <textarea value={newQ} onChange={(e) => setNewQ(e.target.value)} rows={3}
                placeholder="السؤال أو المفهوم الذي أخطأت فيه..."
                className="w-full rounded-2xl px-4 py-3 text-base text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none transition-colors"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

              <div className="grid grid-cols-2 gap-3">
                <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                  className="rounded-2xl px-4 py-3.5 text-base text-[var(--text)] outline-none min-h-[52px]"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {subjects.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={newCat} onChange={(e) => setNewCat(e.target.value)}
                  className="rounded-2xl px-4 py-3.5 text-base text-[var(--text)] outline-none min-h-[52px]"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {ERROR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="ملاحظة: ليش غلطت؟ (اختياري)"
                className="rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[52px]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

              {/* صعوبة الخطأ — تُرتّب «الأهم» حسبها */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-[var(--text-muted)] px-1">صعوبة الخطأ</span>
                <div className="grid grid-cols-3 gap-2">
                  {(["سهل", "متوسط", "صعب"] as VaultDifficulty[]).map((d) => {
                    const active = newDiff === d;
                    const clr = d === "سهل" ? "#10B981" : d === "متوسط" ? "#F59E0B" : "#EF4444";
                    return (
                      <button key={d} onClick={() => setNewDiff(d)} type="button"
                        className="py-2.5 rounded-xl font-bold text-[14px] transition active:scale-95"
                        style={active
                          ? { background: `color-mix(in srgb, ${clr} 16%, transparent)`, border: `1.5px solid ${clr}`, color: clr }
                          : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* عدّاد أخطاء المادة المختارة — كل مادة لها ٢٥ */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-[var(--text-muted)]">أخطاء {newSubject}</span>
                <span className="text-sm font-bold" style={{ color: atLimit ? "var(--danger)" : "var(--text-dim)" }}>
                  {countForSubject(newSubject)} / {PER_SUBJECT_LIMIT}
                </span>
              </div>

              {atLimit && (
                <p className="text-sm text-[var(--danger)] text-center">
                  مادة {newSubject} ممتلئة — اختر مادة ثانية أو{" "}
                  <Link href="/pricing" className="text-[var(--accent-light)] underline font-semibold">رقّي لشاهين</Link>
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={addError} disabled={atLimit}
                  className="py-4 rounded-2xl font-bold text-base transition min-h-[54px] glow-gold"
                  style={atLimit
                    ? { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                    : { background: "rgba(245,158,11,0.08)", border: "1.5px solid #F59E0B", color: "#F59E0B" }}>
                  {atLimit ? "المادة ممتلئة" : "أضف للخزنة"}
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="py-4 rounded-2xl text-base font-medium text-[var(--text-muted)] transition min-h-[54px]"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>

      {/* ── القائمة ── */}
      <div className="px-5 flex flex-col gap-5 rise rise-5">

        {filtered.length === 0 && (
          <div className="text-center py-14 px-4">
            <p className="title-md text-[var(--text)] mb-2">ما في أخطاء بعد</p>
            <p className="body-sm mb-1">هنا تحفظ أي سؤال تغلط فيه — مع سبب الغلط.</p>
            <p className="body-sm mb-4">دويرب يقدر يشرح لك كل خطأ بالضبط فين غلطت.</p>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              أو راجع{" "}
              <a href="/review" className="font-bold underline" style={{ color: "var(--accent-light)" }}>بطاقاتي</a>
              {" "}إذا تبي تمرن على المعلومات
            </p>
          </div>
        )}

        {filtered.map((error) => {
          const color = colorOf(error.subject);
          const isExpanded = expandedId === error.id;
          const daysAgo = Math.round((now - error.createdAt) / 86400000);

          return (
            <div key={error.id}
              className="rounded-2xl overflow-hidden transition-[border-color,box-shadow] duration-200 glow-card-hover group"
              style={{ background: "var(--surface)", border: `1.5px solid ${isExpanded ? color + "55" : "var(--border)"}`, boxShadow: isExpanded ? `0 0 24px ${color}14` : undefined }}>

              <div className="p-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : error.id)}>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0" style={{ background: color }} />

                  <div className="flex-1 min-w-0">
                    <p className="text-base text-[var(--text)] leading-relaxed mb-4">{error.question}</p>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold px-4 py-1.5 rounded-full"
                          style={{ background: color + "20", color }}>
                          {error.subject}
                        </span>
                        <span className="text-sm px-4 py-1.5 rounded-full"
                          style={{ background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
                          {error.category}
                        </span>
                        {error.difficulty && (
                          <span className="text-sm font-bold px-3 py-1.5 rounded-full"
                            style={(() => { const clr = error.difficulty === "سهل" ? "#10B981" : error.difficulty === "متوسط" ? "#F59E0B" : "#EF4444"; return { background: `color-mix(in srgb, ${clr} 14%, transparent)`, color: clr }; })()}>
                            {error.difficulty}
                          </span>
                        )}
                        {error.reviewCount > 0 && (
                          <span className="text-sm text-[var(--success)] font-bold">✓ راجعته {error.reviewCount}×</span>
                        )}
                      </div>
                      <span className="text-sm text-[var(--text-muted)]">
                        {daysAgo === 0 ? "اليوم" : `قبل ${daysAgo} يوم`}
                      </span>
                    </div>
                    {!isExpanded && !explainById[error.id] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedId(error.id); explainError(error); }}
                        disabled={explainLoadingId === error.id}
                        className="mt-3 w-full py-2 rounded-xl text-[12px] font-bold transition flex items-center justify-center gap-1.5"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                          color: "var(--accent-light)",
                        }}>
                        {explainLoadingId === error.id ? (
                          <span className="inline-block w-3 h-3 rounded-full border-2 animate-spin"
                            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                        ) : "دويرب: شرح الخطأ 🤖"}
                      </button>
                    )}
                  </div>

                  <span className="text-[var(--text-muted)] text-sm mt-1">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-[var(--border)]">
                  <div className="pt-5 flex flex-col gap-4">
                    {error.note && (
                      <div className="rounded-2xl p-5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <p className="text-sm font-bold text-[var(--text-muted)] mb-2">ملاحظتي</p>
                        <p className="text-base text-[var(--text-dim)] leading-relaxed">{error.note}</p>
                      </div>
                    )}

                    {/* ── شرح دويرب ── */}
                    {explainById[error.id] ? (
                      <div className="rounded-2xl p-5"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 6%, var(--surface2))",
                          border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)",
                        }}>
                        <p className="text-sm font-bold mb-2" style={{ color: "var(--accent-light)" }}>شرح دويرب 🤖</p>
                        <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                          {explainById[error.id]}
                        </p>
                      </div>
                    ) : (
                      <button onClick={() => explainError(error)} disabled={explainLoadingId === error.id}
                        className="w-full py-3.5 rounded-2xl text-base font-bold transition min-h-[52px] flex items-center justify-center gap-2"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                          border: "1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                          color: "var(--accent-light)",
                        }}>
                        {explainLoadingId === error.id ? (
                          <span className="inline-block w-4 h-4 rounded-full border-2 animate-spin"
                            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                        ) : "دويرب: اشرح هذا الخطأ 🤖"}
                      </button>
                    )}

                    {/* تحويل لبطاقة مراجعة — يمنع التكرار إذا كانت موجودة */}
                    {cardQuestions.has(error.question.trim()) ? (
                      <div className="w-full py-3 rounded-2xl text-[14px] font-bold text-center flex items-center justify-center gap-2"
                        style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)", color: "var(--success)" }}>
                        ✓ موجودة في بطاقاتي — راجِعها هناك
                      </div>
                    ) : (
                      <button onClick={() => convertToCard(error)}
                        className="w-full py-3.5 rounded-2xl text-base font-bold transition min-h-[52px] flex items-center justify-center gap-2"
                        style={{ background: "color-mix(in srgb, var(--gold) 10%, transparent)", border: "1.5px solid color-mix(in srgb, var(--gold) 35%, transparent)", color: "var(--gold)" }}>
                        📇 حوّلها لبطاقة مراجعة
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setErrors((p) => p.map((e) => e.id === error.id ? { ...e, reviewCount: e.reviewCount + 1 } : e))}
                        className="py-4 rounded-2xl text-base font-black transition min-h-[56px]"
                        style={{ background: "transparent", border: `1.5px solid ${color}`, color: color }}>
                        راجعته ✓
                      </button>
                      <button onClick={() => deleteError(error.id)}
                        className="py-4 rounded-2xl text-base font-black transition min-h-[56px]"
                        style={{ background: "var(--surface2)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="h-6" />
      <PageFooter />

      {/* ── تنبيه تحويل البطاقة ── */}
      {cardMsg && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold"
          style={{ background: "var(--surface)", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, transparent)", color: "var(--text)" }}>
          {cardMsg}
        </div>
      )}

      {/* ── تنبيه التراجع عن الحذف ── */}
      {undoItem && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", minWidth: "260px", maxWidth: "90vw" }}
        >
          <p className="flex-1 text-sm font-semibold text-[var(--text)] truncate">حُذف: {undoItem.question.slice(0, 30)}{undoItem.question.length > 30 ? "…" : ""}</p>
          <button
            onClick={undoDelete}
            className="text-sm font-black px-3 py-1.5 rounded-xl"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-light)", border: "1.5px solid var(--accent)" }}
          >
            تراجع
          </button>
        </div>
      )}
    </div>
  );
}
