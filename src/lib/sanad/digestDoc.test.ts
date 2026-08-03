import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { projectDigest, isStale, isDigestDoc, DIGEST_VERSION, DIGEST_STALE_MS } from "./digestDoc";
import type { ParentDigest } from "../parentDigest";

const NOW = 1_800_000_000_000;

const digest = (): ParentDigest => ({
  student: { name: "سعد", stage: "ثالث ثانوي", goal: "الطب" },
  status: { level: "great", emoji: "🟢", label: "بخير", line: "مستمرٌّ هذا الأسبوع." },
  progress: { hours: { value: 12.5, deltaPct: 20 }, sessions: { value: 5, delta: 1 }, commitmentPct: 78 },
  support: { subject: "الكمي", reason: "أضعف نتائجه" },
  nextExam: { name: "قدرات", days: 21 },
  achievements: [{ icon: "🔥", text: "خمسة أيام متتابعة" }],
  suggestion: "شجّعه على جلسةٍ واحدة اليوم.",
  moments: [{ icon: "📓", text: "كتب في دفتره: اليوم فهمت التناسب أخيراً" }],
  alert: null,
});

describe("وثيقةُ ملخّص سند — حارسُ الخصوصية", () => {
  test("«لحظات» لا تُرفع: نصوصٌ حرّةٌ من يوم الطالب، أقربُ إلى دفتره", () => {
    const doc = projectDigest(digest(), NOW);
    assert.ok(!("moments" in doc));
    assert.ok(!JSON.stringify(doc).includes("فهمت التناسب"));
  });

  test("قائمةُ سماحٍ لا قائمةَ منع: حقلٌ حسّاسٌ يُضاف غداً لا يعبر", () => {
    const rogue = {
      ...digest(),
      duwairbChat: [{ role: "user", text: "أنا خايف من الاختبار وأبي أترك المدرسة" }],
      journal: "دفتري الخاص",
      vaultErrors: ["غلطتي في السؤال ٧"],
      location: { lat: 24.7, lng: 46.6 },
    } as unknown as ParentDigest;

    const raw = JSON.stringify(projectDigest(rogue, NOW));
    for (const leak of ["duwairbChat", "أبي أترك", "journal", "دفتري", "vaultErrors", "غلطتي", "location", "24.7"]) {
      assert.ok(!raw.includes(leak), `تسرّب: ${leak}`);
    }
  });

  test("يرفع ما وُعد به الوالدُ فعلاً — لا أقلّ", () => {
    const doc = projectDigest(digest(), NOW);
    assert.equal(doc.student.name, "سعد");
    assert.equal(doc.progress.hours.value, 12.5);
    assert.equal(doc.progress.commitmentPct, 78);
    assert.deepEqual(doc.support, { subject: "الكمي", reason: "أضعف نتائجه" });
    assert.deepEqual(doc.nextExam, { name: "قدرات", days: 21 });
    assert.equal(doc.achievements.length, 1);
  });

  test("تُختم بالصيغة والوقت", () => {
    const doc = projectDigest(digest(), NOW);
    assert.equal(doc.v, DIGEST_VERSION);
    assert.equal(doc.updatedAt, NOW);
  });

  test("البائت: جهازُ الطالب لم يرفع منذ أكثر من ثلاثة أيام", () => {
    assert.equal(isStale({ updatedAt: NOW }, NOW), false);
    assert.equal(isStale({ updatedAt: NOW - DIGEST_STALE_MS + 1000 }, NOW), false);
    assert.equal(isStale({ updatedAt: NOW - DIGEST_STALE_MS - 1000 }, NOW), true);
    assert.equal(isStale(null, NOW), true);
    assert.equal(isStale({}, NOW), true);
  });

  test("لا نثق بما يأتي من الشبكة", () => {
    assert.equal(isDigestDoc(projectDigest(digest(), NOW)), true);
    for (const bad of [null, undefined, 7, "نصّ", {}, { v: 1 }, { v: 1, updatedAt: NOW }]) {
      assert.equal(isDigestDoc(bad), false, `قُبل ما لا يُقبل: ${JSON.stringify(bad)}`);
    }
  });
});
