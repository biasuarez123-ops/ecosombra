const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let dbClient = null;
let isPostgres = false;

if (process.env.DATABASE_URL) {
  isPostgres = true;
  const { Pool } = require('pg');
  const poolConfig = {
    connectionString: process.env.DATABASE_URL,
  };
  // Render / Supabase / Neon geralmente requerem SSL
  if (!process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
  dbClient = new Pool(poolConfig);
  console.log('✅ Banco de dados: Conectado via PostgreSQL');
} else {
  // Ambiente de desenvolvimento local com SQLite nativo do Node 22
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(__dirname, 'ecosombra.db');
  dbClient = new DatabaseSync(dbPath);
  console.log(`✅ Banco de dados: Conectado via SQLite local (${dbPath})`);
}

/**
 * Executa uma consulta SQL parametrizada de forma unificada
 * @param {string} text - Consulta SQL com placeholders $1, $2...
 * @param {Array} params - Parâmetros da consulta
 * @returns {Promise<{ rows: Array, rowCount: number }>}
 */
async function query(text, params = []) {
  if (isPostgres) {
    const res = await dbClient.query(text, params);
    return { rows: res.rows, rowCount: res.rowCount };
  } else {
    // Converte parâmetros booleanos para 1/0 no SQLite caso necessário
    const normalizedParams = params.map(p => typeof p === 'boolean' ? (p ? 1 : 0) : p);

    // Substitui marcadores $1, $2 pelo padrão '?' do SQLite
    const sqliteQuery = text.replace(/\$\d+/g, '?');
    const trimmed = sqliteQuery.trim();
    const isSelect = /^SELECT/i.test(trimmed);
    const hasReturning = /RETURNING/i.test(trimmed);

    const stmt = dbClient.prepare(sqliteQuery);

    if (isSelect || hasReturning) {
      const rows = stmt.all(...normalizedParams);
      return { rows: rows || [], rowCount: rows ? rows.length : 0 };
    } else {
      const result = stmt.run(...normalizedParams);
      return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  }
}

/**
 * Inicializa tabelas e insere dados iniciais (seed) com segurança
 */
async function initDb() {
  const schemaSql = isPostgres
    ? `
      CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(100) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          senha_hash VARCHAR(255) NOT NULL,
          papel VARCHAR(20) NOT NULL DEFAULT 'usuario',
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS locais_sombra (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          titulo VARCHAR(120) NOT NULL,
          descricao TEXT,
          nivel_sombra VARCHAR(20) NOT NULL CHECK(nivel_sombra IN ('pouca', 'moderada', 'muita')),
          latitude NUMERIC(10, 8) NOT NULL,
          longitude NUMERIC(11, 8) NOT NULL,
          endereco VARCHAR(255),
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
    : `
      CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          senha_hash TEXT NOT NULL,
          papel TEXT NOT NULL DEFAULT 'usuario',
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS locais_sombra (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          titulo TEXT NOT NULL,
          descricao TEXT,
          nivel_sombra TEXT NOT NULL CHECK(nivel_sombra IN ('pouca', 'moderada', 'muita')),
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          endereco TEXT,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `;

  if (isPostgres) {
    await dbClient.query(schemaSql);
  } else {
    dbClient.exec(schemaSql);
  }

  // 1. Criar Administrador Inicial via Variáveis de Ambiente (sem expor credenciais no código)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Administrador EcoSombra';

  if (adminEmail && adminPassword) {
    const existingAdmin = await query('SELECT id FROM usuarios WHERE email = $1', [adminEmail]);
    if (existingAdmin.rows.length === 0) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(adminPassword, salt);
      await query(
        'INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES ($1, $2, $3, $4)',
        [adminName, adminEmail, hash, 'admin']
      );
      console.log(`🔒 Usuário Administrador configurado com segurança a partir de .env: ${adminEmail}`);
    }
  }

  // 2. Criar Locais de Sombra Iniciais (Seed de demonstração) caso a base esteja vazia
  const countRes = await query('SELECT COUNT(*) as total FROM locais_sombra');
  const total = Number(countRes.rows[0].total || 0);

  if (total === 0) {
    // Obter um usuário autor para os pontos iniciais (o admin ou cria um)
    let autorId;
    const firstUser = await query('SELECT id FROM usuarios LIMIT 1');
    if (firstUser.rows.length > 0) {
      autorId = firstUser.rows[0].id;
    } else {
      const salt = bcrypt.genSaltSync(10);
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const hash = bcrypt.hashSync(randomSecret, salt);
      const newUser = await query(
        'INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Colaborador Inicial', 'colaborador.inicial@ecosombra.local', hash, 'usuario']
      );
      autorId = newUser.rows[0].id;
    }

    const initialShades = [
      {
        titulo: 'Bosque das Figueiras - Praça da Sé',
        descricao: 'Área com copas muito densas e bancos de madeira com sombra fresca o dia todo.',
        nivel_sombra: 'muita',
        latitude: -23.55052,
        longitude: -46.633308,
        endereco: 'Praça da Sé, Centro, São Paulo - SP'
      },
      {
        titulo: 'Parada de Ônibus Coberta com Pergolado',
        descricao: 'Abrigo urbano com cobertura verde de trepadeiras, sombra moderada.',
        nivel_sombra: 'moderada',
        latitude: -23.55325,
        longitude: -46.63581,
        endereco: 'Av. Brigadeiro Luís Antônio, São Paulo - SP'
      },
      {
        titulo: 'Muda de Ipê Amarelo - Calçada Comercial',
        descricao: 'Árvore jovem que ainda projeta pouca sombra durante o meio-dia.',
        nivel_sombra: 'pouca',
        latitude: -23.54812,
        longitude: -46.63721,
        endereco: 'Rua São Bento, Centro Histórico, São Paulo - SP'
      }
    ];

    for (const shade of initialShades) {
      await query(
        `INSERT INTO locais_sombra (usuario_id, titulo, descricao, nivel_sombra, latitude, longitude, endereco)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [autorId, shade.titulo, shade.descricao, shade.nivel_sombra, shade.latitude, shade.longitude, shade.endereco]
      );
    }
    console.log('🌳 Locais de sombra iniciais inseridos para demonstração!');
  }
}

module.exports = {
  query,
  initDb,
  isPostgres: () => isPostgres,
};
