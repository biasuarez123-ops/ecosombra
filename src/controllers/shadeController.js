const db = require('../../database/db');

const NIVEIS_SOMBRA_VALIDOS = ['pouca', 'moderada', 'muita'];

/**
 * Listagem de todos os locais de sombra (RF06, RF08)
 */
async function listShades(req, res) {
  try {
    const { nivel } = req.query;
    let sql = `
      SELECT ls.*, u.nome AS autor_nome, u.email AS autor_email
      FROM locais_sombra ls
      JOIN usuarios u ON ls.usuario_id = u.id
    `;
    const params = [];

    if (nivel && NIVEIS_SOMBRA_VALIDOS.includes(nivel)) {
      sql += ' WHERE ls.nivel_sombra = $1';
      params.push(nivel);
    }

    sql += ' ORDER BY ls.criado_em DESC';

    const resultado = await db.query(sql, params);
    return res.status(200).json({ locais: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar locais de sombra:', error);
    return res.status(500).json({ erro: 'Falha ao buscar locais de sombra.' });
  }
}

/**
 * Consulta de um único local por ID
 */
async function getShadeById(req, res) {
  try {
    const { id } = req.params;
    const resultado = await db.query(
      `SELECT ls.*, u.nome AS autor_nome
       FROM locais_sombra ls
       JOIN usuarios u ON ls.usuario_id = u.id
       WHERE ls.id = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Local não encontrado.' });
    }

    return res.status(200).json({ local: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar local:', error);
    return res.status(500).json({ erro: 'Falha ao buscar detalhes do local.' });
  }
}

/**
 * Cadastro de novo local de sombra (RF03, RF04, RF05, CA04, CA05)
 */
async function createShade(req, res) {
  try {
    const { titulo, descricao, nivel_sombra, latitude, longitude, endereco } = req.body;
    const usuario = req.session.usuario;

    // Validações obrigatórias
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ erro: 'O título do local é obrigatório.' });
    }

    if (!nivel_sombra || !NIVEIS_SOMBRA_VALIDOS.includes(nivel_sombra)) {
      return res.status(400).json({ erro: 'Selecione um nível de sombra válido: pouca, moderada ou muita.' });
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({ erro: 'Coordenadas geográficas (latitude e longitude) inválidas.' });
    }

    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return res.status(400).json({ erro: 'Coordenadas fora dos limites geográficos aceitáveis.' });
    }

    const resultado = await db.query(
      `INSERT INTO locais_sombra (usuario_id, titulo, descricao, nivel_sombra, latitude, longitude, endereco)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        usuario.id,
        titulo.trim(),
        descricao ? descricao.trim() : null,
        nivel_sombra,
        latNum,
        lonNum,
        endereco ? endereco.trim() : null,
      ]
    );

    const novoLocal = resultado.rows[0];
    novoLocal.autor_nome = usuario.nome;

    return res.status(201).json({
      mensagem: 'Local de sombra cadastrado com sucesso!',
      local: novoLocal,
    });
  } catch (error) {
    console.error('Erro ao cadastrar local de sombra:', error);
    return res.status(500).json({ erro: 'Falha interna ao salvar o local de sombra.' });
  }
}

/**
 * Edição de local de sombra (RF10, RF11, CA06, CA08)
 */
async function updateShade(req, res) {
  try {
    const { id } = req.params;
    const { titulo, descricao, nivel_sombra, latitude, longitude, endereco } = req.body;
    const usuario = req.session.usuario;

    // Busca o local existente
    const busca = await db.query('SELECT * FROM locais_sombra WHERE id = $1', [id]);
    if (busca.rows.length === 0) {
      return res.status(404).json({ erro: 'Local não encontrado.' });
    }

    const localAtual = busca.rows[0];

    // Verificação de permissão: Autor ou Administrador (RF10 e RF11)
    const isAdmin = usuario.papel === 'admin';
    const isAutor = Number(localAtual.usuario_id) === Number(usuario.id);

    if (!isAdmin && !isAutor) {
      return res.status(403).json({ erro: 'Você não tem permissão para editar este local.' });
    }

    // Validações
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ erro: 'O título do local é obrigatório.' });
    }

    if (!nivel_sombra || !NIVEIS_SOMBRA_VALIDOS.includes(nivel_sombra)) {
      return res.status(400).json({ erro: 'Nível de sombra inválido (deve ser: pouca, moderada ou muita).' });
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({ erro: 'Coordenadas geográficas inválidas.' });
    }

    const resultado = await db.query(
      `UPDATE locais_sombra
       SET titulo = $1, descricao = $2, nivel_sombra = $3, latitude = $4, longitude = $5, endereco = $6
       WHERE id = $7
       RETURNING *`,
      [
        titulo.trim(),
        descricao ? descricao.trim() : null,
        nivel_sombra,
        latNum,
        lonNum,
        endereco ? endereco.trim() : null,
        id,
      ]
    );

    const localAtualizado = resultado.rows[0];
    localAtualizado.autor_nome = usuario.nome;

    return res.status(200).json({
      mensagem: 'Local de sombra atualizado com sucesso!',
      local: localAtualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar local:', error);
    return res.status(500).json({ erro: 'Falha interna ao atualizar o local.' });
  }
}

/**
 * Exclusão de local de sombra (RF10, RF11, CA07, CA08)
 */
async function deleteShade(req, res) {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    const busca = await db.query('SELECT * FROM locais_sombra WHERE id = $1', [id]);
    if (busca.rows.length === 0) {
      return res.status(404).json({ erro: 'Local não encontrado.' });
    }

    const localAtual = busca.rows[0];

    // Verificação de permissão: Autor ou Administrador
    const isAdmin = usuario.papel === 'admin';
    const isAutor = Number(localAtual.usuario_id) === Number(usuario.id);

    if (!isAdmin && !isAutor) {
      return res.status(403).json({ erro: 'Você não tem permissão para excluir este local.' });
    }

    await db.query('DELETE FROM locais_sombra WHERE id = $1', [id]);

    return res.status(200).json({ mensagem: 'Local de sombra excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir local:', error);
    return res.status(500).json({ erro: 'Falha interna ao excluir o local.' });
  }
}

module.exports = {
  listShades,
  getShadeById,
  createShade,
  updateShade,
  deleteShade,
};
