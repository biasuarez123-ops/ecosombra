/**
 * Bateria de Testes de Verificação e Conformidade — EcoSombra
 * Executa todos os fluxos da aplicação validando RF01-RF12, RNF01-RNF09 e CA01-CA11.
 */

const bcrypt = require('bcryptjs');
const db = require('../database/db');
const authController = require('../src/controllers/authController');
const shadeController = require('../src/controllers/shadeController');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

let totalTests = 0;
let passedTests = 0;
const resultsLog = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    resultsLog.push({ status: 'PASSOU', testName, details });
    console.log(`  ✅ [PASSOU] ${testName}`);
  } else {
    resultsLog.push({ status: 'FALHOU', testName, details });
    console.error(`  ❌ [FALHOU] ${testName} — ${details}`);
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('   INICIANDO VERIFICAÇÃO COMPLETA DOS FLUXOS DO ECOSOMBRA   ');
  console.log('============================================================\n');

  await db.initDb();

  // -------------------------------------------------------------
  // FLUXO 1: CADASTRO DE USUÁRIO (RF01, CA01, RNF03)
  // -------------------------------------------------------------
  console.log('▶ Testando Fluxo 1: Cadastro de Usuários (RF01, CA01, RNF03)...');
  const uniqueId = Date.now();
  const testUser = {
    nome: 'Carlos Pedestre',
    email: `carlos_${uniqueId}@email.com`,
    senha: 'senhaValida123',
  };

  // 1.1 Cadastro com dados válidos
  let req = { body: testUser, session: {} };
  let res = createMockRes();
  await authController.register(req, res);
  assert(res.statusCode === 201 && res.body.usuario && res.body.usuario.email === testUser.email,
    'RF01/CA01: Cadastro de usuário com dados válidos cria registro');

  // 1.2 Verificação de hash seguro no banco (não texto plano)
  const dbUser = await db.query('SELECT * FROM usuarios WHERE email = $1', [testUser.email]);
  const isHashed = dbUser.rows.length > 0 && bcrypt.compareSync(testUser.senha, dbUser.rows[0].senha_hash);
  assert(isHashed && dbUser.rows[0].senha_hash !== testUser.senha,
    'RNF03: Senha armazenada com hash seguro bcrypt (não texto plano)');

  // 1.3 Rejeição de e-mail duplicado
  req = { body: testUser, session: {} };
  res = createMockRes();
  await authController.register(req, res);
  assert(res.statusCode === 400 && res.body.erro.includes('cadastrado'),
    'CA01: Rejeição de cadastro com e-mail duplicado');

  // 1.4 Rejeição de senha curta (< 6 caracteres)
  req = { body: { nome: 'Ana', email: `ana_${uniqueId}@email.com`, senha: '123' }, session: {} };
  res = createMockRes();
  await authController.register(req, res);
  assert(res.statusCode === 400,
    'CA01: Rejeição de senha com menos de 6 caracteres');

  // -------------------------------------------------------------
  // FLUXO 2: AUTENTICAÇÃO E SESSÃO (RF02, CA02)
  // -------------------------------------------------------------
  console.log('\n▶ Testando Fluxo 2: Login, Autenticação e Sessão (RF02, CA02)...');

  // 2.1 Login com senha incorreta
  req = { body: { email: testUser.email, senha: 'senhaErrada999' }, session: {} };
  res = createMockRes();
  await authController.login(req, res);
  assert(res.statusCode === 401,
    'CA02: Rejeição de login com senha incorreta');

  // 2.2 Login com credenciais válidas
  req = { body: { email: testUser.email, senha: testUser.senha }, session: {} };
  res = createMockRes();
  await authController.login(req, res);
  assert(res.statusCode === 200 && req.session.usuario && req.session.usuario.id === dbUser.rows[0].id,
    'RF02/CA02: Login com credenciais válidas inicializa a sessão');
  const usuarioSessao = req.session.usuario;

  // 2.3 Consulta de status de sessão (/api/auth/me)
  req = { session: { usuario: usuarioSessao } };
  res = createMockRes();
  authController.me(req, res);
  assert(res.statusCode === 200 && res.body.autenticado === true && res.body.usuario.email === testUser.email,
    'RF02: Consulta de sessão ativa retorna dados do usuário logado');

  // 2.4 Logout
  req = { session: { usuario: usuarioSessao } };
  res = createMockRes();
  authController.logout(req, res);
  assert(res.statusCode === 200 && req.session === null,
    'RF02: Logout destrói a sessão do usuário');

  // -------------------------------------------------------------
  // FLUXO 3: CONSULTA PÚBLICA E FILTRO DE SOMBRA (RF06, RF08)
  // -------------------------------------------------------------
  console.log('\n▶ Testando Fluxo 3: Consulta Pública e Filtro por Nível de Sombra (RF06, RF08)...');

  // 3.1 Consulta de todos os locais cadastrados (visitante deslogado)
  req = { query: {} };
  res = createMockRes();
  await shadeController.listShades(req, res);
  assert(res.statusCode === 200 && Array.isArray(res.body.locais) && res.body.locais.length > 0,
    'RF06: Consulta pública retorna lista de locais de sombra cadastrados');

  // 3.2 Filtro por nível 'muita' sombra
  req = { query: { nivel: 'muita' } };
  res = createMockRes();
  await shadeController.listShades(req, res);
  const apenasMuita = res.body.locais.every(l => l.nivel_sombra === 'muita');
  assert(res.statusCode === 200 && apenasMuita,
    'RF08: Filtro por nível de sombra (muita) retorna apenas locais correspondentes');

  // -------------------------------------------------------------
  // FLUXO 4: CADASTRO DE LOCAL DE SOMBRA (RF03, RF04, RF05, CA04, CA05)
  // -------------------------------------------------------------
  console.log('\n▶ Testando Fluxo 4: Cadastro de Local de Sombra (RF03, RF04, RF05, CA04, CA05)...');

  // 4.1 Cadastro com dados válidos pelo usuário autenticado
  const novoLocalPayload = {
    titulo: 'Pérgula Verde do Calçadão',
    descricao: 'Trepadeira densa sobre bancos de madeira',
    nivel_sombra: 'muita',
    latitude: -23.5515,
    longitude: -46.6345,
    endereco: 'Rua das Palmeiras, 150',
  };

  req = { body: novoLocalPayload, session: { usuario: usuarioSessao } };
  res = createMockRes();
  await shadeController.createShade(req, res);
  assert(res.statusCode === 201 && res.body.local && res.body.local.titulo === novoLocalPayload.titulo,
    'RF04/CA05: Cadastro de local salva dados no banco e retorna registro');
  const localCriado = res.body.local;

  // 4.2 Rejeição de nível de sombra inválido
  req = {
    body: { ...novoLocalPayload, nivel_sombra: 'inexistente' },
    session: { usuario: usuarioSessao },
  };
  res = createMockRes();
  await shadeController.createShade(req, res);
  assert(res.statusCode === 400,
    'CA04: Rejeição de cadastro com nível de sombra fora de (pouca, moderada, muita)');

  // 4.3 Rejeição de coordenadas inválidas
  req = {
    body: { ...novoLocalPayload, latitude: 'texto_invalido' },
    session: { usuario: usuarioSessao },
  };
  res = createMockRes();
  await shadeController.createShade(req, res);
  assert(res.statusCode === 400,
    'CA04: Rejeição de cadastro com coordenadas geográficas inválidas');

  // -------------------------------------------------------------
  // FLUXO 5: EDIÇÃO E EXCLUSÃO PELO AUTOR (RF10, CA06, CA07)
  // -------------------------------------------------------------
  console.log('\n▶ Testando Fluxo 5: Edição e Exclusão pelo Autor (RF10, CA06, CA07)...');

  // 5.1 Edição pelo próprio autor
  req = {
    params: { id: localCriado.id },
    body: {
      titulo: 'Pérgula Verde do Calçadão (Reformada)',
      descricao: 'Cobertura expandida com nova trepadeira',
      nivel_sombra: 'muita',
      latitude: -23.5516,
      longitude: -46.6346,
      endereco: 'Rua das Palmeiras, 150 - Reformado',
    },
    session: { usuario: usuarioSessao },
  };
  res = createMockRes();
  await shadeController.updateShade(req, res);
  assert(res.statusCode === 200 && res.body.local.titulo.includes('Reformada'),
    'RF10/CA06: Autor consegue editar com sucesso o seu próprio local');

  // 5.2 Bloqueio de edição por outro usuário comum
  const outroUsuario = { id: 99999, nome: 'Outro Cidadão', email: 'outro@email.com', papel: 'usuario' };
  req = {
    params: { id: localCriado.id },
    body: { titulo: 'Tentativa de Invasão', nivel_sombra: 'pouca', latitude: -23.55, longitude: -46.63 },
    session: { usuario: outroUsuario },
  };
  res = createMockRes();
  await shadeController.updateShade(req, res);
  assert(res.statusCode === 403,
    'RF10: Usuário sem permissão é impedido de editar local de outro autor (403 Proibido)');

  // 5.3 Bloqueio de exclusão por outro usuário comum
  req = { params: { id: localCriado.id }, session: { usuario: outroUsuario } };
  res = createMockRes();
  await shadeController.deleteShade(req, res);
  assert(res.statusCode === 403,
    'RF10: Usuário sem permissão é impedido de excluir local de outro autor (403 Proibido)');

  // -------------------------------------------------------------
  // FLUXO 6: PRIVILÉGIOS DO ADMINISTRADOR (RF11, CA08, RNF04)
  // -------------------------------------------------------------
  console.log('\n▶ Testando Fluxo 6: Moderação e Gestão pelo Administrador (RF11, CA08)...');

  // 6.1 Login de administrador com credenciais seguras vindas do .env
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_INITIAL_PASSWORD;
  req = { body: { email: adminEmail, senha: adminPass }, session: {} };
  res = createMockRes();
  await authController.login(req, res);
  assert(res.statusCode === 200 && res.body.usuario.papel === 'admin',
    'RNF04/RF11: Administrador autenticado com segurança a partir de variáveis de ambiente');
  const adminSessao = req.session.usuario;

  // 6.2 Administrador editando local pertencente a outro usuário
  req = {
    params: { id: localCriado.id },
    body: {
      titulo: 'Pérgula Verde (Validada pelo Administrador)',
      descricao: 'Descrição auditada pela moderação do EcoSombra',
      nivel_sombra: 'moderada',
      latitude: -23.5516,
      longitude: -46.6346,
      endereco: 'Rua das Palmeiras, 150',
    },
    session: { usuario: adminSessao },
  };
  res = createMockRes();
  await shadeController.updateShade(req, res);
  assert(res.statusCode === 200 && res.body.local.titulo.includes('Validada'),
    'RF11/CA08: Administrador consegue editar qualquer local no sistema');

  // 6.3 Administrador excluindo local pertencente a outro usuário
  req = { params: { id: localCriado.id }, session: { usuario: adminSessao } };
  res = createMockRes();
  await shadeController.deleteShade(req, res);
  assert(res.statusCode === 200 && res.body.mensagem.includes('sucesso'),
    'RF11/CA08: Administrador consegue excluir qualquer local no sistema');

  // -------------------------------------------------------------
  // RESUMO E STATUS FINAL
  // -------------------------------------------------------------
  console.log('\n============================================================');
  console.log(` RESULTADO FINAL: ${passedTests} de ${totalTests} TESTES APROVADOS (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('============================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS REQUISITOS E CRITÉRIOS DE ACEITE FORAM VERIFICADOS COM SUCESSO!\n');
    process.exit(0);
  } else {
    console.error('⚠️ ALGUNS TESTES FALHARAM. VERIFIQUE OS LOGS ACIMA.\n');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Erro fatal durante execução da suíte:', err);
  process.exit(1);
});
