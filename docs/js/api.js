/**
 * Camada de comunicação com a API do EcoSombra
 */

const authAPI = {
  async me() {
    const res = await fetch('/api/auth/me');
    return res.json();
  },

  async login(email, senha) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Falha no login');
    return data;
  },

  async register(nome, email, senha) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Falha no cadastro');
    return data;
  },

  async logout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    return res.json();
  },
};

const shadesAPI = {
  async list(nivel = '') {
    const url = nivel ? `/api/locais?nivel=${encodeURIComponent(nivel)}` : '/api/locais';
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Falha ao listar locais');
    return data.locais || [];
  },

  async getById(id) {
    const res = await fetch(`/api/locais/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Falha ao buscar local');
    return data.local;
  },

  async create(payload) {
    const res = await fetch('/api/locais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Falha ao cadastrar local');
    return data;
  },

  async update(id, payload) {
    const res = await fetch(`/api/locais/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Falha ao atualizar local');
    return data;
  },

  async delete(id) {
    const res = await fetch(`/api/locais/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Falha ao excluir local');
    return data;
  },
};

const geoAPI = {
  async searchAddress(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=br`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    if (!res.ok) throw new Error('Não foi possível realizar a busca de endereço');
    return res.json();
  },

  async reverseGeocode(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
      });
      if (!res.ok) return '';
      const data = await res.json();
      return data.display_name || '';
    } catch {
      return '';
    }
  },
};
