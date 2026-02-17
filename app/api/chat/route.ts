import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { messages?: Message[] };
    const messages = body?.messages ?? [];

    if (!messages.length) {
      return NextResponse.json(
        { error: 'Nenhuma mensagem recebida.' },
        { status: 400 }
      );
    }

    const prompt = messages
      .map((message) => `${message.role === 'user' ? 'Usuário' : 'Assistente'}: ${message.content}`)
      .join('\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error('Erro na API do chat:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação.' },
      { status: 500 }
    );
  }
}
