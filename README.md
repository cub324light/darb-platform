<div align="center">

<img src="public/icon-512.png" width="112" height="112" alt="شعار درب" />

# درب · Darb

**المنصة التعليمية التي تعاملك كأخ**

تأسيس حقيقي للقدرات والتحصيلي وأرامكو CPC — يبني خطتك، يلتزم معك، ويوصّلك.

<br/>

[![CI](https://github.com/cub324light/darb-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/cub324light/darb-platform/actions/workflows/ci.yml)
&nbsp;
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
&nbsp;
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
&nbsp;
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
&nbsp;
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

<div dir="rtl">

## ✨ المميزات

- **تسعة مسارات** عبر ثلاث مراحل، مع دعم تفعيل أكثر من مسار في آنٍ واحد:
  - الثانوية — التحصيلي · التحصيلي المبكر
  - بعد الثانوية — القدرات · أرامكو CPC · ITC
  - الإنجليزي — آيلتس · ستيب · توفل · دوليجو
- **الخريطة التفاعلية** — تأسيس ← تدريب ← تسريبات، مع نقاط مراجعة كل ربع
- **أوربت** — تايمر تركيز ٥٠/١٠ مع إحصائيات حقيقية ونظام فضة
- **خزنة الأخطاء** — سجّل أخطاءك وراجعها قبل الاختبار، مع شرح كل خطأ بالذكاء الاصطناعي
- **بنك المراجعة** — تكرار متباعد بخوارزمية SM-2 + توليد أسئلة تدريب
- **دويرب (مساعد ذكي)** — يبني جدول يومك حول مشاغيلك، ويستخرج مواضيع المنهج من صورة أو ملف PDF
- **ستريك يومي 🔥** وإحصائيات حقيقية بلا أرقام وهمية
- **وضع ليلي ونهاري** مع سماء متحركة (نجوم وشهب ليلاً، شمس وطيور نهاراً)
- **تقويم هجري وميلادي** لتحديد يوم الاختبار
- **مزامنة سحابية** عبر Firebase — بياناتك على كل أجهزتك
- **لوحة إدارة** محمية لمتابعة المستخدمين وتقدّمهم

## 🛠 التقنيات

| الطبقة | الأدوات |
|---|---|
| الواجهة | Next.js 16 (App Router) · React 19 · TypeScript صارم |
| التصميم | Tailwind CSS v4 · RTL بالكامل · خطوط مستضافة ذاتياً (Cairo · IBM Plex Mono) عبر `next/font` |
| البيانات | Firebase Auth + Firestore · مزامنة تلقائية + localStorage |
| الذكاء | Groq API — نص (Llama 3.3 70B) ورؤية (Llama 4 Scout) |
| النشر | Vercel |

## 🚀 التشغيل محلياً

```bash
npm install
npm run dev
```

ثم افتح [`http://localhost:3000`](http://localhost:3000).

### 🔑 متغيرات البيئة

| المتغير | الوظيفة |
|---|---|
| `GROQ_API_KEY` | مفتاح الذكاء الاصطناعي — إلزامي لدويرب |
| `ADMIN_PASS` | كلمة سر لوحة الإدارة `/admin` |
| `FIREBASE_SERVICE_ACCOUNT` | بيانات اعتماد السيرفر — للوحة الإدارة فقط |

## 🔄 التكامل المستمر والنشر

- **CI** — كل `push` وكل Pull Request على `main` يشغّل فحص `lint` و`build` تلقائياً عبر GitHub Actions (`.github/workflows/ci.yml`).
- **النشر** — متصل بـ Vercel: كل دمج في `main` يُنشر تلقائياً، وكل فرع يحصل على معاينة (Preview Deployment).

</div>

---

<div align="center">

صُنع بـ 💙 في السعودية

</div>
