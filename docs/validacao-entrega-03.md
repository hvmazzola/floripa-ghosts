# Validação 03 — regressão das regras de negócio

Use este roteiro após as melhorias visuais para confirmar que a experiência
continua respeitando as regras já aprovadas. Faça os testes sempre com dados
fictícios.

## Preparação

1. Abra `http://127.0.0.1:3002/`.
2. Se existirem muitos dados de testes anteriores, mantenha ao menos um treino
   e os integrantes de demonstração para poder comparar os resultados.
3. Comece na visão **Coach**.

## 1. Elenco e permissões

- [x] Abra **Elenco** e confirme que Mazzola, Coach Demo e os atletas de
      demonstração aparecem.
- [x] Adicione um atleta com nome, número, pelo menos uma posição, unidade e
      atribuição **Atleta**. Salve e confirme que ele aparece no elenco.
- [x] Edite esse atleta e altere duas posições. Recarregue a página: as duas
      posições devem permanecer.
- [x] Tente salvar outro atleta usando um número já existente. A aplicação deve
      informar que o número está em uso e não salvar o perfil.
- [x] Crie ou edite um perfil somente com atribuição **Coach**. Número e
      posições não devem ser exigidos nem mostrados depois no perfil.
- [x] Marque um atleta como **Inativo**. Ele continua no elenco, mas não aparece
      na convocação de novos treinos.

## 2. Treino, atividades e convocação

- [x] Abra **Criar treino**. O formulário deve abrir centralizado sobre a tela.
- [x] Crie um treino sem atividades. Preencha nome, data e horário, local e
      selecione ao menos um atleta. O treino deve publicar normalmente.
- [x] Edite o treino criado e adicione uma atividade com tipo, drill, duração,
      unidade e foco. Salve e confira o plano no detalhe do treino.
- [x] Adicione uma segunda atividade com situação e link do YouTube iniciado por
      `https://`. Confirme que o link **Ver vídeo** aparece no detalhe.
- [x] Tente salvar uma atividade sem drill. O sistema deve impedir o
      salvamento e explicar o campo pendente.
- [x] Use **Marcar todos** e depois **Desmarcar todos**. Cada atleta ativo deve
      ser selecionado e removido corretamente.
- [x] Selecione apenas dois atletas, publique ou salve e confira que somente
      eles aparecem em **Convocados**.
- [x] Edite o treino, mantenha um convocado e substitua outro. A confirmação e a
      presença já registradas do integrante mantido devem continuar intactas.

## 3. Visão de atleta e presença

- [x] Mude o seletor de visão para **Atleta**. A central deve mostrar somente
      treinos para os quais Mazzola foi convocado.
- [x] No treino escolhido, selecione **Vou participar**. Recarregue a página e
      confirme que a resposta permanece.
- [x] Volte à visão **Coach**. A métrica de confirmações e o status de Mazzola
      devem refletir a resposta dada pelo atleta.
- [x] Registre a presença de Mazzola como **Presente**. A confirmação deve
      continuar como confirmada; presença não pode alterar a resposta do atleta.
- [x] Troque a presença para **Ausente** e confirme que o total de presenças
      registradas se atualiza sem apagar a confirmação.
- [x] Na visão **Atleta**, abra o menu do perfil e edite somente o próprio
      perfil. Atribuições e status não devem estar disponíveis para edição.

## 4. Persistência e navegação

- [x] Recarregue a página em **Elenco**, **Treinos e agenda** e **Perfil**. A
      página atual deve ser preservada, sem mostrar rapidamente outra tela antes.
- [x] Recarregue com mais de um treino. O treino mais próximo por data deve ser
      selecionado quando necessário.
- [x] Expanda e recolha o menu lateral. Ele deve deslocar o conteúdo, sem cobrir
      cards, formulário ou detalhe do treino.
- [x] Passe o mouse sobre a foto/nome no rodapé do menu. As opções **Perfil** e
      **Elenco** devem aparecer apenas nesse momento.
- [x] Abra os modais de treino e integrante. As áreas de seleção devem manter
      checkboxes quadrados, label à direita e estado selecionado em azul.

## Resultado da validação

| Área                     | Resultado                | Observações |
| ------------------------ | ------------------------ | ----------- |
| Elenco e permissões      | ⬜ Aprovado / ⬜ Ajustar |             |
| Treino e atividades      | ⬜ Aprovado / ⬜ Ajustar |             |
| RSVP e presença          | ⬜ Aprovado / ⬜ Ajustar |             |
| Persistência e navegação | ❌ Aprovado / ✅ Ajustar |             |
| Modais e seleção         | ⬜ Aprovado / ⬜ Ajustar |             |

## Verificação técnica antes deste roteiro

- `npm run format:check`: aprovado.
- `npm run typecheck`: aprovado.
- `npm test`: 6 cenários aprovados.
- `npm run build`: aprovado.
