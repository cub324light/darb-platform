"use client";
import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ERROR_CATEGORIES } from "@/lib/constants";
import type { VaultError, SubjectId, SearchResult } from "@/lib/types";

const SUBJECTS: SubjectId[] = ["فيزياء", "رياضيات", "كيمياء", "أحياء"];

const SUBJECT_COLORS: Record<SubjectId, string> = {
  فيزياء:  "#3B82F6",
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
  const [showSearch, setShowSearch]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult]   = useState<SearchResult | null>(null);
  const [searchError, setSearchError]     = useState<string | null>(null);
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
      id:          crypto.randomUUID(),
      question:    q.trim(),
      subject:     overrides?.subject  ?? newSubject,
      category:    overrides?.category ?? newCat,
      note:        overrides?.note     ?? newNote.trim(),
      createdAt:   Date.now(),
      reviewCount: 0,
    }, ...p]);
    setNewQ(""); setNewNote(""); setShowAdd(false);
  };

  const addFromSearch = () => {
    if (!searchResult?.found) return;
    setNewQ(searchResult.question);
    closeSearch(); setShowAdd(true);
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true); setSearchResult(null); setSearchError(null);
    try {
      const res  = await fetch("/api/question-search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      const data = await res.json() as SearchResult & { error?: string };
      if (!res.ok || data.error) setSearchError(data.error ?? "حدث خطأ");
      else setSearchResult(data);
    } catch { setSearchError("خطأ في الاتصال"); }
    finally  { setSearchLoading(false); }
  };

  const closeSearch = () => {
    setShowSearch(false); setSearchQuery(""); setSearchResult(null); setSearchError(null);
  };

  return (
    <div className="min-h-dvh bg-[var(--bg)]"
      style={{ paddingBottom: "calc(var(--nav-h) + 80px)" }}>

      {/* Header */}
      <div className="anim-1 px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-xl text-white">الخزنة</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              سجّل أخطاءك · لا تكررها
            </p>
          </div>
          <div className="text-left">
            <p className="font-mono-nums font-black text-2xl"
              style={{ color: errors.length >= FREE_LIMIT - 3 ? "var(--danger)" : "var(--gold)" }}>
              {errors.length}
              <span className="text-base font-normal" style={{ color: "var(--text-muted)" }}>
                /{FREE_LIMIT}
              </span>
            </p>
          </div>
        </div>

        {/* Usage bar */}
        <div className="mt-4 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
          <div className="h-full rounded-full transition-all"
            style={{
              width: (errors.length / FREE_LIMIT) * 100 + "%",
              background: errors.length >= FREE_LIMIT - 3 ? "var(--danger)" : "var(--blue)",
            }} />
        </div>
        {atLimit && (
          <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>
            وصلت الحد.{" "}
            <Link href="/pricing" style={{ color: "var(--blue-light)", textDecoration: "underline" }}>
              ترقية لشاهين
            </Link>
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="anim-2 px-5 mb-4 flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(["الكل", ...SUBJECTS] as (SubjectId | "الكل")[]).map((s) => {
            const active = filterSubject === s;
            const color  = s === "الكل" ? "var(--text-dim)" : SUBJECT_COLORS[s as SubjectId];
            return (
              <button key={s} onClick={() => setFilterSubject(s)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition"
                style={active
                  ? { background: color, color: s === "الكل" ? "var(--bg)" : "#fff" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {s}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {["الكل", ...ERROR_CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition"
              style={filterCat === cat
                ? { background: "var(--gold)", color: "#000" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error cards */}
      <div className="anim-3 px-5 flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔒</p>
            <p className="font-black text-lg text-white mb-1">الخزنة فارغة</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>أضف أول خطأ لك</p>
          </div>
        )}

        {filtered.map((error) => {
          const color      = SUBJECT_COLORS[error.subject];
          const isExpanded = expandedId === error.id;
          const daysAgo    = Math.round((_NOW - error.createdAt) / 86400000);

          return (
            <div key={error.id}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--surface)",
                border: `1px solid ${isExpanded ? color + "30" : "var(--border)"}`,
                borderRight: `3px solid ${color}`,
              }}>
              <div className="p-5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : error.id)}>
                <p className="text-sm text-white leading-relaxed mb-3">{error.question}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: color + "14", color }}>
                    {error.subject}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    {error.category}
                  </span>
                  {error.reviewCount > 0 && (
                    <span className="text-[11px] font-bold" style={{ color: "var(--success)" }}>
                      ✓ ×{error.reviewCount}
                    </span>
                  )}
                  <span className="text-[11px] mr-auto" style={{ color: "var(--text-muted)" }}>
                    {daysAgo === 0 ? "اليوم" : `${daysAgo} يوم`}
                  </span>
                  <span className="text-xs" style={{ color: "var(--border)" }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="pt-4 flex flex-col gap-3">
                    {error.note && (
                      <div className="rounded-xl p-3"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <p className="label mb-1">ملاحظتي</p>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                          {error.note}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setErrors((p) => p.map((e) =>
                          e.id === error.id ? { ...e, reviewCount: e.reviewCount + 1 } : e))}
                        className="py-3 rounded-xl text-sm font-black text-white"
                        style={{ background: color }}>
                        راجعته ✓
                      </button>
                      <button
                        onClick={() => { setErrors((p) => p.filter((e) => e.id !== error.id)); setExpandedId(null); }}
                        className="py-3 rounded-xl text-sm font-bold"
                        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "var(--danger)" }}>
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

      {/* Duplicate warning toast */}
      {duplicateWarning && (
        <div className="fixed bottom-24 left-4 right-4 z-40 rounded-2xl px-4 py-3 text-xs text-center font-bold"
          style={{ background: "var(--gold)", color: "#000", backdropFilter: "blur(8px)" }}>
          هذا السؤال موجود في الخزنة مسبقاً
        </div>
      )}

      {/* Bottom action area */}
      {!atLimit && (
        <div className="fixed left-4 right-4 z-30"
          style={{ bottom: "calc(var(--nav-h) + 12px)" }}>
          {showAdd ? (
            <div className="rounded-2xl p-5 flex flex-col gap-4 shadow-2xl"
              style={{ background: "var(--surface)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm" style={{ color: "var(--gold)" }}>خطأ جديد</p>
                <button onClick={() => setShowAdd(false)}
                  className="text-sm px-2 py-1 rounded-lg"
                  style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                  ✕
                </button>
              </div>
              <textarea value={newQ} onChange={(e) => setNewQ(e.target.value)} rows={3}
                placeholder="السؤال الذي أخطأت فيه..."
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[var(--text-muted)] resize-none outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              <div className="grid grid-cols-2 gap-2">
                <select value={newSubject} onChange={(e) => setNewSubject(e.target.value as SubjectId)}
                  className="rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={newCat} onChange={(e) => setNewCat(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {ERROR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="ملاحظة (اختياري)"
                className="rounded-xl px-4 py-2.5 text-sm text-white placeholder-[var(--text-muted)] outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              <button onClick={() => addError()} className="btn-gold">أضف للخزنة</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button onClick={() => setShowSearch(true)}
                className="w-full py-3.5 rounded-2xl text-sm font-bold shadow-lg"
                style={{ background: "var(--surface)", border: "1px solid rgba(37,99,235,0.25)", color: "var(--blue-light)" }}>
                ابحث عن سؤال في الكتاب
              </button>
              <button onClick={() => setShowAdd(true)}
                className="w-full py-3.5 rounded-2xl text-sm font-bold shadow-lg"
                style={{ background: "var(--blue)", color: "white" }}>
                + أضف خطأً
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeSearch(); }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <p className="font-black text-base text-white">ابحث في الكتاب</p>
              <button onClick={closeSearch}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                ✕
              </button>
            </div>
            <textarea value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} rows={3}
              placeholder="صف السؤال أو اكتب جزءاً منه..."
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[var(--text-muted)] resize-none outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) runSearch(); }}
            />
            <button onClick={runSearch}
              disabled={searchLoading || !searchQuery.trim()}
              className="btn-primary">
              {searchLoading ? "جاري البحث..." : "ابحث"}
            </button>
            {searchError && (
              <p className="text-xs text-center py-2" style={{ color: "var(--danger)" }}>{searchError}</p>
            )}
            {searchResult && (
              searchResult.found ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl p-4"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div className="flex gap-2 mb-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: SUBJECT_COLORS[searchResult.subject as SubjectId] + "18",
                          color: SUBJECT_COLORS[searchResult.subject as SubjectId],
                        }}>
                        {searchResult.subject}
                      </span>
                    </div>
                    <p className="text-sm text-white leading-relaxed">{searchResult.question}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={addFromSearch} className="btn-gold">أضف ✓</button>
                    <button onClick={() => { setSearchResult(null); setSearchQuery(""); }}
                      className="py-4 rounded-2xl text-sm font-bold"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      ابحث مجدداً
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>لم أجد هذا السؤال</p>
                  <button onClick={() => { setSearchResult(null); setSearchQuery(""); }}
                    className="mt-3 px-4 py-2 rounded-xl text-xs font-bold"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
                    حاول مرة أخرى
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
