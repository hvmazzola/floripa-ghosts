# Modelo de dados e permissões — proposta para o Marco 1

## Entidades para integração com Supabase

- profiles: id vinculado ao usuário autenticado, nome, foto opcional.
- teams: nome e identificação do time; apenas Ghosts operacional na V1.
- memberships: vínculo único de perfil com time, status ativo/inativo, número.
- membership_roles: um registro por atribuição (admin, coach, athlete).
- positions e membership_positions: catálogo e relação de posições do atleta.
- membership_units: ataque e/ou defesa.
- events: time, tipo, título, início em UTC, fuso do evento, local, objetivo, autor e status.
- event_invitations: evento e vínculo convocado, resposta e data de resposta.
- attendance: evento e vínculo, presença real, responsável pela chamada e data.

Convocação única por evento/vínculo. Ausência de chamada não significa falta.
Desativação de integrante preserva histórico. Alterações de atribuição devem ser administrativas.
O cadastro no banco será feito por migrações versionadas; nenhuma conta externa foi criada.

## Matriz proposta

| Ação                                | Admin                  | Coach                 | Atleta                               |
| ----------------------------------- | ---------------------- | --------------------- | ------------------------------------ |
| Gerenciar integrantes e atribuições | Sim                    | Não                   | Não                                  |
| Consultar elenco ativo do time      | Sim                    | Sim                   | Sim, apenas dados esportivos básicos |
| Criar/editar/cancelar treino        | Apenas se também coach | Sim                   | Não                                  |
| Consultar eventos                   | Todos do time          | Todos do time         | Apenas convocados                    |
| Responder convocação                | Própria, se convocado  | Própria, se convocado | Própria                              |
| Registrar chamada                   | Apenas se também coach | Sim                   | Não                                  |
| Consultar chamada                   | Conforme atribuições   | Do time               | Própria                              |

As permissões são cumulativas. O servidor validará sessão e vínculos; RLS protegerá cada tabela. Não usar chaves privilegiadas no navegador.
Na demonstração atual, a tag de administrador é adicional às atribuições de coach ou atleta. O Coach Demo começa como administrador. A exclusão de integrantes, treinos, exercícios e comunicações é reservada a administradores; a inativação do integrante continua disponível no perfil e preserva seu histórico.

Definições acima são regras da interface local; a validação de segurança efetiva será aplicada no servidor quando entrarem autenticação e banco de dados.
