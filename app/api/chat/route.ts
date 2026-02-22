import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: { message: 'ANTHROPIC_API_KEY não configurada no servidor.' } },
        { status: 500 }
      );
    }

    const body = await req.json();

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
      return NextResponse.json({ error: data.error || { message: "Erro na Anthropic" } }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro na API do chat:', error);
    return NextResponse.json(
      { error: { message: 'Erro ao processar a solicitação.' } },
      { status: 500 }
    );
  }
}
