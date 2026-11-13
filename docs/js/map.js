/**
 * Módulo de Gerenciamento do Mapa (Leaflet + OpenStreetMap)
 */

let mapInstance = null;
let markersLayer = null;
let tempPin = null;

const DEFAULT_COORDS = [-23.55052, -46.633308]; // Ponto de partida padrão
const DEFAULT_ZOOM = 14;

function initMap() {
  if (mapInstance) return mapInstance;

  mapInstance = L.map('map', {
    zoomControl: true,
  }).setView(DEFAULT_COORDS, DEFAULT_ZOOM);

  // Camada de visualização OpenStreetMap (100% gratuita)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | EcoSombra',
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);

  // Clique no mapa para adicionar novo local (RF03, RF04)
  mapInstance.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    if (!currentUser) {
      if (confirm('Para cadastrar este ponto de sombra, você precisa estar conectado. Deseja ir para a tela de login?')) {
        window.location.href = 'login.html';
      }
      return;
    }

    setTempPin(lat, lng);
    openCreateModal(lat, lng);
  });

  return mapInstance;
}

function setTempPin(lat, lng) {
  if (tempPin) {
    mapInstance.removeLayer(tempPin);
  }
  tempPin = L.circleMarker([lat, lng], {
    radius: 9,
    fillColor: '#3b82f6',
    color: '#ffffff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8,
  }).addTo(mapInstance);
}

function clearTempPin() {
  if (tempPin) {
    mapInstance.removeLayer(tempPin);
    tempPin = null;
  }
}

/**
 * Cria ícones com cores padronizadas para os níveis de sombra (CA11)
 */
function createCustomPin(nivel) {
  let pinClass = 'pin-moderada';
  let iconEmoji = '🌳';

  if (nivel === 'pouca') {
    pinClass = 'pin-pouca';
    iconEmoji = '🟡';
  } else if (nivel === 'muita') {
    pinClass = 'pin-muita';
    iconEmoji = '🌲';
  }

  return L.divIcon({
    className: `custom-pin ${pinClass}`,
    html: `<span>${iconEmoji}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

/**
 * Renderiza os locais no mapa
 */
function renderMarkers(locais) {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  locais.forEach((local) => {
    const lat = parseFloat(local.latitude);
    const lon = parseFloat(local.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    const marker = L.marker([lat, lon], {
      icon: createCustomPin(local.nivel_sombra),
    });

    const popupHtml = buildPopupContent(local);
    marker.bindPopup(popupHtml);
    markersLayer.addLayer(marker);
  });
}

/**
 * Constrói o conteúdo do popup com botões de ação para Autor e Administrador (RF10, RF11)
 */
function buildPopupContent(local) {
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
      <div class="d-flex gap-2 mt-2 pt-2 border-top">
        <button class="btn btn-outline-primary btn-sm flex-fill" onclick="openEditModal(${local.id})">
          ✏️ Editar
        </button>
        <button class="btn btn-outline-danger btn-sm flex-fill" onclick="confirmDeleteShade(${local.id})">
          🗑️ Excluir
        </button>
      </div>
    `;
  }

  return `
    <div style="min-width: 220px;">
      <h6 class="mb-1">${escapeHtml(local.titulo)}</h6>
      <div class="mb-2">
        <span class="badge ${badgeClass} p-1 px-2">${badgeLabel}</span>
      </div>
      ${local.endereco ? `<p class="small text-muted mb-1">📍 ${escapeHtml(local.endereco)}</p>` : ''}
      ${local.descricao ? `<p class="small mb-2">${escapeHtml(local.descricao)}</p>` : ''}
      <p class="small text-muted mb-0">Cadastrado por: <strong>${escapeHtml(local.autor_nome || 'Colaborador')}</strong></p>
      ${actionsHtml}
    </div>
  `;
}

/**
 * Centraliza o mapa nas coordenadas indicadas
 */
function centerMap(lat, lon, zoom = 16) {
  if (mapInstance) {
    mapInstance.setView([lat, lon], zoom);
  }
}

/**
 * Localização Atual do Usuário via GPS (RF12, CA10)
 */
function handleUseCurrentLocation() {
  if (!navigator.geolocation) {
    alert('Geolocalização não é suportada pelo seu navegador.');
    return;
  }

  const btn = document.getElementById('btnGeoLocation');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '⏳ Obtendo...';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      centerMap(lat, lon, 16);
      setTempPin(lat, lon);

      if (btn) btn.innerHTML = originalText;

      // Mensagem amigável com opção de já cadastrar no local
      if (currentUser) {
        if (confirm('Localização encontrada! Deseja cadastrar um ponto de sombra onde você está agora?')) {
          openCreateModal(lat, lon);
        }
      }
    },
    (error) => {
      if (btn) btn.innerHTML = originalText;
      let msg = 'Não foi possível obter a sua localização.';
      if (error.code === error.PERMISSION_DENIED) {
        msg = 'Permissão de localização negada pelo navegador.';
      }
      alert(msg);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
