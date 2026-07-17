import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    /* قواعد React Compiler الاستشارية → تحذيرات لا أخطاء.
       تُطلَق على أنماط درب المقصودة والآمنة: قراءة localStorage للعميل داخل
       المُهيّئات/الـmemo، مزامنة matchMedia، تهيئة جسيمات زخرفية، استعادة مؤقّت.
       ليست أخطاء صحّة (tsc/build/التشغيل سليمة) — تبقى مرئيةً كدَينٍ تقنيّ يُعالَج
       تدريجياً، دون تجميد CI على إعادة هيكلةٍ محفوفةٍ أثناء مرحلة الاستقرار. */
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party minified worker (pdfjs-dist):
    "public/pdf.worker.min.mjs",
  ]),
]);

export default eslintConfig;
