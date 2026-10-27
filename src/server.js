const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');
require('dotenv').config();

const db = require('../database/db');
const authRoutes = require('./routes/authRoutes');
const shadeRoutes = require('./routes/shadeRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessão baseada em cookies assinados e seguros
app.use(
  cookieSession({
    name: 'ecosombra_session',
    keys: [process.env.SESSION_SECRET || 'ecosombra_segredo_padrao_para_desenvolvimento_2026'],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    sameSite: 'lax',
    httpOnly: true,
  })
);

// Servir frontend estático da pasta public
app.use(express.static(path.join(__dirname, '../public')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/locais', shadeRoutes);
app.use('/api/shades', shadeRoutes); // alias de compatibilidade

// Rota de verificação de status do servidor
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    projeto: 'EcoSombra',
    banco: db.isPostgres() ? 'PostgreSQL' : 'SQLite Local',
    data: new Date().toISOString(),
  });
});

// Inicialização do servidor e banco de dados
async function startServer() {
  try {
    await db.initDb();
    app.listen(PORT, () => {
      console.log(`🌿 EcoSombra rodando com sucesso em: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Falha crítica ao inicializar servidor/banco:', error);
    process.exit(1);
  }
}

startServer();
