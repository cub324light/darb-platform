export default async function handler(req, res) {
    // هذا الكود يستقبل السؤال من موقعك
    const { prompt } = req.body;
    
    // هنا نقول للسيرفر: خذ المفتاح من "الإعدادات السرية" وليس من الكود
    const API_KEY = process.env.GEMINI_API_KEY; 

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "حدث خطأ في الاتصال بجيميناي" });
    }
}
