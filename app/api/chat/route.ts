import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type RequestBody = {
  messages?: Message[];
  siteData?: Record<string, unknown>;
};

const SYSTEM_PROMPT = `🤖 Contexto Principal: Você é o assistente virtual financeiro e estratégico da Psyzon Company.
🏢 O dono e gestor da empresa é o Senhor Rodrigo.
👔 A marca foca em moda streetwear, produzindo camisetas com serigrafia própria e estamparia DTF. 👕🎨

📊 Suas Principais Funções:
💰 Analisar todo o fluxo de caixa, despesas e lucros disponíveis no sistema.
📉 Identificar gargalos financeiros e sugerir otimizações de custos.
👥 Auxiliar na gestão de tarefas da equipe (Carlos e Isabelly).
📦 Ajudar a organizar os projetos de marketing e produção de artes.

🧠 Regras de Comportamento:
🎯 Seja sempre direto, profissional e objetivo nas respostas.
🚫 Nunca invente dados. Use exclusivamente os números e informações fornecidos no contexto do site/banco de dados.
💡 Foque em soluções práticas para escalar a produção de roupas e melhorar a margem de lucro.
📌 Quando não tiver dados suficientes para responder, diga claramente: "Não tenho dados suficientes no sistema para responder isso."
💬 Responda sempre em português brasileiro.
📊 Quando fizer análises, use formatação com emojis e organização visual para facilitar a leitura.
💵 Formato de moeda: R$ (Real brasileiro). Use vírgula para decimais (ex: R$ 1.250,00).

Você tem acesso aos dados reais do sistema financeiro da empresa. Os dados serão fornecidos como contexto em cada mensagem.`;

function buildSiteDataContext(siteData: Record<string, unknown> | undefined): string {
  if (!siteData || Object.keys(siteData).length === 0) {
    return '\n[DADOS DO SISTEMA: Nenhum dado disponível no momento.]\n';
  }

  const sections: string[] = [];

  // Transactions
  if (siteData.transactions) {
    const transactions = siteData.transactions as Array<Record<string, unknown>>;
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    const balance = totalIncome - totalExpense;

    sections.push(`📊 TRANSAÇÕES (${transactions.length} lançamentos):
- Receita total: R$ ${totalIncome.toFixed(2)}
- Despesa total: R$ ${totalExpense.toFixed(2)}
- Saldo: R$ ${balance.toFixed(2)}
- Últimas 20 transações: ${JSON.stringify(transactions.slice(-20).map(t => ({
      desc: t.description,
      valor: t.amount,
      tipo: t.type,
      cat: t.category,
      escopo: t.scope,
      data: t.date,
      nome: t.name
    })))}`);
  }

  // Clients
  if (siteData.clients) {
    const clients = siteData.clients as Array<Record<string, unknown>>;
    sections.push(`👥 CLIENTES (${clients.length}):
${JSON.stringify(clients.map(c => ({ nome: c.name, id: c.id })))}`);
  }

  // Production Orders
  if (siteData.production_orders) {
    const orders = siteData.production_orders as Array<Record<string, unknown>>;
    const active = orders.filter(o => o.status !== 'done');
    sections.push(`📦 PEDIDOS DE PRODUÇÃO (${orders.length} total, ${active.length} ativos):
${JSON.stringify(active.slice(0, 15).map(o => ({
      desc: o.description,
      status: o.status,
      cliente: o.clientId,
      checklist: o.checklist
    })))}`);
  }

  // Monthly bills
  if (siteData.psyzon_accounts_db_v1) {
    const billsDb = siteData.psyzon_accounts_db_v1 as Record<string, unknown>;
    sections.push(`🏦 CONTAS MENSAIS:
${JSON.stringify(billsDb)}`);
  }

  // Budget limits
  if (siteData.business_budget_limit || siteData.personal_budget_limit) {
    sections.push(`💳 LIMITES DE ORÇAMENTO:
- Empresarial: R$ ${siteData.business_budget_limit || 'Não definido'}
- Pessoal: R$ ${siteData.personal_budget_limit || 'Não definido'}`);
  }

  // Categories
  if (siteData.incomeCategories || siteData.expenseCategories) {
    sections.push(`🏷️ CATEGORIAS:
- Receita: ${JSON.stringify(siteData.incomeCategories || [])}
- Despesa: ${JSON.stringify(siteData.expenseCategories || [])}`);
  }

  // Monthly production
  if (siteData.monthlyProduction) {
    sections.push(`🏭 PRODUÇÃO MENSAL:
${JSON.stringify(siteData.monthlyProduction)}`);
  }

  return `\n=== DADOS REAIS DO SISTEMA PSYZON ===\n${sections.join('\n\n')}\n=== FIM DOS DADOS ===\n`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const body = (await req.json()) as RequestBody;
    const messages = body?.messages ?? [];
    const siteData = body?.siteData;

    if (!messages.length) {
      return NextResponse.json(
        { error: 'Nenhuma mensagem recebida.' },
        { status: 400 }
      );
    }

    const dataContext = buildSiteDataContext(siteData);

    const fullPrompt = [
      `[INSTRUÇÕES DO SISTEMA]\n${SYSTEM_PROMPT}`,
      dataContext,
      '[CONVERSA]',
      ...messages.map(
        (m) => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
      ),
    ].join('\n\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(fullPrompt);
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
