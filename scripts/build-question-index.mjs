/**
 * One-time script to extract questions from the Tahsili PDF and build a local search index.
 * Usage:
 *   1. Place your PDF at scripts/tahsili.pdf
 *   2. Run: node scripts/build-question-index.mjs
 *   3. Commit the generated src/data/questions.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const PDF_PATH = join(__dirname, "tahsili.pdf");
const OUT_DIR  = join(__dirname, "../src/data");
const OUT_PATH = join(OUT_DIR, "questions.json");

if (!existsSync(PDF_PATH)) {
  console.error("❌ الكتاب غير موجود:", PDF_PATH);
  console.error("ضع tahsili.pdf في مجلد scripts/ ثم أعد التشغيل.");
  process.exit(1);
}

console.log("📄 قراءة الكتاب...");
const pdfParse = require("pdf-parse");
const buffer = readFileSync(PDF_PATH);
const { text } = await pdfParse(buffer);

console.log(`📝 استخراج النص... (${text.length.toLocaleString()} حرف)`);

const chunks = text
  .split(/\n{2,}/)
  .map((c) => c.replace(/\s+/g, " ").trim())
  .filter((c) => c.length > 20);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(chunks));

console.log(`\n✅ تم بناء الفهرس: ${chunks.length} مقطع`);
console.log(`📁 الملف: src/data/questions.json`);
console.log(`\nالخطوة التالية: git add src/data/questions.json && git commit -m "add question index" && git push`);
