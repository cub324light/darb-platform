/* اختبار نظام المسارات والمنهج — تشغيل: npx tsx --test src/lib/curriculum.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACADEMIC_TRACKS, CURRICULUM, subjectsFor, trackSubjectEmphasis, trackLabel, type AcademicTrack,
} from "./curriculum";

const TRACKS: AcademicTrack[] = ["general", "cs-eng", "health", "business", "sharia"];

test("المسارات الخمسة الرسمية، «عام» موصى به وأول القائمة", () => {
  assert.equal(ACADEMIC_TRACKS.length, 5);
  assert.deepEqual(ACADEMIC_TRACKS.map((t) => t.id), ["general", "cs-eng", "health", "business", "sharia"]);
  assert.equal(ACADEMIC_TRACKS[0].id, "general");
  assert.equal(ACADEMIC_TRACKS[0].recommended, true);
  assert.ok(ACADEMIC_TRACKS.every((t) => t.icon && t.label && t.desc));
});

test("سلامة البيانات: كل مسار له ثاني وثالث، وكلٌّ ثلاثة فصولٍ غير فارغة", () => {
  for (const t of TRACKS) {
    for (const g of ["ثاني", "ثالث"] as const) {
      for (const s of ["s1", "s2", "s3"] as const) {
        const subs = CURRICULUM[t][g][s];
        assert.ok(Array.isArray(subs) && subs.length > 0, `${t}/${g}/${s} فارغ`);
        assert.equal(new Set(subs).size, subs.length, `${t}/${g}/${s} فيه تكرار`);
      }
    }
  }
});

test("Resolver: يجلب مواد الفصل حسب المسار+الصف+الفصل (first→s1 · second→s2 · summer→s3)", () => {
  const s1 = subjectsFor("health", "ثاني ثانوي", "first");
  assert.deepEqual(s1, CURRICULUM.health["ثاني"].s1);
  assert.ok(s1.includes("الأحياء (2-1)"));
  assert.deepEqual(subjectsFor("health", "ثاني ثانوي", "second"), CURRICULUM.health["ثاني"].s2);
  assert.deepEqual(subjectsFor("health", "ثاني ثانوي", "summer"), CURRICULUM.health["ثاني"].s3);
  /* الفصل غير المحدّد = الأول */
  assert.deepEqual(subjectsFor("cs-eng", "ثالث ثانوي"), CURRICULUM["cs-eng"]["ثالث"].s1);
});

test("Resolver: أول ثانوي أو بلا مسار → لا مواد", () => {
  assert.deepEqual(subjectsFor("general", "أول ثانوي", "first"), []);
  assert.deepEqual(subjectsFor(null, "ثاني ثانوي", "first"), []);
  assert.deepEqual(subjectsFor(undefined, "ثالث ثانوي", "second"), []);
  assert.deepEqual(subjectsFor("business", "خريج", "first"), []);
});

test("مواد التركيز لكل مسار (لدويرب) — «عام» متوازن", () => {
  assert.deepEqual(trackSubjectEmphasis("health"), ["الأحياء", "الكيمياء"]);
  assert.deepEqual(trackSubjectEmphasis("cs-eng"), ["الرياضيات", "الفيزياء"]);
  assert.deepEqual(trackSubjectEmphasis("business"), ["الاقتصاد", "المحاسبة"]);
  assert.deepEqual(trackSubjectEmphasis("general"), []);
  assert.deepEqual(trackSubjectEmphasis(null), []);
});

test("trackLabel يعيد الاسم العربي", () => {
  assert.equal(trackLabel("sharia"), "الشرعي");
  assert.equal(trackLabel("cs-eng"), "علوم الحاسب والهندسة");
});
