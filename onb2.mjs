import { chromium, devices } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ ...devices["Pixel 7"], locale: "ar-SA" });
const p = await ctx.newPage();
const OUT="/tmp/claude-0/-home-user-darb-platform/d8ac0c5e-72f0-5653-92b2-42be58ba4fc3/scratchpad/";
await p.addInitScript(() => { localStorage.setItem("darb_guest_mode","1"); localStorage.setItem("darb_tour_done","1"); });
await p.goto("http://localhost:3100/onboarding",{waitUntil:"networkidle"});
await p.waitForTimeout(1500);
let t = await p.locator("body").innerText();
if (!t.includes("وش صفّك")) {
  for (const label of ["يلا نبدأ","ابدأ","التالي"]) {
    const btn = p.locator(`button:has-text("${label}")`).first();
    if (await btn.count()) { await btn.click().catch(()=>{}); await p.waitForTimeout(900); }
    t = await p.locator("body").innerText();
    if (t.includes("وش صفّك")) break;
  }
}
console.log("خطوةُ «وش صفّك الدراسي؟»:", t.includes("وش صفّك") ? "ظهرت ✓" : "لم تظهر ✗");
console.log("  مدخلُ سند فيها:", t.includes("سجّل في سند وتابع مذاكرة ابنك") ? "ظهر ✓" : "غائب ✗");
await p.screenshot({ path: OUT+"onb-stage2.png", fullPage: true });

await p.locator('button:has-text("خريج")').first().click().catch(()=>{});
await p.waitForTimeout(600);
for (let i=0;i<8;i++){
  const body = await p.locator("body").innerText();
  if (body.includes("نسبة الثانوية")) break;
  const nx = p.locator('button:has-text("التالي")').first();
  if (!(await nx.count())) break;
  await nx.click().catch(()=>{}); await p.waitForTimeout(800);
}
const t2 = await p.locator("body").innerText();
console.log("خطوةُ «نسبة الثانوية»:", t2.includes("نسبة الثانوية") ? "ظهرت ✓" : "لم تُبلَغ");
if (t2.includes("نسبة الثانوية")) {
  await p.locator('button:has-text("نعم، أعرفها")').first().click().catch(()=>{});
  await p.waitForTimeout(500);
  await p.locator('input[inputmode="decimal"]').first().fill("94.5").catch(()=>{});
  await p.waitForTimeout(600);
  const t3 = await p.locator("body").innerText();
  console.log("  بعد إدخال 94.5:", t3.includes("94.5٪") || t3.includes("94٫5٪") ? "عُرضت كما هي ✓" : "—");
  console.log("  التقدير:", ["ممتاز","جيد جداً","جيد","مقبول"].find(x=>t3.includes(x)) ?? "—");
  await p.screenshot({ path: OUT+"onb-gpa2.png", fullPage: true });
}
await b.close();
