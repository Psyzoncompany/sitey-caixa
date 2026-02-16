export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY não configurada no ambiente do servidor.'
    });
  }

  const { model, payload } = req.body || {};
  if (!model || !payload) {
    return res.status(400).json({
      error: 'Parâmetros obrigatórios ausentes: model e payload.'
    });
  }

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (error) {
    return res.status(502).json({
      error: 'Falha ao conectar com a API Gemini.',
      details: error?.message || String(error)
    });
  }
}
