import fs from 'node:fs';
import path from 'node:path';

const SITE_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSiteContext = '';
let cachedAt = 0;

function stripHtml(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildSiteContext() {
    const now = Date.now();
    if (cachedSiteContext && now - cachedAt < SITE_CACHE_TTL_MS) return cachedSiteContext;

    const publicDir = path.join(process.cwd(), 'public');
    const allowedFiles = fs
        .readdirSync(publicDir)
        .filter((file) => /\.(html|js)$/i.test(file) && !['server.js', 'package-lock.json'].includes(file));

    const snippets = [];
    allowedFiles.forEach((file) => {
        try {
            const raw = fs.readFileSync(path.join(publicDir, file), 'utf8');
            const cleaned = stripHtml(raw).slice(0, 1200);
            if (cleaned) snippets.push(`[PÁGINA: ${file}] ${cleaned}`);
        } catch (error) {
            console.error(`Falha ao ler ${file}:`, error);
        }
    });

    cachedSiteContext = snippets.join('\n\n').slice(0, 14000);
    cachedAt = now;
    return cachedSiteContext;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const {
        message,
        mode = 'normal',
        history = [],
        context = '',
        image = null,
        includeSiteContext = false,
        thinkingTimeMs = 0
    } = req.body;

    if ((typeof message !== 'string' || !message.trim()) && !(image && image.base64 && image.mimeType)) {
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

    const boundedThinkingMs = Math.max(0, Math.min(Number(thinkingTimeMs) || 0, 10000));
    const reflectionInstruction = boundedThinkingMs
        ? `REFLEXÃO GUIADA: use até ${Math.round(boundedThinkingMs / 1000)} segundos para refletir internamente antes de responder, mas entregue somente a resposta final.`
        : '';

    try {
        if (boundedThinkingMs > 0) await sleep(boundedThinkingMs);

        const siteContext = includeSiteContext ? buildSiteContext() : '';

        const systemPrompt = `Você é o PSYZON AI, assistente da Psyzon. Responda em português brasileiro.
Você pode responder QUALQUER pergunta, não apenas sobre negócios.
Nunca invente dados. Se não tiver o dado em contexto, peça para o usuário verificar a aba correspondente.
Use o contexto financeiro, o [CONTEÚDO DA PÁGINA] e o [MAPA COMPLETO DO SITE] quando eles forem fornecidos.
Nunca comece com "Com base no contexto..." ou "Considerando os dados...".
1 emoji no início da resposta, sem exagerar.
Quando o usuário pedir sugestão de metas ou planejamento, analise o contexto financeiro recebido e sugira:
- Meta de receita mínima para o próximo mês (baseada no lucro atual + custos fixos)
- Limite de gastos empresariais recomendado
- Quantidade mínima de peças a produzir para cobrir os custos
- 1 ação prioritária para reduzir o risco atual
Apresente as metas em formato visual com emojis e valores específicos em R$.
${modeInstructions[mode] || modeInstructions.normal}
${reflectionInstruction}`;

        const baseMessage = typeof message === 'string' ? message : '';
        const compositeContext = [
            context ? `[CONTEÚDO DA PÁGINA]\n${context}` : '',
            siteContext ? `[MAPA COMPLETO DO SITE]\n${siteContext}` : ''
        ].filter(Boolean).join('\n\n');

        const messageWithContext = `${compositeContext ? `${compositeContext}\n\n` : ''}${baseMessage || '[Imagem enviada para análise]'}`;
        const safeHistory = Array.isArray(history) ? history.slice(-20) : [];
        const hasImage = image && image.base64 && image.mimeType;
        const userMessage = hasImage
            ? {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } },
                    { type: 'text', text: messageWithContext }
                ]
            }
            : { role: 'user', content: messageWithContext };

        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: hasImage ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile',
                messages: [{ role: 'system', content: systemPrompt }, ...safeHistory, userMessage],
                max_tokens: 2048,
                temperature: 0.65
            })
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
