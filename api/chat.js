const SYSTEM_PROMPT = `أنت مساعد ذكي لمنصة "درب" التعليمية السعودية. تخصصك حصري في:
- اختبار أرامكو (CPC) وبرامج الابتعاث
- اختبار القدرات (قياس)
- اختبار التحصيلي (قياس)
- نصائح الدراسة والتحضير

قواعدك:
- ردودك باللغة العربية دائماً
- إذا سألك المستخدم عن شيء خارج هذه المواضيع، أعده بلطف للمحور التعليمي
- كن محفزاً وواضحاً وموجزاً
- لا تتجاوز 200 كلمة في الرد الواحد`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'السؤال فارغ' });
    }

    if (prompt.length > 1000) {
        return res.status(400).json({ error: 'السؤال طويل جداً' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;

    if (!apiKey) {
        return res.status(500).json({ error: 'مفتاح API غير مضبوط في بيئة الخادم' });
    }

    try {
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: [{ parts: [{ text: prompt.trim() }] }]
                })
            }
        );

        const data = await geminiRes.json();

        if (!geminiRes.ok) {
            return res.status(502).json({
                error: `خطأ من Gemini: ${data?.error?.message || geminiRes.status}`
            });
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return res.status(502).json({ error: 'لم يرجع رد من الذكاء الاصطناعي' });
        }

        return res.status(200).json({ text });
    } catch (error) {
        return res.status(500).json({ error: `خطأ في السيرفر: ${error.message}` });
    }
}
