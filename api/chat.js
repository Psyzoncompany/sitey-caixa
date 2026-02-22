export default async function handler(req, res) {
    // Apenas POST é permitido
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Campo "message" é obrigatório' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Chave da API Groq não configurada no servidor' });
    }

    try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [
                    {
                        role: 'system',
                        content: `Você é o assistente estratégico da Psyzon, uma empresa de vestuário. 
Seu papel é ajudar o gestor com análises financeiras, dicas de produção, controle de custos e estratégias de negócio.
Responda sempre em português brasileiro, de forma clara, objetiva e prática.
Quando receber contexto financeiro do negócio, use-o para dar conselhos personalizados.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 1024,
                temperature: 0.7,
            }),
        });

        if (!groqResponse.ok) {
            const errorData = await groqResponse.json();
            console.error('Erro da API Groq:', errorData);
            return res.status(groqResponse.status).json({
                error: errorData?.error?.message || 'Erro ao chamar a API Groq'
            });
        }

        const data = await groqResponse.json();
        const content = data?.choices?.[0]?.message?.content || 'Não obtive resposta.';

        return res.status(200).json({ content });

    } catch (error) {
        console.error('Erro interno:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}