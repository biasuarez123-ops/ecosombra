/**
 * Gerenciamento de Sessão e Estado do Usuário no Frontend
 */

let currentUser = null;

async function checkAuthStatus() {
  try {
    const data = await authAPI.me();
    currentUser = data.autenticado ? data.usuario : null;
    renderUserNav();
    return currentUser;
  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
    currentUser = null;
    renderUserNav();
    return null;
  }
}

function renderUserNav() {
  const container = document.getElementById('userNavContainer');
  if (!container) return;

  if (currentUser) {
    const isAdmin = currentUser.papel === 'admin';
    const badgeRole = isAdmin
      ? '<span class="badge bg-danger ms-1">Admin</span>'
      : '<span class="badge bg-success ms-1">Colaborador</span>';

    container.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <span class="text-white small d-none d-md-inline">
          👤 <strong>${escapeHtml(currentUser.nome)}</strong> ${badgeRole}
        </span>
        <button class="btn btn-warning btn-sm fw-bold" onclick="openCreateModal()">
          + Novo Local
        </button>
        <button class="btn btn-outline-light btn-sm" onclick="handleLogout()">
          Sair
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <a href="login.html" class="btn btn-light btn-sm fw-bold">
        Entrar / Cadastrar
      </a>
    `;
  }
}

async function handleLogout() {
  if (confirm('Deseja realmente sair da sua conta?')) {
    try {
      await authAPI.logout();
      currentUser = null;
      window.location.reload();
    } catch (err) {
      alert('Erro ao sair: ' + err.message);
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
