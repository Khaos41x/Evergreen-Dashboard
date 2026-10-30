# Evergreen — extensão de organização

Inspeção de 30/10/2026. Escopo: organizar empresas, equipe e projetos por extensão do sistema preto/esmeralda existente. Este documento é a única escrita da passagem documentadora. `DESIGN.md`, `.impeccable/design.json`, branding, UI e políticas de acesso foram preservados; não há redesenho ou nova identidade.

## Overview

A entrada “Empresas e equipe” na sidebar abre a aba Empresas da central existente. `CompanyOperations` reúne as contagens carregadas da equipe, projetos, tarefas abertas e tarefas sem responsável de cada empresa operacional. As ações levam a Equipe e convites, Projetos, Tarefas ou Objetivos no workspace correspondente; não transferem registros entre empresas. Empresas com acesso apenas estratégico mostram essa condição e não oferecem ações operacionais.

`CreateCompany` permite ao responsável do grupo criar um workspace e vinculá-lo à holding com os RPCs existentes. `ProjectsModule` apresenta projetos do workspace, responsáveis e tarefas associadas; a tarefa usa o `TaskEditor` existente. `FounderInvites`, inserido em Fundadores → Governança para o owner, facilita o convite de equipe e deixa explícita a etapa posterior de concessão de fundador. `IntegrationSetup` identifica a preparação real de configuração do servidor antes de solicitar credenciais.

O cadastro comum de conta continua conforme `PRODUCT.md`: convite é uma forma de associação à equipe, não um requisito de criação da conta. Cargo, botão visível e contexto selecionado não concedem acesso financeiro ou estratégico. O convite de equipe não atribui automaticamente papel, capacidades ou escopo de fundador.

## Colors

A extensão reutiliza `collaboration.css`, `economy.css`, `productivity.css` e `holding.css`. Fundo quase preto, ação esmeralda, bordas discretas e avisos persistentes mantêm a continuidade. Novos estilos são locais; não criam tokens normativos globais.

| Papel observado | Valor local | Relação com o incumbente |
| --- | --- | --- |
| Divisórias de projeto | `#293c33` / `#273b31` | Neutros verdes escuros próximos de `--line` |
| Texto de apoio | `#b7c9bf` / `#bbcec2` | Variações locais de `--soft` |
| Progresso de projeto | `#00ce97` | Família esmeralda existente, sem equivalência literal a `--emerald` |
| Foco de projetos | `#24d4a1`, 2px, afastamento 3px | Foco explícito, escopo do módulo |
| Foco de convites | `#32d7a6`, 2px, afastamento 3px | Mesma família e espessura do módulo |

Empresa operacional, presença incerta, tarefa concluída e convite pendente têm texto. A barra de progresso vem acompanhada de contagem/percentual. A inspeção de capturas não substitui medição independente de contraste.

## Typography

A pilha sans local é herdada; não há fonte nova ou download. Títulos de projetos usam 22px e tracking `-.02em`; nomes de empresa e título do bloco de convites, 20px. Apoio usa entrelinha 1.6 e limite de 70ch; metadados usam 12–13px. Valores de contagem/progresso usam figuras tabulares; contagem por empresa, 26px.

Campos novos de Projetos e FounderInvites explicitam 16px, em continuidade com os formulários do incumbente. CreateCompany herda o formulário Holding. As diferenças já existentes de escala e valores literais da família Holding permanecem descritas em `DESIGN-HOLDING-EXTENSION.md`, sem normalização nesta passagem.

## Layout

Empresas permanecem em linhas abertas com divisórias, contagens em definição/lista e navegação de ações flexível. O formulário de nova empresa segue `holding-form`, com largura máxima de 560px. A lista de projetos tem largura máxima de 1250px e margem automática. Cada projeto separa título/estado, descrição, responsável, contagem, progresso e ações; tarefas filhas aparecem em linhas, sem novo quadro ou cartões aninhados.

Até 600px, cabeçalhos de projeto quebram linha, tarefas dão largura total ao título e os filtros se acomodam à largura disponível. Convites empilham os campos; o link ocupa sua própria linha antes da ação de copiar. Em 790/1440px, formulários e ações voltam a distribuir-se horizontalmente. O link continua em campo nativo selecionável, com rolagem interna do próprio input.

As doze capturas de `output/organization` carregam estilos de economia, produtividade, identidade, colaboração e Holding, dentro do wrapper `collab-app`. São um harness de componentes, não o shell autenticado completo. Os botões ingleses `organization/invites/projects/integrations` e mensagens como `w1/records`, “Vinculada new-company” e “Atribuição manual necessária” pertencem ao teste. Não são especificação de navegação nem textos aprovados para o produto.

Quatro capturas adicionais `output/playwright/organization-shell-{projects,team}-{390,1440}.png` mostram a extensão no shell completo: contexto global, sidebar desktop, menu e navegação inferior mobile, Projetos e Membros e acesso. A suite percorre Empresas e equipe → Projetos, cria um projeto novo no editor existente `.collab-modal` e percorre Empresas e equipe → Equipe e convites. Continuam sendo respostas REST de fixture, sem login ou persistência remota real; a mensagem “Item salvo no servidor” nas imagens é o texto do produto após a resposta simulada.

## Elevation & Depth

As novas superfícies são planas: linhas, bordas de 1px, listas e áreas de formulário. Projetos não introduzem sombra decorativa. Abrir tarefa reutiliza o modal existente de produtividade, com scrim, foco contido, Escape e retorno de foco ao acionador conforme `Dialog.tsx`. Confirmar identidade na criação/vinculação reutiliza `Reauthenticate` por `useOperation`.

## Shapes

Controles mantêm cantos de 8px herdados. O estado de projeto tem contorno com cantos de 7px; a barra nativa tem 6px de altura e máximo de 560px. Tarefas são botões em linha com cantos zerados. Projetos e convites explicitam alvos mínimos de 44px; ações operacionais por empresa também. CreateCompany e preparação de integração herdam parte da família Holding, cuja regra base continua 42px. Não se afirma que todos os controles da aplicação foram medidos em 44px.

## Components

| Componente | Comportamento e estados observados |
| --- | --- |
| Empresas e equipe | Shortcut da sidebar para Empresas. Escolher uma ação troca workspace, limpa o canal antigo e navega ao destino solicitado. Não concede vínculo à empresa estratégica. |
| CompanyOperations | Consulta somente IDs operacionais, limpa estado ao mudar o escopo e ignora resposta antiga. Loading, erro e repetição têm texto. Mostra equipe, projetos, tarefas abertas, sem responsável e vencidas. Acima do limiar de mil registros carregados, informa que as contagens cobrem os registros disponíveis. |
| CreateCompany | Nome com mínimo de dois caracteres; criação usa `eg_create_workspace`, vínculo usa `eg_founders_action('link')`. Owner/grupo controlam a apresentação; RPCs continuam sendo a autoridade. Sucesso só após confirmar o vínculo. |
| Recuperação de criação | Erro definitivo mantém o formulário corrigível. Após criar, conserva o ID para repetir apenas o vínculo, inclusive após reautenticação. Antes de vincular, consulta empresas já ligadas para evitar repetição. Resposta incerta da criação bloqueia recriação e pede conferir a lista/Configurações. Não simula rollback ou sucesso. |
| Projetos da empresa | Filtra records/membros pelo workspace; busca por título/descrição; estados Em aberto, Todos os ativos, Concluídos e Arquivados. Vazio e busca sem resultado têm textos distintos. |
| Progresso de projeto | Havendo tarefas ativas vinculadas, calcula concluídas/total e rotula “pelas tarefas”. Sem tarefas, mostra o valor já informado no projeto, rotulado “informado no projeto”. Não altera o estado do projeto automaticamente nem inventa execução com base em horas. |
| Tarefas filhas | `aria-expanded`/`aria-controls` em Ver/Ocultar tarefas. Abrir tarefa usa TaskEditor. Adicionar pré-seleciona `initialProjectId`; pessoas e records enviados ao editor já estão limitados ao workspace. Tarefas abertas sem projeto têm seção própria para vinculação. |
| FounderInvites | Consulta empresas em que o usuário tem owner/admin e somente convites não aceitos/não expirados. Usa `eg_invites` e RLS existentes; normaliza o e-mail e reutiliza convite válido. Exibe expiração e empresa. Não envia e-mail automaticamente. |
| Link e revogação | Antes de Mostrar link, relê o convite pendente; se expirou/foi aceito, remove-o da lista e limpa o link correspondente. Copiar tem fallback de seleção manual. Revogar exige confirmação e checa retorno da exclusão; erro preserva a linha e oferece nova tentativa. |
| Acesso de fundador | “Pessoa já entrou?” abre a atribuição existente em Governança. Não executa grant ao criar/reutilizar link. Aceite de equipe e concessão de capacidades continuam etapas explícitas separadas. |
| IntegrationSetup | GET autenticado/admin por empresa retorna apenas booleans de preparação e providers. Limpa o estado ao trocar workspace; respostas antigas não substituem o contexto novo. Loading, falha e Verificar novamente/Verificar preparação são explícitos. |
| Integração pendente | Proteção de credenciais, gravação dos indicadores e autenticação do agendamento mostram configurada/pendente. Formulário de token e escolha de recurso ficam ausentes até `ready`. Sincronização fica desabilitada. Backend também rejeita discover/connect/sync sem preparação, antes de consultar o provedor. |

### O que “preparado” significa

`integrationReadiness` valida o formato da chave de cifragem e a presença da chave de persistência no servidor. `scheduled` indica presença de `CRON_SECRET`; o texto manda confirmar a frequência na hospedagem. Isso não é teste de credencial externa, healthcheck de Storage/métricas, teste de escrita hospedada ou confirmação de cron agendado. O estado mostrado nas imagens é uma fixture com cifragem configurada, gravação pendente e agendamento não configurado.

### Movimento e acessibilidade

Não foi adicionada animação nova nos CSS de projetos/convites/linhas de empresa. A expansão de tarefas é imediata. As transições de fundo/borda da família Holding continuam condicionadas a `prefers-reduced-motion: no-preference`; os diálogos reutilizam a implementação existente.

Foram observados campos com labels, tipos nativos de e-mail, mínimo de nome, foco visível, estados busy/disabled, `role=status` para acompanhamento e `role=alert` para erro. O componente de convite mantém mensagem persistente em vez de toast efêmero. O editor usa diálogo com teclado e retorno de foco; a regressão de colaboração registra esses comportamentos. Não houve auditoria integral de leitor de tela, contraste, zoom do sistema ou dispositivo físico nesta passagem.

### Marca e preservação

A extensão não cria nem altera logo. `EvergreenBrand` e os PNGs permanecem os mesmos; não foram produzidos novos assets, fontes ou glifos de marca. A autoridade é o `PRODUCT.md` atual e os arquivos originais existentes. `DESIGN.md` e sidecar continuam com descrições históricas da marca Georgia e exemplos ingleses; essa defasagem foi preservada por escopo, sem regeneração.

| Arquivo preservado | SHA-256 antes/depois da documentação |
| --- | --- |
| `DESIGN.md` | `ADF8CF8C8DB1EFC08DFBE9219AD147C15375C8A93650CB353F2A9BBFFFBDD54F` |
| `.impeccable/design.json` | `0C4F3F4A5CF8D7BB889784980DBFFD05A59FF49A2E00D20DDF398D442AD8C2ED` |
| `src/styles.css` | `FAA808BAA829FB4DCE60E25B0319D90D8A20D23C11B781A2CE580DDE622C9989` |
| `public/evergreen-holdings-original.png` | `BB6F07CC8A9801E613D727F9556220D24324856ACC4C8968A6BB966925F62CE5` |
| `public/evergreen-holdings-logo.png` | `F6AA0849F3F3F69F95A59F58BDF03D1EF48DF499079D5CA42510BF6A52DB106F` |

## Do's and Don'ts

- **Do** levar a pessoa ao workspace da empresa antes de operar equipe, projeto ou tarefa.
- **Do** preservar distinção entre convite de equipe, cargo e grant de fundador/financeiro.
- **Do** identificar progresso derivado das tarefas e progresso manual informado.
- **Do** conservar ID e etapa concluída ao repetir vínculo; mostrar resultado incerto como incerto.
- **Do** informar preparação do servidor antes de solicitar segredos de serviço.
- **Don't** preencher empresas, equipe, projetos, indicadores ou sucesso para ornamentar vazios.
- **Don't** transformar `ready` ou `scheduled` em prova de API externa ou cron ativo.
- **Don't** usar o harness ou uma regressão de fixture como validação autenticada de produção.

### Evidências e limites

Lidos PRODUCT/DESIGN/sidecar, a referência Impeccable de documentação já utilizada nesta conversa, `CompanyOperations`, `CreateCompany`, `ProjectsModule`, `TaskEditor`, `Dialog`, `FounderInvites`, `IntegrationSetup`, CSS correspondentes, integração em Holding/Founders/Collaboration e preparação/backend. Foram abertas individualmente as doze capturas `output/organization/{companies,founder-invites,projects,integration-pending}-{390,790,1440}.png` e as quatro capturas `output/playwright/organization-shell-{projects,team}-{390,1440}.png`.

| Artefato inspecionado | Resultado registrado | Fronteira |
| --- | --- | --- |
| `output/organization/browser-results.json` | 390/790/1440px: ações por empresa; sem ações estrangeiras; validação corrigível; repetição do vínculo sem duplicação e após step-up usando o ID criado; convite reutilizado/revogado/revalidado; sem grant automático; projetos por escopo; pré-seleção do projeto; preparação; sem overflow/pageerrors | Edge com APIs interceptadas e dados sintéticos; não cria empresa, convite ou usuário remoto |
| `scripts/organization-browser-check.mjs` | Harness atualizado inclui economy/identity/productivity CSS e wrapper collab-app; testes percorrem falhas e recuperação das três correções | Capturas não são shell completo nem cobrem visualmente cada erro intermediário |
| `output/platform/identity-results.json` | 14 grupos locais; inclui status autenticado/admin sem segredos e bloqueio antes da configuração | HTTP/Auth/REST de fixture, não provedores reais |
| `output/holding/integrations.json` | Cinco grupos de conectores com respostas determinísticas | Sem API ou credencial externa real |
| `output/holding/browser-results.json` | Regressão Holding em 390/790/1440px, sem overflow/erros | Harness local |
| `output/collaboration-ui-results.json` | Seis larguras 320/375/390/430/768/1440px; `organizationShellNavigation: true` em 390/1440, cobertura referenciada nessas duas nas demais larguras; fluxos existentes e foco/teclado conforme resultados | REST de fixture; não prova Auth, persistência hospedada ou Realtime |
| `scripts/collaboration-ui-check.mjs` e quatro capturas organization-shell | Sidebar → empresa → Projetos; Novo projeto salvo pelo editor existente; retorno ao atalho → Equipe e convites; verificação de headings, dados e overflow em 390/1440 | Fluxo novo dentro do shell completo local, com endpoints interceptados |

O handoff final informa build aprovado, três correções do reviewer resolvidas e “Aceite visual concluído no escopo local revisado”, após as doze recapturas em três larguras. Essa conclusão é atribuída ao reviewer via handoff; nenhum arquivo de parecer final Organização estava disponível para leitura independente. Os verdicts antigos de plataforma/cadastro não são aprovação desta extensão. A evidência nova no shell foi conferida em fonte, JSON e quatro capturas. A passagem documentadora não repetiu testes, não publicou e não executou ações remotas.

**Estado de produção anterior, separado desta extensão:** `docs/ACTIVATION-HOLDING-20261030.md` registra publicação do código `87f3e33`, migrações da versão anterior e responsável real confirmado no banco. O handoff confirma que essa segue sendo a versão publicada. São evidências/estado informados da ativação anterior; não houve nova consulta hospedada nesta passagem. Portanto, não se repete a antiga afirmação de que todo o pacote Holding está sem ativação. `PRODUCT.md` e notas antigas que dizem “sem deploy” antecedem esse registro.

**Esta entrega de organização, no fechamento desta documentação:** nenhuma migração nova ou mudança de produção realizada pela passagem documentadora. O responsável pela implementação informou autorização do usuário para empacotar/publicar a UI, sem nova DDL ou variável de ambiente; o resultado externo dessa publicação ainda não foi recebido aqui. Até esse resultado, a versão publicada segue sendo a ativação anterior `87f3e33`; autorização não é evidência de publicação concluída. Nova UI/status não foram validados em sessão real hospedada por esta passagem. Não houve integração real, e-mail, convite remoto ou envio externo. A configuração de persistência de métricas e credenciais reais dos serviços continuam pendentes conforme a ativação anterior; cron não foi agendado aqui. Google/passkeys, e-mail real e APIs dos produtos não são comprovados pelos fixtures. Detector não foi executado novamente. A documentação não certifica produção, segurança hospedada ou disponibilidade de provedores.
