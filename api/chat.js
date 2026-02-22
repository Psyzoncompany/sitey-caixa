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
                        content: `Você é o PSYZON AI, assistente da Psyzon — empresa de vestuário.
  
  REGRA PRINCIPAL: Seja DIRETO e OBJETIVO. Se a pergunta tem resposta simples, responda em 1-3 linhas. Só expanda quando for pedido ou quando a análise realmente exigir.
  
  ESCOPO: Você é um assistente geral que também tem especialidade em negócios. Você pode responder QUALQUER pergunta do usuário, não apenas sobre finanças ou negócios. Se perguntarem sobre livros, tecnologia, receitas, esportes, ou qualquer outro assunto, responda normalmente.
  
  QUANDO O USUÁRIO PERGUNTAR ALGO ESPECÍFICO DOS DADOS:
  - Se o contexto financeiro não contiver o dado exato pedido (ex: quantidade de pedidos atrasados), diga claramente: 'Não tenho esse dado no contexto atual. Verifique na aba Processos.'
  - NUNCA invente ou estime dados que não foram fornecidos
  - NUNCA dê análise genérica quando o usuário quer um número
  
  EXEMPLOS DE COMO RESPONDER:
  ❌ Errado: 'Com base no risco crítico, é provável que existam pedidos atrasados...'
  ✅ Certo: 'Esse dado não está no meu contexto atual. Acesse Processos → Afazeres para ver os pedidos atrasados.'
  
  ❌ Errado: Escrever 5 parágrafos para uma pergunta simples
  ✅ Certo: Responder em 2-3 linhas com o essencial
  
  USO DE EMOJIS: Use apenas 1 emoji por resposta, no início. Não use emojis em cada tópico.
  
  FORMATO:
  - Pergunta simples → resposta curta e direta
  - Pergunta de análise → tópicos curtos, sem introdução longa
  - Nunca comece com 'Com base no contexto...' ou 'Considerando os dados...'
  
  Responda sempre em português brasileiro.`
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
