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
