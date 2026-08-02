# نشرُ سجلّات DNS-AID لدرب — تعليماتُ Cloudflare

> **لماذا هذا ملفُّ تعليماتٍ لا كود؟**
> DNS-AID اكتشافٌ على طبقة الـDNS لا على طبقة التطبيق. لا يستطيع مستودعُ درب
> ولا Vercel نشرَ هذه السجلّات: تُنشَر في منطقة `usedarb.com` عند مزوّد الـDNS.
> فلا نزعم أنها منشورة، ولا نضع في الكود ما يوهم بذلك.

- المرجع: [draft-mozleywilliams-dnsop-dnsaid](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/)
- صيغةُ السجلّ: [RFC 9460](https://www.rfc-editor.org/rfc/rfc9460) (SVCB/HTTPS)

---

## ١) السجلّات المطلوبة

سجلّان بوضع الخدمة (**ServiceMode**، أي أولويّةٌ ≥ 1؛ الصفرُ وضعُ الاسم البديل
AliasMode ولا يحمل معاملات):

```dns
; فهرسُ الاكتشاف العام — يقود الوكيل إلى فهرس الواجهات
_index._agents.usedarb.com. 3600 IN SVCB 1 usedarb.com. (
                                     alpn="h2,h3"
                                     endpoint="/.well-known/api-catalog" )

; اكتشافُ التخاطب بين الوكلاء (A2A) — يقود إلى بطاقة الوكيل
_a2a._agents.usedarb.com.   3600 IN SVCB 1 usedarb.com. (
                                     alpn="h2,h3"
                                     endpoint="/.well-known/agent-card.json" )
```

كلا الهدفين مخدومٌ فعلاً اليوم على `https://usedarb.com` — تحقّق قبل النشر:

```bash
curl -sI https://usedarb.com/.well-known/api-catalog       # 200 · application/linkset+json
curl -sI https://usedarb.com/.well-known/agent-card.json   # 200 · application/json
```

### ⚠ تحقّق من هذا قبل النشر
معامل `endpoint` **لم يُسجَّل بعد** في سجلّ IANA لمعاملات SVCB؛ هو من المسوّدة.
فإن رفضت Cloudflare الاسمَ النصّي، أدخِله بالصيغة العامّة `keyNNNNN="…"` برقم
المفتاح الذي تحدّده المسوّدة في نسختها السارية. **لا تخترع رقماً** — راجع
المسوّدة وقتَ النشر، فإن لم يكن الرقمُ مخصَّصاً بعدُ فأجّل السجلّين: سجلٌّ بمعاملٍ
مجهولٍ يتجاهله الوكيلُ في أحسن الأحوال.

---

## ٢) الإدخال في Cloudflare

**DNS → Records → Add record**

| الحقل | `_index._agents` | `_a2a._agents` |
|---|---|---|
| Type | `SVCB` | `SVCB` |
| Name | `_index._agents` | `_a2a._agents` |
| Priority | `1` | `1` |
| Target | `usedarb.com` | `usedarb.com` |
| Params | `alpn="h2,h3" endpoint="/.well-known/api-catalog"` | `alpn="h2,h3" endpoint="/.well-known/agent-card.json"` |
| TTL | `3600` | `3600` |
| Proxy | **DNS only** (رماديّ) — سجلّات SVCB لا تُوجَّه عبر الوكيل | نفسه |

بالـAPI بدل الواجهة:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "type": "SVCB",
        "name": "_index._agents.usedarb.com",
        "ttl": 3600,
        "data": {
          "priority": 1,
          "target": "usedarb.com",
          "value": "alpn=\"h2,h3\" endpoint=\"/.well-known/api-catalog\""
        }
      }'
```

> الرمز يحتاج صلاحية **Zone → DNS → Edit** على `usedarb.com` وحدها.

---

## ٣) DNSSEC — شرطٌ لا اختيار

المسوّدة توجب توقيعَ منطقة الاكتشاف حتى تُعيد المحلِّلاتُ المتحقِّقة بياناتٍ
موثَّقة؛ وبغيره يُهمل الوكيلُ الحَذِرُ السجلَّين.

1. Cloudflare → **DNS → Settings → DNSSEC → Enable DNSSEC**.
2. انسخ سجلَّ الـ**DS** الذي تعرضه Cloudflare (Key Tag · Algorithm · Digest Type · Digest).
3. أدخِله عند **مُسجِّل النطاق** (حيث اشتُري `usedarb.com`) في قسم DNSSEC.
4. انتظر انتشارَ التفويض ثم تحقّق:

```bash
dig +dnssec _index._agents.usedarb.com SVCB    # يجب أن تظهر راية «ad»
dig DS usedarb.com @1.1.1.1                    # سجلّ DS عند الأب
delv _index._agents.usedarb.com SVCB           # «fully validated»
```

إن غابت رايةُ `ad` فالتفويضُ ناقص — راجِع خطوة المُسجِّل قبل أي شيء آخر.

---

## ٤) التحقّق بعد النشر

```bash
dig _index._agents.usedarb.com SVCB +short
dig _a2a._agents.usedarb.com   SVCB +short
```

يُتوقَّع سطرٌ يبدأ بـ`1 usedarb.com.` ويليه المعاملان.

---

## ٥) ما لا يفعله هذا الملفّ

لا يُنشئ سجلّاً ولا يوقّع منطقة. إلى أن تُنفَّذ الخطواتُ أعلاه في لوحة
Cloudflare، تبقى درب **غيرَ مكتشَفةٍ عبر DNS-AID** — وهذا هو الوضع الحالي،
نقوله صراحةً ولا نُظهر خلافه في أي ملفٍّ أو بيان.
