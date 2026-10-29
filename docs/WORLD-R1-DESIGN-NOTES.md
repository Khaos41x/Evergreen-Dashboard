# Evergreen World R1 — notas da extensão visual

Registro independente da implementação inspecionada em 2026-10-28. Escopo: modo **OPERATE**, com exploração espacial dentro da identidade Evergreen existente. Este documento complementa o sistema; não substitui `DESIGN.md`, não regenera `.impeccable/design.json` e não estabelece uma nova marca ou um novo North Star.

## Overview

World traduz pessoas e projetos carregados em estações e salas de um escritório isométrico. O diretório HTML e o inspector continuam sendo a superfície operacional para ler trabalho, abrir editores existentes e executar ações permitidas. A cena acompanha essa seleção; não autentica, não amplia acesso e não é requisito para trabalhar.

A marca serifada do shell, o conteúdo sans, os fundos quase pretos, as divisórias discretas e a seleção esmeralda mantêm continuidade com Evergreen. O escritório usa geometria 3D nativa, construída em código, com mesas, monitores, divisórias, piso, plantas e acesso arquitetônico. Nenhum raster novo, modelo baixado, fonte remota, bloom ou pós-processamento foi introduzido nessa superfície.

Não há comp visual aprovado para comparação pixel a pixel: a autoridade é o sistema incumbente, o contrato de superfície e o resultado executável. As capturas registram implementação, não passam a ser uma referência aprovada retroativamente. O detector visual ficou indisponível por engine/cache; não há resultado de detector a declarar como aprovado.

## Colors

O sistema existente conserva a ação esmeralda (`--emerald`, `#10d994`) e a família de neutros escuros. World reutiliza esse esmeralda em alternância, ações, seleção e progresso; ciano identifica salas, e âmbar comunica foco. Presença desconhecida é círculo vazado com texto, sem preencher uma disponibilidade fictícia.

| Papel observado | Valor efetivamente implementado | Uso |
| --- | --- | --- |
| Fundo World | `#080e0c` | Área de conteúdo |
| Fundo da cena | `#0b1510` | Canvas e moldura espacial |
| Inspector | `#0e1812` | Diretório e detalhes |
| Divisória World | `#25382e` | Separação estrutural |
| Texto principal / apoio | `#edf4ee` / `#b8c9bf` | Hierarquia operacional |
| Seleção de lista | `#193527`, borda `#3c6b50` | Item pressionado |
| Disponível / foco | `#10d994` / `#f2c16c` | Indicadores HTML acompanhados de rótulo |
| Label de sala | texto `#bbebf2`, borda `#3d6b73` | Diferenciação de projeto |
| Erro de ação | fundo `#34241e`, texto `#f7d4bd` | Alerta persistente, incluindo rejeição de fixture |

Os valores acima são inventário desta superfície, não novos tokens globais. O contrato indicava `#00d69b` e superfícies `#101b16/#17251e`; o código final preserva `#10d994` e usa os neutros listados. Essa diferença fica explícita, sem reescrever o contrato ou o sistema global nesta passagem.

## Typography

World herda a pilha Inter/ui-sans-serif do projeto, sem carregar uma fonte adicional. O título usa (28px, peso 600, entrelinha 1.2), passa a (25px) no breakpoint de 1100px e a (26px) até 768px. Detalhes selecionados usam (18px); orientação sem seleção, (20px). Diretório e ações usam predominantemente (12px), com metadados de (10–11px). No diretório mobile, nomes usam (11px) e presença (9px).

A busca World implementa (12px) em vez dos (16px) descritos para formulários no sistema de colaboração. Qualidade usa (11px). Isso é uma divergência local observada; a inspeção de capturas não verifica zoom de inputs em Safari/iPhone. Os rótulos pequenos da cena são complementares: nomes completos e ações permanecem no diretório.

## Layout

O shell mantém a navegação Work e acrescenta uma alternância Work/World visível no topo. A busca global entra no fluxo flex ao lado do seletor; no mobile, ações auxiliares do topo e atalhos de teclado da busca são ocultados para acomodar os controles. O retorno ao Work conserva a página anterior.

No desktop, cena e inspector formam duas colunas com intervalo de (16px): cena flexível e painel de (316px), reduzido para (280px) até 1100px e ampliado para (350px) a partir de 1500px. A cena usa `clamp(500px, calc(100dvh - 200px), 760px)`. O inspector limita sua altura à cena e rola internamente. Quando há seleção, os detalhes sobem ao início do painel; o diretório permanece abaixo.

Até 768px, o conteúdo empilha cabeçalho, cena de (420px) e inspector no fluxo da página. O diretório de pessoas usa duas colunas; projetos permanecem em lista. Só o label selecionado aparece sobre a sala, reduzindo colisões. A seleção leva foco aos detalhes e, no mobile, rola até eles, respeitando redução de movimento.

O modo Diretório 2D remove a cena e usa duas áreas lado a lado no desktop; no mobile, detalhes e diretório voltam a uma coluna. A busca filtra pessoas e projetos; a paginação espacial limita a (12 estações / 6 salas) por página, sem transformar o limite da cena em limite de acesso aos registros.

## Elevation & Depth

A interface HTML usa superfícies tonais e bordas de (1px), sem sombra decorativa. A profundidade pertence ao escritório: câmera ortográfica, piso material, mesas reconhecíveis, plantas geométricas e luz direcional com sombras opcionais. Isso não altera a filosofia plana de listas e controles do sistema incumbente.

Selecionar estação ou sala ajusta câmera e realce do objeto; pan, zoom e recentralização têm controles HTML equivalentes aos gestos. A câmera interpola a seleção e respeita `prefers-reduced-motion`; o modo reduzido também remove transições/animações CSS. Não há animação ambiental contínua. O renderer trabalha sob demanda e suspende frames com documento oculto.

## Shapes

Cena e inspector têm cantos de (12px), com inspector mobile de (10px). Botões e linhas de diretório usam (6px); o seletor Work/World tem contorno externo de (9px). Essas medidas são específicas do World e não substituem controles globais de (8px) nem diálogos de (14px) do sistema existente. Mesas, monitores e divisórias formam volumes retangulares; vegetação e vasos usam primitivas esféricas/cilíndricas.

## Components

| Componente real | Comportamento e estados |
| --- | --- |
| Work/World | Grupo com `aria-pressed`; seleção esmeralda e retorno ao contexto Work anterior |
| Sala 3D / Diretório 2D | Grupo com estado pressionado; a ação Sala 3D permite tentar recuperar WebGL. Após falha de import/runtime da cena, muda para “Recarregar 3D” e recarrega a página mediante ação explícita |
| Câmera | Sete botões nomeados para aproximar, afastar, mover e recentralizar; equivalência HTML para navegação espacial |
| Qualidade | Select nativo: Automática, Econômica, Detalhada; automático considera viewport, hardware e amostras de interação |
| Diretório | Busca com label acessível; linhas pressionáveis; iniciais, nome e presença textual; paginação desabilita extremos |
| Inspector | Sem seleção: orientação e criar tarefa quando disponível. Pessoa: presença, tarefas, projetos associados e atividade. Sala: descrição, tarefas, abrir projeto e participantes derivados das atribuições |
| Progresso | `progress` nativo e texto de tarefas concluídas; zero tarefas apresenta “Sem tarefas”, sem percentual artificial |
| Ações de tarefa | Abrir editor Work; concluir quando permitido; Focus para tarefa não concluída atribuída ao usuário e com callback disponível |
| Notificações persistentes | Loading, erro de dados, falha de presença, falha gráfica e rejeição de ação têm texto explícito; erro de ação usa `role=alert` |
| Recuperação gráfica | Falta de WebGL2 e perda de contexto levam ao diretório 2D; a perda de contexto permite recriar o canvas. Falha de import/runtime mantém o diretório acessível e oferece “Recarregar 3D”, evitando repetir o mesmo import lazy rejeitado |
| Entrada do painel | `WorldEntry.tsx` contém a falha de import lazy do próprio WorldPane. Durante import mostra “Abrindo Evergreen World…”. Na falha, alerta persistente com “Voltar ao Work” e “Recarregar página”; Work continua disponível |

Foco de controles usa contorno claro de (2px), deslocado (3px). O inspector selecionado recebe foco programático e anúncio por região `aria-live`. Labels projetados são `aria-hidden`; a alternativa acessível é o diretório HTML.

A correção P2 revisada estabelece área mínima mobile de (44px) para câmera, paginação, fechar detalhes, Work/World e visualização 3D/2D. Isso é o escopo específico do parecer independente final “ship”; não certifica que todo controle de toda a aplicação tenha 44px. Outros tamanhos continuam registrados no CSS: busca compacta, select de qualidade de (32px), ação primária World de (40px) e ações textuais de (36px).

Concluir mostra “Salvando…” e bloqueia os botões de conclusão durante a requisição. A rejeição permanece no inspector, sem alterar a contagem para simular sucesso. Dados locais são explicitamente pessoais e sem sincronização; o adaptador local não cria colegas conectados. No modo compartilhado, ausência de sinal atual permanece “Presença não verificada”. Canais exibidos são os autorizados do workspace, com aviso de que não há associação automática ao projeto.

## Do's and Don'ts

- **Do** preservar a identidade preta/esmeralda e o shell existente ao ampliar o World.
- **Do** oferecer as mesmas seleções e ações no HTML, inclusive quando a cena falhar.
- **Do** ligar estação/pessoa e sala/projeto ao snapshot carregado e autorizado; manter preferências espaciais em memória.
- **Do** distinguir dados locais, fixtures de teste e dados conectados efetivamente verificados.
- **Don't** transformar seleção, presença incerta ou resposta pendente em sucesso visual.
- **Don't** acrescentar equipe, projeto, métricas operacionais ou chamadas de voz fictícias para preencher o escritório.
- **Don't** promover a composição desta sala ou suas cores materiais a regras universais de marca.

## Evidência e limites da revisão

Foram lidos `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `WORLD-R1-SURFACE.md`, `WORLD-R1-ARCHITECTURE.md`, todos os módulos em `src/features/world` e o estilo global relevante. A orientação de documentação Impeccable foi aplicada como extração do estado existente, com o limite expresso de escrever somente estas notas.

As quatro capturas em `.impeccable/review` foram inspecionadas:

| Captura | Evidência visível | Limite |
| --- | --- | --- |
| `desktop.png` | Sala densa, seleção de Bruno QA 2, inspector primeiro, erro “Fixture: atualização recusada pelo servidor”, diretório abaixo | Harness sintético com fixtures; não é workspace Supabase autenticado |
| `mobile.png` | Cena empilhada, apenas label selecionado, controles de câmera, erro persistente, diretório de duas colunas e paginação | Viewport emulado; não é celular físico |
| `integrated-desktop.png` | Shell Evergreen, alternância Work/World, um perfil local e projeto QA local, orientação sem seleção | Modo pessoal no navegador; não comprova colaboração remota |
| `integrated-mobile.png` | Topo compacto, cena e diretório empilhados, origem pessoal explícita, ação de criar no Work | Viewport emulado; não verifica Safari ou GPU física |

A revisão geral anterior considerou sala e contrato coerentes. A revisão independente final comunicada para esta documentação avaliou exclusivamente o P2 de toque mínimo e retornou “ship” após a correção. Este registro não amplia esse parecer para uma auditoria completa, acessibilidade integral ou validação de backend.

Drift anterior à documentação, fora do reparo solicitado: o `DESIGN.md` e o sidecar descrevem principalmente colaboração; o shell pessoal em `src/styles.css` tem marca Bodoni MT/Didot com fallback serifado, enquanto o documento global resume a marca como Georgia. Há também tamanhos locais menores que o padrão documentado de campos/ações. Essas diferenças foram inventariadas, sem alterar código, marca, tokens ou documentos globais.

No recheck documental final, foram relidos `WorldEntry.tsx`, os caminhos de recuperação em `WorldPane.tsx`/`WorldBoundary.tsx` e `output/world/world-results.json`. O resultado salvo registra `panelChunkFailureContained`, `workAvailableAfterPanelFailure`, `chunkLoadFailureFallback` e `chunkFailureRecoveryByReload` como `true` em testes locais de falha induzida. Isso documenta a contenção e a recuperação de módulos sem criar uma nova revisão visual ou recapturar a superfície normal.

Nenhum teste foi executado por esta passagem documental. Os cenários e métricas executáveis pertencem à evidência de validação do agente principal; a leitura do resultado salvo, do código e das screenshots não os substitui. O ambiente gráfico de teste usa SwiftShader/software: counters do renderer e fixtures locais não demonstram FPS, bateria, memória ou comportamento em celular físico. Novos módulos no Supabase: **NOT_VERIFIED**. Não houve deploy World nesta entrega, nem validação de voz/reuniões reais.

Validação de escopo: único arquivo escrito por este documenter, `docs/WORLD-R1-DESIGN-NOTES.md`. `DESIGN.md` e `.impeccable/design.json` preservados; nenhuma alteração de código, README ou outro documento.
