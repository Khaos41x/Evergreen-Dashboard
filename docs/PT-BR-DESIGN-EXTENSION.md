# Evergreen — extensão em português do sistema existente

Registro de implementação de 30/10/2026. Extensão ordinária do Evergreen, sem nova direção visual. `DESIGN.md` e `.impeccable/design.json` continuam como sistema incumbente e foram preservados. Este documento descreve apenas os ajustes entregues; não substitui seus tokens.

## Continuidade visual observada

| Aspecto | Evidência no código entregue | Aplicação nesta extensão |
| --- | --- | --- |
| Paleta | `src/styles.css`: fundo `#070a09`, sidebar `#090e0d`, painel `#0a0f0e`, superfície elevada `#0d1312`, texto `#f3f4f2`, texto secundário `#bdc7c3`, divisória `#1b2320`, esmeralda `#10d994` | Sala de foco e Como usar reutilizam variáveis e superfícies existentes. |
| Tipografia | Pilha Inter/sans local; títulos serifados permanecem nas superfícies existentes que já os utilizam | Não houve download de fonte nem substituição global de hierarquia. Room/Help usam a interface sans. |
| Controles | Colaboração: cantos de 8px, alvo principal de 44px, campos de 16px; diálogos de 14px | Novas ações reutilizam os controles e diálogos reais. |
| Layout | Conteúdo de colaboração com 32px; em telas pequenas, 24px/16px | Novas seções limitadas a 1180px; linhas planas com divisórias, sem nova grade de cartões. |
| Profundidade | Superfícies tonais, linhas de 1px e scrim dos diálogos existentes | Não foi criado novo sistema de sombras ou material. |

Fontes comparadas: `DESIGN.md`, `.impeccable/design.json`, `src/styles.css`, `tailwind.config.js`, `src/collaboration/collaboration.css`, `src/features/identity/identity.css`, `src/features/productivity/productivity.css` e componentes amostrados abaixo. A configuração Tailwind não adiciona um tema concorrente.

## Marca e proveniência

O componente `src/components/EvergreenBrand.tsx` passa a apresentar `/evergreen-holdings-logo.png` com texto alternativo “Evergreen Holdings”, dimensões intrínsecas 1536 × 1024 e `object-fit: contain`. `EvergreenBrand.css` mantém a proporção 3:2: apresentação padrão de 180 × 120px, compacta de 72 × 48px e cabeçalho de colaboração de 132 × 88px. Após o usuário rejeitar o retângulo claro, a apresentação usa `background: transparent` e `filter: brightness(0) invert(1)`: a marca fica clara sobre o tema escuro com alfa preservado, sem placa de fundo.

Na autenticação, a solicitação posterior removeu “Seu espaço. Sua equipe.” e o texto de apoio. O cabeçalho contém apenas a marca maior, centralizada acima do formulário. `src/features/identity/identity.css` define coluna única com largura máxima de 560px, padding desktop de 40px/32px, gap de 28px e cabeçalho flex centralizado. A marca usa largura de até 320px no desktop e 280px no mobile, limitada ao espaço disponível (276px no viewport de 320px), altura automática e proporção 3:2. Os overrides antigos da marca na autenticação foram removidos de `EvergreenBrand.css`. Esse ajuste pertence à superfície de acesso, sem alterar a apresentação dos demais módulos.

Origem: imagem fornecida pelo usuário, `C:/Users/sobooa7iqytvqheo/Downloads/Logotipo Evergreen Holdings.png`. Destino: `public/evergreen-holdings-logo.png`, PNG RGBA, 1536 × 1024. SHA256 verificado nesta documentação: `F6AA0849F3F3F69F95A59F58BDF03D1EF48DF499079D5CA42510BF6A52DB106F`. Os bytes foram preservados; a adaptação de cor ocorre somente na renderização CSS, sem edição, vetorização ou geração substituta do arquivo. A proveniência fica no documento para preservar o original.

## Português e acesso

O pedido direto de português prevalece sobre a instrução antiga de inglês no material anexado. Rótulos visuais e acessíveis, formulários, situações, prioridades, papéis, avisos e formatação de datas/números usam português do Brasil. `src/i18n/pt-BR.ts` concentra traduções de códigos e formatação; dados escritos pelas pessoas, IDs, enums persistidos e rotas mantêm compatibilidade. Os nomes visíveis Visão, Finanças e Fundadores correspondem às rotas estáveis `/vision`, `/economy` e `/founders`.

Cadastro comum usa nome, e-mail, senha e cargo opcional, sem convite obrigatório. Após confirmação de e-mail, uma conta pode criar seu espaço isolado ou aceitar acesso compartilhado por uma equipe. Cargo e metadados de cadastro não concedem associação corporativa nem permissões automáticas. A decisão e as migrações são descritas em `PRODUCT.md` e `docs/PT-BR-REGISTRATION.md`; aplicação de migrações não equivale à validação E2E dos provedores.

Cancelamento, expiração, incompatibilidade e falhas de segurança do WebAuthn recebem orientação em português por `credentialFailure()` em `src/features/identity/client.ts`. A normalização envolve criação, autenticação, parsing de opções e serialização; mensagens nativas em inglês não são exibidas diretamente nesses caminhos. O veredito independente final pontua esta correção como resolvida, no escopo desse único item.

## Sala de foco e Como usar

`src/features/productivity/FocusRoom.tsx` recebe membros autorizados, sessões e presença existentes. Foto/nome/cargo vêm dos perfis; o papel traduzido funciona como alternativa ao cargo. Ausência de sessão e falha de presença têm texto explícito. A tela não inventa participantes ou atividade e não adiciona áudio/vídeo.

O contador é derivado de `started_at`, `paused_at`, `paused_ms`, modo e duração; a atualização visual por segundo é local. Pausas não contam como foco e o temporizador respeita sua duração. Em falha de presença, a interface explica que os tempos refletem as últimas sessões recebidas. A ação principal abre o fluxo real de foco. Abaixo de 640px, informações da sessão passam para outra linha e a ação principal ocupa a largura disponível.

`src/features/productivity/GettingStarted.tsx` oferece ações para criar tarefa, iniciar foco, abrir mensagens, consultar histórico e personalizar perfil/espaço. Os callbacks são encaminhados pela colaboração às ações existentes. Os atalhos são apresentados com `kbd`; atalhos de letras respeitam os campos de digitação. Canais, conversas privadas, respostas, menções e lista/quadro de tarefas reutilizam os comportamentos existentes, inspirados nos padrões já adotados de Slack e Linear.

## Acessibilidade e movimento

O código mantém labels, foco visível, campos de tamanho legível, estados de carregamento/erro e diálogos existentes com fechamento e retorno de foco. Marca tem texto alternativo; presença tem texto além do ponto colorido; erro de presença usa `role="alert"`; o relógio tem rótulo e números tabulares. Não há anúncio `aria-live` a cada segundo. Ações de Room/Help são botões reais e as explicações mantêm comprimento limitado.

Room/Help não acrescentam animação de entrada. A colaboração conserva a regra de rolagem sem suavização para `prefers-reduced-motion: reduce`; o efeito de respiração do cronômetro existente é desativado nessa preferência. Isto descreve implementação e verificações locais, sem declarar auditoria completa de leitores de tela, contraste de todos os estados ou acessibilidade em aparelhos físicos.

## Evidência e limites

O construtor e a revisão independente abriram as capturas da extensão: `output/platform/auth-1440.png`, `signup-390.png`, `onboarding-390.png`, `economy-390.png`, `founders-1440.png`, `vision-390.png`; e `output/playwright/functional-home-1440x900.png`, `local-tasks-390.png`, `fixture-chat-1440.png`, `focus-room-390.png`, `getting-started-1440.png`. Elas antecedem a correção final da transparência da marca. Este passe documental não recapturou nem iniciou nova busca de defeitos.

A correção da marca tem revisão nova em `.impeccable/review/transparent-logo-review.md`, com `disposition: ship` restrito ao logo. Construtor e revisor abriram as três capturas válidas `C:/Users/sobooa7iqytvqheo/Documents/Codex/2026-10-26/npm-ci-npm-run-dev/outputs/Evergreen-logo-transparente-{390,790,1440}.png`, incluindo a largura intermediária relatada pelo usuário. Confirmaram continuidade do fundo escuro, proporções preservadas e ausência de placa; o handoff registra fundo computado `rgba(0, 0, 0, 0)`, ausência de overflow e build aprovado. Não há extensão desse veredito às migrações ou à aplicação inteira.

A revisão posterior `.impeccable/review/centered-logo-review.md` registra `disposition: ship` somente para a remoção do slogan e a marca maior centralizada. O construtor e o revisor abriram capturas válidas no mesmo diretório: `Evergreen-logo-central-login-390.png`, `Evergreen-logo-central-signup-790.png` e `Evergreen-logo-central-login-1440.png`. O handoff do navegador registra login/cadastro em 320/390/790/1440px com centro horizontal no meio do viewport, dimensão natural de 1536 × 1024, transparência e ausência de overflow. Essas capturas substituem as anteriores como referência visual atual da autenticação; nenhum desses vereditos cobre a aplicação inteira.

Resultados locais registrados no handoff: build; núcleo com 17 grupos; SQL de plataforma com 19 verificações; identidade HTTP com 13; interface em 390/478/1440px; colaboração e modo pessoal em 320/375/390/430/768/1440px; preservação/backup e World/modelo. `output/platform/browser-results.json` registra cadastro comum, primeiro espaço, recuperação, OTP, cerimônia virtual e `nativeWebAuthnErrorsPortuguese: true` nas três larguras. Os testes de colaboração incluem Sala de foco/Como usar e abertura dos diálogos reais. São fixtures, banco local, autenticador virtual e emulação móvel; não são E2E de provedor nem testes em dispositivos físicos.

`.impeccable/review/pt-registration-review.md` apontou uma correção material: erro nativo de WebAuthn em inglês. `.impeccable/review/pt-registration-verdict.md` registra `disposition: ship` para esse item resolvido. O veredito não é nova auditoria completa da superfície, autorização de publicação ou certificação de produção. A observação inicial sobre `PRODUCT.md` antigo foi superada pela atualização atual de 30/10.

Detector: `FAILED/unavailable`, binário 0.1.5 indisponível, sem segunda execução e sem pass inferido. A consulta inicial das oito tabelas e as tentativas expiradas são históricas. O handoff mais recente registra ativação autorizada no Supabase dedicado: produtividade `20261030144552` e release aberto atômico `20261030150627` aplicados, com identidade, Finanças, Fundadores e cadastro presentes, 38 tabelas com RLS, cadastro habilitado e confirmação de e-mail exigida. As contagens antes/depois permaneceram em 9 espaços, 15 associações, 16 mensagens e 3 registros; a sonda de sessão inválida foi rejeitada. A restrição antiga por convite foi rejeitada pela revisão automática e aposentada em `supabase/legacy`, sem aplicação. Esses fatos operacionais vêm do handoff; este passe documental não executou consultas ou migrações.

A checagem local registrada obteve HTTP 200 para índice, marca e configuração, sessões por cookie e flags de Google/passkeys desativadas. Não houve E2E de provedor nem deploy: SMTP, Google, passkeys, Redis, Storage/Realtime e cerimônias físicas permanecem `NOT_VERIFIED` no fluxo integrado; detalhes operacionais pertencem a `docs/SECURITY-CONTROLS.md` e `docs/PLATFORM-VALIDATION.md`.

## Deriva não promovida a regra

O sistema incumbente registra a marca serifada textual e o sidecar ainda contém exemplos em inglês; o produto atual usa a imagem fornecida e textos em português. O registro é principalmente de colaboração e não cobre toda a diversidade tipográfica das outras superfícies existentes. Essas diferenças são anotadas sem reescrever `DESIGN.md`/sidecar, sem transformar exemplos antigos em exigência de idioma e sem canonizar estilos isolados. Nenhum reparo de deriva ou redesign foi autorizado neste passe documental.
