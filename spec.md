# Especificação Oficial — Projeto EcoSombra

Documento de especificação do projeto **EcoSombra**, elaborado de acordo com as orientações da apostila “Programar com IA de forma responsável”.

---

## 1. Objetivo

O **EcoSombra** é uma aplicação web voltada ao mapeamento colaborativo e à consulta de locais com sombra em áreas urbanas, como árvores frondosas, praças sombreadas, marquises e coberturas urbanas.

O objetivo é auxiliar pedestres e ciclistas a encontrarem pontos protegidos do sol, classificando os locais de acordo com o nível de sombra: *pouca*, *moderada* ou *muita*.

O sistema permite que usuários autenticados cadastrem, editem e excluam seus próprios locais. Administradores também podem realizar a gestão dos locais cadastrados.

---

## 2. Usuários

1. **Visitante (não autenticado):**
   - Visualiza os locais de sombra no mapa e na lista.
   - Pesquisa endereços para navegar no mapa.
   - Filtra locais pelo nível de sombra: pouca, moderada ou muita.

2. **Usuário cadastrado (autenticado):**
   - Possui as funcionalidades do visitante.
   - Cadastra novos locais de sombra.
   - Edita e exclui os locais cadastrados por ele mesmo.

3. **Administrador:**
   - Possui as funcionalidades do usuário autenticado.
   -
