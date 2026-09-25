# Entrega 01 — roteiro de validação

## Como validar esta revisão

1. Abra a aplicação em `http://127.0.0.1:3002/` e confirme que o treino mais próximo aparece selecionado depois de recarregar.
2. Como Coach, abra **Criar treino**. Preencha nome, evento, data, local e objetivo.
3. Em **Atividades do treino**, complete a primeira linha com tipo, drill, duração, unidade e foco. Adicione uma segunda atividade; use uma situação e um link do YouTube, se quiser.
4. Publique e confira o evento e o plano de atividades no detalhe do treino.
5. Clique em **Editar treino**. Altere o título, uma atividade e a convocação. Salve; a tela deve refletir os novos dados.
6. Recarregue a página. O treino editado e suas atividades devem permanecer.
7. Troque para a visão de Atleta. A demonstração usa somente Mazzola como identidade; não há seletor para assumir outro atleta.
8. Confirme participação. Volte para Coach e registre a presença. Confirmação e chamada continuam independentes.
9. Repita em tela estreita.

## Critérios desta revisão

- [ ] Evento identifica o treino inteiro e pode ficar vazio.
- [ ] Tipo pertence a cada atividade.
- [ ] Cada atividade suporta drill, duração, unidade, foco, situação e vídeo de referência.
- [ ] Coach consegue editar um treino.
- [ ] Dados legados são preservados e atualizados para o novo formato local.
- [ ] Ao abrir/recarregar, a aplicação seleciona o treino mais próximo por data.
- [ ] O seletor de outro atleta não aparece mais.

## Verificação técnica realizada

- `npm run typecheck`: aprovado.
- `npm test`: 5 cenários aprovados, incluindo edição, validação de atividades e migração dos dados anteriores.

## Ainda pendente

Login real, convites, banco compartilhado, edição do elenco, cancelamento de eventos, vídeos hospedados e os módulos posteriores da V1.
