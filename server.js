require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// Armazenamento em memória para o histórico de cada sessão
const sessionHistories = {};

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

app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  // Validação básica
  if (!sessionId || !message) {
    console.error('Erro: sessionId ou message não fornecidos', { sessionId, message });
    return res.status(400).json({ reply: 'Ô mona, faltou mandar o babado direitinho! Tenta de novo.' });
  }

  // Verifica se a chave da API está configurada
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_CHAVE_API_AQUI') {
    console.error('Erro: Chave da API do Gemini não configurada');
    return res.status(500).json({ reply: 'Ô mona, a chave do sistema tá dando kaô! Configura direitinho e tenta de novo.' });
  }

  // Inicializa o histórico para a sessão, se não existir
  if (!sessionHistories[sessionId]) {
    sessionHistories[sessionId] = [];
  }

  // Adiciona a mensagem do usuário ao histórico
  sessionHistories[sessionId].push({ role: 'user', parts: [{ text: message }] });

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] }, // Prompt do sistema como mensagem do usuário
          ...sessionHistories[sessionId]
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Verifica se a resposta contém os dados esperados
    if (!response.data.candidates || !response.data.candidates[0].content.parts[0].text) {
      console.error('Erro: Resposta da API do Gemini não contém candidates ou text', response.data);
      return res.status(500).json({ reply: 'Ô mona, o sistema tá confuso com a resposta da API! Tenta de novo.' });
    }

    const reply = response.data.candidates[0].content.parts[0].text;
    // Adiciona a resposta do bot ao histórico
    sessionHistories[sessionId].push({ role: 'model', parts: [{ text: reply }] });
    res.json({ reply });
  } catch (error) {
    console.error('Erro na API do Gemini:', {
      message: error.message,
      response: error.response ? error.response.data : null,
      status: error.response ? error.response.status : null
    });
    res.status(500).json({ reply: 'Ô mona, deu um kaô no sistema! Tenta de novo, vai!' });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});