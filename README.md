# 🌿 EcoSombra — Mapeamento Colaborativo de Sombra Urbana

O **EcoSombra** é uma aplicação web voltada ao mapeamento e consulta de locais com sombra em áreas urbanas, permitindo que cidadãos encontrem pontos protegidos da radiação solar excessiva, classificados por níveis de sombreamento (*pouca*, *moderada* ou *muita* sombra).

O projeto foi implementado rigorosamente de acordo com a especificação oficial em [`spec.md`](spec.md).

---

## 🚀 Funcionalidades Implementadas

* **Autenticação de Usuários:** Cadastro de novos usuários e login seguro com senhas criptografadas via `bcrypt` (RF01, RF02).
* **Mapeamento Interativo:** Mapa integrado com Leaflet e OpenStreetMap, sem custos ou chaves pagas (RF07).
* **Classificação de Sombra:** Identificação visual e filtros rápidos para *pouca* (amarelo), *moderada* (verde claro) e *muita* sombra (verde escuro) (RF08).
* **Pesquisa de Endereço:** Busca de ruas, praças e bairros com geocodificação via Nominatim (RF09).
* **Geolocalização (GPS):** Botão "Meu GPS" para capturar a posição atual do usuário pelo navegador (RF12).
* **Cadastro Rápido:** Usuários autenticados podem cadastrar locais preenchendo coordenadas ou simplesmente clicando no mapa (RF03, RF04).
* **Gestão pelo Autor (RF10):** Usuários podem editar e excluir os locais que cadastraram.
* **Gestão pelo Administrador (RF11):** Administradores podem editar e excluir qualquer ponto de sombra para moderação do sistema.
* **Segurança de Credenciais:** Nenhuma credencial de administrador ou chave de banco fica exposta no código-fonte (RNF04).

---

## 🛠️ Stack Tecnológica

* **Backend:** Node.js (v22+) + Express.js + `cookie-session` + `bcryptjs`
* **Banco de Dados:**
  * **Produção (Deploy Web):** PostgreSQL (Neon.tech / Supabase / Render Postgres)
  * **Desenvolvimento Local:** SQLite integrado (zero configuração)
* **Frontend:** HTML5, CSS (Bootstrap 5 via CDN), JavaScript Puro (ES6+) e Leaflet.js
* **Deploy:** Compatível com Render.com, Railway ou qualquer hospedagem Node.js

---

## 💻 Como Executar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor:**
   ```bash
   npm start
   ```

3. **Acesse no navegador:**
   Abra `http://localhost:3000`

### 🔑 Credenciais do Administrador
O primeiro usuário administrador é configurado **exclusivamente via variáveis de ambiente** (`ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD`).
* No ambiente local, configure seus valores no seu arquivo `.env` (que está protegido no `.gitignore`).
* Nenhuma senha padrão ou credencial sensível é exposta no código-fonte ou no repositório versionado.

---

## ☁️ Como Publicar na Internet (Deploy no Render com PostgreSQL)

1. Crie um repositório no seu GitHub e suba este projeto.
2. Crie uma conta gratuita em [Render.com](https://render.com).
3. **Crie o Banco de Dados PostgreSQL:**
   * Clique em **New +** ➔ **PostgreSQL**.
   * Escolha o plano gratuito e crie o banco.
   * Copie a **Internal Database URL** ou **External Database URL**.
4. **Crie o Web Service:**
   * Clique em **New +** ➔ **Web Service** e conecte seu repositório GitHub.
   * Runtime: `Node`
   * Build Command: `npm install`
   * Start Command: `npm start`
5. **Configure as Variáveis de Ambiente no Render:**
   Na aba **Environment**, adicione:
   * `DATABASE_URL` = *(a URL do PostgreSQL que você copiou)*
   * `SESSION_SECRET` = *(uma chave longa e secreta para assinar cookies)*
   * `ADMIN_EMAIL` = *(o e-mail que você deseja utilizar como administrador)*
   * `ADMIN_INITIAL_PASSWORD` = *(a senha segura definida para o administrador)*
6. Clique em **Deploy**. A sua aplicação estará online com um link público funcional!
