export default async function handler(req, res) {
    // Apenas POST é permitido
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message, mode = 'normal' } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Campo "message" é obrigatório' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Chave da API Groq não configurada no servidor' });
    }

    const modeInstructions = {
        normal: 'MODO NORMAL: resposta direta com contexto suficiente, 3 a 5 linhas, até 4 tópicos curtos.',
        rapido: 'MODO RÁPIDO: responda em no máximo 2 linhas. Só o essencial, sem introdução, sem lista.',
        profundo: 'MODO PROFUNDO: análise completa, mínimo 5 pontos com dados, causas, consequências e sugestões.'
    };

    try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: `Você é o PSYZON AI, assistente da Psyzon. Responda em português brasileiro.
Você pode responder QUALQUER pergunta, não apenas sobre negócios.
Nunca invente dados. Se não tiver o dado, diga onde encontrar.
Nunca comece com "Com base no contexto..." ou "Considerando os dados...".
1 emoji no início da resposta, sem exagerar.
${modeInstructions[mode] || modeInstructions.normal}`
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
