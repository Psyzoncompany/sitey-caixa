require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

function shouldFallback(status) {
  return [402, 429].includes(Number(status));
}

async function callCroq({ apiKey, message }) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: message }]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Erro ao chamar Croq');
    error.status = response.status;
    throw error;
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  return content || 'Não obtive resposta.';
}

async function callGemini({ apiKey, message }) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.65, maxOutputTokens: 1024 }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Erro ao chamar Gemini');
    error.status = response.status;
    throw error;
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const content = parts.map((part) => part?.text || '').join('\n').trim();
  return content || 'Não obtive resposta.';
}

app.post('/api/chat', async (req, res) => {
  const { message, selectedModel = 'croq' } = req.body || {};

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Campo "message" é obrigatório' });
  }

  const preferred = String(selectedModel).toLowerCase() === 'gemini' ? 'gemini' : 'croq';
  const fallback = preferred === 'croq' ? 'gemini' : 'croq';

  const croqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const callProvider = async (provider) => {
    if (provider === 'croq') {
      if (!croqKey) {
        const error = new Error('Chave GROQ_API_KEY não configurada');
        error.status = 500;
        throw error;
      }
      return callCroq({ apiKey: croqKey, message });
    }

    if (!geminiKey) {
      const error = new Error('Chave GEMINI_API_KEY não configurada');
      error.status = 500;
      throw error;
    }

    return callGemini({ apiKey: geminiKey, message });
  };

  try {
    const content = await callProvider(preferred);
    return res.status(200).json({ content, modelUsed: preferred });
  } catch (primaryError) {
    if (!shouldFallback(primaryError?.status)) {
      return res.status(primaryError?.status || 500).json({ error: primaryError.message || 'Erro ao chamar IA' });
    }

    try {
      const content = await callProvider(fallback);
      return res.status(200).json({
        content,
        modelUsed: fallback,
        fallbackNotice: `Modelo ${preferred === 'croq' ? 'Croq' : 'Gemini'} indisponível por limite/crédito. Continuei com ${fallback === 'croq' ? 'Croq' : 'Gemini'}.`
      });
    } catch (fallbackError) {
      return res.status(fallbackError?.status || 500).json({ error: fallbackError.message || 'Erro ao chamar IA' });
    }
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
