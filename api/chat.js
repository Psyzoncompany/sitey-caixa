module.exports = async function (req, res) {
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        const body = req.body || {};

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || "Erro na Anthropic" });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Erro na API do chat:', error);
        return res.status(500).json({ error: 'Erro ao processar a solicitação.', details: error.message });
    }
};
