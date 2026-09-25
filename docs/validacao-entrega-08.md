# Validação 08 — permissões administrativas e persistência local

## Preparação

1. Abra a aplicação e selecione a visão de teste **Coach**.
2. Abra **Pessoas** e edite o perfil **Coach Demo**.
3. Confirme que a opção **Administrador** está disponível e marcada.

## Administração e elenco

1. Crie um integrante com atribuição de atleta e salve.
2. Altere o status para **Inativo** e confirme que o perfil continua aparecendo no elenco, com sua situação preservada.
3. Exclua o integrante usando o botão **Excluir**.
4. Confirme que somente o perfil excluído é removido e os outros integrantes permanecem.

## Treinos, exercícios e comunicações

1. Em **Treinos**, confirme que o admin vê **Excluir** no treino selecionado.
2. Em **Exercícios**, confirme que coaches podem criar e editar exercícios.
3. Confirme que **Excluir** aparece na biblioteca somente para o admin.
4. Em **Comunicação**, confirme que o admin pode excluir uma mensagem.
5. Mude para a visão de teste **Atleta** e confirme que nenhum botão de exclusão aparece.

## Recuperação de dados locais

1. Navegue entre **Home**, **Treinos** e **Comunicação** e recarregue a página.
2. Confirme que a última página e o último treino selecionado são preservados.
3. Os testes automatizados também verificam que uma chave local inválida é recuperada isoladamente, sem apagar preferências válidas.

## Resultado esperado

O admin é uma atribuição adicional do perfil. Inativar continua sendo uma ação independente de excluir. A interface local restringe exclusões a administradores, sem impedir coaches de realizar as atividades operacionais previstas.
