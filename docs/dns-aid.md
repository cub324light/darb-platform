# نشرُ سجلّات DNS-AID لدرب — تعليماتُ Cloudflare

> **لماذا ملفُّ تعليماتٍ لا كود؟**
> DNS-AID اكتشافٌ على طبقة الـDNS. لا يستطيع مستودعُ درب ولا Vercel نشرَ هذه
> السجلّات: تُنشَر في منطقة `usedarb.com` عند مزوّد الـDNS. فلا نزعم أنها
> منشورة، ولا نضع في الكود ما يوهم بذلك.

- المرجع: [draft-mozleywilliams-dnsop-dnsaid](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/)
- صيغةُ السجلّ: [RFC 9460](https://www.rfc-editor.org/rfc/rfc9460) (SVCB/HTTPS)

---

## ١) السجلّ المطلوب

سجلٌّ واحدٌ في فضاء `_agents` يكفي. نستعمل **`_index`** — وهو المدخلُ العام
للاكتشاف، ويصف ما نخدمه فعلاً: خدمةُ HTTPS على المنفذ ٤٤٣.

```dns
_index._agents.usedarb.com. 3600 IN SVCB 1 usedarb.com. alpn="h2" port=443 mandatory=alpn,port
```

**بنيةُ السجلّ:** أولويّة `1` (وضعُ الخدمة ServiceMode؛ الصفرُ وضعُ الاسم
البديل ولا يحمل معاملات) · الهدف `usedarb.com.` · ثلاثةُ معاملاتٍ قياسية.

### عن `_a2a` — لا تنشره الآن
المثالُ في المواصفة يستعمل `alpn="a2a"`، وهو تصريحٌ بأن المضيف **يتكلّم
بروتوكول A2A**. ونحن ننشر بطاقةَ وكيلٍ بصيغة A2A، لكنّ نقطتنا `/mcp` تتكلّم
MCP لا A2A. فنشرُ `_a2a` يجذب عميلاً يتوقّع تدفّقاً لا نخدمه، فينكسر عندنا.
سجلُّ `_index` وحده يكفي للاكتشاف، ولا يَعِد بما ليس عندنا.

### معاملاتٌ مخصّصة
إن احتجنا مستقبلاً معاملاً من المسوّدة لم يُسجَّل في IANA، يُكتب بصيغته
الرقمية `keyNNNNN="…"` لا باسمٍ نصّي. اليوم لا نحتاج شيئاً منها: المعاملات
الثلاثة أعلاه قياسيّةٌ كلُّها.

---

## ٢) الإدخال في Cloudflare

**DNS → Records → Add record**

| الحقل | القيمة |
|---|---|
| Type | `SVCB` |
| Name | `_index._agents` |
| Priority | `1` |
| Target | `usedarb.com` |
| Value / Params | `alpn="h2" port=443 mandatory=alpn,port` |
| TTL | `3600` (أو Auto) |
| Proxy | **DNS only** (رماديّ) — سجلّات SVCB لا تُوجَّه عبر الوكيل |

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
          "value": "alpn=\"h2\" port=443 mandatory=alpn,port"
        }
      }'
```

> الرمز يحتاج صلاحية **Zone → DNS → Edit** على `usedarb.com` وحدها.

---

## ٣) DNSSEC — شرطٌ لا اختيار

المواصفة توجب توقيعَ منطقة الاكتشاف حتى تُعيد المحلِّلاتُ المتحقِّقة بياناتٍ
موثَّقة.

1. Cloudflare → **DNS → Settings → DNSSEC → Enable DNSSEC**.
2. انسخ سجلَّ الـ**DS** المعروض (Key Tag · Algorithm · Digest Type · Digest).
3. أدخِله عند **مُسجِّل النطاق** (حيث اشتُري `usedarb.com`) في قسم DNSSEC.
4. انتظر انتشارَ التفويض.

---

## ٤) التحقّق

الفاحصُ يستعلم عبر **DNS-over-HTTPS**: افتراضياً `cloudflare-dns.com/dns-query`
ثم `dns.google/resolve` عند فشل المحلِّل. فتحقّق بالطريقة نفسها:

```bash
# عبر DoH — كما يفعل الفاحصُ تماماً
curl -s 'https://cloudflare-dns.com/dns-query?name=_index._agents.usedarb.com&type=SVCB' \
     -H 'accept: application/dns-json' | jq

curl -s 'https://dns.google/resolve?name=_index._agents.usedarb.com&type=SVCB' | jq

# وبالطريقة التقليدية
dig _index._agents.usedarb.com SVCB +short
dig +dnssec _index._agents.usedarb.com SVCB   # يجب أن تظهر راية «ad»
delv _index._agents.usedarb.com SVCB          # «fully validated»
```

يُتوقَّع سطرٌ يبدأ بـ`1 usedarb.com.` ويليه المعاملات الثلاثة. وغيابُ راية
`ad` يعني أن تفويض DNSSEC ناقصٌ عند المُسجِّل — راجِع الخطوة ٣ قبل أي شيء آخر.

وللفحص الكامل:

```bash
curl -sX POST https://isitagentready.com/api/scan \
     -H 'Content-Type: application/json' \
     -d '{"url":"https://usedarb.com"}' | jq '.checks.discoverability.dnsAid'
```

الحالةُ المطلوبة: `"pass"`.

---

## ٥) ما لا يفعله هذا الملفّ

لا يُنشئ سجلّاً ولا يوقّع منطقة. إلى أن تُنفَّذ الخطوات أعلاه في لوحة
Cloudflare، تبقى درب **غيرَ مكتشَفةٍ عبر DNS-AID** — نقولها صراحةً ولا نُظهر
خلافها في أي ملفٍّ أو بيان.
