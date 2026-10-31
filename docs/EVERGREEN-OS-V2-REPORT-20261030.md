# Evergreen OS V2 — entrega e homologação

Atualização de 31/10/2026: o pacote aprovado `57c94c4` foi aplicado e publicado. Evidência remota e limites em [ACTIVATION-OS-V2-20261031.md](ACTIVATION-OS-V2-20261031.md). O texto abaixo registra o estado local anterior à aprovação.

Data: 30/10/2026. Escopo: diretivas Master Build e Master Implementation V2, mais os seis comentários do início. A V2 prevalece sobre a definição anterior de fundadores ilimitados.

## Estado desta entrega

Esta versão está implementada e testada localmente. **A migração OS V2 e esta versão do frontend ainda não foram aplicadas/publicadas em produção.** A consulta atual do projeto dedicado confirmou que a última migração hospedada é `evergreen_professional_profiles`, versão remota `20261030203725`.

Enquanto o backend OS V2 não estiver ativado, o frontend mantém o acesso aos espaços e configurações existentes, sem apresentar as novas operações como disponíveis.

Os testes de interface usam respostas HTTP sintéticas; os de banco executam SQL/Postgres em PGlite com identidades e sessões de teste. Nenhum deles equivale à homologação de Auth, Realtime, Storage ou dispositivos reais no Supabase/Vercel. O histórico de ativação da versão anterior permanece em `ACTIVATION-WORKSPACE-PROFILES-20261030.md`.

| Funcionalidade | Classificação | Evidência e limite |
| --- | --- | --- |
| Aviso de sessão concluída | IMPLEMENTADA E VALIDADA, localmente | Fechamento sobrevive a quatro atualizações e remount; revisão manual continua disponível; regressões de temporizador/cronômetro passaram |
| Saudação com a empresa, remoção da nota e CTA maior | IMPLEMENTADA E VALIDADA, localmente | Interface em 390, 790 e 1440 px; CTA medido; sem overflow |
| Árvore sem PNG durante a execução | IMPLEMENTADA E VALIDADA, localmente | 45.190 pontos XYZ, geometria com profundidade, sem pedido de textura PNG; profundidade reconstruída, não o modelo 3D original |
| Hub e Evergreen Group como organização própria | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Workspace geral separado do ambiente reservado dos fundadores; diretório com acesso autorizado |
| Empresa independente e Builder de oito etapas | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Criação transacional, slug único, reenvio idempotente, convites e rollback de entradas inválidas; nenhum vínculo automático com o grupo |
| Níveis A0–A6 e E0–E6 | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Nomes personalizáveis, permissões técnicas no servidor; cargos e participação separados; grupo ativo exige deliberação |
| Três assentos Chairman | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Três posições/IDs permanentes, aceite individual, igualdade de autoridade-base após ativação, bloqueio de remoção unilateral e de rotas antigas de desvio; sucessão unânime restaura a autoridade do novo titular e preserva direitos independentes nas empresas |
| Propostas, votos e execução | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Dois votos ordinários por padrão no grupo; unanimidade para assentos/políticas estruturais; conflitos, votos imutáveis, prazo e revalidação de acesso |
| Vínculo empresa/grupo ou parceria | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Aprovações dos dois lados e escopos explícitos; aprovação do grupo pelo conselho quando ativo |
| Sociedade e evidência privada | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Percentuais exatos, proposta versus documentada, comprovação privada e deliberação; retirar acesso não apaga participação nem histórico |
| Contas a pagar/receber e recorrência | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Centavos exatos; aprovação solicitada a partir do compromisso ou formulário do Cofre, com conta/valor preenchidos; caixa muda somente na liquidação; repetição a partir da data original, incluindo fim de mês |
| Política de aprovação financeira | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Conta, destino, valor, descrição e lançamento vinculados à autorização; dois aprovadores sem conflito; alteração de política ativa por conselho |
| Intercompany | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Atalhos legados de transferência entre workspaces bloqueados; dois aprovadores distintos e atuais, uma partida de saída e outra de entrada, transação atômica, mesma moeda, saldo e idempotência; não executa pagamento bancário |
| Conversa privada em grupo | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Reusa mensagens/canais; somente membros explicitamente selecionados da mesma organização |
| Canal compartilhado entre empresas | IMPLEMENTADA, PENDENTE DE HOMOLOGAÇÃO | Aprovação bilateral, participantes explícitos, workspace isolado, nível de origem respeitado e revogação imediata; não concede acesso aos outros canais |
| Chat, projetos, tarefas, perfis, anexos, presença e Vision existentes | IMPLEMENTADAS, PENDENTES DE HOMOLOGAÇÃO nesta combinação | Preservados; regressões locais de envio/edição/exclusão, busca, tarefa, foto, foco, navegação e alternativa sem WebGL |
| Sessões seguras e reautenticação | IMPLEMENTADAS, PENDENTES DE HOMOLOGAÇÃO com provedores reais | BFF e cookies existentes preservados; novas ações sensíveis também exigem sessão recente no servidor e no banco |
| Google OAuth e passkeys | IMPLEMENTADAS, PENDENTES DE HOMOLOGAÇÃO do provedor | Código/transportes existentes; flags e configuração reais não ativadas por esta entrega; testes virtuais não comprovam cerimônia criptográfica hospedada |
| IA com consultas autorizadas | NÃO IMPLEMENTADA como serviço operacional | Tela informa ausência de provedor e oferece busca real autorizada; não gera respostas simuladas nem envia documentos a modelos |
| Cloudflare, Vercel, Supabase e Asaas como fontes conectadas | PENDENTES DE CONFIGURAÇÃO/HOMOLOGAÇÃO | Adaptadores anteriores preservados; esta entrega não configurou credenciais nem atestou ingestão real dessas fontes |
| Voz/vídeo, pagamentos bancários e atos societários legais | NÃO IMPLEMENTADOS | Mensagens e livro interno não são chamadas de voz, transferências bancárias ou registro jurídico |

## Arquitetura e decisões

React/Vite, Supabase Auth/Postgres/RLS, backend de mesma origem e rotas atuais foram preservados. A autenticação não carrega componentes 3D. Não foram introduzidos tokens de autenticação no armazenamento do navegador.

1. **Platform:** conta, sessão, criação de organizações e infraestrutura.
2. **Evergreen Group:** organização interna, com comunicação geral, diretório, trabalho institucional e conselho. O espaço reservado dos fundadores continua separado.
3. **Empresas:** workspaces independentes. Ser administrador do grupo não concede acesso operacional ou financeiro automático a uma empresa.
4. **Salas compartilhadas:** workspaces exclusivamente para a conversa aprovada; não entram no diretório de empresas ou consolidado financeiro.

Uma organização externa não entra na holding por ser criada na plataforma. O vínculo é um pedido bilateral. A consolidação existente continua somando lançamentos em centavos por moeda: transferências internas têm entradas opostas e não são receitas/despesas duplicadas. Registros manuais continuam distintos das observações de provedores.

Os três assentos existem sem inventar contas. A migração inicia a designação a partir do responsável já confirmado, sem aceitar em seu nome. Miguel Mármore e Gabriel continuam dependentes dos convites, das contas confirmadas e do aceite pessoal. A governança colegiada só é ativada depois dos três aceites. Antes disso, permanece explicitamente o procedimento de designação inicial.

Nomes de níveis não mudam códigos/permissões automaticamente. Nível, cargo, vínculo profissional, percentual societário e escopos estratégicos são registros diferentes. O código E0 deriva dos assentos ativos; não é uma opção comum de promoção. Empresas novas recebem A0 para o responsável inicial. Membros antigos mantêm acesso existente até atribuição explícita; não há reclassificação em massa silenciosa.

Políticas financeiras ativas não podem ser desligadas unilateralmente. Aprovações intercompany expiram em 24 horas e precisam de acesso atual; podem ser renovadas pelo aprovador do respectivo lado antes da execução. Não há execução de transferência externa. Os critérios de aprovação não substituem confirmação e controles da instituição financeira.

## Migração e APIs

Migração incremental e transacional: `supabase/migrations/20261030211959_evergreen_os_v2.sql`.

Fontes legíveis: `supabase/os-v2-api.sql`, `os-v2-operations.sql`, `os-v2-group-levels.sql`, `os-v2-shared-channels.sql`. `node scripts/compose-os-migration.mjs` recompõe a migração; o replay deve ser executado após qualquer alteração dessas fontes. O arquivo de migração é o artefato aplicável no Supabase.

| Área | RPCs |
| --- | --- |
| Contexto | `eg_os_context`, `eg_os_snapshot`, `eg_os_operations`, `eg_os_channels` |
| Empresas e níveis | `eg_os_company_create`, `eg_os_company_update`, `eg_os_assign_level`, `eg_os_level_name`, `eg_os_level_permissions`, `eg_os_group_level` |
| Conselho | `eg_os_council`, `eg_os_seat`, `eg_os_seat_consent`, `eg_os_propose`, `eg_os_vote`, `eg_os_execute` |
| Vínculos e colaboração | `eg_os_link`, `eg_os_group_chat`, `eg_os_shared_channel`, `eg_os_shared_channels` |
| Sociedade e financeiro | `eg_os_equity`, `eg_os_commitment`, `eg_os_intercompany`, `eg_os_finance_policy` |

Tabelas adicionadas cobrem níveis/atribuições, espaço geral do grupo, pedidos de vínculo, três assentos, propostas/votos/consentimentos, participações, compromissos, intercompany/aprovações, consumo de autorizações, salas compartilhadas, auditoria e chaves de idempotência. Escritas sensíveis são feitas por RPCs verificadas. Funções privadas e versões antigas de desvio não têm execução direta concedida ao cliente. Helpers usados por políticas existentes foram substituídos preservando seus OIDs.

## Arquivos de implementação

- `src/features/organizations/`: Hub, Builder, organização do grupo, administração da empresa, conselho/resumos legíveis, pessoas/níveis, sociedade, compromissos, política financeira, conversas privadas e salas compartilhadas.
- `src/collaboration/Collaboration.tsx`, `WorkspaceNavigation.tsx`, `workspace.css`: integração, seleção de contexto, rail e navegação.
- `src/components/FocusTimer.tsx`, `src/features/productivity/FocusHome.tsx`: conclusão identificada por sessão e reconhecimento visual de fechamento.
- `src/pages/HomePage.tsx`, `src/components/HeroTree.tsx`, `HeroTree.css`: contexto da empresa, retirada da nota, CTA e projeção da geometria.
- `public/evergreen-tree.geometry.bin`, `.json`, `scripts/build-hero-tree.py`: geometria derivada da referência existente e proveniência.
- `server/proxy.mjs`, `src/features/holding/useOperation.tsx`: reautenticação das novas ações e tratamento de `REAUTH_REQUIRED`.
- `src/features/economy/Economy.tsx`: acesso aos compromissos/aprovações mantendo o Cofre existente.
- `supabase/bootstrap-holding-owner.sql`: exclui o workspace geral do grupo de vínculos empresariais automáticos do bootstrap legado.
- `scripts/os-sql-check.mjs`, `os-browser-check.mjs`, suites de segurança/identidade/colaboração e `package.json`: cobertura automatizada.

## Testes e evidências

| Comando | Resultado local |
| --- | --- |
| `npm run build` | Compilação TypeScript e build passaram; chunk WorldScene de aproximadamente 947 kB continua lazy e mantém o aviso de tamanho existente |
| `npm run test:platform:security` | 42 grupos de verificações e replay passaram; relatório `output/platform/sql-results.json` |
| `npm run test:identity` | 14 grupos passaram; inclui bloqueio de sete novas ações quando a sessão não é recente |
| `npm run test:os:ui` | Fluxos em 390, 790 e 1440 px, incluindo autorização direta no Cofre e manutenção do mesmo identificador; `output/os/browser-results.json` |
| `npm run test:collaboration-ui` | Sete larguras: 320, 375, 390, 430, 768, 790 e 1440 px; fixture HTTP, sem prova de Realtime hospedado |
| `npm run test:platform:ui` | Cadastro, recuperação, passkey virtual, Cofre/Founders, cofre 3D e navegação sem WebGL passaram nas larguras cobertas |
| `npm run test:local:regression` | CRUD, cronômetro/temporizador, persistência, seis larguras e preservação/backup de dados locais inválidos passaram |

Capturas ficam em `output/os/`, incluindo propostas com seletores nomeados, resumos financeiros e início ativo/ocioso. A revisão visual independente está registrada em `EVERGREEN-OS-V2-DESIGN-REVIEW.md`. O detector automático do Impeccable não teve veredito: o engine 0.1.5 não estava instalado no ambiente. Isso não foi tratado como aprovação automática.

## Limites e riscos restantes

- Homologar a combinação no Supabase/Vercel com duas contas reais, incluindo reconexão Realtime, upload/download privado, remoção de acesso, convites e persistência após reload. Os testes locais com múltiplas identidades não substituem essa prova.
- A árvore mantém silhueta/intensidade da referência 2D, com profundidade reconstruída. O arquivo original 3D não foi fornecido; não é possível afirmar que a profundidade é a original ou idêntica.
- Propostas sensíveis exigem aprovadores sem conflito. Um quadro com poucas contas administrativas pode não ter quórum; o servidor falha fechado. Não criar contas fictícias para preencher essa necessidade.
- Listas novas ainda não têm paginação/cursor completo em todas as áreas. A auditoria mostra os últimos cem eventos. Validar volume real antes de ampliar o uso.
- Juros, amortização e conciliação de empréstimos intercompany não são automatizados. O tipo classifica o lançamento aprovado; não cria contrato ou cronograma de amortização.
- A personalização fina de quóruns por tipo de decisão, edição legal de estruturas societárias e automação de ingestão de provedores não são um sistema jurídico/contábil completo.
- Solicitações externas de vínculo/canais dependem de identificar a organização de destino. Diretório público global de empresas não foi aberto, preservando a privacidade.

## Ativação revisável

Esta entrega não altera os produtos/bancos da ORKTO ou ThinkerChess. Os workspaces dessas empresas dentro do Evergreen pertencem ao projeto Supabase dedicado.

Após aprovação deste pacote: aplicar a migração OS V2 no projeto `dlxsakabwtpdimolsmgd`; verificar tabelas, políticas, grants e backfill do espaço geral/três assentos; publicar o frontend correspondente; executar smoke público e homologação autenticada separadamente. Não ativar os assentos no lugar das pessoas nem habilitar provedores sem a configuração e validação reais.

Preservar a versão anterior do frontend para rollback e os dados novos. Não executar um down destrutivo sobre participações, votos ou lançamentos. A migração completa está em uma transação; falhas de aplicação devem abortar a operação antes do deploy correspondente.

Commits locais de implementação:

- d072519 — correção do resumo de foco e árvore com geometria/profundidade.
- 46be7dc — Hub de organizações, governança colegiada, controles financeiros, colaboração e testes.
- 7b725e4 — transição segura de autoridade na sucessão de um Chairman, com teste completo.

O commit de documentação contém este relatório. Nenhum push ou deploy OS V2 foi realizado durante a preparação local. O pacote de evidências inclui somente os relatórios desta execução; relatórios antigos de produção não foram reutilizados como homologação OS V2.
