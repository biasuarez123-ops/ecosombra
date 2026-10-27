# Especificação Oficial — Projeto EcoSombra

Documento de especificação do projeto **EcoSombra**, elaborado e estruturado de acordo com o padrão de 8 seções da apostila oficial.

---

## 1. Objetivo
O **EcoSombra** é uma aplicação web voltada ao mapeamento colaborativo e consulta de locais com sombra em áreas urbanas (árvores frondosas, praças sombreadas, marquises e coberturas urbanas). O objetivo central é auxiliar pedestres e ciclistas a encontrarem pontos frescos e protegidos do sol, classificando os locais de acordo com o nível de sombra (*pouca*, *moderada* ou *muita*). O sistema permite que usuários autenticados cadastrem, editem e excluam seus locais (usando GPS ou busca de endereço), e que administradores façam a gestão de todo o acervo de locais cadastrados.

---

## 2. Usuários
1. **Visitante (Não Autenticado):**
   * Visualiza todos os locais de sombra em mapa georreferenciado e em lista estruturada.
   * Pesquisa endereços para navegar no mapa.
   * Filtra locais pelo nível de sombra (*pouca*, *moderada*, *muita*).
2. **Usuário Cadastrado (Autenticado):**
   * Possui todos os acessos do visitante.
   * Cadastra novos locais de sombra (via coordenadas manuais, clique no mapa ou localização atual do dispositivo).
   * Edita e exclui os locais cadastrados por ele mesmo.
3. **Administrador:**
   * Possui todas as funcionalidades do usuário autenticado.
   * Pode editar e excluir qualquer local cadastrado no sistema (para garantir integridade e moderação do conteúdo).

---

## 3. Casos de Uso Principais
* **UC01 - Cadastrar Usuário:** Criação de conta informando nome, e-mail único e senha.
* **UC02 - Autenticar Usuário (Login/Logout):** Validação de credenciais e gerenciamento seguro de sessão.
* **UC03 - Consultar e Listar Locais:** Exibição de todos os pontos cadastrados tanto em mapa interativo quanto em listagem de cartões.
* **UC04 - Pesquisar por Endereço:** Localização rápida de ruas, praças e bairros via serviço de geocodificação.
* **UC05 - Usar Localização Atual (GPS):** Leitura de coordenadas do dispositivo do usuário via API do navegador para preenchimento ágil.
* **UC06 - Cadastrar Local de Sombra:** Registro com título, classificação de sombra (*pouca*, *moderada*, *muita*), coordenadas (latitude/longitude), endereço aproximado e descrição opcional.
* **UC07 - Editar Local (Autor ou Administrador):** Atualização dos dados de um local existente com verificação de autorização.
* **UC08 - Excluir Local (Autor ou Administrador):** Remoção definitiva de um local do banco de dados com verificação de autorização.

---

## 4. Requisitos Funcionais
* **RF01:** O sistema deve permitir o cadastro de novos usuários com nome, e-mail único e senha.
* **RF02:** O sistema deve permitir a autenticação (login) e encerramento de sessão (logout) de usuários.
* **RF03:** O sistema deve restringir ações de escrita (somente usuários autenticados podem cadastrar ou editar locais).
* **RF04:** O cadastro de local deve exigir: título/nome, nível de sombra (*pouca*, *moderada* ou *muita*) e coordenadas geográficas (latitude e longitude). Descrição e endereço são opcionais.
* **RF05:** O sistema deve persistir todos os dados de usuários e locais em banco de dados relacional permanente.
* **RF06:** O sistema deve disponibilizar a consulta e listagem de todos os locais de sombra cadastrados.
* **RF07:** O sistema deve exibir os locais tanto em um mapa georreferenciado interativo quanto em formato de lista.
* **RF08:** O sistema deve permitir a identificação visual e a filtragem dos locais pelo nível de sombra (*pouca*, *moderada*, *muita*).
* **RF09:** O sistema deve oferecer pesquisa por endereço com reposicionamento do mapa no local correspondente.
* **RF10:** O sistema deve permitir que o próprio usuário edite e exclua os locais por ele cadastrados.
* **RF11:** O sistema deve permitir que usuários com perfil de Administrador editem e excluam qualquer local cadastrado no sistema.
* **RF12:** O sistema deve permitir obter e utilizar a localização atual do dispositivo do usuário (GPS / HTML5 Geolocation API).

---

## 5. Requisitos Não Funcionais
* **RNF01 (Deploy e Acesso Público):** A aplicação deve ser publicada e estar acessível publicamente via link na internet (ex.: Render ou similar).
* **RNF02 (Persistência Durável):** O banco de dados não deve ser volátil; os dados gravados devem permanecer salvos mesmo após reinicializações do servidor.
* **RNF03 (Segurança de Senhas):** Todas as senhas de usuários devem ser gravadas com hash criptográfico seguro (bcrypt com salt).
* **RNF04 (Proteção de Segredos):** Credenciais de banco, chaves de sessão e contas de administração não devem ser expostas no código-fonte, utilizando variáveis de ambiente (`.env`).
* **RNF05 (Controle de Acesso / Autorização):** As operações de alteração e exclusão devem validar no backend se o solicitante é o autor do registro ou administrador.
* **RNF06 (Responsividade):** A interface deve ser totalmente responsiva, funcionando com boa ergonomia em smartphones e desktops.
* **RNF07 (Desempenho):** O carregamento do mapa e a busca de endereços devem responder de maneira ágil, utilizando serviços gratuitos e estáveis (Leaflet + OpenStreetMap + Nominatim).
* **RNF08 (Compatibilidade):** A aplicação deve operar adequadamente nos navegadores modernos padrão (Google Chrome, Mozilla Firefox, Microsoft Edge e Safari).
* **RNF09 (Usabilidade e Feedback):** O sistema deve fornecer mensagens de sucesso ou erro claras ao usuário em todas as ações de formulário e exclusão.

---

## 6. Modelo de Dados

### Tabela: `usuarios`
| Campo | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INTEGER | PRIMARY KEY | Identificador único do usuário |
| `nome` | VARCHAR(100) | NOT NULL | Nome completo |
| `email` | VARCHAR(150) | NOT NULL, UNIQUE | E-mail para autenticação |
| `senha_hash` | VARCHAR(255) | NOT NULL | Hash seguro da senha |
| `papel` | VARCHAR(20) | NOT NULL, DEFAULT 'usuario' | Papel de acesso: `'usuario'` ou `'admin'` |
| `criado_em` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Data e hora de cadastro |

### Tabela: `locais_sombra`
| Campo | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INTEGER | PRIMARY KEY | Identificador único do local |
| `usuario_id` | INTEGER | NOT NULL, FK -> `usuarios.id` | Chave estrangeira do autor do cadastro |
| `titulo` | VARCHAR(120) | NOT NULL | Título ou referência do ponto |
| `descricao` | TEXT | NULL | Detalhes adicionais |
| `nivel_sombra`| VARCHAR(20) | NOT NULL, CHECK in ('pouca', 'moderada', 'muita') | Nível de sombreamento do local |
| `latitude` | NUMERIC(10, 8) | NOT NULL | Latitude em graus decimais |
| `longitude` | NUMERIC(11, 8) | NOT NULL | Longitude em graus decimais |
| `endereco` | VARCHAR(255) | NULL | Endereço ou referência descritiva |
| `criado_em` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Data e hora do registro |

---

## 7. Critérios de Aceite
* **CA01:** O cadastro de usuário aceita nome, e-mail e senha válida; rejeita e-mails duplicados e salva a senha criptografada.
* **CA02:** O login autentica usuários com credenciais válidas e rejeita credenciais incorretas com mensagem clara.
* **CA03:** Usuários deslogados conseguem visualizar locais no mapa e na lista, mas são impedidos de cadastrar, editar ou excluir.
* **CA04:** O formulário de cadastro de local só salva se o título, as coordenadas e o nível de sombra (*pouca*, *moderada* ou *muita*) forem preenchidos.
* **CA05:** Após submeter um novo local de sombra, os dados são persistidos no banco de dados e refletidos imediatamente no mapa e na lista.
* **CA06 (Edição pelo Autor - RF10):** Um usuário logado consegue editar as informações de seus próprios locais cadastrados; as mudanças são gravadas no banco e atualizadas na interface.
* **CA07 (Exclusão pelo Autor - RF10):** Um usuário logado consegue excluir seus próprios locais com diálogo de confirmação.
* **CA08 (Gestão pelo Administrador - RF11):** Um usuário logado com `papel = 'admin'` consegue visualizar opções de edição e exclusão em locais criados por quaisquer usuários e executá-las com sucesso.
* **CA09 (Busca de Endereço):** A busca por logradouro/bairro centraliza o mapa no ponto retornado pela geocodificação.
* **CA10 (Geolocalização do Dispositivo):** O botão de localização atual solicita autorização ao navegador e, se concedida, preenche as coordenadas e centraliza o mapa.
* **CA11 (Identificação Visual de Sombra):** Os pontos exibem badges e marcadores diferenciados por cor e texto para *pouca* (amarelo), *moderada* (verde claro) e *muita* sombra (verde escuro).

---

## 8. Decisão de Stack e Deploy
* **Backend:** Node.js com Express.js, sessão com cookies assinados (`cookie-session`), hash com `bcryptjs`.
* **Banco de Dados:** PostgreSQL para ambiente de produção em nuvem (Neon / Supabase / Render Postgres) com suporte local inteligente para desenvolvimento imediato.
* **Frontend:** HTML5, CSS moderno responsivo com Bootstrap 5 via CDN, JavaScript nativo (ES6+), biblioteca Leaflet.js com camadas OpenStreetMap e serviço de busca Nominatim.
* **Deploy:** Plataforma Render.com (Web Service) conectada a repositório Git, com variáveis de ambiente configuradas no painel.
