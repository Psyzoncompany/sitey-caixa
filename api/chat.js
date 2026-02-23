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

async function callAnthropic({ apiKey, systemPrompt, safeHistory, messageWithContext, image }) {
    const hasImage = image && image.base64 && image.mimeType;
    const userContent = hasImage
        ? [
            {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: image.mimeType,
                    data: image.base64
                }
            },
            { type: 'text', text: messageWithContext }
        ]
        : messageWithContext;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [...safeHistory, { role: 'user', content: userContent }]
        })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = new Error(data?.error?.message || 'Erro ao chamar a API Anthropic');
        err.status = response.status;
        throw err;
    }

    const content = Array.isArray(data?.content)
        ? data.content.filter((item) => item?.type === 'text').map((item) => item.text).join('\n').trim()
        : '';

    return content || 'Não obtive resposta.';
}

async function callGemini({ apiKey, systemPrompt, safeHistory, messageWithContext, image }) {
    const historyParts = safeHistory.map((entry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content) }]
    }));

    const userParts = [];
    if (image && image.base64 && image.mimeType) {
        userParts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
    }
    userParts.push({ text: messageWithContext });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [...historyParts, { role: 'user', parts: userParts }],
            generationConfig: { temperature: 0.65, maxOutputTokens: 2048 }
        })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = new Error(data?.error?.message || 'Erro ao chamar a API Gemini');
        err.status = response.status;
        throw err;
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const content = parts.map((part) => part?.text || '').join('\n').trim();
    return content || 'Não obtive resposta.';
}

function shouldFallback(error) {
    return [402, 429].includes(Number(error?.status));
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
        selectedModel = 'croq'
    } = req.body;

    if ((typeof message !== 'string' || !message.trim()) && !(image && image.base64 && image.mimeType)) {
        return res.status(400).json({ error: 'Campo "message" é obrigatório' });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const modeInstructions = {
        normal: 'MODO NORMAL: resposta direta com contexto suficiente, 3 a 5 linhas, até 4 tópicos curtos.',
        rapido: 'MODO RÁPIDO: responda em no máximo 2 linhas. Só o essencial, sem introdução, sem lista.',
        profundo: 'MODO PROFUNDO: análise completa, mínimo 5 pontos com dados, causas, consequências e sugestões.'
    };

    try {
        const siteContext = includeSiteContext ? buildSiteContext() : '';

        const systemPrompt = `Você é uma assistente de negócios extremamente inteligente chamada Croq IA, integrada ao sistema da empresa.
Responda sempre em português do Brasil.

CAPACIDADES:
- Responde perguntas sobre o negócio e também sobre qualquer outro assunto.
- Analisa dados, identifica padrões, antecipa riscos e sugere ações práticas.
- Faz cálculos, comparações e projeções automaticamente quando útil.

REGRAS CRÍTICAS DE DADOS:
- Sempre priorize os dados reais enviados no contexto da conversa.
- Nunca invente dados.
- Nunca diga que faltam informações sem antes varrer todo o JSON/contexto recebido.
- Se faltar parte do dado, responda com o que existe e explique exatamente o que não veio.
- Cruze dados de produção, pedidos, clientes e financeiro quando isso melhorar a resposta.

PEDIDOS DE CORTE (OBRIGATÓRIO):
- Quando existir o array "pedidosDeCorte" no contexto, ele deve ser considerado como fonte principal para perguntas de corte.
- Cada item pode conter: cliente, peca, referencia, quantidadeTotalPedida, quantidadeJaCortada, quantidadePendente, statusPedido e prazoEntrega.
- Para perguntas como "quantas camisas de Arthur Potiragua 3A faltam cortar?", procure por cliente + peça + referência e retorne o número exato da quantidadePendente.
- Se houver mais de um item compatível, some as quantidades pendentes e mostre o cálculo.

PRIORIDADES DO DIA:
- Ao pedir prioridades, ordene por: prazo mais próximo, depois maior valor, depois maior quantidade pendente.
- Informe dias restantes para cada prazo e alerte imediatamente se houver atraso.

COMUNICAÇÃO:
- Seja objetiva, direta e útil (estilo sócio de negócios experiente).
- Para perguntas simples, respostas curtas.
- Para análises, use listas e destaque os números principais.
- Em cálculos, mostre: dado bruto → cálculo → resultado final.
- Nunca use mensagens de espera/carregamento.

Dados do contexto que podem chegar na mensagem:
- [CONTEÚDO DA PÁGINA]
- [MAPA COMPLETO DO SITE]
${modeInstructions[mode] || modeInstructions.normal}`;

        const baseMessage = typeof message === 'string' ? message : '';
        const compositeContext = [
            context ? `[CONTEÚDO DA PÁGINA]\n${context}` : '',
            siteContext ? `[MAPA COMPLETO DO SITE]\n${siteContext}` : ''
        ].filter(Boolean).join('\n\n');

        const messageWithContext = `${compositeContext ? `${compositeContext}\n\n` : ''}${baseMessage || '[Imagem enviada para análise]'}`;
        const safeHistory = Array.isArray(history) ? history.slice(-20) : [];

        const preferred = String(selectedModel).toLowerCase() === 'gemini' ? 'gemini' : 'croq';
        const fallback = preferred === 'croq' ? 'gemini' : 'croq';

        const callProvider = async (provider) => {
            if (provider === 'croq') {
                if (!anthropicKey) {
                    const err = new Error('Chave da API Anthropic não configurada no servidor');
                    err.status = 500;
                    throw err;
                }
                return callAnthropic({ apiKey: anthropicKey, systemPrompt, safeHistory, messageWithContext, image });
            }
            if (!geminiKey) {
                const err = new Error('Chave da API Gemini não configurada no servidor');
                err.status = 500;
                throw err;
            }
            return callGemini({ apiKey: geminiKey, systemPrompt, safeHistory, messageWithContext, image });
        };

        try {
            const content = await callProvider(preferred);
            return res.status(200).json({ content, modelUsed: preferred });
        } catch (primaryError) {
            if (!shouldFallback(primaryError)) {
                return res.status(primaryError?.status || 500).json({ error: primaryError.message || 'Erro interno do servidor' });
            }

            const content = await callProvider(fallback);
            const fallbackNotice = `Modelo ${preferred === 'croq' ? 'Croq' : 'Gemini'} indisponível por limite/crédito. Continuei automaticamente com ${fallback === 'croq' ? 'Croq' : 'Gemini'}.`;
            return res.status(200).json({ content, modelUsed: fallback, fallbackNotice });
        }
    } catch (error) {
        console.error('Erro interno:', error);
        return res.status(error?.status || 500).json({ error: error?.message || 'Erro interno do servidor' });
    }
}
