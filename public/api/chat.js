module.exports = async (req, res) => {
    if (req.method !== "POST") {
        res.statusCode = 405;
        return res.end(JSON.stringify({ error: "Use POST" }));
    }

    try {
        const body = req.body || {};
        const message = body.message;

        if (!message || typeof message !== "string") {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "message inválida" }));
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: "GROQ_API_KEY não configurada" }));
        }

        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [{ role: "user", content: message }],
                temperature: 0.7
            })
        });

        const data = await r.json();
        res.setHeader("Content-Type", "application/json");

        if (!r.ok) {
            res.statusCode = r.status;
            return res.end(JSON.stringify({ error: "Erro Groq", details: data }));
        }

        res.statusCode = 200;
        return res.end(JSON.stringify({ content: data?.choices?.[0]?.message?.content || "" }));
    } catch (e) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: "Falha no servidor", details: String(e) }));
    }
};