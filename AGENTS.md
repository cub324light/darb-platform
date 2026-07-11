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
4. **الأرقام**: من `src/lib/format.ts` فقط (`n/pct/frac/sar/dateShort/dateLong/days`) —
   أرقامٌ عربية-هندية، الرمز العربي للنسبة ٪ والريال ﷼. للمحاذاة أضِف `class="font-mono-nums"`.
5. **بلا `letter-spacing` موجب على العربية** (يكسر وصل الحروف).
6. **Legacy (دَين تقني تدريجي)**: لا حملة تحويلٍ كبيرة. كلّما عدّلتَ صفحةً قديمة تستخدم
   أحجاماً مباشرة، حوّل أحجامها إلى Tokens ضمن التعديل — لا دفعةً واحدة.

لا نعيد فتح نظام الخطوط إلا عند مشكلةٍ حقيقية من استخدام الطلاب.
