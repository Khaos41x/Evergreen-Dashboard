# Arquitetura

## Frontend e dados

`Root` separa explicitamente produtividade local e colaboração. O modo local mantém as chaves `evergreen.workspace.v1` e `evergreen.focus-session.v1`; selecionar modo local não autentica nem compartilha dados. `Auth` mantém sessão Supabase persistida pelo SDK, acompanha eventos de sessão, oferece cadastro/login/recuperação/nova senha e só renderiza colaboração com sessão. `Collaboration` usa o UUID real da conta; nenhuma identidade fixa participa de autorização remota.

`client.ts` centraliza cliente e erros. `useLiveData` carrega apenas o workspace ativo, cancela aplicações de respostas antigas e recarrega após mutações; Postgres Changes e reconciliação periódica/foco atualizam dados compartilhados. `Chat` assina mensagens do canal, reconcilia por UUID e usa confirmação do INSERT antes de exibir o envio. UUID mantido entre tentativas resolve resposta perdida sem duplicar a gravação. Paginação usa `(created_at,id)`; texto é renderizado como texto React, sem HTML injetado. O upload usa buckets privados e paths autorizados por recurso, após a segunda migração.

O editor remoto salva explicitamente, mantém conteúdo se falhar, permite responsável, projeto, objetivo, status e progresso. Controle otimista por `version` impede sobrescrita silenciosa de edição concorrente. Projetos, tarefas e objetivos são registros por workspace com tipo imutável. A segunda migração acrescenta checklist, prioridade, vencimento, comentários, sugestões com consentimento, handoff, Inbox privado e Issues. A importação legada ainda arquiva campos extras na descrição; não converte automaticamente todos os novos domínios.

## Banco e autorização

Tabelas `eg_profiles`, `eg_workspaces`, `eg_members`, `eg_channels`, `eg_channel_members`, `eg_invites`, `eg_messages`, `eg_records`. Todas com RLS; sem acesso anônimo. Índices para escopo e histórico. Acesso privado exige participação explícita no canal, além de participação no workspace. Uma sessão autenticada isoladamente não concede acesso a linhas de outro workspace.

Helpers `SECURITY DEFINER` vivem no schema não exposto `evergreen_private`, com search_path vazio e checagens de `auth.uid()`. RPCs públicas são wrappers `SECURITY INVOKER`; EXECUTE revogado de PUBLIC/anon. Operações atômicas: criar workspace e proprietário/canal inicial; aceitar convite vinculado ao e-mail confirmado; criar canal e participação; administrar membros e canais. Somente proprietário gerencia papéis/removal; proprietário não pode ser rebaixado. Remover membro limpa atribuições, participação em canais e convites já aceitos para impedir reentrada por replay.

Privilégios de colunas impedem alterar escopo, autoria e timestamps. Trigger atribui autor/nome/hora de mensagem e impede ressuscitar mensagem excluída. Exclusão de mensagem é tombstone por UPDATE, evitando limitações de eventos DELETE com RLS. Mensagens só podem ser editadas/excluídas pelo próprio autor. Registros exigem referências de projeto/objetivo no mesmo workspace e responsável participante por FK composta.

## Migração dos dados locais

Exportação explícita de JSON bruto, depois confirmação de compartilhamento e importação. Originais nunca removidos. `source_key` único por workspace/tipo/id legado torna retomada idempotente. Projetos e objetivos são importados antes de tarefas; antigos responsáveis são remapeados para a conta importadora. Campos extras são arquivados em descrição; Inbox e foco permanecem no backup local. Importação pode ser parcial em erro; informa erro e pode ser retomada. Não há sincronização automática local↔remoto. Armazenamento local inválido suspende gravação em vez de sobrescrever silenciosamente o original.

## UX e disponibilidade

Identidade existente: fundos escuros, verde esmeralda, marca serifada, linhas finas, componentes utilitários. Desktop: sidebar de workspaces/canais e navegação de áreas. Mobile: drawer, navegação inferior, formulários de toque, alturas dinâmicas e safe-area. Botões de enviar/salvar têm pending, erro e confirmação remota. Canal sem participação oferece entrar; em privado o servidor controla adesão.

## Limites e próximos recursos

Chamadas/voz/vídeo, documentos colaborativos, agentes de IA e PWA não foram implementados. DMs, threads, reações, Presence, notificações, uploads, pesquisa e produtividade avançada estão implementados localmente, mas ainda dependem de aplicar e verificar a segunda migração no serviço hospedado.

Revisão operacional pendente: advisors hospedados, SMTP/limites de Auth, teste de reconnect/revogação e volumes grandes, monitoramento, backup de banco, testes de abuso e políticas de retenção. Realtime usa Postgres Changes com reconciliação por polling (12 s mensagens, 15 s workspace). Remoção e revogação podem demorar até a reconciliação no cliente, embora o servidor já negue novas leituras/escritas. O MVP permanece não verificado até completar os cenários reais.

## Estado hospedado em 2026-10-27

Projeto dedicado `dlxsakabwtpdimolsmgd`, organização Evergreen, conectado à aplicação local. Schema aplicado pelo SQL Editor e RLS/publicação conferidos no banco real. Histórico da CLI ainda requer reconciliação antes de qualquer db push; não reaplicar a migração inicial.

O carregador associa cada snapshot ao workspace carregado e ignora respostas antigas de outro escopo. A seleção de workspace/canal é persistida por UUID de conta em `evergreen.cloud-selection.<userId>` e validada novamente pela lista autorizada do servidor. Criações preservam a seleção solicitada enquanto a sincronização incorpora o novo registro. Atualização de perfil usa UPDATE somente do nome, sem ampliar privilégios de colunas.

Nove verificações E2E e sete grupos negativos pela Data API real passaram. Contas descartáveis foram provisionadas pelo Auth Admin com confirmação automática; SMTP, cadastro público com caixa real e recuperação permanecem pendentes. Consulte VALIDATION.md para evidências e limites; estes resultados substituem o antigo bloqueio de configuração, sem comprovar recursos posteriores.


## Domínios de produtividade (segunda migração pendente)

`src/features/productivity` contém modelos, repository, carregador com proteção de escopo e módulos de Tasks/Issues, objetivos, Focus/Home, Work, perfil, anexos e pesquisa. Operações atômicas e autorização ficam em RPCs e RLS; algumas operações de interface ainda usam o cliente diretamente.

Focus usa timestamps do servidor, duração acumulada de pausa e uma sessão ativa por usuário. A interface deriva o relógio sem gravar a cada segundo; Presence usa canal privado por workspace e mudanças de estado. Goals recalculam progresso ponderado; uma tarefa não contribui duas vezes no mesmo Objective. Checklist deriva o percentual da Task. Manual não é apresentado como cálculo por IA.

Storage usa `eg-files` e `eg-avatars`, limites de MIME/tamanho e URLs assinadas. Arquivos são vinculados a canal ou registro, ainda sem vínculo individual a mensagem/comentário. Perfis públicos de colegas omitem preferências e nome privado. Notificações têm RLS por destinatário; vencimentos são avaliados ao atualizar os dados, sem cron hospedado.

O teste de schema diferencia coluna ausente de falhas de rede/permissão. Recursos novos só são habilitados após verificar a coluna da segunda migração. Erros não viram sucesso local. Estado hospedado dos novos domínios: NOT_APPLIED / NOT_VERIFIED.
