# Validação 05 — planejamento publicado e execução do treino

Use este roteiro com dados fictícios para validar o ciclo completo de um treino:
**rascunho → publicação → execução → histórico**.

## Preparação

1. Abra `http://127.0.0.1:3002/` na visão **Coach**.
2. Mantenha pelo menos dois atletas ativos no elenco.
3. Crie ou escolha um treino com duas ou mais atividades para testar ordenação e
   execução.

## 1. Rascunho e publicação

- [x] Clique em **Criar treino**, preencha os campos obrigatórios, convide ao
      menos um atleta e salve.
- [x] Confirme que o treino aparece com o status **Rascunho**.
- [x] Troque a visão para **Atleta**. O rascunho não deve aparecer na agenda nem
      no calendário do atleta.
- [x] Volte à visão **Coach**, abra o treino e clique em **Publicar plano**.
- [x] Confirme que o status muda para **Publicado**.
- [x] Volte à visão **Atleta**. O treino publicado deve aparecer, permitindo a
      confirmação de presença normalmente.
- [x] Recarregue a página e confirme que o status publicado permanece.

## 2. Ordenação e duração planejada

- [x] No treino em rascunho ou publicado, clique em **Editar treino**.
- [x] Confirme que o cabeçalho de atividades exibe o total de minutos planejados.
- [x] Use **↑ Subir** e **↓ Descer** em uma atividade. A ordem deve mudar sem
      alterar os dados de cada atividade.
- [x] Salve, recarregue e confirme que a nova ordem foi preservada no detalhe do
      treino.
- [x] Adicione uma atividade, confira o aumento do total planejado e depois a
      remova. O total deve voltar ao valor anterior.
- [x] Confirme que ainda é possível salvar um treino sem atividades, quando essa
      for a decisão do coach.

## 3. Tracker de execução

- [x] Em um treino publicado, localize a seção **Tracker do treino**.
- [x] Clique em **Iniciar treino**. O status deve mudar para **Em andamento**.
- [x] Confirme que o indicador de progresso inicia em `0%`.
- [x] Marque uma atividade como **Concluída**. O progresso e a contagem de
      atividades registradas devem aumentar.
- [x] Informe uma **Duração real** e uma **Observação da atividade**. Recarregue
      a página e confirme que os dados permanecem.
- [x] Marque outra atividade como **Pular**. Ela também deve entrar no progresso.
- [x] Preencha a **Observação geral do treino**.
- [x] Clique em **Finalizar e registrar treino**. O status deve mudar para
      **Concluído**.
- [x] Depois de concluído, os controles de atividades e a observação geral devem
      ficar bloqueados, preservando o histórico registrado.

## 4. Regras de acesso e regressão

- [x] Na visão **Atleta**, confirme que o tracker de execução não aparece.
- [x] Tente iniciar um treino em rascunho. O botão deve permanecer indisponível
      até a publicação.
- [x] Confirme que presença real e confirmação antecipada continuam funcionando
      separadamente em um treino publicado.
- [x] Recarregue a página no treino selecionado. A seleção, o status do plano e
      o estado da execução devem ser preservados.

## Resultado da validação

| Área                     | Resultado                | Observações |
| ------------------------ | ------------------------ | ----------- |
| Rascunho e publicação    | ⬜ Aprovado / ⬜ Ajustar |             |
| Ordem e duração do plano | ⬜ Aprovado / ⬜ Ajustar |             |
| Tracker de execução      | ⬜ Aprovado / ⬜ Ajustar |             |
| Acesso e persistência    | ⬜ Aprovado / ⬜ Ajustar |             |

## Verificação técnica desta entrega

- `npm run format:check`: aprovado.
- `npm run typecheck`: aprovado.
- `npm test`: 8 cenários aprovados.
- `npm run build`: aprovado.
