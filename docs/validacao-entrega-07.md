# Validação 07 — Comunicação e notificações

Use dados fictícios para validar o mural, os feedbacks individuais, o sino no
cabeçalho e a leitura de mensagens.

## 1. Mural e avisos do time

Com a visão de teste em **Coach**:

- [ ] Abra **Comunicação** no menu lateral.
- [ ] Selecione **Aviso para o time**, preencha título e mensagem e clique em
      **Publicar**.
- [ ] Confirme que a mensagem aparece no mural com a etiqueta **Aviso do time**.
- [ ] Clique no aviso dentro do mural. Um modal deve abrir com a mensagem completa.
- [ ] Feche o modal pelo botão `×`.
- [ ] Exclua o aviso criado e confirme que ele sai do mural.

## 2. Feedback individual

Ainda como **Coach**:

- [ ] Selecione **Feedback individual**.
- [ ] Escolha um atleta ativo, preencha título e mensagem e publique.
- [ ] Confirme que o item mostra a etiqueta com o nome do atleta destinatário.
- [ ] Mude a visão de teste para **Atleta**.
- [ ] O feedback deve aparecer apenas se tiver sido enviado para o atleta atual.
- [ ] Nenhum feedback destinado a outros atletas pode ser exibido.

## 3. Sino de notificações

- [ ] Em qualquer página, clique no ícone de sino no cabeçalho.
- [ ] Confirme que a lista exibe apenas os avisos gerais e feedbacks permitidos
      para a visão atual.
- [ ] O contador do sino deve corresponder à quantidade de mensagens disponíveis,
      limitado visualmente a `9+`.
- [ ] Clique em uma notificação. A lista deve fechar e o modal com a mensagem
      completa deve abrir.
- [ ] No topo da lista, clique em **Ver todas**. A página **Comunicação** deve
      abrir.

## 4. Permissões

- [ ] Como atleta, confirme que não aparece o formulário de publicação.
- [ ] Como atleta, confirme que não aparecem botões **Excluir** no mural.
- [ ] Como coach, confirme que o formulário e os botões **Excluir** estão
      disponíveis.
- [ ] Recarregue a página e confirme que mensagens criadas ou excluídas permanecem
      conforme o armazenamento local deste navegador.

## Verificação técnica realizada

- [x] Formatação verificada com Prettier.
- [x] Tipos verificados com TypeScript.
- [x] Regras existentes testadas.
- [x] Aplicação local acessível.
