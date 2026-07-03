"use client";
/* ─── 🎓 ذكاء القبول الجامعي — اللوحة المستقلة ───
   مخصّصة لمن هم على أعتاب القبول (ثالث ثانوي/خريج). كل المنطق من محرّكات
   نقية في university.ts: الموزونة، تحليل الفجوة، المسافة، موسم القبول.
   لا تكرار قرار — تستهلك نفس مصادر الحقيقة (darb_goals/darb_results/darb_admissions). */
import { useMemo, useState } from "react";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import {
  loadUser, loadGoals, currentScoreMap, loadTrackExamDates,
  loadAdmissions, saveAdmissions, showsUniversityUI,
  type AdmissionApplication, type AdmissionStatus,
} from "@/lib/storage";
import {
  UNIVERSITIES, findUniversity, findMajor, requiredScores, gapAnalysis,
  computeWeighted, weightedVerdict, regionDistanceKm, housingInfo, admissionType,
  admissionSeason, type WeightedFormula, type UniversityOption,
} from "@/lib/university";
import { daysUntil } from "@/lib/insights";
import Link from "next/link";

const ar = (n: number) => n.toLocaleString("ar-SA");

/* أقرب درجة من خريطة النتائج */
function scoreFrom(map: Record<string, { score: number }>, ...keys: string[]): number | null {
  for (const k of keys) for (const mk of Object.keys(map)) if (mk.includes(k)) return map[mk].score;
  return null;
}

/* علمي ↔ إنساني من نوع مسار الطالب */
function trackOfType(t?: string): "علمي" | "إنساني" {
  return t === "إداري" || t === "قانوني" || t === "عام" ? "إنساني" : "علمي";
}

/* اختيار المعادلة المطابقة لمسار الطالب (وإلا الأولى) */
function formulaForStudent(u: UniversityOption, track: "علمي" | "إنساني"): WeightedFormula | undefined {
  if (!u.formulas?.length) return undefined;
  return u.formulas.find((f) => f.track === track) ?? u.formulas[0];
}

const STATUS_META: Record<AdmissionStatus, { label: string; icon: string; color: string }> = {
  applied:  { label: "قدّمت", icon: "📨", color: "var(--accent-light)" },
  accepted: { label: "مقبول", icon: "✅", color: "var(--success)" },
  rejected: { label: "مرفوض", icon: "❌", color: "var(--danger)" },
  waiting:  { label: "قائمة انتظار", icon: "⏳", color: "var(--gold)" },
};

export default function UniversityPage() {
  const user = useMemo(() => loadUser(), []);
  const goals = useMemo(() => loadGoals(), []);
  const eligible = showsUniversityUI(user);

  const scoreMap = useMemo(() => currentScoreMap(), []);
  const studentTrack = trackOfType(user?.trackType);

  /* درجات الطالب الحالية */
  const have = useMemo(() => ({
    qudurat: scoreFrom(scoreMap, "قدرات"),
    tahsili: scoreFrom(scoreMap, "تحصيلي"),
    step: scoreFrom(scoreMap, "STEP", "ستيب"),
    gpa: goals.highschoolPct ?? null,
  }), [scoreMap, goals.highschoolPct]);

  /* أقرب اختبار → أسابيع متبقية (لتقدير الحاجة الأسبوعية) */
  const weeksUntilExam = useMemo(() => {
    const dates = loadTrackExamDates();
    let best: number | null = null;
    for (const d of Object.values(dates)) {
      const days = daysUntil(d);
      if (days != null && days >= 0 && (best == null || days < best)) best = days;
    }
    if (best == null && user?.examDate) {
      const days = daysUntil(user.examDate);
      if (days != null && days >= 0) best = days;
    }
    return best != null ? Math.max(1, Math.round(best / 7)) : null;
  }, [user]);

  const targetMajor = findMajor(goals.majorId);
  const gap = useMemo(
    () => (targetMajor ? gapAnalysis(targetMajor.requirements, have, weeksUntilExam) : null),
    [targetMajor, have, weeksUntilExam],
  );

  /* مقارنة الجامعات — حتى ٣ */
  const [compareIds, setCompareIds] = useState<string[]>(() =>
    goals.universityId && goals.universityId !== "other" ? [goals.universityId] : [],
  );
  const [picker, setPicker] = useState("");
  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
    setPicker("");
  };
  const compareUnis = compareIds.map((id) => findUniversity(id)).filter(Boolean) as UniversityOption[];
  const pickerOptions = useMemo(() => {
    const q = picker.trim();
    return UNIVERSITIES.filter((u) => u.id !== "other" && !compareIds.includes(u.id))
      .filter((u) => !q || u.name.includes(q) || (u.region ?? "").includes(q));
  }, [picker, compareIds]);

  /* نتائج القبول */
  const [apps, setApps] = useState<AdmissionApplication[]>(() => loadAdmissions());
  const [showAdd, setShowAdd] = useState(false);
  const persistApps = (next: AdmissionApplication[]) => { setApps(next); saveAdmissions(next); };

  const season = useMemo(() => admissionSeason(new Date()), []);

  /* ── حارس الأهلية ── */
  if (!eligible) {
    return (
      <div className="page">
        <Dome compact>
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="title-lg grad-title">القبول الجامعي</h1>
          </div>
        </Dome>
        <div className="px-5 mt-8">
          <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[40px] mb-2">🎓</p>
            <p className="text-[16px] font-black mb-2" style={{ color: "var(--text)" }}>هذا القسم لمن هم على أعتاب القبول</p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              ذكاء القبول (الموزونة، مقارنة الجامعات، تحليل الفجوة) يظهر لطلاب <b>ثالث ثانوي</b> و<b>الخريجين</b>.
              ركّز الآن على بناء أساسك القوي، وبنفتحه لك في وقته.
            </p>
            <Link href="/dashboard" className="inline-block mt-4 px-5 py-2.5 rounded-2xl font-bold text-[14px]"
              style={{ background: "var(--accent)", color: "#fff" }}>
              ← الرئيسية
            </Link>
          </div>
        </div>
        <div className="h-6" />
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="page">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">القبول الجامعي</h1>
        </div>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
          موزونتك، الجامعات المناسبة، وما تحتاجه للوصول لهدفك
        </p>
      </Dome>
      <div className="h-4" />

      <div className="page-content">
        {/* ═══ موسم القبول ═══ */}
        <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{
            background: season.status === "open"
              ? "color-mix(in srgb, var(--success) 9%, var(--surface))"
              : season.status === "upcoming"
              ? "color-mix(in srgb, var(--gold) 9%, var(--surface))"
              : "var(--surface)",
            border: `1px solid ${season.status === "open" ? "color-mix(in srgb, var(--success) 25%, transparent)" : season.status === "upcoming" ? "color-mix(in srgb, var(--gold) 25%, transparent)" : "var(--border)"}`,
          }}>
          <span className="text-[20px] flex-shrink-0">{season.icon}</span>
          <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{season.label}</p>
        </div>

        {/* ═══ وش تقدر تقدم عليه؟ — الفرص المصنّفة حسب بياناتك ═══ */}
        <Link href="/opportunities" className="rounded-2xl px-4 py-3.5 flex items-center gap-3 transition active:scale-[0.99]"
          style={{
            background: "color-mix(in srgb, var(--accent) 10%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
          }}>
          <span className="text-[22px] flex-shrink-0">🧭</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-black" style={{ color: "var(--text)" }}>وش تقدر تقدم عليه؟ ←</span>
            <span className="block text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              جامعات، ابتعاث، دبلومات، منح وبرامج — مصنّفة حسب درجاتك ووجهتك
            </span>
          </span>
        </Link>

        {/* ═══ ماذا أحتاج؟ + تحليل الفجوة ═══ */}
        <section className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🎯</span>
            <p className="text-[14px] font-black flex-1" style={{ color: "var(--text)" }}>
              {targetMajor ? `ماذا أحتاج للوصول إلى ${targetMajor.name}؟` : "ماذا أحتاج للوصول لهدفي؟"}
            </p>
          </div>

          {!targetMajor ? (
            <div className="rounded-xl px-3 py-3 text-[13px] font-semibold" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
              حدّد تخصصك المستهدف من <Link href="/profile" className="font-black" style={{ color: "var(--accent-light)" }}>ملفك › مستقبلي الجامعي</Link> لأحسب لك المطلوب وتحليل الفجوة.
            </div>
          ) : !gap?.hasData ? (
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>لا تتوفّر متطلبات مُقدّرة لهذا التخصص.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {gap.items.map((it) => {
                  const color = it.met ? "var(--success)" : it.current == null ? "var(--text-muted)" : "var(--gold)";
                  const pct = Math.max(0, Math.min(100, it.current == null ? 0 : (it.current / it.required) * 100));
                  return (
                    <div key={it.label} className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-black" style={{ color: "var(--text)" }}>{it.label}</span>
                        <span className="text-[12.5px] font-bold" style={{ color }}>
                          {it.current == null ? `المطلوب ${ar(it.required)}+` :
                            it.met ? `✅ ${ar(it.current)} (المطلوب ${ar(it.required)})` :
                            `${ar(it.current)} / ${ar(it.required)} — ينقص ${ar(it.gap)}`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      {!it.met && it.weeklyNeed != null && it.weeklyNeed > 0 && (
                        <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                          ≈ {ar(it.weeklyNeed)} نقطة/أسبوع للوصول قبل اختبارك
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                style={{ background: gap.allMet ? "color-mix(in srgb, var(--success) 10%, transparent)" : "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
                <span className="text-[16px]">{gap.allMet ? "🟢" : "📈"}</span>
                <p className="text-[12.5px] font-bold" style={{ color: "var(--text)" }}>
                  {gap.allMet
                    ? "درجاتك تلبّي المطلوب التقديري لهذا التخصص — ركّز على إتمام التقديم."
                    : `إجمالي ما تحتاج رفعه ≈ ${ar(gap.remainingTotal)} نقطة موزّعة على ما سبق.`}
                </p>
              </div>
              <p className="text-[10.5px]" style={{ color: "var(--text-muted)" }}>
                الدرجات المطلوبة تقديرية إرشادية — تختلف حسب الجامعة والسنة والمنافسة.
              </p>
            </>
          )}
        </section>

        {/* ═══ مقارنة الجامعات ═══ */}
        <section className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[18px]">⚖️</span>
            <p className="text-[14px] font-black flex-1" style={{ color: "var(--text)" }}>قارن الجامعات</p>
            <span className="text-[11.5px] font-bold" style={{ color: "var(--text-muted)" }}>{ar(compareIds.length)}/٣</span>
          </div>

          {/* منتقي */}
          {compareIds.length < 3 && (
            <div>
              <input value={picker} onChange={(e) => setPicker(e.target.value)}
                placeholder="🔎 أضف جامعة للمقارنة..."
                className="w-full rounded-xl px-3 py-2.5 text-[14px] text-[var(--text)] outline-none mb-2"
                style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
              {picker.trim() && (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {pickerOptions.map((u) => (
                    <button key={u.id} onClick={() => toggleCompare(u.id)}
                      className="px-3 py-1.5 rounded-full text-[12.5px] font-bold transition active:scale-95"
                      style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}>
                      {u.name}
                    </button>
                  ))}
                  {pickerOptions.length === 0 && (
                    <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>لا نتائج.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {compareUnis.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>اختر جامعة أو أكثر لمقارنتها جنباً إلى جنب.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-[12.5px]" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: compareUnis.length > 1 ? "440px" : undefined }}>
                <tbody>
                  {/* رأس الأعمدة */}
                  <tr>
                    <td className="py-2 pl-2 align-bottom" />
                    {compareUnis.map((u) => (
                      <td key={u.id} className="py-2 px-2 align-bottom" style={{ minWidth: "130px" }}>
                        <div className="flex flex-col gap-1">
                          <span className="font-black leading-tight" style={{ color: "var(--text)" }}>{u.name}</span>
                          <button onClick={() => toggleCompare(u.id)} className="text-[11px] font-bold text-right" style={{ color: "var(--danger)" }}>إزالة ✕</button>
                        </div>
                      </td>
                    ))}
                  </tr>
                  {/* موزونتك المقدّرة */}
                  <CompareRow label="موزونتك المقدّرة">
                    {compareUnis.map((u) => {
                      const f = formulaForStudent(u, studentTrack);
                      if (!f) return <CompareCell key={u.id}><span style={{ color: "var(--text-muted)" }}>—</span></CompareCell>;
                      const r = computeWeighted(f, { highschool: have.gpa, qudurat: have.qudurat, tahsili: have.tahsili });
                      if (r.score == null) return <CompareCell key={u.id}><span style={{ color: "var(--text-muted)" }}>أدخل درجاتك</span></CompareCell>;
                      const v = weightedVerdict(r.score);
                      return <CompareCell key={u.id}><span className="font-black" style={{ color: v.icon === "🟢" ? "var(--success)" : v.icon === "🟡" ? "var(--gold)" : "var(--danger)" }}>{v.icon} {ar(r.score)}٪</span></CompareCell>;
                    })}
                  </CompareRow>
                  <CompareRow label="نوع القبول">
                    {compareUnis.map((u) => <CompareCell key={u.id}>{admissionType(u)}</CompareCell>)}
                  </CompareRow>
                  <CompareRow label="المدينة / المنطقة">
                    {compareUnis.map((u) => <CompareCell key={u.id}>{u.region ?? "—"}</CompareCell>)}
                  </CompareRow>
                  <CompareRow label="المسافة عنك">
                    {compareUnis.map((u) => {
                      const km = regionDistanceKm(user?.region, u.region);
                      return <CompareCell key={u.id}>{km == null ? "—" : km === 0 ? "نفس منطقتك" : `≈ ${ar(km)} كم`}</CompareCell>;
                    })}
                  </CompareRow>
                  <CompareRow label="السكن">
                    {compareUnis.map((u) => <CompareCell key={u.id}>{housingInfo(u)}</CompareCell>)}
                  </CompareRow>
                  <CompareRow label="التخصصات">
                    {compareUnis.map((u) => <CompareCell key={u.id}>{u.colleges?.length ? `${ar(u.colleges.length)} كلية` : "—"}</CompareCell>)}
                  </CompareRow>
                </tbody>
              </table>
            </div>
          )}
          {user?.region == null && compareUnis.length > 0 && (
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>💡 أضف منطقتك في ملفك لحساب المسافة.</p>
          )}
        </section>

        {/* ═══ نتائج القبول ═══ */}
        <section className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🗂️</span>
            <p className="text-[14px] font-black flex-1" style={{ color: "var(--text)" }}>نتائج القبول</p>
            <button onClick={() => setShowAdd((s) => !s)}
              className="text-[12px] font-black px-3 py-1.5 rounded-full"
              style={{ background: "var(--accent)", color: "#fff" }}>
              {showAdd ? "إغلاق" : "+ إضافة"}
            </button>
          </div>

          {showAdd && <AdmissionForm onAdd={(a) => { persistApps([a, ...apps]); setShowAdd(false); }} />}

          {apps.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              سجّل تقديماتك وحالتها (قدّمت / مقبول / مرفوض / انتظار) لتكتمل رحلتك.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {apps.map((a) => {
                const m = STATUS_META[a.status];
                return (
                  <div key={a.id} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: "var(--surface2)" }}>
                    <span className="text-[18px] flex-shrink-0">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-black truncate" style={{ color: "var(--text)" }}>{a.university}</p>
                      {a.major && <p className="text-[11.5px] truncate" style={{ color: "var(--text-muted)" }}>{a.major}{a.date ? ` · ${a.date}` : ""}</p>}
                    </div>
                    <span className="text-[11.5px] font-black px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ background: `color-mix(in srgb, ${m.color} 14%, transparent)`, color: m.color }}>{m.label}</span>
                    <button onClick={() => persistApps(apps.filter((x) => x.id !== a.id))}
                      aria-label="حذف" className="text-[var(--text-muted)] text-sm font-bold px-1 flex-shrink-0">✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="h-6" />
      <PageFooter />
    </div>
  );
}

/* صف مقارنة */
function CompareRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr style={{ borderTop: "1px solid var(--border)" }}>
      <td className="py-2.5 pl-2 font-bold align-top whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{label}</td>
      {children}
    </tr>
  );
}
function CompareCell({ children }: { children: React.ReactNode }) {
  return <td className="py-2.5 px-2 align-top font-semibold" style={{ color: "var(--text)" }}>{children}</td>;
}

/* نموذج إضافة تقديم */
function AdmissionForm({ onAdd }: { onAdd: (a: AdmissionApplication) => void }) {
  const [uniId, setUniId] = useState("");
  const [uniText, setUniText] = useState("");
  const [major, setMajor] = useState("");
  const [status, setStatus] = useState<AdmissionStatus>("applied");

  const submit = () => {
    const u = findUniversity(uniId);
    const name = u && u.id !== "other" ? u.name : uniText.trim();
    if (!name) return;
    onAdd({
      id: `${Date.now()}`,
      universityId: u && u.id !== "other" ? u.id : undefined,
      university: name,
      major: major.trim() || undefined,
      status,
      date: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <select value={uniId} onChange={(e) => setUniId(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text)] outline-none"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
        <option value="">اختر الجامعة...</option>
        {UNIVERSITIES.filter((u) => u.id !== "other").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        <option value="other">أخرى (اكتب)</option>
      </select>
      {uniId === "other" && (
        <input value={uniText} onChange={(e) => setUniText(e.target.value)} placeholder="اسم الجامعة" maxLength={60}
          className="w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text)] outline-none"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />
      )}
      <input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="التخصص (اختياري)" maxLength={40}
        className="w-full rounded-lg px-3 py-2 text-[13px] text-[var(--text)] outline-none"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(STATUS_META) as AdmissionStatus[]).map((s) => {
          const on = status === s;
          return (
            <button key={s} onClick={() => setStatus(s)}
              className="px-3 py-1.5 rounded-full text-[12px] font-bold transition active:scale-95"
              style={{ background: on ? STATUS_META[s].color : "var(--surface)", color: on ? "#fff" : "var(--text)", border: `1.5px solid ${on ? STATUS_META[s].color : "var(--border)"}` }}>
              {STATUS_META[s].icon} {STATUS_META[s].label}
            </button>
          );
        })}
      </div>
      <button onClick={submit} disabled={!uniId || (uniId === "other" && !uniText.trim())}
        className="rounded-lg py-2.5 text-[13px] font-black transition active:scale-[0.98]"
        style={{ background: "var(--accent)", color: "#fff", opacity: !uniId || (uniId === "other" && !uniText.trim()) ? 0.4 : 1 }}>
        حفظ
      </button>
    </div>
  );
}
