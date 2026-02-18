'use client';

import { FormEvent, useMemo, useState } from 'react';

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const MAX_CONTEXT_MESSAGES = 12;
const CLIENT_TIMEOUT_MS = 50_000;
const RETRYABLE_STATUS = new Set([429, 503, 504]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeParseJson(response: Response) {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function callChatApi(messages: ChatMessage[], accessToken?: string): Promise<string> {
  const trimmedMessages = messages
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => ({ role: message.role, content: message.content.trim() }))
    .filter((message) => message.content.length > 0);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ messages: trimmedMessages }),
        signal: controller.signal,
      });

      const data = await safeParseJson(response);

      if (response.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente para continuar.');
      }

      if (RETRYABLE_STATUS.has(response.status) && attempt < 2) {
        const jitter = Math.floor(Math.random() * 250);
        await wait(400 * 2 ** attempt + jitter);
        continue;
      }

      if (!response.ok) {
        const errorMessage =
          data && typeof data.error === 'string'
            ? data.error
            : 'Falha na comunicação com a IA.';
        throw new Error(errorMessage);
      }

      const reply = data && typeof data.reply === 'string' ? data.reply : null;
      if (!reply) {
        throw new Error('A IA retornou uma resposta em formato inesperado.');
      }

      return reply;
    } catch (error) {
      if (attempt < 2) {
        const jitter = Math.floor(Math.random() * 250);
        await wait(400 * 2 ** attempt + jitter);
        continue;
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Erro inesperado durante a requisição.');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('Não foi possível completar a requisição para a IA.');
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await callChatApi(nextMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado.';
      setMessages((prev) => [...prev, { role: 'assistant', content: `Erro: ${message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto flex h-screen w-full max-w-4xl flex-col px-4 py-6 md:px-6">
        <header className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 backdrop-blur">
          <h1 className="text-xl font-semibold md:text-2xl">Chat com Google Gemini</h1>
          <p className="mt-1 text-sm text-zinc-400">Next.js 14 + API Route segura + Tailwind Dark UI</p>
        </header>

        <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">
              Comece a conversa enviando sua primeira mensagem.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed md:text-base ${
                  message.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'mr-auto bg-zinc-800 text-zinc-100'
                }`}
              >
                {message.content}
              </div>
            ))
          )}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-2">
          <input
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-blue-500"
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </section>
    </main>
  );
}
