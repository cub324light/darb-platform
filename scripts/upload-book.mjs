/**
 * One-time script to upload the Tahsili PDF to Anthropic Files API.
 * Usage:
 *   1. Place your PDF at scripts/tahsili.pdf
 *   2. Run: ANTHROPIC_API_KEY=sk-... node scripts/upload-book.mjs
 *   3. Copy the printed ANTHROPIC_FILE_ID= line into your .env.local and Vercel env vars
 */
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { createReadStream, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = join(__dirname, "tahsili.pdf");

if (!existsSync(PDF_PATH)) {
  console.error("Error: PDF not found at", PDF_PATH);
  console.error("Place your Tahsili PDF at scripts/tahsili.pdf and re-run.");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY env variable not set.");
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

console.log("Uploading", PDF_PATH, "...");

const uploaded = await client.beta.files.upload({
  file: await toFile(createReadStream(PDF_PATH), "tahsili.pdf", {
    type: "application/pdf",
  }),
  betas: ["files-api-2025-04-14"],
});

console.log("\n✅ Upload successful!\n");
console.log("ANTHROPIC_FILE_ID=" + uploaded.id);
console.log("\nAdd this to your .env.local and Vercel environment variables.");
