// Servidor só para rodar localmente (npm start). Na Vercel quem responde é api/chat.js.
require('dotenv').config();
const path = require('path');
const express = require('express');
const chatHandler = require('./api/chat');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.post('/api/chat', chatHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
