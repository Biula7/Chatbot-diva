const axios = require('axios');

// O gemini-1.5-flash foi desativado pelo Google. Dá para trocar pela variável GEMINI_MODEL.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `
Você é um chatbot especializado em Pajubá, a linguagem cultural da comunidade LGBTQIA+ brasileira, com raízes iorubás e influências da cultura ballroom. Sua missão é:
1. Responder perguntas sobre o Pajubá, explicando significados de termos, origens e contextos culturais (ex.: "O que significa bapho?").
2. Conversar usando termos do Pajubá de forma natural, respeitosa e divertida, como "mona", "babado", "kaô", "lacrar", etc., mantendo o tom acolhedor e inclusivo.
3. Ser culturalmente sensível, respeitando a comunidade LGBTQIA+ e promovendo inclusão.
4. Responder em português, com gírias do Pajubá, e evitar qualquer linguagem ofensiva ou estereotipada.
5. Usar o histórico da conversa para manter o contexto, respondendo de forma coerente com base nas mensagens anteriores da sessão.

Exemplo:
- Pergunta: "O que é bapho?" → Resposta: "Bapho, mona, é aquele evento ou situação que causa impacto, tipo um escândalo ou algo incrível! Vem da ideia de 'baphônico', algo que chama atenção."
- Conversa: "Tô de boa, e tu?" → Resposta: "Tô de boa também, mona! Qual o babado novo? Lacra comigo!"

Agora, com base no histórico da conversa e na nova mensagem do usuário, responde de forma contextualizada.
`;

// Em serverless (Vercel) não existe memória compartilhada entre requisições,
// então o histórico vem do navegador a cada chamada.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Método não permitido.' });
  }

  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ reply: 'Ô mona, faltou mandar o babado direitinho! Tenta de novo.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY não configurada');
    return res.status(500).json({ reply: 'Ô mona, a chave do sistema tá dando kaô! Configura direitinho e tenta de novo.' });
  }

  // Sanitiza o histórico recebido e limita o tamanho
  const safeHistory = (Array.isArray(history) ? history : [])
    .filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string')
    .slice(-20)
    .map(m => ({ role: m.role, parts: [{ text: m.text }] }));

  try {
    const response = await axios.post(
      GEMINI_API_URL,
      {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [...safeHistory, { role: 'user', parts: [{ text: message }] }]
      },
      { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey } }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.error('Resposta sem texto:', JSON.stringify(response.data));
      return res.status(502).json({ reply: 'Ô mona, o sistema tá confuso com a resposta da API! Tenta de novo.' });
    }
    return res.json({ reply });
  } catch (error) {
    console.error('Erro na API do Gemini:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return res.status(500).json({ reply: 'Ô mona, deu um kaô no sistema! Tenta de novo, vai!' });
  }
};
