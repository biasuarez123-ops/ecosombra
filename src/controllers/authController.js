const bcrypt = require('bcryptjs');
const db = require('../../database/db');

/**
 * Cadastro de novo usuário (RF01)
 */
async function register(req, res) {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: 'O nome é obrigatório.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ erro: 'O e-mail é obrigatório.' });
    }
    if (!senha || senha.length < 6) {
      return res.status(400).json({ erro: 'A senha deve conter pelo menos 6 caracteres.' });
    }

    const emailLimpo = email.trim().toLowerCase();

    // Verifica duplicação de e-mail (CA01)
    const existente = await db.query('SELECT id FROM usuarios WHERE email = $1', [emailLimpo]);
    if (existente.rows.length > 0) {
      return res.status(400).json({ erro: 'Este e-mail já está cadastrado no sistema.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const resultado = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, papel, criado_em`,
      [nome.trim(), emailLimpo, senhaHash, 'usuario']
    );

    const novoUsuario = resultado.rows[0];

    // Cria a sessão automaticamente após cadastro
    req.session.usuario = {
      id: novoUsuario.id,
      nome: novoUsuario.nome,
      email: novoUsuario.email,
      papel: novoUsuario.papel,
    };

    return res.status(201).json({
      mensagem: 'Cadastro realizado com sucesso!',
      usuario: req.session.usuario,
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return res.status(500).json({ erro: 'Falha interna ao realizar cadastro.' });
  }
}

/**
 * Autenticação de usuário (RF02)
 */
async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Informe o e-mail e a senha.' });
    }

    const emailLimpo = email.trim().toLowerCase();
    const busca = await db.query('SELECT * FROM usuarios WHERE email = $1', [emailLimpo]);

    if (busca.rows.length === 0) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const usuario = busca.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
    };

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso!',
      usuario: req.session.usuario,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ erro: 'Falha interna ao realizar login.' });
  }
}

/**
 * Encerramento de sessão (RF02)
 */
function logout(req, res) {
  req.session = null;
  return res.status(200).json({ mensagem: 'Logout realizado com sucesso.' });
}

/**
 * Consulta da sessão ativa
 */
function me(req, res) {
  if (req.session && req.session.usuario) {
    return res.status(200).json({
      autenticado: true,
      usuario: req.session.usuario,
    });
  }
  return res.status(200).json({
    autenticado: false,
    usuario: null,
  });
}

module.exports = {
  register,
  login,
  logout,
  me,
};
