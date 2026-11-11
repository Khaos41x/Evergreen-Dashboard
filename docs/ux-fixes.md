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
