# Validação — 2026-10-27

**Produto completo: NÃO DECLARADO. Segunda migração: NOT_APPLIED no Supabase hospedado. Novos domínios remotos: NOT_VERIFIED.**

O núcleo anterior foi validado no projeto real dlxsakabwtpdimolsmgd. Os resultados históricos estão em VALIDATION-CORE-20261027.md e não comprovam a segunda migração. Nenhum push ou deploy foi executado.

## Estado de banco

- 20261026171401_collaboration_core.sql: aplicada pelo SQL Editor. Oito tabelas com RLS e cinco publicadas no Realtime verificadas no serviço real. Não reaplicar; histórico CLI não reconciliado.
- 20261027115328_productivity_domains.sql: replay local aprovado, **não aplicada no serviço hospedado**.
- O navegador retornou: Local browser use is disabled in Work settings. Sem conexão administrativa disponível para aplicar a nova migração. Não houve tentativa de contornar essa configuração.
- Chave administrativa e senhas temporárias dos testes anteriores foram removidas; não fazem parte da entrega.

## Verificações locais

| Verificação | Resultado | Limite |
| --- | --- | --- |
| TypeScript + Vite | PASS | Build local |
| SQL/RLS: 17 grupos | PASS | PGlite com schemas Auth/Realtime/Storage de fixture |
| Regressão local | PASS | Tasks, checklist, projetos, objetivos, timer/stopwatch, pausa, conclusão e persistência |
| Colaboração: 320/375/390/430/768/1440 | PASS | REST simulado; chat, Task, editor, ajustes, drawer |
| Focus e Work: 320/390/1440 | PASS | Componentes; teclado, pending, erro, recuperação, retorno de foco e datas |
| Task → Focus com alteração não salva | PASS | Fixture 390px; recusa preserva texto, confirmação por teclado abre Focus |
| Revisão independente | PASS no escopo revisado | Três correções materiais; identidade preservada |

SQL local cobre isolamento de workspace, papéis, canais privados, autoria, concorrência, checklist, Inbox privado, consentimento, handoff, Focus/timestamps, metas ponderadas/deduplicação, DM/thread/reação/leitura, paths de Storage, avatar, username, timezone e preferências. Schemas simulados não validam gateway Auth, transporte Presence/Realtime ou arquivos hospedados.

Evidências: output/security-results.json, output/collaboration-ui-results.json, output/productivity-review-results.json e output/playwright/. Fixtures existem somente nos testes; o produto usa Supabase real e informa falhas.

## Serviço real: evidência histórica do núcleo

Antes da extensão passaram nove verificações E2E e sete grupos negativos pela Data API. Foram comprovados login, workspace/convite, chat Realtime, persistência, autorização e atribuição básica. Contas foram provisionadas pelo Auth Admin; isso não comprova SMTP, cadastro com caixa real ou recuperação por e-mail.

Os arquivos históricos output/e2e-real-results.json e output/real-security-results.json não devem ser substituídos por execução bloqueada nem usados para declarar a extensão pronta. O E2E histórico precisa ser adaptado aos novos fluxos. A captura mobile histórica mostra estado transitório, sem provar tela final estável.

## Próxima validação hospedada

1. Ativar Local browser use nas configurações do Work e abrir o projeto dedicado autenticado.
2. Conferir schema e aplicar somente a segunda migração transacional. Conferir RLS, grants, buckets, publicação Realtime e Presence. Reconciliar histórico CLI separadamente; nenhum reset.
3. Com contas descartáveis, testar Task atribuída → notificação → Focus → Presence do colega → sessão → conclusão → Goal/Objective → Timeline/estatísticas/heatmap → thread, incluindo recarga.
4. Testar negações por externo/membro removido/canal privado/DM/Inbox/anexos; reconnect e revogação.
5. Validar caixa de e-mail real, celular físico, advisors e volumes maiores. Vercel requer configuração/autorização e teste da URL publicada.

Veja PHASES.md para diferenças ainda não implementadas. Esta entrega não constitui aceite integral dos 30 critérios do pedido.


## Mudança para uso interno da holding

Migração adicional `20261027160000_internal_holding_access.sql`: NOT_APPLIED no serviço hospedado. Frontend sem cadastro aberto; ativação por convite. SQL local passou 17 grupos, incluindo restrição de criação de workspace, convite válido por email, negações, confirmação e remoção/replay. Auth UI fixture passou em 320/390/1440; resultado em `output/internal-access-ui-results.json`. Nenhum desses testes comprova GoTrue/SMTP hospedado. Consulte `INTERNAL-ACCESS.md` para bootstrap do responsável, revisão dos owners existentes e aplicação segura.


## Publicação Vercel autorizada

Frontend publicado em https://evergreen-holding.vercel.app (deployment READY). Página/assets/rota SPA verificados por HTTPS. O primeiro responsável peixotodavy831@gmail.com, os redirects de produção e as migrações posteriores ainda precisam de configuração administrativa no Supabase. Nenhuma conta foi criada nesta publicação. Detalhes em docs/DEPLOYMENT.md (ou DEPLOYMENT.md neste diretório).
