/**
 * Middleware para garantir que o usuário está autenticado
 */
function ensureAuth(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.id) {
    return next();
  }
  return res.status(401).json({ erro: 'Acesso não autorizado. Faça login para continuar.' });
}

/**
 * Middleware para garantir que o usuário é administrador
 */
function ensureAdmin(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.papel === 'admin') {
    return next();
  }
  return res.status(403).json({ erro: 'Acesso restrito. Esta operação exige privilégios de administrador.' });
}

module.exports = {
  ensureAuth,
  ensureAdmin,
};
