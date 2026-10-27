/**
 * Controlador Principal da Interface do Usuário (UI)
 */

let allShades = [];
let currentFilter = '';
let createModalInstance = null;
let editModalInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa mapa e autenticação
  initMap();
  await checkAuthStatus();

  // Instancia modais do Bootstrap
  const createEl = document.getElementById('modalCreateShade');
  if (createEl) createModalInstance = new bootstrap.Modal(createEl);

  const editEl = document.getElementById('modalEditShade');
  if (editEl) editModalInstance = new bootstrap.Modal(editEl);

  // Carrega locais iniciais
  await loadShades();

  // Configura formulários
  setupForms();
});

/**
 * Carrega e renderiza locais de sombra do backend
 */
async function loadShades(filter = '') {
  currentFilter = filter;
  try {
    allShades = await shadesAPI.list(filter);
    updateFilterBadges();
    renderMarkers(allShades);
    renderListView(allShades);
  } catch (err) {
    console.error('Erro ao carregar locais:', err);
    showAlert('Não foi possível carregar os locais de sombra.', 'danger');
  }
}

/**
 * Renderiza a listagem estruturada em cartões (RF07)
 */
function renderListView(locais) {
  const container = document.getElementById('shadesListContainer');
  const countEl = document.getElementById('totalCountBadge');
  if (!container) return;

  if (countEl) countEl.innerText = `${locais.length} ponto(s)`;

  if (locais.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <p class="fs-4 mb-1">🍃</p>
        <p>Nenhum local de sombra encontrado para este filtro.</p>
        ${currentUser ? '<button class="btn btn-outline-success btn-sm mt-2" onclick="openCreateModal()">Cadastrar Novo Ponto</button>' : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = locais
    .map((local) => {
      const isAutor = currentUser && Number(currentUser.id) === Number(local.usuario_id);
      const isAdmin = currentUser && currentUser.papel === 'admin';
      const podeGerenciar = isAutor || isAdmin;

      let badgeClass = 'badge-sombra-moderada';
      let badgeLabel = 'Moderada Sombra';

      if (local.nivel_sombra === 'pouca') {
        badgeClass = 'badge-sombra-pouca';
        badgeLabel = 'Pouca Sombra';
      } else if (local.nivel_sombra === 'muita') {
        badgeClass = 'badge-sombra-muita';
        badgeLabel = 'Muita Sombra';
      }

      let actionsHtml = '';
      if (podeGerenciar) {
        actionsHtml = `
          <div class="mt-2 pt-2 border-top d-flex justify-content-end gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="openEditModal(${local.id})">
              ✏️ Editar
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteShade(${local.id})">
              🗑️ Excluir
            </button>
          </div>
        `;
      }

      return `
        <div class="card shade-card mb-3 shadow-sm">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <h6 class="card-title mb-0 fw-bold text-dark">${escapeHtml(local.titulo)}</h6>
              <span class="badge ${badgeClass}">${badgeLabel}</span>
            </div>
            ${local.endereco ? `<p class="small text-muted mb-1">📍 ${escapeHtml(local.endereco)}</p>` : ''}
            ${local.descricao ? `<p class="small text-secondary mb-2">${escapeHtml(local.descricao)}</p>` : ''}
            <div class="d-flex justify-content-between align-items-center small text-muted">
              <span>Por: <strong>${escapeHtml(local.autor_nome || 'Colaborador')}</strong></span>
              <button class="btn btn-link btn-sm p-0 text-success text-decoration-none fw-bold" onclick="focusOnMap(${local.latitude}, ${local.longitude})">
                Ver no mapa ➔
              </button>
            </div>
            ${actionsHtml}
          </div>
        </div>
      `;
    })
    .join('');
}

function focusOnMap(lat, lon) {
  centerMap(lat, lon, 17);
  // Muda para a aba de mapa caso esteja em telas menores
  const mapTab = document.getElementById('tab-map-button');
  if (mapTab) mapTab.click();
}

/**
 * Atualiza o estado dos botões de filtro
 */
function applyFilter(nivel) {
  document.querySelectorAll('.btn-filter').forEach((btn) => {
    btn.classList.remove('active', 'btn-dark', 'text-white');
    btn.classList.add('btn-outline-secondary');
  });

  const activeBtn = document.getElementById(`filter-${nivel || 'todos'}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'btn-dark', 'text-white');
    activeBtn.classList.remove('btn-outline-secondary');
  }

  loadShades(nivel);
}

function updateFilterBadges() {
  // Atualiza contadores caso necessário
}

/**
 * Pesquisa de Endereço (RF09, CA09)
 */
async function handleAddressSearch(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('searchAddressInput');
  const query = input ? input.value.trim() : '';

  if (!query) {
    alert('Digite um endereço, rua ou bairro para buscar.');
    return;
  }

  const searchBtn = document.getElementById('btnSearchAddress');
  if (searchBtn) searchBtn.innerHTML = '🔍 Buscando...';

  try {
    const results = await geoAPI.searchAddress(query);
    if (!results || results.length === 0) {
      alert('Nenhum endereço encontrado para: ' + query);
      return;
    }

    const first = results[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);

    centerMap(lat, lon, 16);
    setTempPin(lat, lon);

    // Sugere cadastro caso o usuário esteja logado
    if (currentUser) {
      if (confirm(`Encontrado: "${first.display_name}".\nDeseja abrir o cadastro para este local?`)) {
        openCreateModal(lat, lon, first.display_name);
      }
    }
  } catch (err) {
    alert('Erro ao buscar endereço: ' + err.message);
  } finally {
    if (searchBtn) searchBtn.innerHTML = 'Buscar';
  }
}

/**
 * Abrir Modal de Cadastro de Local (RF03, RF04)
 */
async function openCreateModal(lat = null, lon = null, endereco = '') {
  if (!currentUser) {
    alert('Você precisa estar logado para cadastrar um local.');
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('formCreateShade');
  if (form) form.reset();

  // Preenche coordenadas se fornecidas
  if (lat && lon) {
    document.getElementById('createLatitude').value = lat.toFixed(6);
    document.getElementById('createLongitude').value = lon.toFixed(6);

    if (!endereco) {
      // Tenta obter o endereço reverso para facilitar
      const enderecoSugestao = await geoAPI.reverseGeocode(lat, lon);
      if (enderecoSugestao) {
        document.getElementById('createEndereco').value = enderecoSugestao;
      }
    } else {
      document.getElementById('createEndereco').value = endereco;
    }
  } else {
    // Tenta usar as coordenadas atuais do centro do mapa como padrão
    if (mapInstance) {
      const center = mapInstance.getCenter();
      document.getElementById('createLatitude').value = center.lat.toFixed(6);
      document.getElementById('createLongitude').value = center.lng.toFixed(6);
    }
  }

  if (createModalInstance) createModalInstance.show();
}

/**
 * Abrir Modal de Edição (RF10, RF11, CA06, CA08)
 */
async function openEditModal(id) {
  try {
    const local = await shadesAPI.getById(id);
    if (!local) return;

    document.getElementById('editId').value = local.id;
    document.getElementById('editTitulo').value = local.titulo;
    document.getElementById('editDescricao').value = local.descricao || '';
    document.getElementById('editLatitude').value = parseFloat(local.latitude).toFixed(6);
    document.getElementById('editLongitude').value = parseFloat(local.longitude).toFixed(6);
    document.getElementById('editEndereco').value = local.endereco || '';

    // Seleciona o radio correspondente ao nível de sombra
    const radio = document.querySelector(`input[name="editNivelSombra"][value="${local.nivel_sombra}"]`);
    if (radio) radio.checked = true;

    if (editModalInstance) editModalInstance.show();
  } catch (err) {
    alert('Erro ao abrir local para edição: ' + err.message);
  }
}

/**
 * Exclusão de Local (RF10, RF11, CA07, CA08)
 */
async function confirmDeleteShade(id) {
  if (!confirm('Tem certeza de que deseja excluir este local de sombra? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    await shadesAPI.delete(id);
    showAlert('Local de sombra excluído com sucesso.', 'success');
    await loadShades(currentFilter);
  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
  }
}

/**
 * Configuração dos Formulários de Envio
 */
function setupForms() {
  // Form de Cadastro
  const formCreate = document.getElementById('formCreateShade');
  if (formCreate) {
    formCreate.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nivelRadio = document.querySelector('input[name="createNivelSombra"]:checked');

      const payload = {
        titulo: document.getElementById('createTitulo').value.trim(),
        descricao: document.getElementById('createDescricao').value.trim(),
        nivel_sombra: nivelRadio ? nivelRadio.value : '',
        latitude: document.getElementById('createLatitude').value,
        longitude: document.getElementById('createLongitude').value,
        endereco: document.getElementById('createEndereco').value.trim(),
      };

      try {
        await shadesAPI.create(payload);
        if (createModalInstance) createModalInstance.hide();
        clearTempPin();
        showAlert('Local de sombra cadastrado com sucesso!', 'success');
        await loadShades(currentFilter);
      } catch (err) {
        alert('Erro ao cadastrar: ' + err.message);
      }
    });
  }

  // Form de Edição
  const formEdit = document.getElementById('formEditShade');
  if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editId').value;
      const nivelRadio = document.querySelector('input[name="editNivelSombra"]:checked');

      const payload = {
        titulo: document.getElementById('editTitulo').value.trim(),
        descricao: document.getElementById('editDescricao').value.trim(),
        nivel_sombra: nivelRadio ? nivelRadio.value : '',
        latitude: document.getElementById('editLatitude').value,
        longitude: document.getElementById('editLongitude').value,
        endereco: document.getElementById('editEndereco').value.trim(),
      };

      try {
        await shadesAPI.update(id, payload);
        if (editModalInstance) editModalInstance.hide();
        showAlert('Local de sombra atualizado com sucesso!', 'success');
        await loadShades(currentFilter);
      } catch (err) {
        alert('Erro ao atualizar: ' + err.message);
      }
    });
  }
}

function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('globalAlertContainer');
  if (!alertContainer) return;

  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  setTimeout(() => {
    alertContainer.innerHTML = '';
  }, 4000);
}
