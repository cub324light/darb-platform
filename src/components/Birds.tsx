"use client";
import { useEffect, useId, useState } from "react";
import { getBird, type BirdId, type BirdPalette } from "@/lib/birds";

/* ─── الطيور الرفيقة: SVG مفصّل + أنميشن + لوحة لكل ثيم ─── */

function useTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setTheme(el.getAttribute("data-theme") === "light" ? "light" : "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

type Props = { p: BirdPalette; uid: string };

/* ═══ الصقر — جارح رابض، خط الوجنة المميز ومنقار معقوف ═══ */
function FalconSVG({ p, uid }: Props) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}fb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.b1} /><stop offset="100%" stopColor={p.b2} />
        </linearGradient>
        <linearGradient id={`${uid}fw`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={p.w1} /><stop offset="100%" stopColor={p.w2} />
        </linearGradient>
      </defs>
      {/* الذيل — خلف المجثم بميل خفيف */}
      <g className="bird-tail">
        <path d="M58,80 C63,90 66,102 65,115 Q62,117 59,116 C57,104 56,90 55,82 Z" fill={`url(#${uid}fw)`} />
        <path d="M55,84 C55,95 56,106 58,116 Q55,116 53,114 C51,103 52,91 52,85 Z" fill={`url(#${uid}fw)`} opacity="0.65" />
      </g>
      {/* الجسم */}
      <path d="M57,30 C73,33 81,50 78,70 C75,87 66,96 55,96 C44,96 36,84 38,65 C40,47 46,33 57,30 Z" fill={`url(#${uid}fb)`} />
      {/* بقع الصدر */}
      <g fill={p.b2} opacity="0.5">
        <path d="M46,58 q3,-1.5 6,0 q-3,3 -6,0 Z" /><path d="M52,67 q3,-1.5 6,0 q-3,3 -6,0 Z" />
        <path d="M44,74 q3,-1.5 6,0 q-3,3 -6,0 Z" /><path d="M52,82 q3,-1.5 6,0 q-3,3 -6,0 Z" />
      </g>
      {/* الجناح المطوي — ريشات أولية مدببة تصل للذيل */}
      <g className="bird-wing">
        <path d="M62,38 C76,44 82,58 80,74 C79,87 73,97 66,101 C61,88 59,55 62,38 Z" fill={`url(#${uid}fw)`} />
        <path d="M68,70 C72,78 72,88 69,97 C67,89 66,78 66,70 Z" fill={p.b2} opacity="0.45" />
        <path d="M66,62 q6,4 8,12 q-6,-1 -10,-6 Z" fill={p.b1} opacity="0.22" />
        <path d="M65,76 q5,4 7,10 q-6,-1 -9,-5 Z" fill={p.b1} opacity="0.16" />
      </g>
      {/* الرأس */}
      <path d="M52,8 C64,9 71,18 70,29 C69,39 61,44 51,43 C41,42 35,34 36,24 C37,14 43,7 52,8 Z" fill={`url(#${uid}fb)`} />
      {/* القلنسوة الداكنة — سمة الجارح */}
      <path d="M38,22 C40,13 46,8 53,8 C63,9 70,17 70,27 C70,29 69,31 68,33 C65,25 59,20 52,20 C46,20 41,23 38,27 Z" fill={p.w2} opacity="0.9" />
      {/* خط الوجنة — شارب الصقر */}
      <path d="M46,27 C47,32 46,38 42,42 C40,37 41,30 44,26 Z" fill={p.w2} opacity="0.9" />
      {/* المنقار: شمع ذهبي + خطاف داكن */}
      <path d="M39,23 C36,22 34,24 34,26 C34,28 36,29 38,29 C37,27 38,24 39,23 Z" fill={p.beak} />
      <path d="M35,24 C31,24 28,26 28,29 C28,32 31,34 34,33 C32,31 33,27 35,24 Z" fill="#4B5563" />
      <path d="M29,30 C30,32 32,33.5 34,33 C33,32 32,31 32,30 Z" fill="#1F2937" />
      {/* العين — حلقة ذهبية وحدقة حادة تحت حافة القلنسوة */}
      <circle cx="46" cy="24" r="5" fill={p.beak} />
      <circle cx="46" cy="24" r="3.8" fill="#FFFFFF" />
      <g className="bird-eye">
        <circle cx="45.4" cy="24" r="2.9" fill="#0A0A12" />
        <circle cx="44.3" cy="22.8" r="1" fill="#FFFFFF" />
      </g>
      {/* حاجب حاد فوق العين */}
      <path d="M40,19 L51,17.5" stroke={p.w2} strokeWidth="2.2" strokeLinecap="round" />
      {/* لمعة الرأس */}
      <path d="M54,10 C59,11 63,14 65,18 C61,15 57,13 53,12 Z" fill={p.acc} opacity="0.5" />
      {/* المخالب والمجثم */}
      <line x1="36" y1="103" x2="76" y2="103" stroke={p.w2} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <path d="M48,95 L46,103 M52,96 L52,103 M58,95 L60,103" stroke={p.beak} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </>
  );
}

/* ═══ الهدهد — التاج المروحي بأطراف داكنة ومنقار طويل مقوّس ═══ */
function HoopoeSVG({ p, uid }: Props) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}hb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.b1} /><stop offset="100%" stopColor={p.b2} />
        </linearGradient>
        <linearGradient id={`${uid}hw`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.w1} /><stop offset="100%" stopColor={p.w2} />
        </linearGradient>
      </defs>
      {/* التاج */}
      <g className="bird-crest">
        {[
          { d: "M52,22 C52,14 54,7 58,3", tip: [58, 3] },
          { d: "M54,23 C57,16 61,10 66,7", tip: [66, 7] },
          { d: "M56,25 C61,19 66,15 72,13", tip: [72, 13] },
          { d: "M57,27 C63,23 69,21 76,20", tip: [76, 20] },
          { d: "M58,30 C64,28 71,27 78,28", tip: [78, 28] },
        ].map((f, i) => (
          <g key={i}>
            <path d={f.d} stroke={`url(#${uid}hb)`} strokeWidth="3.4" strokeLinecap="round" fill="none" />
            <circle cx={f.tip[0]} cy={f.tip[1]} r="2.6" fill={p.acc} />
            <circle cx={f.tip[0]} cy={f.tip[1]} r="2.6" fill={p.w2} opacity="0.55" transform="translate(1.2,0)" />
          </g>
        ))}
      </g>
      {/* الذيل — أسود بشريط فاتح */}
      <g className="bird-tail">
        <path d="M68,76 L86,98 Q83,102 79,102 L62,82 Z" fill={`url(#${uid}hw)`} />
        <path d="M70,84 L78,93 L74,96 L66,88 Z" fill="#FFFFFF" opacity="0.85" />
      </g>
      {/* الجسم */}
      <path d="M50,32 C64,32 74,44 74,60 C74,76 64,86 52,86 C40,86 32,75 33,59 C34,44 40,32 50,32 Z" fill={`url(#${uid}hb)`} />
      {/* الجناح المخطط */}
      <g className="bird-wing">
        <path d="M52,46 C64,48 71,58 70,72 C69,82 62,87 55,86 C50,75 49,58 52,46 Z" fill={`url(#${uid}hw)`} />
        <path d="M53,54 C60,55 66,60 68,66 L66,69 C61,63 56,59 52,58 Z" fill="#FFFFFF" opacity="0.9" />
        <path d="M52,64 C58,65 63,69 66,74 L64,77 C60,72 55,69 51,68 Z" fill="#FFFFFF" opacity="0.9" />
        <path d="M52,74 C56,75 60,78 62,82 L60,84 C57,81 53,78 51,77 Z" fill="#FFFFFF" opacity="0.85" />
      </g>
      {/* الرأس */}
      <path d="M48,18 C57,18 63,25 62,33 C61,40 55,44 48,43 C41,42 36,36 37,29 C38,22 42,18 48,18 Z" fill={`url(#${uid}hb)`} />
      {/* المنقار الطويل المقوّس */}
      <path d="M39,29 C30,32 22,37 16,44" stroke={p.beak} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* العين */}
      <circle cx="45" cy="28" r="4.4" fill="#FFFFFF" />
      <g className="bird-eye">
        <circle cx="44.5" cy="28" r="2.7" fill="#0A0A12" />
        <circle cx="43.5" cy="26.8" r="1" fill="#FFFFFF" />
      </g>
      {/* لمسة الصدر */}
      <path d="M44,52 q6,8 4,18 q-6,-8 -4,-18 Z" fill={p.acc} opacity="0.25" />
      {/* الأرجل */}
      <path d="M48,86 L46,94 M56,85 L57,94" stroke={p.beak} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>
  );
}

/* ═══ البجعة — عنق متموج فوق ماء هادئ ═══ */
function SwanSVG({ p, uid }: Props) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}sb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.b1} /><stop offset="100%" stopColor={p.b2} />
        </linearGradient>
        <linearGradient id={`${uid}sw`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.w1} /><stop offset="100%" stopColor={p.w2} />
        </linearGradient>
      </defs>
      {/* الجسم */}
      <path d="M32,70 C38,58 58,53 74,57 C88,61 94,71 87,80 C78,90 48,91 36,83 C30,79 29,75 32,70 Z" fill={`url(#${uid}sb)`} />
      {/* ريش الجناح المرفوع */}
      <g className="bird-wing">
        <path d="M48,58 C62,52 78,55 84,64 C78,62 70,62 64,65 C72,65 79,69 82,75 C74,72 66,72 60,75 C66,76 71,80 73,85 C62,84 50,78 46,68 Z" fill={`url(#${uid}sw)`} />
      </g>
      {/* العنق المتموج */}
      <g className="bird-neck">
        <path d="M44,68 C36,58 38,46 46,38 C52,32 52,26 48,22" stroke={`url(#${uid}sb)`} strokeWidth="9" strokeLinecap="round" fill="none" />
        {/* الرأس */}
        <path d="M47,14 C53,13 57,17 57,22 C57,26 53,29 48,28 C43,27 40,23 41,19 C42,16 44,14 47,14 Z" fill={`url(#${uid}sb)`} />
        {/* المنقار ببروز أسود */}
        <path d="M42,20 L31,24 Q30,25 31,26 L42,27 Z" fill={p.beak} />
        <path d="M42,19.5 C40,19 39,20 39,21 L42,21.5 Z" fill="#0A0A12" />
        {/* العين */}
        <g className="bird-eye">
          <circle cx="46" cy="20" r="2.3" fill="#0A0A12" />
          <circle cx="45.3" cy="19.3" r="0.8" fill="#FFFFFF" />
        </g>
      </g>
      {/* الذيل المرفوع */}
      <path d="M86,72 C92,68 95,63 95,58 C99,64 98,72 92,78 Z" fill={`url(#${uid}sb)`} opacity="0.9" />
      {/* خط الماء والتموجات */}
      <g stroke={p.acc} strokeWidth="2" strokeLinecap="round" fill="none">
        <path className="bird-ripple" d="M16,92 Q28,89 40,92 T64,92" opacity="0.5" />
        <path className="bird-ripple" style={{ animationDelay: "0.8s" }} d="M52,99 Q66,96 80,99 T104,99" opacity="0.35" />
        <path className="bird-ripple" style={{ animationDelay: "1.5s" }} d="M28,106 Q40,103 52,106 T76,106" opacity="0.22" />
      </g>
    </>
  );
}

/* ═══ الغراب — أسود لامع ببريق قزحي ═══ */
function RavenSVG({ p, uid }: Props) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}rb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.b1} /><stop offset="100%" stopColor={p.b2} />
        </linearGradient>
        <linearGradient id={`${uid}rw`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={p.w1} /><stop offset="100%" stopColor={p.w2} />
        </linearGradient>
        <linearGradient id={`${uid}rs`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.acc} stopOpacity="0" />
          <stop offset="50%" stopColor={p.acc} stopOpacity="0.7" />
          <stop offset="100%" stopColor={p.acc} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* الذيل الإسفيني الطويل */}
      <g className="bird-tail">
        <path d="M62,80 L88,104 Q85,109 80,109 L58,86 Z" fill={`url(#${uid}rw)`} />
        <path d="M66,86 L80,99 L76,102 L62,90 Z" fill={`url(#${uid}rs)`} className="bird-sheen" />
      </g>
      {/* الجسم */}
      <path d="M50,28 C66,28 77,42 77,60 C77,77 66,88 52,88 C39,88 31,76 32,59 C33,43 39,28 50,28 Z" fill={`url(#${uid}rb)`} />
      {/* الجناح */}
      <g className="bird-wing">
        <path d="M54,42 C68,44 76,56 75,71 C74,82 66,89 58,88 C52,76 51,55 54,42 Z" fill={`url(#${uid}rw)`} />
        <path d="M57,50 C66,53 72,62 72,72 C68,64 62,57 55,54 Z" fill={`url(#${uid}rs)`} className="bird-sheen" />
      </g>
      {/* بريق الصدر */}
      <path d="M42,44 C46,52 46,64 42,74 C38,66 38,52 42,44 Z" fill={`url(#${uid}rs)`} className="bird-sheen" style={{ animationDelay: "1.2s" }} />
      {/* الرأس */}
      <path d="M48,12 C59,12 66,20 65,30 C64,39 57,44 48,43 C39,42 33,34 34,25 C35,16 41,12 48,12 Z" fill={`url(#${uid}rb)`} />
      {/* ريش الحلق الأشعث */}
      <path d="M42,42 L40,48 L45,44 L45,50 L50,45 L51,51 L55,45" stroke={p.b2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
      {/* المنقار الثقيل المستقيم */}
      <path d="M37,22 L20,27 Q19,28 20,29 L36,32 C34,29 34,25 37,22 Z" fill={p.beak} />
      <path d="M21,28 L36,31 C35,30 34,29 34,28 Z" fill={p.b2} opacity="0.6" />
      {/* العين */}
      <circle cx="44" cy="23" r="4.2" fill="#FFFFFF" opacity="0.95" />
      <g className="bird-eye">
        <circle cx="43.6" cy="23" r="2.8" fill="#0A0A12" />
        <circle cx="42.6" cy="21.8" r="0.9" fill="#FFFFFF" />
      </g>
      {/* الأرجل */}
      <path d="M46,88 L44,98 M54,88 L55,98" stroke={p.b2} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M40,98 L48,98 M51,98 L59,98" stroke={p.b2} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>
  );
}

/* ═══ الطاووس — مروحة الذيل بعيونها الذهبية ═══ */
function PeacockSVG({ p, uid }: Props) {
  const rays = [-69, -46, -23, 0, 23, 46, 69];
  return (
    <>
      <defs>
        <linearGradient id={`${uid}pb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.b1} /><stop offset="100%" stopColor={p.b2} />
        </linearGradient>
        <radialGradient id={`${uid}pt`}>
          <stop offset="0%" stopColor={p.w1} /><stop offset="100%" stopColor={p.w2} />
        </radialGradient>
      </defs>
      {/* المروحة */}
      <g className="bird-fan">
        {rays.map((deg, i) => (
          <g key={deg} transform={`rotate(${deg} 62 72)`}>
            <path d="M62,72 C58,52 58,34 62,18 C66,34 66,52 62,72 Z" fill={`url(#${uid}pt)`} opacity="0.9" />
            <g className="bird-sheen" style={{ animationDelay: `${i * 0.5}s` }}>
              <circle cx="62" cy="26" r="6" fill={p.w2} />
              <circle cx="62" cy="26" r="4" fill={p.acc} />
              <circle cx="62" cy="26" r="2" fill={p.b2} />
            </g>
          </g>
        ))}
      </g>
      {/* الجسم */}
      <path d="M52,44 C62,44 70,54 70,68 C70,82 62,92 52,92 C42,92 35,82 35,68 C35,54 42,44 52,44 Z" fill={`url(#${uid}pb)`} />
      {/* لمعة الصدر */}
      <path d="M45,52 C49,58 49,70 45,80 C41,72 41,60 45,52 Z" fill={p.b1} opacity="0.35" />
      {/* العنق والرأس */}
      <path d="M50,46 C44,40 42,32 44,24" stroke={`url(#${uid}pb)`} strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M45,12 C51,11 56,15 56,21 C56,26 51,29 46,28 C41,27 38,23 39,18 C40,14 42,12 45,12 Z" fill={`url(#${uid}pb)`} />
      {/* تاج بثلاث شعرات */}
      <g className="bird-crest">
        <path d="M44,12 L41,4 M47,11 L47,2 M50,12 L53,4" stroke={`url(#${uid}pb)`} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <circle cx="41" cy="4" r="1.8" fill={p.acc} /><circle cx="47" cy="2" r="1.8" fill={p.acc} /><circle cx="53" cy="4" r="1.8" fill={p.acc} />
      </g>
      {/* المنقار */}
      <path d="M40,19 L31,22 Q30,23 31,24 L40,25 Z" fill={p.beak} />
      {/* العين */}
      <circle cx="44" cy="19" r="3.4" fill="#FFFFFF" />
      <g className="bird-eye">
        <circle cx="43.6" cy="19" r="2.1" fill="#0A0A12" />
        <circle cx="42.9" cy="18.2" r="0.7" fill="#FFFFFF" />
      </g>
      {/* الأرجل */}
      <path d="M47,92 L45,102 M57,92 L58,102" stroke={p.beak} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>
  );
}

/* ═══ الفينكس — ينهض بأجنحة من لهب ═══ */
function PhoenixSVG({ p, uid }: Props) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}xb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.b1} /><stop offset="100%" stopColor={p.b2} />
        </linearGradient>
        <linearGradient id={`${uid}xw`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.w2} /><stop offset="100%" stopColor={p.w1} />
        </linearGradient>
      </defs>
      {/* ألسنة الذيل اللهبية */}
      <g>
        <path className="bird-flame" d="M54,84 C48,94 48,106 53,116 C56,108 56,96 58,88 Z" fill={`url(#${uid}xw)`} opacity="0.9" />
        <path className="bird-flame bird-flame-2" d="M62,86 C62,96 64,106 70,113 C70,104 67,94 66,87 Z" fill={`url(#${uid}xw)`} opacity="0.75" />
        <path className="bird-flame bird-flame-3" d="M58,88 C56,98 58,108 62,115 C63,106 61,96 61,89 Z" fill={p.acc} opacity="0.55" />
      </g>
      {/* الجناح الأيسر — لهب صاعد */}
      <g className="bird-wing-flame">
        <path className="bird-flame" d="M46,56 C34,52 24,42 20,28 C30,34 38,36 44,44 C40,36 38,28 40,20 C46,30 50,42 50,54 Z" fill={`url(#${uid}xw)`} />
        <path className="bird-flame bird-flame-2" d="M46,58 C38,56 30,50 26,42 C34,46 40,48 45,52 Z" fill={p.acc} opacity="0.5" />
      </g>
      {/* الجناح الأيمن */}
      <g className="bird-wing-flame">
        <path className="bird-flame bird-flame-2" d="M70,56 C82,52 92,42 96,28 C86,34 78,36 72,44 C76,36 78,28 76,20 C70,30 66,42 66,54 Z" fill={`url(#${uid}xw)`} />
        <path className="bird-flame bird-flame-3" d="M70,58 C78,56 86,50 90,42 C82,46 76,48 71,52 Z" fill={p.acc} opacity="0.5" />
      </g>
      {/* الجسم الصاعد */}
      <path d="M58,28 C66,32 70,44 69,60 C68,74 63,84 58,86 C53,84 48,74 47,60 C46,44 50,32 58,28 Z" fill={`url(#${uid}xb)`} />
      {/* وهج الصدر */}
      <path d="M58,42 C61,48 61,62 58,72 C55,62 55,48 58,42 Z" fill={p.acc} opacity="0.6" />
      {/* الرأس */}
      <circle cx="58" cy="24" r="10" fill={`url(#${uid}xb)`} />
      {/* لهب التاج */}
      <g className="bird-crest">
        <path className="bird-flame" d="M54,16 C52,10 53,5 56,1 C57,6 58,10 58,14 Z" fill={`url(#${uid}xw)`} />
        <path className="bird-flame bird-flame-2" d="M60,15 C61,9 63,5 67,2 C66,8 64,12 62,16 Z" fill={`url(#${uid}xw)`} opacity="0.85" />
      </g>
      {/* المنقار */}
      <path d="M50,23 L42,26 Q41,27 42,28 L50,29 Z" fill={p.beak} />
      {/* العين */}
      <circle cx="54" cy="22" r="3.6" fill="#FFFFFF" />
      <g className="bird-eye">
        <circle cx="53.6" cy="22" r="2.2" fill="#0A0A12" />
        <circle cx="52.9" cy="21.2" r="0.8" fill="#FFFFFF" />
      </g>
    </>
  );
}

const SVGS: Record<BirdId, (props: Props) => React.JSX.Element> = {
  falcon: FalconSVG,
  hoopoe: HoopoeSVG,
  swan: SwanSVG,
  raven: RavenSVG,
  peacock: PeacockSVG,
  phoenix: PhoenixSVG,
};

export default function Bird({ id, size = 96, className = "", animate = true, theme: themeOverride }: {
  id?: string;
  size?: number;
  className?: string;
  animate?: boolean;
  theme?: "dark" | "light";
}) {
  const watched = useTheme();
  const theme = themeOverride ?? watched;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const meta = getBird(id);
  const p = meta.palette[theme];
  const Svg = SVGS[meta.id];
  return (
    <div
      className={className}
      style={{ width: size, height: size, filter: `drop-shadow(0 5px 16px ${p.glow})`, flexShrink: 0 }}
      role="img"
      aria-label={meta.name}
    >
      <svg viewBox="0 0 120 120" className={`bird ${animate ? "bird-bob" : ""}`} width="100%" height="100%">
        <Svg p={p} uid={uid} />
      </svg>
    </div>
  );
}
