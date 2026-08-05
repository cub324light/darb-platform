<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Darb Architect — المرجع المعماري الدائم

قبل أي تطوير أو تعديل أو مراجعة في هذا المشروع (ميزة جديدة، إعادة هيكلة، إصلاح، أو فحص PR)
استخدِم الـsubagent المعرّف في `.claude/agents/darb-architect.md` عبر أداة Agent بـ
`subagent_type: darb-architect`. هو حارس المعمارية: يمنع كسر الميزات/البناء/الأنواع/الاختبارات،
يرفض التكرار ويعيد استخدام الأنظمة القائمة، ويشغّل بوابات التحقق قبل أي commit. هو المرجع
الأساسي لكل عمليات تطوير درب المستقبلية.

# نظام الخطوط (Typography) — مغلق. المرجع الحيّ: `/dev/design-system`

خطٌّ واحد لكل المنصّة: **IBM Plex Sans Arabic** (لا خطّ آخر إلا لسببٍ قويٍّ جداً). أربعة
أوزان فقط: 400/500/600/700. قواعدُ ملزِمة لأي صفحةٍ أو مكوّنٍ جديد:

1. **استخدم Tokens السلّم فقط** — ممنوع `text-[13px]`/`text-[15px]` أو أي حجمٍ مباشر في
   كودٍ جديد. السلّم: `t-display · t-h1 · t-h2 · t-h3 · t-title · t-body-lg · t-body ·
   t-small · t-caption` (معرّفة في `globals.css`).
2. **Hero**: العنوان = `t-display` أو `t-h1` فقط.
3. **البطاقة**: `t-title` (عنوان) ثم `t-body` (وصف) ثم `t-caption` (تفاصيل) — ثلاثة مستويات لا أكثر.
4. **الأرقام**: من `src/lib/format.ts` فقط (`n/pct/frac/sar/time/dur/dateShort/dateLong/days`).
   أرقام **0-9** (الغُبارية — عربيّةُ الأصل، وهي التي يذاكر بها طالبنا ويراها في قياس
   وأبشر وجواله). قاعدتان: **(أ)** كل رقمٍ 0-9 ولا يُخلط شكلان أبداً. **(ب)** العدد داخل
   جملةٍ سرديّة يُكتب **كلمةً**: «القسم الأول» لا «القسم 1»، و«ثلاث جلسات» لا «3 جلسات»؛
   أمّا القياس فيبقى رقماً: «45 دقيقة» · «95 درجة». الرمز العربي للنسبة ٪ والريال ﷼،
   وللمحاذاة أضِف `class="font-mono-nums"`.
   ⚠ **ممنوع `"ar-SA"`** (وكذلك `"ar-SA-u-nu-latn"`): في المتصفّح تعني تقويم أُمّ القرى،
   فتطبع «26 محرم» حيث يقصد المنتج «11 يوليو». الاصطلاح `"ar-u-nu-latn"` وحده، ومَن
   أراد الهجريّ فليطلبه صراحةً بـ`dateHijri`. يحرسه اختبارٌ في `format.test.ts`.
5. **بلا `letter-spacing` موجب على العربية** (يكسر وصل الحروف).
6. **Legacy (دَين تقني تدريجي)**: لا حملة تحويلٍ كبيرة. كلّما عدّلتَ صفحةً قديمة تستخدم
   أحجاماً مباشرة، حوّل أحجامها إلى Tokens ضمن التعديل — لا دفعةً واحدة.

لا نعيد فتح نظام الخطوط إلا عند مشكلةٍ حقيقية من استخدام الطلاب.

# المرحلة والقدرات — الصفحةُ تسأل ولا تقرّر

`src/lib/transition/` هو **مصدرُ الحقيقة الوحيد** لمرحلة الطالب. قاعدةٌ مثبَّتة
يحرسها `transition/boundary.test.ts` على `src/app` و`src/components` كلِّها:

1. **ممنوعٌ داخل أيّ صفحةٍ أو مكوّن**: `studyLevel === …` · `gradStage === …` ·
   `computeStudentPhase` · `phaseExperience` · `isUniversityPhase` ·
   `isUniversityGraduate` · `isGraduatePhase` · `showsUniversityUI` ·
   `canApplyUniversity` · `studentPersona`. لا استثناءَ إلا `/admin` و`/dev`
   (أدواتُ تشغيلٍ تعرض حالةَ المحرّكات) و`/onboarding` (يُنشئ الملفَّ ولا ينتقل).

2. **السؤالُ الوحيد**: `currentPhase()` من `@/lib/transition` — يعطي
   `allows(cap)` · `id` · `label` · `declarable` · `navMid` · `duwairbHint` · `stage`.

3. **رتّب بالقدرات لا بأسماء المراحل**. القدراتُ اليوم: `school` ·
   `secondary-study` · `admission` · `uni-life` · `career`. لأن الطالب لا يبقى في
   مرحلته — ثاني ثانويّ يصير ثالثاً، وثالثٌ خرّيجاً، وخرّيجٌ جامعياً — فالترتيبُ
   المبنيُّ على القدرة يتبعه من نفسه، والمبنيُّ على الاسم يتخلّف عنه.

4. **قدرةٌ جديدة؟** تُضاف في `transition/registry.ts` وحدَه — لا شرطَ جديدٌ في
   صفحة. وإضافةُ مرحلةٍ كاملة (مبتعث · ماجستير · موظّف) مدخلٌ واحدٌ في السجلّ.
