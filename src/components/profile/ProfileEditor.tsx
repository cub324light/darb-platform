"use client";
/* ─── محرّر معلومات الطالب — يُستعمل في صفحة /profile/edit المستقلّة ───
   حقولٌ اختيارية تُحفَظ فوراً في DarbUser (مصدرٌ واحد). لعبةٌ تدريجية: +5 فضة مع كل معلومةٍ
   جديدة، ووسام + 30 عند 100٪ (مرّة لكلٍّ). التعديل لاحقاً لا يمنح فضةً من جديد. */
import { useState } from "react";
import { loadUser, addSilver, loadAdmissions, type DarbUser } from "@/lib/storage";
import { updateProfile, setSchoolGrade, type ProfilePatch } from "@/lib/userCommands";
import { transitionTo, phaseDef, currentPhase } from "@/lib/transition";
import { profileCompletion, pendingProfileRewards } from "@/lib/profileCompletion";
import { SA_REGIONS } from "@/lib/saRegions";
import { SCHOOL_STAGES } from "@/lib/darbKnowledge";
import { ACADEMIC_TRACKS, trackLabel, type AcademicTrack } from "@/lib/curriculum";
import { n } from "@/lib/format";

/* وجهاتُ الطالب — نفسُ معرّفات التسجيل، فما يُختار هنا يقرؤه ما يقرؤه هناك */
const TARGETS: { id: string; icon: string; label: string }[] = [
  { id: "university",  icon: "🎓", label: "الجامعة" },
  { id: "aramco",      icon: "🏭", label: "أرامكو" },
  { id: "itc",         icon: "🛠️", label: "ITC" },
  { id: "military",    icon: "🪖", label: "الكليات العسكرية" },
  { id: "scholarship", icon: "✈️", label: "الابتعاث" },
];

const STUDY_STYLES: { id: "book" | "video" | "both"; label: string }[] = [
  { id: "book", label: "📘 بالقراءة" }, { id: "video", label: "🎬 بالفيديو" }, { id: "both", label: "🧩 الاثنين" },
];
const HOBBIES = ["📖 القراءة", "⚽ الرياضة", "🎨 الرسم", "💻 البرمجة", "🎮 الألعاب", "✈️ السفر", "📷 التصوير", "✍️ الكتابة"];
const INTERESTS = ["🔬 العلوم", "🩺 الطب", "⚙️ الهندسة", "💼 الأعمال", "🎭 الفنون", "🗣️ اللغات", "🚀 ريادة الأعمال", "🌍 البيئة"];
const SUBJECTS = ["رياضيات", "فيزياء", "كيمياء", "أحياء", "لغتي", "إنجليزي", "حاسب", "اجتماعيات"];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className="px-3.5 py-2 rounded-full t-small font-bold transition active:scale-95"
      style={{ background: on ? "var(--accent)" : "var(--surface2)", color: on ? "#fff" : "var(--text-muted)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}` }}>
      {children}
    </button>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="t-title font-bold mb-2.5" style={{ color: "var(--text)" }}>{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function ProfileEditor() {
  const [user, setUser] = useState<DarbUser | null>(() => (typeof window !== "undefined" ? loadUser() : null));
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [coreOpen, setCoreOpen] = useState(false);
  if (!user) return null;
  const comp = profileCompletion(user);

  /* كلُّ كتابةٍ تمرّ بأمرٍ واحد (`updateProfile`) — لا `saveUser` في الواجهة.
     والمكافأةُ تُحسب على الملفّ بعد الدمج ثم تُضاف إلى نفس الرقعة، فتبقى الكتابةُ
     واحدةً لا اثنتين. */
  const commit = (patch: ProfilePatch) => {
    const merged: DarbUser = { ...(loadUser() ?? user), ...patch };
    const full: ProfilePatch = { ...patch };
    const reward = pendingProfileRewards(merged);
    if (reward) {
      if (reward.silver) addSilver(reward.silver);
      if (reward.newRewardedFields.length) full.rewardedFields = [...(merged.rewardedFields ?? []), ...reward.newRewardedFields];
      if (reward.setCompleteFlag) full.awardedProfileComplete = true;
      if (reward.badge) {
        /* اكتمل الملف أوّل مرّة: نُسجّل إشارةً عابرة ليعرضها «حفظ» في صفحة احتفالٍ مستقلّة */
        try { sessionStorage.setItem("darb_celebrate_complete", JSON.stringify({ silver: reward.silver })); } catch {}
        setCelebrate("🎉 اكتمل ملفك الشخصي — اضغط «حفظ ✓» لرؤية مكافأتك");
      } else {
        setCelebrate(reward.message);
      }
    }
    setUser(updateProfile(full) ?? { ...merged, ...full });
  };
  const toggle = (key: "hobbies" | "interests" | "favSubjects", val: string) => {
    const cur = user[key] ?? [];
    const arr = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
    commit({ [key]: arr.length ? arr : undefined });
  };
  const on = (key: "hobbies" | "interests" | "favSubjects", val: string) => (user[key] ?? []).includes(val);
  /* ▓ عرضُ المرحلة — الصفحةُ تسأل ولا تشتقّ. كلُّ إظهارٍ هنا من قدرةٍ يمنحها
     محرّكُ الانتقال، فإذا انتقل الطالبُ تغيّرت الشاشةُ من نفسها. */
  const view = currentPhase();
  const isSchool = view.allows("school");

  /* ═══ مرحلتك — الموضعُ **الوحيد** الذي يُعلن فيه الطالبُ انتقالَه ═══
     لا اقتراحَ تلقائيّ ولا انتقالَ تلقائيّ: قرارٌ صريحٌ منه هنا ولا شيء غيره.
     و«الانتقال إلى عالم الجامعة» لا يظهر إلا لمن عنده قبولٌ مسجَّل فعلاً —
     إشارةٌ كتبها هو بيده في «القبول الجامعي»، لا استنتاجٌ منّا. */
  const hasAccepted = loadAdmissions().some((a) => a.status === "accepted");
  const stageMoves = view.declarable.filter((to) => (to === "university" ? hasAccepted : true));

  const declare = (to: string) => {
    const label = phaseDef(to)?.label ?? "";
    if (!confirm(`الانتقال إلى «${label}»؟\n\nيتغيّر: مرحلتك وما تعرضه لك درب.\nيبقى كما هو: أهدافك وأخطاؤك وإحصاءاتك وجلساتك وتقدّمك — لا يُحذف شيء.`)) return;
    if (transitionTo(to as Parameters<typeof transitionTo>[0])) {
      const u = loadUser();
      if (u) setUser(u);
    }
  };
  const unlockCore = () => {
    if (confirm("هذه معلوماتٌ يقوم عليها المنتج: صفُّك ومسارُك يحدّدان موادّك، وهدفُك يحدّد اختباراتك. تفتحها للتعديل؟")) {
      setCoreOpen(true);
    }
  };
  /* اختيارُ وجهةٍ يُلغي «درب يحدّد لي» — لا يجتمع أن يختار وأن يفوّض */
  const toggleTarget = (id: string) => {
    const cur = user.targets ?? [];
    const arr = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    commit({ targets: arr.length ? arr : undefined, goalUndecided: arr.length ? false : user.goalUndecided });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* تقدّم الاكتمال */}
      <div className="ds-card">
        <div className="flex items-center justify-between mb-2">
          <p className="t-title font-black" style={{ color: "var(--text)" }}>تقدّمك</p>
          <span className="t-h3 font-black font-mono-nums" style={{ color: comp.pct === 100 ? "var(--success)" : "var(--accent-light)" }}>{comp.pct === 100 ? "🏅 " : ""}{n(comp.pct)}٪</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--text-muted) 22%, transparent)" }}>
          <div className="h-full rounded-full eval-bar-fill" style={{ width: `${comp.pct}%`, background: comp.pct === 100 ? "var(--success)" : "var(--accent)" }} />
        </div>
      </div>

      {celebrate && (
        <div className="ds-card rise flex items-start gap-3" style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 40%, var(--border))" }}>
          <span className="text-[22px] flex-shrink-0">🎉</span>
          <p className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{celebrate}</p>
          <button onClick={() => setCelebrate(null)} className="t-caption font-bold px-2" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
      )}

      {/* ═══ معلوماتٌ أساسية — **مقفلةٌ حتى تُفتح** ═══
          هذه ليست كالهوايات: صفُّك ومسارُك يقودان موادَّ «المدرسة»، وهدفُك يقود
          اختباراتِ «مساري»، ومنطقتُك تقود أقربَ جامعة. تغييرُها بضغطةٍ عابرة
          يقلب المنتجَ على الطالب وهو لا يدري — فتُفتح بقصدٍ ثم تُقفَل بعد التعديل. */}
      <div className="ds-card flex flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <p className="t-title font-black" style={{ color: "var(--text)" }}>
            {coreOpen ? "🔓 معلوماتك الأساسية" : "🔒 معلوماتك الأساسية"}
          </p>
          <button onClick={() => (coreOpen ? setCoreOpen(false) : unlockCore())}
            className="t-caption font-black px-3 py-1.5 rounded-xl"
            style={{ background: coreOpen ? "var(--accent)" : "var(--surface2)", color: coreOpen ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>
            {coreOpen ? "أقفلها" : "عدّلها"}
          </button>
        </div>
        {!coreOpen && (
          <div className="flex flex-col gap-1.5">
            <p className="t-small font-bold" style={{ color: "var(--text)" }}>
              {[user.name, user.grade || user.studyLevel, user.academicTrack ? trackLabel(user.academicTrack) : null, user.region]
                .filter(Boolean).join(" · ") || "لم تُضبط بعد"}
            </p>
            <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
              هذه تقود موادّك واختباراتك — لا تُغيَّر بضغطةٍ عابرة. اضغط «عدّلها» لفتحها.
            </p>
          </div>
        )}
      </div>

      {coreOpen && (
      <div className="ds-card flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="t-title font-bold" style={{ color: "var(--text)" }}>الاسم</span>
          <input value={user.name ?? ""} onChange={(e) => commit({ name: e.target.value })}
            placeholder="اسمك كما تحبّ أن نناديك"
            className="w-full rounded-xl px-4 py-3 t-body font-bold outline-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        </label>

        {/* مرحلتك — الحالةُ ثم فعلٌ واحدٌ إن كان له فعلٌ مسموح */}
        <Group title="مرحلتك">
          <span className="px-3.5 py-2 rounded-full t-small font-bold"
            style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}>
            {view.id ? view.label : "لم تُحدَّد بعد"}
          </span>
          {stageMoves.map((to) => (
            <button key={to} onClick={() => declare(to)}
              className="px-3.5 py-2 rounded-full t-small font-black transition active:scale-95"
              style={{ background: "var(--accent)", color: "#fff", border: "1.5px solid var(--accent)" }}>
              {to === "university" ? "الانتقال إلى عالم الجامعة" : `الانتقال إلى «${phaseDef(to)?.label}»`}
            </button>
          ))}
        </Group>

        {/* الصفُّ والمسارُ للثانويّ وحده: الجامعيُّ والخرّيج تكفيهم حالتُهم
            التعليمية. وكلاهما يغيّر موادَّ المنهج، فنقولها له صراحةً. */}
        {isSchool && (
          <div className="flex flex-col gap-4">
            <Group title="صفّك">
              {SCHOOL_STAGES.map((g) => (
                <Chip key={g} on={user.grade === g}
                  onClick={() => { const u = setSchoolGrade(user.grade === g ? null : g); if (u) setUser(u); }}>{g}</Chip>
              ))}
            </Group>
            <Group title="مسارك الدراسي">
              {ACADEMIC_TRACKS.map((t) => (
                <Chip key={t.id} on={user.academicTrack === t.id}
                  onClick={() => commit({ academicTrack: user.academicTrack === t.id ? undefined : (t.id as AcademicTrack) })}>
                  {t.icon} {t.label}
                </Chip>
              ))}
            </Group>
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>
              صفُّك ومسارُك يحدّدان موادّك في «المدرسة» — ولا يمسّان تقدّمك ولا أخطاءك.
            </p>
          </div>
        )}

        <Group title="المنطقة">
          {SA_REGIONS.map((r) => (
            <Chip key={r} on={user.region === r} onClick={() => commit({ region: user.region === r ? undefined : r })}>{r}</Chip>
          ))}
        </Group>

        <div>
          <Group title="الهدف">
            {TARGETS.map((t) => (
              <Chip key={t.id} on={!user.goalUndecided && (user.targets ?? []).includes(t.id)}
                onClick={() => toggleTarget(t.id)}>{t.icon} {t.label}</Chip>
            ))}
            <Chip on={!!user.goalUndecided}
              onClick={() => commit({ goalUndecided: !user.goalUndecided, ...(user.goalUndecided ? {} : { targets: undefined }) })}>
              🤝 درب يحدّد لي
            </Chip>
          </Group>
        </div>

      </div>
      )}

      <div className="ds-card flex flex-col gap-5">
        <p className="t-title font-black" style={{ color: "var(--text)" }}>✨ معلوماتٌ تخصّك</p>
        <Group title="طريقة المذاكرة">
          {STUDY_STYLES.map((s) => <Chip key={s.id} on={user.studyStyle === s.id} onClick={() => commit({ studyStyle: user.studyStyle === s.id ? undefined : s.id })}>{s.label}</Chip>)}
        </Group>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="t-title font-bold" style={{ color: "var(--text)" }}>ساعات المذاكرة اليومية</p>
            <span className="t-body font-black font-mono-nums" style={{ color: "var(--accent-light)" }}>{n(user.studyHours ?? 3)} ساعة</span>
          </div>
          <input type="range" min={1} max={16} step={1} value={user.studyHours ?? 3} aria-label="ساعات المذاكرة اليومية"
            onChange={(e) => commit({ studyHours: parseInt(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: "var(--accent)", background: "var(--surface2)" }} />
        </div>
        <Group title="الهوايات">{HOBBIES.map((h) => <Chip key={h} on={on("hobbies", h)} onClick={() => toggle("hobbies", h)}>{h}</Chip>)}</Group>
        <Group title="الاهتمامات">{INTERESTS.map((i) => <Chip key={i} on={on("interests", i)} onClick={() => toggle("interests", i)}>{i}</Chip>)}</Group>
        <Group title="المواد المفضّلة">{SUBJECTS.map((s) => <Chip key={s} on={on("favSubjects", s)} onClick={() => toggle("favSubjects", s)}>{s}</Chip>)}</Group>
      </div>
    </div>
  );
}
