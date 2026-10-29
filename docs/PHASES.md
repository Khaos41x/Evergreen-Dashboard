# Fases do Evergreen — 2026-10-27

**Implementado localmente não significa validado no Supabase hospedado.** Identidade visual preservada.

| Domínio | Disponível no código | Serviço hospedado |
| --- | --- | --- |
| Auth/workspace/membros/convite | Login/cadastro/recuperação, papéis e convite por e-mail | Núcleo PASS; SMTP/caixa real pendentes |
| Perfil | Nome público/privado, username, bio, timezone, preferências e avatar | Novos campos NOT_VERIFIED |
| Tasks/Issues | CRUD, arquivo/restauração, cópia, prioridade, prazo, filtros, lista/board, checklist, comentários/menções, sugestão consentida, handoff e conversão | Novos fluxos NOT_VERIFIED |
| Inbox | Captura privada e conversão atômica | NOT_VERIFIED |
| Focus/Home | Timer/stopwatch por timestamps, pausa/retomada/extensão/troca/conclusão, sessão única e Presence privado | NOT_VERIFIED |
| Objectives | Áreas, metas ponderadas, Tasks sem dupla contagem, valores numéricos/manuais | NOT_VERIFIED |
| Messages | Canais, DM de duas pessoas, threads, reações, pins, busca, leitura, menções e conversão Task/Issue | Chat núcleo PASS; extensões NOT_VERIFIED |
| Files | Bucket privado, autorização por recurso, URL assinada e avatar | NOT_VERIFIED |
| Notifications/Work/Search | Notificações, vencimento no refresh, eventos, sessões, métricas, heatmap, timeline, filtros e Ctrl K | NOT_VERIFIED |
| Vercel | Build e configuração SPA preparados | Sem deploy |

## Diferenças abertas

- Responsável único por Task; atribuição múltipla não adicionada.
- Arquivos pertencem a canal/registro; vínculo individual por mensagem/comentário não implementado.
- Milestones usam contagem; editor de marcos individuais não criado.
- Busca de mensagem abre canal, sem localizar mensagem antiga específica. Registros/eventos têm limites e precisam de paginação adicional para histórico extenso.
- Vencimentos avaliados no refresh, sem agendador em background ou envio externo.
- Alguns fluxos misturam português e inglês.
- Importação legada preserva extras na descrição, sem converter toda estrutura normalizada nova.
- Algumas mutações ainda estão nos componentes; extração completa para repositories não terminada.
- Chamadas, voz/vídeo, PWA, documentos colaborativos e IA autônoma não implementados. Manual não é anunciado como IA.

A colaboração completa e funcionamento na Vercel permanecem abertos. A segunda migração continua NOT_APPLIED; funcionalidades remotas novas NOT_VERIFIED. Não há mocks de produto ou sucesso silencioso para mascarar esses limites.


## Direção de produto: holding interna

Sem comercialização, planos, cobrança ou cadastro livre. Workspaces são espaços internos de empresas/equipes. Conta nova exige convite vinculado ao email; owners/admins convidam, e só owners existentes criam novos espaços. Terceira migração implementada e testada em SQL local, ainda NOT_APPLIED no serviço. A organização corporativa usa workspaces existentes; não há organograma/SSO implantado.
