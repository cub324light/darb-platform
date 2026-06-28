/* اختبارات نظام الرتب — تشغيل: npx tsx --test src/lib/rank.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rankFromRP, computeRpChange, expectedScore, TIERS, START_RP, DIVISION_SPAN,
} from "./rank";

test("RP=0 → برونزي III (أدنى تقسيم في أدنى رتبة)", () => {
  const r = rankFromRP(0);
  assert.equal(r.tierId, "bronze");
  assert.equal(r.division, 3);
  assert.equal(r.divisionRoman, "III");
  assert.equal(r.label, "برونزي III");
  assert.equal(r.floor, 0);
  assert.equal(r.ceil, 100);
});

test("حدود التقسيمات داخل البرونزي (III→II→I تصاعدياً)", () => {
  assert.equal(rankFromRP(99).label, "برونزي III");
  assert.equal(rankFromRP(100).label, "برونزي II");
  assert.equal(rankFromRP(200).label, "برونزي I");
  assert.equal(rankFromRP(299).label, "برونزي I");
  assert.equal(rankFromRP(300).label, "فضي III"); // الرتبة التالية
});

test("كل رتبة عند حدّها الأدنى تعطي تقسيم III", () => {
  for (const t of TIERS) {
    const r = rankFromRP(t.floor);
    assert.equal(r.tierId, t.id, `floor ${t.floor} → ${t.id}`);
    if (t.divisions === 3) assert.equal(r.divisionRoman, "III");
    else assert.equal(r.division, null);
  }
});

test("الرتب أحادية التقسيم: جراند ماستر بلا تقسيم، وأسطوري قمة بلا سقف", () => {
  const gm = rankFromRP(1800);
  assert.equal(gm.tierId, "grandmaster");
  assert.equal(gm.division, null);
  assert.equal(gm.label, "جراند ماستر");

  const leg = rankFromRP(2400);
  assert.equal(leg.tierId, "legendary");
  assert.equal(leg.ceil, null);
  assert.equal(leg.toNext, 0);
  assert.equal(leg.progressPct, 100);

  const legHigh = rankFromRP(999999);
  assert.equal(legHigh.tierId, "legendary"); // لا شيء أعلى من الأسطوري
});

test("rung يرتفع رتيباً مع RP (للمقارنة بين اللاعبين)", () => {
  let prev = -1;
  for (let rp = 0; rp <= 2600; rp += 50) {
    const rung = rankFromRP(rp).rung;
    assert.ok(rung >= prev, `rung لا ينقص عند ${rp}`);
    prev = rung;
  }
  assert.ok(rankFromRP(2400).rung > rankFromRP(0).rung);
});

test("RP سالب أو غير صالح يُحدّ عند 0", () => {
  assert.equal(rankFromRP(-500).rp, 0);
  assert.equal(rankFromRP(NaN).rp, 0);
  assert.equal(rankFromRP(-1).label, "برونزي III");
});

test("الفوز يزيد النقاط والخسارة تنقصها", () => {
  const win = computeRpChange({ myRP: 500, oppRP: 500, won: true, winStreak: 0 });
  const loss = computeRpChange({ myRP: 500, oppRP: 500, won: false, winStreak: 0 });
  assert.ok(win.delta > 0, "الفوز موجب");
  assert.ok(loss.delta < 0, "الخسارة سالبة");
  assert.equal(win.newRP, 500 + win.delta);
});

test("الفوز يمنح حدّاً أدنى مُجزياً حتى ضد أضعف منافس", () => {
  const win = computeRpChange({ myRP: 2000, oppRP: 100, won: true, winStreak: 0 });
  assert.ok(win.delta >= 12, "الفوز لا يقل عن +12 حتى لو متوقَّعاً");
});

test("الخسارة لا تُنزل RP تحت الصفر", () => {
  // خسارة بحجم يتجاوز الرصيد (منافس مكافئ) ⇒ يُحدّ عند 0
  const loss = computeRpChange({ myRP: 10, oppRP: 10, won: false, winStreak: 0 });
  assert.equal(loss.newRP, 0);
  assert.equal(loss.delta, -10); // الفعلي بعد الحدّ (وليس -16)
});

test("Elo: الفوز على أقوى يمنح أكثر من الفوز على أضعف", () => {
  const vsStrong = computeRpChange({ myRP: 500, oppRP: 900, won: true, winStreak: 0 });
  const vsWeak = computeRpChange({ myRP: 500, oppRP: 100, won: true, winStreak: 0 });
  assert.ok(vsStrong.delta > vsWeak.delta, "مكافأة أكبر على الأقوى");
  assert.ok(expectedScore(500, 900) < expectedScore(500, 100));
});

test("مكافأة سلسلة الانتصارات تبدأ من 3 وتتراكم بسقف", () => {
  const s2 = computeRpChange({ myRP: 500, oppRP: 500, won: true, winStreak: 2 }); // ستصبح 3
  const s0 = computeRpChange({ myRP: 500, oppRP: 500, won: true, winStreak: 0 }); // ستصبح 1
  assert.ok(s2.streakBonus > 0, "سلسلة 3 تمنح مكافأة");
  assert.equal(s0.streakBonus, 0, "لا مكافأة قبل 3");
  assert.ok(s2.delta > s0.delta);

  const sBig = computeRpChange({ myRP: 500, oppRP: 500, won: true, winStreak: 20 });
  assert.ok(sBig.streakBonus <= 15, "المكافأة لها سقف");
});

test("الخسارة تصفّر السلسلة، الفوز يزيدها", () => {
  assert.equal(computeRpChange({ myRP: 500, oppRP: 500, won: false, winStreak: 7 }).newStreak, 0);
  assert.equal(computeRpChange({ myRP: 500, oppRP: 500, won: true, winStreak: 7 }).newStreak, 8);
});

test("الترقية تُكتشف عند عبور حدّ التقسيم صعوداً", () => {
  // عند 295 (برونزي I) فوز يدفع فوق 300 ⇒ ترقية لفضي
  const promo = computeRpChange({ myRP: 295, oppRP: 700, won: true, winStreak: 5 });
  assert.ok(promo.newRP >= 300);
  assert.equal(promo.promoted, true);
  assert.equal(promo.demoted, false);
});

test("الخفض يُكتشف عند عبور حدّ التقسيم نزولاً", () => {
  // عند 305 (فضي III) خسارة تنزل تحت 300 ⇒ خفض لبرونزي
  const demo = computeRpChange({ myRP: 305, oppRP: 100, won: false, winStreak: 0 });
  assert.ok(demo.newRP < 300);
  assert.equal(demo.demoted, true);
  assert.equal(demo.promoted, false);
});

test("لاعبان متعادلان: مجموع تغيّر RP ≈ صفر (لا تضخّم من تبادل الفوز)", () => {
  const a = computeRpChange({ myRP: 800, oppRP: 800, won: true, winStreak: 0 });
  const b = computeRpChange({ myRP: 800, oppRP: 800, won: false, winStreak: 0 });
  // الفائز يكسب ما يخسره الخاسر تقريباً (±2) ⇒ لا يمكن تضخيم الزوج بالتبادل
  assert.ok(Math.abs(a.delta + b.delta) <= 3, `مجموع التغيّر ${a.delta + b.delta}`);
});

test("START_RP يضع اللاعب الجديد في برونزي II", () => {
  assert.equal(DIVISION_SPAN, 100);
  assert.equal(rankFromRP(START_RP).label, "برونزي II");
});
