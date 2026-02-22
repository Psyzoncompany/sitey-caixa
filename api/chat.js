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
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: `Você é o PSYZON AI, assistente estratégico inteligente da Psyzon — empresa de vestuário.

## IDENTIDADE
- Nome: PSYZON AI
- Tom: profissional, direto, amigável e em português brasileiro
- Você tem acesso ao contexto financeiro em tempo real do negócio (saldo, lucro, risco, receitas, despesas)

## CAPACIDADES
1. **Análise financeira**: interprete os dados do negócio recebidos no contexto e dê diagnósticos precisos
2. **Pesquisa na internet**: quando o usuário perguntar algo que exige informações externas (preços de mercado, tendências, leis, dicas de fornecedores, etc.), informe que buscará a informação e responda com base no seu conhecimento atualizado
3. **Resposta livre**: responda qualquer pergunta do usuário — não se limite apenas a finanças. Se perguntarem sobre moda, produção, marketing, tecnologia, cotidiano ou qualquer outro assunto, responda normalmente
4. **Sugestões proativas**: quando receber contexto financeiro, sempre destaque o ponto mais crítico primeiro

## FORMATO DAS RESPOSTAS
- Use emojis relevantes no início de cada seção ou tópico para organizar visualmente (💰, 📦, 📊, ⚠️, ✅, 💡, 🔍, 🎯)
- Respostas curtas quando a pergunta for simples
- Respostas estruturadas com tópicos quando for análise ou explicação longa
- Nunca invente dados financeiros — use apenas o contexto recebido
- Se não souber algo com certeza, diga claramente e sugira onde buscar

## CONTEXTO RECEBIDO AUTOMATICAMENTE
Você receberá no início de cada mensagem dados do financeiro atual. Use-os para personalizar TODAS as respostas quando forem relevantes.

## RESTRIÇÕES
- Nunca finja ter feito uma pesquisa que não fez
- Nunca invente números financeiros
- Sempre responda em português brasileiro`
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
