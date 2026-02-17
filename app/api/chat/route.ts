import { NextRequest, NextResponse } from 'next/server';

type MessageRole = 'system' | 'user' | 'assistant';

type Message = {
  role: MessageRole;
  content: string;
};

const GEMINI_MODEL = 'gemini-1.5-flash';
const MAX_MESSAGES = 12;
const MAX_CONTENT_LENGTH = 2_000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 45_000;

function corsHeaders() {
  const origin = process.env.ALLOWED_ORIGIN ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMessageRole(role: unknown): role is MessageRole {
  return role === 'system' || role === 'user' || role === 'assistant';
}

function sanitizeMessages(rawMessages: unknown): Message[] {
  if (!Array.isArray(rawMessages)) return [];

  return rawMessages
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const role = (item as { role?: unknown }).role;
      const content = (item as { content?: unknown }).content;

      return {
        role: isMessageRole(role) ? role : 'user',
        content: typeof content === 'string' ? content.trim().slice(0, MAX_CONTENT_LENGTH) : '',
      };
    })
    .filter((message) => message.content.length > 0)
    .slice(-MAX_MESSAGES);
}

function toGeminiPayload(messages: Message[]) {
  const systemInstruction = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n')
    .trim();

  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

  return {
    ...(systemInstruction
      ? {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
        }
      : {}),
    contents,
  };
}

async function callGeminiWithRetry(apiKey: string, payload: ReturnType<typeof toGeminiPayload>) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const raw = await response.text();
      let parsed: Record<string, unknown> | null = null;

      try {
        parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      } catch {
        parsed = null;
      }

      if ((response.status === 429 || response.status === 503 || response.status === 504) && attempt < MAX_RETRIES) {
        const jitter = Math.floor(Math.random() * 300);
        const delay = BASE_DELAY_MS * 2 ** attempt + jitter;
        await wait(delay);
        continue;
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          body: parsed,
        };
      }

      return {
        ok: true,
        status: 200,
        body: parsed,
      };
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const jitter = Math.floor(Math.random() * 300);
        const delay = BASE_DELAY_MS * 2 ** attempt + jitter;
        await wait(delay);
        continue;
      }

      return {
        ok: false,
        status: 504,
        body: { error: error instanceof Error ? error.message : 'Erro de rede com Gemini.' },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    ok: false,
    status: 429,
    body: { error: 'Limite de tentativas excedido.' },
  };
}

function extractText(body: Record<string, unknown> | null): string {
  if (!body) return '';

  const candidates = body.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';

  const first = candidates[0] as { content?: { parts?: Array<{ text?: unknown }> } };
  const parts = first.content?.parts;

  if (!Array.isArray(parts)) return '';

  const text = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  return text;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders();

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no servidor.' }, { status: 500, headers });
    }

    const body = (await req.json()) as { messages?: unknown };
    const messages = sanitizeMessages(body?.messages);

    if (!messages.length) {
      return NextResponse.json({ error: 'Nenhuma mensagem válida recebida.' }, { status: 400, headers });
    }

    const payload = toGeminiPayload(messages);
    if (!payload.contents.length) {
      return NextResponse.json({ error: 'Envie ao menos uma mensagem do usuário.' }, { status: 400, headers });
    }

    const upstream = await callGeminiWithRetry(apiKey, payload);

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: 'Falha ao processar solicitação no provedor de IA.',
          details: upstream.body,
        },
        { status: upstream.status, headers },
      );
    }

    const reply = extractText(upstream.body) || 'Não consegui gerar uma resposta agora.';

    return NextResponse.json({ reply }, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erro ao processar a solicitação.',
        details: error instanceof Error ? error.message : 'Erro inesperado.',
      },
      { status: 500, headers },
    );
  }
}
