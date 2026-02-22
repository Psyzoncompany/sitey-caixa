export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Use POST" });
    }

    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Mensagem vazia" });
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [{ role: "user", content: message }],
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";

        res.status(200).json({ content });
    } catch (err) {
        res.status(500).json({ error: "Erro no backend", details: String(err) });
    }
}