"use client";
import { useState, useEffect, startTransition } from "react";
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

const FREE_LIMIT  = 20;
const STORAGE_KEY = "darb_vault";
const _NOW        = Date.now();

export default function VaultPage() {
  const [errors, setErrors]               = useState<VaultError[]>([]);
  const [hydrated, setHydrated]           = useState(false);
  const [showAdd, setShowAdd]             = useState(false);
  const [filterSubject, setFilterSubject] = useState<SubjectId | "الكل">("الكل");
  const [filterCat, setFilterCat]         = useState<string>("الكل");
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [newQ, setNewQ]                   = useState("");
  const [newSubject, setNewSubject]       = useState<SubjectId>("فيزياء");
  const [newCat, setNewCat]               = useState<string>(ERROR_CATEGORIES[0]);
  const [newNote, setNewNote]             = useState("");

  const [showSearch, setShowSearch]             = useState(false);
  const [searchQuery, setSearchQuery]           = useState("");
  const [searchLoading, setSearchLoading]       = useState(false);
  const [searchResult, setSearchResult]         = useState<SearchResult | null>(null);
  const [searchError, setSearchError]           = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  useEffect(() => {
    startTransition(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setErrors(JSON.parse(stored) as VaultError[]);
      } catch {}
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(errors)); } catch {}
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
      id: crypto.randomUUID(),
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
      if (!res.ok || data.error) setSearchError(data.error ?? "حدث خطأ");
      else setSearchResult(data);
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

  return (
    <div className="page">

      {/* Header */}
      <div className="anim-1 flex items-center justify-between px-5 pt-12 pb-5">
        <div>
          <h1 className="font-black text-xl text-[var(--text)]">الخزنة</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">سجّل أخطاءك — لا تكررها</p>
        </div>
        <div className="stat-chip">
          <span className="font-mono-nums font-bold text-[var(--gold)]">{errors.length}</span>
          {isPlanFree && <span className="text-[var(--text-muted)] text-xs">/{FREE_LIMIT}</span>}
        </div>
      </div>

      {/* Usage bar */}
      {isPlanFree && (
        <div className="anim-1 px-5 mb-4">
          <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: (errors.length / FREE_LIMIT) * 100 + "%",
                background: errors.length >= FREE_LIMIT - 5 ? "var(--danger)" : "var(--gold)",
              }} />
          </div>
          {atLimit && (
            <p className="text-xs text-[var(--danger)] mt-2 text-center">
              وصلت الحد المجاني.{" "}
              <Link href="/pricing" className="text-[var(--blue-light)] underline font-semibold">ترقية لشاهين</Link>
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="anim-2 px-5 mb-5 flex flex-col gap-3">
        {/* Subject */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(["الكل", ...SUBJECTS] as (SubjectId | "الكل")[]).map((s) => {
            const active = filterSubject === s;
            const color  = s === "الكل" ? "var(--text-muted)" : SUBJECT_COLORS[s as SubjectId];
            return (
              <button key={s} onClick={() => setFilterSubject(s)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition"
                style={active
                  ? { background: color, color: s === "الكل" ? "var(--bg)" : "#fff" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {s}
              </button>
            );
          })}
        </div>
        {/* Category */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {["الكل", ...ERROR_CATEGORIES].map((cat) => {
            const active = filterCat === cat;
            const count  = cat === "الكل" ? errors.length : errors.filter(e => e.category === cat).length;
            return (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition"
                style={active
                  ? { background: "var(--gold)", color: "#0D0D0D" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {cat}{count > 0 && <span className="mr-1 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      <div className="px-5 flex flex-col gap-4 anim-3">
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔒</p>
            <p className="font-black text-lg text-[var(--text)] mb-1">الخزنة فارغة</p>
            <p className="text-sm text-[var(--text-muted)]">أضف أخطاءك وستتراجع في المراجعة</p>
          </div>
        )}

        {filtered.map((error) => {
          const color      = SUBJECT_COLORS[error.subject];
          const isExpanded = expandedId === error.id;
          const daysAgo    = Math.round((_NOW - error.createdAt) / 86400000);

          return (
            <div
              key={error.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: "var(--surface)",
                border: `1px solid ${isExpanded ? color + "40" : "var(--border)"}`,
                borderRight: `3px solid ${color}`,
              }}
            >
              <div className="p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : error.id)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] leading-relaxed mb-3">{error.question}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: color + "18", color }}>
                        {error.subject}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                        {error.category}
                      </span>
                      {error.reviewCount > 0 && (
                        <span className="text-xs text-[var(--success)] font-bold">✓ ×{error.reviewCount}</span>
                      )}
                      <span className="text-xs text-[var(--text-muted)] mr-auto">
                        {daysAgo === 0 ? "اليوم" : `قبل ${daysAgo} يوم`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[var(--text-muted)] text-xs mt-1 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[var(--border)]">
                  <div className="pt-4 flex flex-col gap-3">
                    {error.note && (
                      <div className="rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <p className="text-xs font-bold text-[var(--text-muted)] mb-1">ملاحظتي</p>
                        <p className="text-sm text-[var(--text-dim)] leading-relaxed">{error.note}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setErrors((p) => p.map((e) => e.id === error.id ? { ...e, reviewCount: e.reviewCount + 1 } : e))}
                        className="py-3 rounded-xl text-sm font-black text-white transition"
                        style={{ background: color }}>
                        راجعته ✓
                      </button>
                      <button
                        onClick={() => setErrors((p) => p.filter((e) => e.id !== error.id))}
                        className="py-3 rounded-xl text-sm font-black transition"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--danger)" }}>
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

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className="mx-5 mt-3 rounded-xl px-4 py-3 text-xs text-center"
          style={{ background: "rgba(245,158,11,0.1)", color: "var(--gold)", border: "1px solid rgba(245,158,11,0.25)" }}>
          هذا السؤال موجود في الخزنة مسبقاً
        </div>
      )}

      {/* Add / Search */}
      {!atLimit && (
        <div className="px-5 py-5 flex flex-col gap-3 anim-4">
          <button onClick={() => setShowSearch(true)}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition"
            style={{ background: "var(--surface)", border: "1px solid rgba(37,99,235,0.35)", color: "var(--blue-light)" }}>
            ابحث عن سؤال في الكتاب
          </button>

          {!showAdd ? (
            <button onClick={() => setShowAdd(true)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-[var(--text-muted)] transition"
              style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
              + أضف خطأً يدوياً
            </button>
          ) : (
            <div className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <p className="font-bold text-sm text-[var(--gold)]">خطأ جديد</p>

              <textarea value={newQ} onChange={(e) => setNewQ(e.target.value)} rows={3}
                placeholder="السؤال أو المفهوم الذي أخطأت فيه..."
                className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

              <div className="grid grid-cols-2 gap-2">
                <select value={newSubject} onChange={(e) => setNewSubject(e.target.value as SubjectId)}
                  className="rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={newCat} onChange={(e) => setNewCat(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {ERROR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="ملاحظة: ليش غلطت؟ (اختياري)"
                className="rounded-xl px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => addError()}
                  className="py-3 rounded-xl font-bold text-sm"
                  style={{ background: "var(--gold)", color: "#0D0D0D" }}>
                  أضف للخزنة
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="py-3 rounded-xl text-sm font-medium text-[var(--text-muted)]"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search modal */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeSearch(); }}
        >
          <div className="w-full max-w-lg rounded-t-3xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

            <div className="flex items-center justify-between">
              <p className="font-black text-base text-[var(--text)]">ابحث في الكتاب</p>
              <button onClick={closeSearch}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)]"
                style={{ background: "var(--surface2)" }}>✕</button>
            </div>

            <div className="flex flex-col gap-3">
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                rows={3}
                placeholder="صف السؤال أو اكتب جزءاً منه..."
                className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) runSearch(); }}
              />
              <button
                onClick={runSearch}
                disabled={searchLoading || !searchQuery.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-black transition"
                style={{
                  background: searchLoading || !searchQuery.trim() ? "var(--surface2)" : "var(--blue)",
                  color: searchLoading || !searchQuery.trim() ? "var(--text-muted)" : "#fff",
                }}>
                {searchLoading ? "جاري البحث..." : "ابحث"}
              </button>
            </div>

            {searchError && (
              <div className="rounded-xl p-3 text-xs text-center"
                style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.25)" }}>
                {searchError}
              </div>
            )}

            {searchResult && (
              <div className="flex flex-col gap-3">
                {searchResult.found ? (
                  <>
                    <div className="rounded-xl p-4 flex flex-col gap-3"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{
                            background: SUBJECT_COLORS[searchResult.subject as SubjectId] + "18",
                            color: SUBJECT_COLORS[searchResult.subject as SubjectId],
                          }}>
                          {searchResult.subject}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                          {searchResult.category}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text)] leading-relaxed font-semibold">{searchResult.question}</p>
                      {!searchResult.answer && (
                        <p className="text-xs text-[var(--text-muted)]">حدد المادة والتصنيف يدوياً عند الإضافة</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={addFromSearch}
                        className="py-3 rounded-xl text-sm font-black"
                        style={{ background: "var(--gold)", color: "#0D0D0D" }}>
                        أضف للخزنة ✓
                      </button>
                      <button onClick={() => { setSearchResult(null); setSearchQuery(""); }}
                        className="py-3 rounded-xl text-sm font-medium"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        ابحث مجدداً
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 flex flex-col gap-2">
                    <p className="text-3xl">🔍</p>
                    <p className="text-sm text-[var(--text)]">لم أجد هذا السؤال</p>
                    <p className="text-xs text-[var(--text-muted)]">{searchResult.explanation}</p>
                    <button onClick={() => { setSearchResult(null); setSearchQuery(""); }}
                      className="mx-auto px-5 py-2 rounded-xl text-xs font-bold mt-1"
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
