# Correções de UX

Base: 2a8a24b. Checkout: Documents/Codex/Evergreen-Dashboard.

## P0-1 — viewport e rolagem

Causa reproduzida: o shell limitava a altura, mas seus filhos e os estilos de cada módulo disputavam overflow e espaçamento. O histórico tinha padding próprio que cobria a folga. Em 390×480, cabeçalho, busca e compositor não cabiam; descendentes absolutos de Fundadores também contribuíam para a altura externa sem um ancestral posicionado.

Correção: src/features/layout/viewport.css:1 centraliza altura dinâmica, contenção, min-size, fundo e --bottom-inset (navegação + safe-area + 24px). AppViewport.tsx:1 acompanha visualViewport sem interferir em zoom. Root.tsx integra ambos. Economy, OrganizationHub, Founders e Chat tornam a região principal focável. Chat oferece busca recolhível em altura curta e preserva o compositor.

Reprodução: results-734x715.json em output/playwright/ux/before registrou 13 falhas de contrato (variável ausente, região sem foco, folga e fim de conversa encoberto). A asserção sobre esse registro falhou com exit 1. Capturas antes/depois: output/playwright/ux/{before,after}/economy-734x715.png e demais rotas. Não foi reproduzida a área preta original da sessão publicada; esta correção não comprova que aquele relato está resolvido em produção.

Prova: node scripts/test-ux.mjs, exit 0: 80 inspeções, 4 rotas × 4 larguras × 4 alturas, mais as 4 rotas com altura reduzida por teclado em 390. Roda, toque CDP, Space, PageDown, documento sem rolagem, ancestral sem rolagem adicional, folga inferior e foco final foram verificados em Chromium real. O gesto de toque foi ajustado para começar acima da barra inferior, dentro da região visível. Simulação de altura não equivale a teclado físico iOS/Android.

Infraestrutura: os comandos lint, typecheck, test e check:build estavam ausentes e falharam com Missing script. Foram adicionados. auth-config-check.mjs foi convertido de Windows-1252 para UTF-8 para permitir análise sintática. O manifest público de build é excluído explicitamente do pacote OTA pelo exportador; a suíte OTA passou. GlobalSearch passou a carregar ao abrir, mantendo o orçamento inicial.

Saídas finais desta etapa:
- lint: exit 0, avisos preexistentes de variáveis não usadas.
- typecheck: tsc -b, exit 0.
- test: holding-model e world-model, exit 0.
- build: exit 0; avisos existentes de chunks grandes e importações Capacitor.
- check:build: {"initialJavaScriptGzipBytes":244289,"baseline":244603,"scanned":258,"matchedSecrets":0}.
- test:mobile:ota: exit 0; criptografia/arquivo locais e transporte/plugin controlados, sem instalação em dispositivo.
- test:ux: exit 0, 80 inspeções sem falhas.

## Decisão P1-2

Em 11/11/2026 o usuário confirmou: manter Chairman = fundador original; APEX = fundador de empresa; NÍVELO = CEO. Referências: ProfessionalLevels.tsx, organizations/model.ts, people/model.ts, migrações 20261030200108_professional_profiles.sql e 20261030211959_evergreen_os_v2.sql e PRODUCT.md. Cargo, participação e permissão são independentes. Nenhuma alteração de significado no banco foi autorizada.

## P0-2 — contexto e alcance

Causa: o cabeçalho exibia apenas texto; não havia leitura contextual dos dados independentes de cargo, participação e permissão. A troca no trilho alterava o workspace mesmo com um formulário financeiro aberto. Revisões de governança e de votos executavam a operação diretamente.

Correção: AccessChip.tsx:8 consulta eg_os_snapshot e eg_professional_profile; aceita apenas o snapshot da empresa ativa e apresenta separadamente os três campos, com estados ausente/carregando/erro. Não deduz autoridade de cargo ou equity. O chip inclui breadcrumb e troca de empresa no topo, também em Fundadores. sensitiveScope.tsx:3 introduz pedido cancelável de troca: cancelar preserva contexto/rascunho; aceitar descarta e requer nova revisão. Economy.tsx registra workspace e papel financeiro da origem na revisão; o botão nomeia valor e destino. Founders.tsx revisa concessão/escopo/votos/revogação. Boardroom e FinanceOperations usam useScopedReview.tsx:7 com leitura contextual e confirmação antes da RPC existente. Nenhuma regra do servidor foi substituída.

Prova vermelha: output/ux-context-before.log, exit 1, chip ausente. Prova verde: UX_ITEM=P0-2 COLLAB_SURFACES=1 COLLAB_ATLAS=1 COLLAB_WIDTHS=390,734,1440 node scripts/collaboration-ui-check.mjs, exit 0, nove verificações por largura: chip nas rotas após carregarem, três campos, resposta A5 independente de cargo/25%, confirmação financeira, cancelar/aceitar troca, descarte de revisão, resposta A6 e revisão de acesso em Governança. Capturas: output/playwright/ux/after/context-{390,734,1440}.png. Antes visual: economy-734x715.png da reprodução P0-1.

Saídas: typecheck exit 0; lint exit 0 com avisos existentes; build exit 0; check:build 242187 bytes gzip contra 244603 da base, matchedSecrets=0; oito inspeções de rolagem no menor viewport/teclado passaram. Modelos unitários já passavam e não houve mudança de regras de domínio. Perfil passou a carregar sob demanda para manter orçamento. Estes testes usam HTTP de teste em Chromium; persistência, RLS e decisões com duas contas hospedadas não foram validadas.

## P1-1 — navegação e Finanças

Causa: cabeçalho duplicava Finanças/Fundadores e ocultava a busca em telas médias. Havia filtro de canais independente da paleta, atalho apenas Ctrl e resultados sem origem. A sequência de título/contexto/filtros/cartões altos empurrava o livro para fora da dobra.

Correção: Collaboration.tsx:260 mantém um chip e uma busca, sem os dois destinos duplicados; WorkspaceNavigation.tsx usa a mesma paleta para canais. GlobalSearch.tsx:10 aceita canais e rotula cada resultado por empresa; mensagens consultam a relação real eg_channels(workspace_id). WorldModeSwitch.tsx:3 exibe Mapa; navigation.ts mantém /vision como alias e emite /mapa. Economy.tsx usa DecisionKpis.tsx:9 e decision-kpis.css:1: saldo, fluxo, vencimentos e teto mensal menos despesas do período. Nenhuma tendência/meta ausente foi inventada: a indisponibilidade é textual. Vencimentos e contagem vêm de eg_os_operations. As seis abas permanecem com marcador e aria-current. Revisão de transferência e orientação para primeira conta permanecem.

Prova vermelha: output/ux-finance-before.log, exit 1 (Finanças duplicado); captura before/finance-decision-734.png. Primeira passagem verde encontrou a linha fora da dobra; CSS de módulos carregados tardiamente tinha prioridade igual e aplicava padding/botões maiores. A especificidade agora preserva as dimensões planejadas.

Prova verde: UX_ITEM=P1-1 COLLAB_SURFACES=1 COLLAB_ATLAS=1 COLLAB_WIDTHS=390,734,1440 node scripts/collaboration-ui-check.mjs, exit 0, 14 verificações por largura. Em 734×715: dataHeight=401.921875, panelHeight=642.921875, ratio=0.6251488565387513. Primeira linha inteira e ação primária visíveis; livro acessível em uma interação. Ctrl+K e Cmd+K abriram a mesma paleta. Carregamento, vazio, erro 403 deliberado e recuperação foram exercitados. Capturas after/finance-decision-{390,734,1440}.png.

typecheck/lint/build/check:build passaram; JS inicial=242160, base=244603, matchedSecrets=0. Os logs de 403 são da resposta de falha controlada para testar a recuperação. Registros são fixtures explícitas e não dados operacionais.

## P1-2 — níveis e confirmação

Decisão resolvida pelo usuário: manter significados atuais. As definições UI/código/banco/docs foram apresentadas na pergunta, e a resposta foi "Sim, manter os significados atuais". Não há pergunta pendente e não houve mudança no banco.

Causa: cartões de marca separados não esclareciam limites nem distinguiam a confirmação por um estado explícito em cada pessoa. As definições não eram compartilhadas com o contexto de acesso.

Correção: levelVocabulary.ts:2 centraliza os quatro termos. ProfessionalLevels.tsx:14 apresenta tabela Nível / Quem é / O que pode fazer / Onde vale. APEX como título de vínculo e A0 como código operacional são descritos sem derivar um do outro. A tabela explicita concessões por servidor e a condição independente de assento aceito. Confirmado tem marcador textual/ícone; Convite pendente tem relógio e borda tracejada. AccessChip compartilha as descrições no disclosure Entender os níveis. professional-levels.css:1 substitui cores fixas por tokens de tema.

Prova vermelha: output/ux-levels-before.log exit 1, tabela ausente; before/levels-734.png. Prova verde: UX_ITEM=P1-2 COLLAB_SURFACES=1 COLLAB_ATLAS=1 COLLAB_WIDTHS=390,734,1440 node scripts/collaboration-ui-check.mjs, exit 0; oito verificações por largura. Pendentes nunca têm Confirmado. Capturas after/levels-{390,734,1440}.png e levels-access-*.png. typecheck, lint, build e check:build passaram. JS inicial=242559 (base244603), matchedSecrets=0.

## P1-3 — navegação em 600–1000 px

Causa: workspace.css no breakpoint 1000px ocultava completamente a barra e exigia Abrir menu. selectContext e seu wrapper redefiniam a seção para home a cada troca.

Correção: responsive-navigation.css:2 mantém trilho de 56px e barra de 64px; expande em hover/foco/Ctrl ou Cmd+Shift+Backslash e permite fixar. Labels permanecem na árvore acessível e badges não lidas aparecem no ícone. WorkspaceNavigation.tsx:14 guarda somente preferência de fixação. useCompanySections.ts:5 guarda navegação por usuário/empresa no sessionStorage; não guarda registros nem autoridade. O servidor continua limitando empresas e canais. Abaixo de 600, cinco botões na navegação inferior incluem Mais, com destinos adicionais e Fundadores apenas para conta autorizada; chip de empresa continua no topo.

Prova: a primeira tentativa teve timeout de carregamento e foi descartada como evidência; a reprodução seguinte falhou por barra invisível (output/ux-navigation-before.log). Após correção, UX_ITEM=P1-3 COLLAB_SURFACES=1 COLLAB_ATLAS=1 COLLAB_WIDTHS=390,734,1000 node scripts/collaboration-ui-check.mjs passou com 13 verificações por largura: recolhida, atalho, fixar/recolher, troca no trilho, restauração Conversas/Finanças, badge, Tab, limites mobile e destinos em Mais. Troca usa um clique; localizar conversa usa diretório + linha (dois cliques). Capturas before/navigation-734.png e after/navigation-*.png. typecheck/build/check:build passaram; JS inicial=243497, base=244603, matchedSecrets=0.

## P2 — tokens, acessibilidade e regressão visual

Causas reproduzidas:
- A regra inicial encontrou 1182 candidatos a cores/classes fixas. Duas ocorrências eram a classe semântica text-emerald (já resolvia para var(--emerald)); a regra distingue essa classe de paletas fixas. A migração registrou 1205 usos de cor e 814 primitivas históricas em 31 arquivos.
- Fora do Atlas, o --heading-font global de workspace.css levava Libre Caslon a textos menores que 20px. A asserção sobre a auditoria inicial falhou em oito telas.
- Em 320px a tabela horizontal de níveis não recebia foco: axe encontrou scrollable-region-focusable. As seis abas financeiras mediam 40px em vez da meta móvel de 44px.
- atlas.css suprimia o contorno de campos também ao usar teclado e fixava o indicador em 1px.
- A integração da barra expandida revelou um desvio de clique: durante a transição de largura o texto do rodapé quebrava, reduzindo o painel de navegação entre pointerdown e pointerup. O registro real mostrou Trabalho ao pressionar e o perfil ao soltar.
- can_finance no retorno de eg_os_operations descreve escrita, enquanto os compromissos retornados já passaram pela autorização de leitura do servidor. Usar esse booleano para esconder vencimentos era incorreto; o caso de leitura falhou antes da correção.

Correções:
- scripts/check-tokens.mjs:1 usa PostCSS e AST TS/TSX para rejeitar cores fixas fora dos quatro arquivos de paleta/tema. color-tokens.css e visual-colors.ts centralizam os valores de compatibilidade sem mudar a paleta. Novas superfícies usam aliases semânticos; veja ux-tokens.md.
- themes.css:364 define color-scheme, --control-border e --focus-ring explicitamente em cada tema. accessibility.css:1 aplica corpo/heading Geist fora dos títulos grandes profissionais, foco, alvos, seleção com peso/marcador e movimento reduzido. atlas.css mantém o modo de ponteiro e passa a oferecer contorno de teclado de 2px.
- ProfessionalLevels.tsx:12 dá foco e nome ao contêiner horizontal da tabela. A regra móvel de abas tem prioridade sobre o CSS financeiro carregado tardiamente e garante 44px.
- WorkspaceNavigation.tsx:16 e responsive-navigation.css:2 distinguem hover, foco de teclado, fixação e encerramento após navegar; removem a animação de largura que deslocava os alvos. Texto do rodapé não quebra durante a expansão; o botão de fixação fica no mesmo lugar.
- Economy.tsx:194 conta compromissos abertos e aprovações pendentes. DecisionKpis usa os vencimentos autorizados para leitura; o booleano de escrita apenas orienta a ação disponível. A confirmação continua vinculada à empresa e permissão recebidas. Reautenticações pendentes são canceladas ao descartar o contexto; nenhuma migração ou regra de autoridade do servidor foi alterada.

Provas e capturas:
- Tokens: ux-tokens-before.log falhou; check:tokens final tem zero violações. test-tokens.mjs injeta temporariamente hex, rgb, hsl e classe de paleta fixa e exige quatro rejeições; remove o arquivo no finally.
- Migração visual: compare-ux-themes.mjs passou nos 15 pares de /hub, /economy e /founders em Atlas, Evergreen, Preto, Elétrico e Claro. Treze imagens foram idênticas; em duas, 37 e 29 pixels variaram somente 1/255 em menos de 0,01% da imagem. A comparação permite apenas essa tolerância mínima de rasterização; alterações maiores falham. Pares em output/playwright/ux/{before,migration}/theme-*.png.
- Auditoria final: test:ux:axe passou em 320 e 734px: 30 combinações rota/tema, mais dez estados de erro financeiro, total de 40 análises axe sem violações sérias/críticas. Zero texto Caslon abaixo de 20px, zero alvos abaixo de 24px e zero alvos móveis abaixo de 44px nos controles medidos. Contrastes mínimos medidos: secundário 5,57:1; fronteira de controle 4,20:1; foco 7,23:1.
- Teclado: foco visível nas regiões disponíveis, menu de status do quadro moveu uma tarefa sem arrastar e registrou a alteração pelo fluxo existente, com HTTP de teste. A simulação de leitura atrasada confirmou que a empresa nova aparece e a resposta antiga não reaparece. As telas executadas são React real, não jsdom.
- Reflow: 320px sem overflow e equivalente de 400% por viewport 320×180 com DPR4 (captura salva em 320×180 pixels CSS). Isso representa o espaço CSS de um viewport 1280×720 ampliado quatro vezes; não é uma validação do zoom/teclado do sistema em um dispositivo físico.
- Preservação: uma cópia temporária do commit 144f783, sem credenciais, produziu as referências profissionais. compare-ux-preservation.mjs confirmou zero pixels diferentes em Empresas e atuação a 390 e 1440px. Os dois PNGs originais da marca são byte a byte iguais. A árvore conservou 45190 pontos, filtro none e opacidades 0,44/0,68. Capturas before/after/professional-preserved-*.png.
- A suíte antiga foi atualizada para selecionar o destino no dd (o novo botão também nomeia o destino) e verificar neutralidade/contraste AA da tabela, em lugar da cor exata do cartão anterior. Sua execução final passou em 390/734/1440, incluindo envio/revisão de transferência, centavos exatos, arquivos, conversas, troca de empresa e revogação de leitura.

## Resultado consolidado

A bateria final está em output/ux-final-results.json: features, extras, accessibility, matrix e regression, todos exit 0. A matriz final cobre 80 inspeções em Chromium: quatro rotas, quatro larguras, quatro alturas e altura reduzida nas quatro rotas a 390px. Além de documento/ancestrais, exige somente uma região vertical no painel principal quando seu conteúdo excede a altura; a navegação tem seu próprio domínio e não rola o documento.

lint (inclui check:tokens), typecheck, modelos unitários, build e check:build passaram. JS inicial final: 242214 bytes gzip; base imutável: 244603; 277 arquivos inspecionados pelo scanner de assinaturas, matchedSecrets=0. O scanner tem cobertura por padrões e não substitui auditoria de credenciais. A suíte OTA local também passou, com arquivo/criptografia reais e transporte/plugin controlados.

As saídas completas finais, sem substituir falhas históricas pelos resultados novos, estão em ux-verification.txt. Os logs de 403 dos testes financeiros e Storage são respostas de erro intencionalmente controladas.

## Limites e validações restantes

A área preta original de /hub e o elemento claro da sessão publicada não foram reproduzidos exatamente. O color-scheme já era dark no Atlas na auditoria inicial; não foi atribuída uma causa ao elemento claro sem evidência. O controle da sessão autenticada no navegador estava desativado no Work na tentativa desta revisão, portanto não houve inspeção dessa sessão nem comprovação do problema específico em produção.

Não houve publicação manual, merge, migração hospedada, acesso ao provedor com duas contas ou teste de teclado/safe-area em telefone físico. Reflow/teclado simulado e HTTP controlado não provam iOS/Android, RLS, persistência hospedada ou prontidão de produção. Essas validações e a compreensão do vocabulário/escopo por pessoas reais permanecem necessárias. Avisos de lint preexistentes e os avisos de chunk 3D/Capacitor do build continuam documentados nas saídas.

P1-2 não tem pergunta pendente: o usuário confirmou manter os significados atuais. Cargo, participação e permissão permanecem independentes. Os commits de cada item estão no histórico da branch codex/evergreen-vision-economy.
