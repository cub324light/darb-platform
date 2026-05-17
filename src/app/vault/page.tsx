"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ERROR_CATEGORIES } from "@/lib/constants";
import type { VaultError, SubjectId, SearchResult } from "@/lib/types";

const SUBJECTS: SubjectId[] = ["فيزياء", "رياضيات", "كيمياء", "أحياء"];

const SUBJECT_COLORS: Record<SubjectId, string> = {
  فيزياء:  "#2563EB",
  رياضيات: "#8B5CF6",
  كيمياء:  "#10B981",
  أحياء:   "#F59E0B",
};

const FREE_LIMIT = 20;
const STORAGE_KEY = "darb_vault";

export default function VaultPage() {
  const [errors, setErrors]         = useState<VaultError[]>([]);
  const [hydrated, setHydrated]     = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [filterSubject, setFilterSubject] = useState<SubjectId | "الكل">("الكل");
  const [filterCat, setFilterCat]   = useState<string>("الكل");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newQ, setNewQ]             = useState("");
  const [newSubject, setNewSubject] = useState<SubjectId>("فيزياء");
  const [newCat, setNewCat]         = useState<string>(ERROR_CATEGORIES[0]);
  const [newNote, setNewNote]       = useState("");

  // Search modal state
  const [showSearch, setShowSearch]         = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchLoading, setSearchLoading]   = useState(false);
  const [searchResult, setSearchResult]     = useState<SearchResult | null>(null);
  const [searchError, setSearchError]       = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setErrors(JSON.parse(stored) as VaultError[]);
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever errors change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
    } catch {
      // ignore storage errors
    }
  }, [errors, hydrated]);

  const isPlanFree = true;
  const atLimit    = isPlanFree && errors.length >= FREE_LIMIT;

  const filtered = errors.filter((e) => {
    if (filterSubject !== "الكل" && e.subject !== filterSubject) return false;
    if (filterCat     !== "الكل" && e.category !== filterCat)   return false;
    return true;
  });

  const addError = (overrides?: Partial<VaultError>) => {
    const q = overrides?.question ?? newQ;
    if (!q.trim() || atLimit) return;
    if (errors.some((e) => e.question.trim() === q.trim())) {
      setDuplicateWarning(true);
      setTimeout(() => setDuplicateWarning(false), 2500);
      return;
    }
    setErrors((p) => [{
      id: Date.now().toString(),
      question: q.trim(),
      subject: overrides?.subject ?? newSubject,
      category: overrides?.category ?? newCat,
      note: overrides?.note ?? newNote.trim(),
      createdAt: Date.now(),
      reviewCount: 0,
    }, ...p]);
    setNewQ(""); setNewNote(""); setShowAdd(false);
  };

  const addFromSearch = () => {
    if (!searchResult?.found) return;
    setNewQ(searchResult.question);
    closeSearch();
    setShowAdd(true);
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResult(null);
    setSearchError(null);
    try {
      const res = await fetch("/api/question-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      const data = await res.json() as SearchResult & { error?: string };
      if (!res.ok || data.error) {
        setSearchError(data.error ?? "حدث خطأ");
      } else {
        setSearchResult(data);
      }
    } catch {
      setSearchError("خطأ في الاتصال، حاول مرة أخرى");
    } finally {
      setSearchLoading(false);
    }
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResult(null);
    setSearchError(null);
  };

  const categoryCount = (cat: string) => errors.filter((e) => e.category === cat).length;

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="title-md text-[var(--text)]">خزنة الأخطاء 🔒</h1>
        <div className="stat-chip">
          <span className="font-mono-nums font-bold text-base text-[var(--gold)]">{errors.length}</span>
          {isPlanFree && <span className="body-sm">/{FREE_LIMIT}</span>}
        </div>
      </div>

      {/* ── Limit bar ── */}
      {isPlanFree && (
        <div className="px-5 mb-7">
          <div className="flex justify-between mb-2">
            <span className="body-sm">الاستخدام</span>
            <span className="body-sm">{errors.length} / {FREE_LIMIT}</span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: (errors.length / FREE_LIMIT) * 100 + "%",
                background: errors.length >= FREE_LIMIT - 5 ? "#EF4444" : "#F59E0B",
              }} />
          </div>
          {atLimit && (
            <p className="text-sm text-[var(--danger)] mt-2 text-center">
              وصلت الحد المجاني.{" "}
              <Link href="/pricing" className="text-[var(--blue-light)] underline font-semibold">رقّي لشاهين</Link>
            </p>
          )}
        </div>
      )}

      {/* ── Category pills ── */}
      <div className="px-5 mb-8">
        <p className="text-base font-black text-[var(--text)] mb-4">تصنيف الخطأ</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {["الكل", ...ERROR_CATEGORIES].map((cat) => {
            const count = cat === "الكل" ? errors.length : categoryCount(cat);
            const active = filterCat === cat;
            return (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className="flex-shrink-0 px-6 py-3.5 rounded-2xl text-base font-bold transition"
                style={active
                  ? { background: "#F59E0B", color: "#0A0A0F" }
                  : { background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-dim)" }}>
                {cat}{count > 0 && <span className="mr-1 text-sm opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Subject tabs ── */}
      <div className="px-5 mb-8">
        <p className="text-base font-black text-[var(--text)] mb-4">المادة</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(["الكل", ...SUBJECTS] as (SubjectId | "الكل")[]).map((s) => {
            const active = filterSubject === s;
            const color = s === "الكل" ? "#64748B" : SUBJECT_COLORS[s as SubjectId];
            return (
              <button key={s} onClick={() => setFilterSubject(s)}
                className="flex-shrink-0 px-6 py-3.5 rounded-2xl text-base font-bold transition"
                style={active
                  ? { background: color, color: "#fff" }
                  : { background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Cards list ── */}
      <div className="px-5 flex flex-col gap-5">

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔒</p>
            <p className="title-md text-[var(--text)] mb-2">الخزنة فارغة</p>
            <p className="body-sm">هذا جيد! استمر.</p>
          </div>
        )}

        {filtered.map((error) => {
          const color     = SUBJECT_COLORS[error.subject];
          const isExpanded = expandedId === error.id;
          const daysAgo   = Math.round((Date.now() - error.createdAt) / 86400000);

          return (
            <div key={error.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{ background: "var(--surface)", border: `1.5px solid ${isExpanded ? color + "50" : "var(--border)"}` }}>

              {/* Card header */}
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
                        {error.reviewCount > 0 && (
                          <span className="text-sm text-[var(--success)] font-bold">✓ راجعته {error.reviewCount}×</span>
                        )}
                      </div>
                      <span className="text-sm text-[var(--text-muted)]">
                        {daysAgo === 0 ? "اليوم" : `قبل ${daysAgo} يوم`}
                      </span>
                    </div>
                  </div>

                  <span className="text-[var(--text-muted)] text-sm mt-1">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-[var(--border)]">
                  <div className="pt-5 flex flex-col gap-4">
                    {error.note && (
                      <div className="rounded-2xl p-5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <p className="text-sm font-bold text-[var(--text-muted)] mb-2">ملاحظتي</p>
                        <p className="text-base text-[var(--text-dim)] leading-relaxed">{error.note}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setErrors((p) => p.map((e) => e.id === error.id ? { ...e, reviewCount: e.reviewCount + 1 } : e))}
                        className="py-4 rounded-2xl text-base font-black text-white transition"
                        style={{ background: color }}>
                        راجعته ✓
                      </button>
                      <button onClick={() => setErrors((p) => p.filter((e) => e.id !== error.id))}
                        className="py-4 rounded-2xl text-base font-black transition"
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

      {/* ── Duplicate warning ── */}
      {duplicateWarning && (
        <div className="mx-5 mb-3 rounded-2xl px-4 py-3 text-sm text-center"
          style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
          هذا السؤال موجود في الخزنة مسبقاً
        </div>
      )}

      {/* ── Add / Search buttons ── */}
      {!atLimit && (
        <div className="px-5 py-5 flex flex-col gap-3">
          {/* Book search button */}
          <button onClick={() => setShowSearch(true)}
            className="w-full py-4 rounded-2xl text-base font-bold transition"
            style={{ background: "var(--surface)", border: "1.5px solid rgba(37,99,235,0.4)", color: "#3B82F6" }}>
            🔍 ابحث عن سؤال في الكتاب
          </button>

          {/* Manual add */}
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)}
              className="w-full py-4 rounded-2xl text-base font-bold text-[var(--text-dim)] transition"
              style={{ background: "var(--surface)", border: "1.5px dashed var(--border)" }}>
              + أضف خطأً يدوياً
            </button>
          ) : (
            <div className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1.5px solid rgba(245,158,11,0.35)" }}>
              <p className="font-bold text-base text-[var(--gold)]">خطأ جديد في الخزنة</p>

              <textarea value={newQ} onChange={(e) => setNewQ(e.target.value)} rows={3}
                placeholder="السؤال أو المفهوم الذي أخطأت فيه..."
                className="w-full rounded-2xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none transition-colors"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

              <div className="grid grid-cols-2 gap-3">
                <select value={newSubject} onChange={(e) => setNewSubject(e.target.value as SubjectId)}
                  className="rounded-2xl px-4 py-3 text-sm text-[var(--text)] outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={newCat} onChange={(e) => setNewCat(e.target.value)}
                  className="rounded-2xl px-4 py-3 text-sm text-[var(--text)] outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {ERROR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="ملاحظة: ليش غلطت؟ (اختياري)"
                className="rounded-2xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => addError()}
                  className="py-3 rounded-2xl font-bold text-base transition"
                  style={{ background: "#F59E0B", color: "#0A0A0F" }}>
                  أضف للخزنة
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="py-3 rounded-2xl text-base font-medium text-[var(--text-muted)] transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Book search modal ── */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeSearch(); }}>

          <div className="w-full max-w-lg rounded-t-3xl p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>

            {/* Modal header */}
            <div className="flex items-center justify-between">
              <p className="font-black text-lg text-[var(--text)]">🔍 ابحث في الكتاب</p>
              <button onClick={closeSearch} className="text-[var(--text-muted)] text-2xl leading-none">×</button>
            </div>

            {/* Search input */}
            <div className="flex flex-col gap-3">
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                rows={3}
                placeholder="صف السؤال أو اكتب جزءاً منه... مثال: سؤال عن قانون نيوتن الثاني والقوة"
                className="w-full rounded-2xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) runSearch(); }}
              />
              <button
                onClick={runSearch}
                disabled={searchLoading || !searchQuery.trim()}
                className="w-full py-4 rounded-2xl text-base font-black transition"
                style={{
                  background: searchLoading || !searchQuery.trim() ? "var(--surface2)" : "#2563EB",
                  color: searchLoading || !searchQuery.trim() ? "var(--text-muted)" : "#fff",
                }}>
                {searchLoading ? "جاري البحث..." : "ابحث"}
              </button>
            </div>

            {/* Error */}
            {searchError && (
              <div className="rounded-2xl p-4 text-sm text-center"
                style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                {searchError}
              </div>
            )}

            {/* Result */}
            {searchResult && (
              <div className="flex flex-col gap-4">
                {searchResult.found ? (
                  <>
                    <div className="rounded-2xl p-5 flex flex-col gap-3"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      {/* Subject badge */}
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-sm font-bold px-3 py-1 rounded-full"
                          style={{
                            background: SUBJECT_COLORS[searchResult.subject as SubjectId] + "20",
                            color: SUBJECT_COLORS[searchResult.subject as SubjectId],
                          }}>
                          {searchResult.subject}
                        </span>
                        <span className="text-sm px-3 py-1 rounded-full"
                          style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
                          {searchResult.category}
                        </span>
                      </div>

                      {/* Question */}
                      <p className="text-base text-[var(--text)] leading-relaxed font-semibold">
                        {searchResult.question}
                      </p>

                      {/* Answer — only shown when available */}
                      {searchResult.answer ? (
                        <div className="rounded-xl p-3"
                          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                          <p className="text-xs text-[var(--text-muted)] mb-1">الإجابة الصحيحة</p>
                          <p className="text-sm text-[var(--success)]">{searchResult.answer}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)]">
                          حدد المادة والتصنيف يدوياً عند الإضافة
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={addFromSearch}
                        className="py-4 rounded-2xl text-base font-black transition"
                        style={{ background: "#F59E0B", color: "#0A0A0F" }}>
                        أضف للخزنة ✓
                      </button>
                      <button onClick={() => { setSearchResult(null); setSearchQuery(""); }}
                        className="py-4 rounded-2xl text-base font-medium transition"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        ابحث مجدداً
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 flex flex-col gap-3">
                    <p className="text-4xl">🔍</p>
                    <p className="text-base text-[var(--text)]">لم أجد هذا السؤال في الكتاب</p>
                    <p className="text-sm text-[var(--text-muted)]">{searchResult.explanation}</p>
                    <button onClick={() => { setSearchResult(null); setSearchQuery(""); }}
                      className="mx-auto px-6 py-3 rounded-2xl text-sm font-bold"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
                      حاول مرة أخرى
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
