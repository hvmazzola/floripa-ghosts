# Validação 04 — biblioteca de exercícios e formulários

Este roteiro cobre a nova biblioteca reutilizável de exercícios, o preenchimento
por template e os retornos de validação dos modais. Use somente dados fictícios.

## Preparação

1. Abra `http://127.0.0.1:3002/`.
2. Mude para a visão **Coach**.
3. Mantenha pelo menos um treino e um atleta ativo para os testes de convocação.

## 1. Biblioteca de exercícios

- [x] Abra **Exercícios** pelo menu lateral. A página deve mostrar o título
      **Exercícios reutilizáveis** e o botão **Novo exercício**.
- [x] Clique em **Novo exercício**. O modal deve abrir centralizado, com o mesmo
      padrão visual dos outros modais e botão de fechar.
- [x] Tente salvar sem preencher nome e duração. Os campos devem ganhar borda
      vermelha e mostrar **Campo obrigatório** ao lado do rótulo.
- [x] Informe somente um nome e confirme que o asterisco desse campo fica cinza,
      enquanto o da duração permanece vermelho até receber um valor válido.
- [x] Preencha nome, tipo, duração, unidade, foco e situação. Salve e confirme
      que o exercício aparece na biblioteca.
- [x] Crie outro exercício com um texto qualquer no vídeo de referência e tente
      salvar. O campo deve ficar destacado e mostrar **Informe um link** ao lado
      do rótulo.
- [x] Substitua o texto por um endereço iniciado por `https://` e salve. O
      exercício deve ser incluído normalmente.
- [x] Recarregue a página. Os exercícios cadastrados devem permanecer na lista.

## 2. Template dentro do treino

- [x] Abra **Criar treino** ou edite um treino existente e clique em
      **+ Atividade**.
- [x] Confirme que existe apenas o botão **+ Atividade** no cabeçalho da área de
      atividades.
- [x] Na nova atividade, clique no campo **Template**. A lista de exercícios
      cadastrados deve aparecer sem impedir a digitação.
- [x] Digite parte do nome de um exercício. A lista deve filtrar os resultados
      durante a digitação.
- [x] Escolha um template. Drill, tipo, duração, unidade, foco, situação e vídeo
      devem ser preenchidos com os dados do exercício escolhido.
- [x] Altere algum campo preenchido pelo template e salve o treino. A alteração
      deve valer somente para essa atividade, sem modificar o exercício salvo na
      biblioteca.
- [x] Clique novamente em **+ Atividade**. A nova atividade deve abrir acima do
      cabeçalho **Atividades do treino**; as anteriores devem manter a ordem.

## 3. Alertas e estados de salvamento

- [x] Em um modal de treino, integrante ou exercício, deixe um campo obrigatório
      vazio e tente salvar. A mensagem **Campo obrigatório** deve aparecer ao
      lado do respectivo rótulo, sem negrito excessivo.
- [x] Preencha o campo. O destaque vermelho e a mensagem devem desaparecer; o
      asterisco deve ficar cinza.
- [x] Esvazie novamente o mesmo campo. O asterisco deve retornar ao vermelho.
- [x] Faça uma alteração válida e salve. O aviso no topo deve confirmar a ação.
- [x] Clique no **X** desse aviso. Ele deve desaparecer imediatamente.
- [x] Faça uma alteração e depois volte todos os valores ao último estado salvo.
      O botão de salvar deve ficar cinza e indisponível.

## 4. Regressão rápida

- [x] Confirme que um **Coach** sem atribuição de atleta não aparece entre os
      convocados do treino.
- [x] Use **Marcar todos** e **Desmarcar todos** na convocação e confira que
      apenas atletas ativos são afetados.
- [x] Recarregue a página na área atual. A visão selecionada, a página e o treino
      em foco devem ser preservados, sem exibir outra tela rapidamente.

## Resultado da validação

| Área                     | Resultado                | Observações |
| ------------------------ | ------------------------ | ----------- |
| Biblioteca de exercícios | ⬜ Aprovado / ⬜ Ajustar |             |
| Templates no treino      | ⬜ Aprovado / ⬜ Ajustar |             |
| Validações e alertas     | ⬜ Aprovado / ⬜ Ajustar |             |
| Regressão                | ⬜ Aprovado / ⬜ Ajustar |             |

## Verificação técnica desta entrega

- `npm run format:check`: aprovado.
- `npm run typecheck`: aprovado.
