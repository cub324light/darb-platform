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

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'مفتاح API غير مضبوط في بيئة الخادم' });
    }

    try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt.trim() }
                ],
                max_tokens: 400
            })
        });

        const data = await groqRes.json();

        if (!groqRes.ok) {
            return res.status(502).json({
                error: `خطأ من Groq: ${data?.error?.message || groqRes.status}`
            });
        }

        const text = data?.choices?.[0]?.message?.content;

        if (!text) {
            return res.status(502).json({ error: 'لم يرجع رد من الذكاء الاصطناعي' });
        }

        return res.status(200).json({ text });
    } catch (error) {
        return res.status(500).json({ error: `خطأ في السيرفر: ${error.message}` });
    }
}
