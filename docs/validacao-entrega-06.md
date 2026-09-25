# Validação 06 — Home e histórico de desempenho

Use dados fictícios para validar a Home, seus indicadores e o histórico de
execução de treinos.

## 1. Acesso e navegação

- [ ] Recarregue a aplicação com a **Home** aberta. Ela deve permanecer como a
      página atual.
- [ ] No menu lateral, confirme que **Home** abre os indicadores e que
      **Treinos e agenda** continua abrindo a agenda.
- [ ] No breadcrumb, clique em **Início**. A navegação deve retornar à Home.
- [ ] Clique em qualquer item de **Histórico recente**. O treino correspondente
      deve abrir em **Treinos e agenda**.

## 2. Indicadores e filtros

Com a visão de teste em **Coach**:

- [ ] Confira os cinco indicadores: treinos concluídos, presença entre
      convocados, presença entre confirmados, carga realizada e atividades
      concluídas.
- [ ] A presença entre convocados deve calcular atletas marcados como presentes
      ÷ atletas convocados.
- [ ] A presença entre confirmados deve calcular atletas marcados como presentes
      ÷ atletas que confirmaram. Ela pode passar de 100% quando houver atletas
      presentes que não confirmaram.
- [ ] Em **Período**, alterne entre últimos 30 dias, últimos 90 dias e todo o
      histórico. Indicadores e lista devem ser recalculados.
- [ ] Escolha **Faixa de datas**, preencha início e fim e confirme que apenas
      treinos dentro do intervalo aparecem.
- [ ] Em **Unidade**, alterne entre todas, ataque e defesa. A lista deve mostrar
      apenas treinos que tenham atividades da unidade escolhida.

## 3. Carga e execução

- [ ] Em **Treinos e agenda**, inicie um treino e marque uma atividade como
      **Concluída**, sem finalizar o treino.
- [ ] Volte à Home. A carga realizada deve incluir somente atividades marcadas
      como concluídas, mesmo com o treino ainda em andamento.
- [ ] Durante a execução, use **Concluir todas**. Todas as atividades devem ser
      registradas como concluídas e a carga da Home deve ser atualizada.
- [ ] Use **Desfazer** em uma atividade concluída e confira que a carga diminui.

## 4. Visão de atleta

Mude a visão de teste para **Atleta**:

- [ ] A Home deve mostrar somente treinos publicados para o atleta atual.
- [ ] Os textos devem mudar para a visão pessoal: **Minha evolução** e resumo da
      própria participação.
- [ ] As duas métricas de presença devem considerar somente as convocações do
      atleta atual.
- [ ] Filtros de período, faixa de datas e unidade devem continuar funcionando.

## 5. Estados sem dados

- [ ] Escolha uma faixa ou unidade sem treinos. A lista deve informar que não há
      treinos para os filtros, sem quebrar os indicadores.
- [ ] Sem convocações ou confirmações, as métricas de presença devem aparecer como
      `0%`.
- [ ] Sem atividades concluídas, carga realizada e atividades concluídas devem
      aparecer como zero.

## Verificação técnica realizada

- [x] Formatação verificada com Prettier.
- [x] Tipos verificados com TypeScript.
- [x] Regras de domínio testadas.
- [x] Compilação de produção concluída.
