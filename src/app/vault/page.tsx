"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Dome from "@/components/Dome";
import { ERROR_CATEGORIES } from "@/lib/constants";
import { getTrack, subjectColor, type Track } from "@/lib/tracks";
import { loadUser, loadList, saveList } from "@/lib/storage";
import type { VaultError } from "@/lib/types";

const FREE_LIMIT = 20;
const VAULT_KEY = "darb_vault";

export default function VaultPage() {
  const [track, setTrack] = useState<Track | null>(null);
  const [errors, setErrors] = useState<VaultError[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>("الكل");
  const [filterCat, setFilterCat] = useState<string>("الكل");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newCat, setNewCat] = useState<string>(ERROR_CATEGORIES[0]);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    const t = getTrack(loadUser()?.track);
    setTrack(t);
    setNewSubject(t.subjects[0]?.name ?? "");
    setErrors(loadList<VaultError>(VAULT_KEY));
    setLoaded(true);
  }, []);

  /* حفظ تلقائي عند أي تغيير */
  useEffect(() => {
    if (loaded) saveList(VAULT_KEY, errors);
  }, [errors, loaded]);

  const isPlanFree = true;
  const atLimit = isPlanFree && errors.length >= FREE_LIMIT;

  const subjects = track?.subjects.map((s) => s.name) ?? [];

  const filtered = errors.filter((e) => {
    if (filterSubject !== "الكل" && e.subject !== filterSubject) return false;
    if (filterCat !== "الكل" && e.category !== filterCat) return false;
    return true;
  });

  const addError = () => {
    if (!newQ.trim() || atLimit) return;
    setErrors((p) => [{
      id: Date.now().toString(), question: newQ.trim(),
      subject: newSubject, category: newCat,
      note: newNote.trim(), createdAt: Date.now(), reviewCount: 0,
    }, ...p]);
    setNewQ(""); setNewNote(""); setShowAdd(false);
  };

  const categoryCount = (cat: string) => errors.filter((e) => e.category === cat).length;
  const colorOf = (subj: string) => (track ? subjectColor(track, subj) : "var(--accent)");

  return (
    <div className="page">

      <Dome compact>
        <div className="flex items-center justify-between">
          <h1 className="title-lg" style={{ color: "var(--text)" }}>خزنة الأخطاء</h1>
          <div className="dome-chip">
            <span className="num-hero text-base" style={{ color: "var(--gold-light)" }}>{errors.length}</span>
            {isPlanFree && <span className="text-[13px] font-semibold" style={{ color: "var(--text-dim)" }}>/{FREE_LIMIT}</span>}
          </div>
        </div>
      </Dome>
      <div className="h-5" />

      {/* ── شريط الحد ── */}
      {isPlanFree && (
        <div className="px-5 mb-7 rise rise-1">
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
              <Link href="/pricing" className="text-[var(--accent-light)] underline font-semibold">رقّي لشاهين</Link>
            </p>
          )}
        </div>
      )}

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
                  ? { background: "#F59E0B", color: "var(--btn-text-on-gold)" }
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

      {/* ── زر الإضافة — فوق القائمة وبمتناول الإبهام ── */}
      {!atLimit && (
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
              <p className="font-bold text-base text-[var(--gold)]">خطأ جديد في الخزنة</p>

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

              <div className="grid grid-cols-2 gap-3">
                <button onClick={addError}
                  className="py-4 rounded-2xl font-bold text-base transition min-h-[54px]"
                  style={{ background: "#F59E0B", color: "var(--btn-text-on-gold)" }}>
                  أضف للخزنة
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
      )}

      {/* ── القائمة ── */}
      <div className="px-5 flex flex-col gap-5 rise rise-5">

        {loaded && filtered.length === 0 && (
          <div className="text-center py-14">
            <p className="title-md text-[var(--text)] mb-2">الخزنة فارغة</p>
            <p className="body-sm">أول ما تغلط في سؤال، احفظه هنا — عشان ما تغلط فيه مرتين.</p>
          </div>
        )}

        {filtered.map((error) => {
          const color = colorOf(error.subject);
          const isExpanded = expandedId === error.id;
          const daysAgo = Math.round((Date.now() - error.createdAt) / 86400000);

          return (
            <div key={error.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{ background: "var(--surface)", border: `1.5px solid ${isExpanded ? color + "50" : "var(--border)"}` }}>

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
                        className="py-4 rounded-2xl text-base font-black text-white transition min-h-[56px]"
                        style={{ background: color }}>
                        راجعته ✓
                      </button>
                      <button onClick={() => setErrors((p) => p.filter((e) => e.id !== error.id))}
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
      <BottomNav />
    </div>
  );
}
