---
name: Evergreen — Biblioteca dos fundadores
description: Extensão local da Visão com três mesas executivas permanentes e acesso ao financeiro existente
colors:
  world-background: "#080e0c"
  world-text: "#edf4ee"
  world-soft: "#b8c9bf"
  world-line: "#25382e"
  primary: "#10d994"
  world-focus: "#a1f4d6"
  stage: "#0b1510"
  inspector: "#0e1812"
  selected-station: "#193527"
  label: "#0c1914e8"
  label-text: "#e2f2e8"
  label-border: "#385747"
  timber: "#705734"
  desk-timber: "#6b4c2e"
  desk-leather: "#193b2e"
  brass: "#a58d5a"
  vault-metal: "#24332e"
typography:
  page-title:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  detail-title:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  control:
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
  scene-label:
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    lineHeight: 1.35
rounded:
  stage-and-inspector: "12px"
  control: "6px"
  label: "4px"
spacing:
  page-horizontal: "24px"
  narrow-page-horizontal: "12px"
  layout-gap: "16px"
components:
  station-selected:
    backgroundColor: "{colors.selected-station}"
    textColor: "#d6e6db"
    rounded: "{rounded.control}"
    padding: "8px"
  scene-label:
    backgroundColor: "{colors.label}"
    textColor: "{colors.label-text}"
    typography: "{typography.scene-label}"
    rounded: "{rounded.label}"
    padding: "7px 10px"
---

# Evergreen — Biblioteca dos fundadores

## Overview

Registro extraído do código em 31/10/2026. A autoridade visual continua em [DESIGN.md](../DESIGN.md) e [.impeccable/design.json](../.impeccable/design.json); a extensão anterior está em [DESIGN-EVERGREEN-OS-V2.md](DESIGN-EVERGREEN-OS-V2.md). Este arquivo acrescenta os valores observados da biblioteca, sem substituir esses arquivos nem promover materiais da cena a tokens globais.

A direção veio do pedido explícito: biblioteca exclusiva dos titulares, exatamente três mesas executivas iguais, nomes e estados reais, cofre maior no canto superior esquerdo e continuidade do financeiro. A primeira vista materializa essa biblioteca em geometria, com madeira, estantes, livros, couro verde, latão e cofre metálico escuro. A sequência de uso vai dos três lugares permanentes à consulta de titular/presença e ao acesso a Finanças. É uma extensão guiada por código e pelo sistema existente; não existe comp raster aprovado nem seed conceitual para substituir a identidade.

**Key Characteristics:**

- Árvore branca interna, fundo verde escuro, esmeralda e títulos Libre Caslon preservam a continuidade do Evergreen.
- Três mesas conservam modelagem, tamanho e lugar, inclusive com assento vago.
- Nome completo, estado textual e detalhes vêm do conjunto autorizado; decoração não fabrica atividade.
- O diretório 2D e o atalho financeiro mantêm a operação por teclado e sem WebGL.

Comparação com o incumbente: superfícies tonais, controles sans e navegação permanecem. A biblioteca acrescenta profundidade e materiais apenas à sala. As cores locais do frontmatter são extraídas de `world.css`, `libraryGeometry.ts` e `FinancialVault.tsx`; diferenças locais de superfície, foco, escala e peso tipográfico ficam registradas, sem correção de drift não solicitada.

Evidência: [relatório funcional](FOUNDERS-LIBRARY-20261031.md), [revisão independente](FOUNDERS-LIBRARY-DESIGN-REVIEW-20261031.md) e [resultados do navegador](../output/library/browser-results.json). As nove capturas `scene`, `room` e `directory`, nas larguras 390, 1238 e 1440px, usam respostas HTTP sintéticas com WebGL real por software. Nomes com sufixo QA, presença e heartbeat dessas fixtures não comprovam usuários ou presença hospedada. A revisão inicial pediu liberar a silhueta do cofre no celular e mostrar nomes completos; as recapturas resolveram ambos. O veredito `ship` do mesmo revisor cobre somente essas duas correções.

O build, 44 grupos de verificações SQL/segurança locais e a regressão de colaboração em 390/1440px estão registrados no relatório funcional; não foram repetidos para esta alteração documental. O build mantém aviso de tamanho do chunk 3D carregado sob demanda. O detector foi tentado uma vez e não executou: engine 0.1.5 indisponível e cache sem permissão; não há pontuação automática. O pacote OS V2 `57c94c4` já foi publicado, mas a nova migração e a biblioteca ainda não foram aplicadas/publicadas. Auth e presença com contas reais em Supabase/Vercel continuam sem E2E hospedado nesta entrega.

## Colors

### Primary

A esmeralda incumbente identifica ações e presença disponível. O foco local da Visão usa `world-focus`, uma variação clara da mesma família, com contorno de 2px e afastamento de 3px. A seleção do diretório usa verde tonal e borda, sem equiparar toda linha ao botão primário.

### Secondary

Madeira, couro e latão pertencem à materialidade tridimensional. `timber` marca prateleiras; `desk-timber`, o corpo das mesas; `desk-leather`, o revestimento superior; `brass`, o acabamento arquitetônico. Livros combinam capas verdes, cinzas, marrons e bege. Esses materiais não mudam as cores de navegação, alertas ou autorização.

### Neutral

`world-background`, `stage` e `inspector` distinguem página, sala e consulta. Etiquetas usam fundo escuro translúcido, texto claro e borda própria; o cofre combina `vault-metal` com camadas escuras, ferragens claras e indicador esmeralda. Seu aspecto não comunica saldo ou permissão concedida.

Presença sempre tem texto junto ao ponto: “Disponível”, “Ausente”, “Offline” ou “Presença não verificada”; assento vago recebe “Aguardando titular”/“Titular ainda não confirmado”. Não depender apenas da diferença de cor entre esses estados.

## Typography

Libre Caslon Display regular é servida localmente por `EvergreenBrand.css`, em `/fonts/LibreCaslonDisplay-Regular.ttf`, com licença OFL preservada. A árvore é imagem fornecida, sem recomposição tipográfica. Corpo e controles mantêm a pilha sans incumbente; não há nova família para a biblioteca.

Os valores do frontmatter refletem declarações CSS locais: o título da Visão e os detalhes pedem peso 600, embora o arquivo local da fonte esteja declarado em 400. Isso descreve a implementação atual, sem introduzir outro arquivo de fonte ou alterar o peso incumbente global. O título passa a 25px até 1100px, 26px até 768px e, na regra final até 700px, usa `clamp(20px, 5.5vw, 26px)`.

Etiquetas de titular têm nome completo e linha de estado; não usam reticências. A largura máxima é 168px em desktop e 122px no celular; palavras longas podem quebrar. No celular o nome usa 10px e o estado 9px. O diretório também permite quebra dos nomes completos, e o cabeçalho dos detalhes quebra conteúdo longo. As capturas incluem nomes sintéticos longos para conferir esse comportamento.

## Layout

A página usa padding de 22px por 24px e uma grade de sala flexível mais inspetor de 316px, com gap de 16px. Até 1100px, o inspetor reduz para 280px e o padding para 20px por 16px; acima de 1500px, amplia para 350px. Até 768px, sala e inspetor empilham e o padding horizontal reduz para 12px. A lista de fundadores permanece em uma coluna.

A sala tem altura `clamp(500px, calc(100dvh - 200px), 760px)`; na biblioteca móvel, 460px. Em desktop o inspetor pode rolar internamente; no celular acompanha o fluxo da página. Ao selecionar uma mesa, os detalhes recebem foco e aparecem antes do diretório no inspetor 3D; no celular a seleção também leva a consulta para a área visível.

A geometria fixa ocupa 26 por 20 unidades. As três posições são `[-5, 0, 3]`, `[1, 0, -3]` e `[6, 0, 5]`; o cofre fica em `[-10, 0, 0]`. A câmera ortográfica inicial parte de `[24, 22, 24]`. A composição inicial situa o cofre no quadrante superior esquerdo e preserva as três mesas iguais; não é uma quarta estação nem depende do número de pessoas online. A busca filtra o diretório e as etiquetas sem desmontar as três mesas físicas.

Na vista estreita, os callouts dos assentos usam posições ajustadas para deixar o cofre exposto. Sua identificação é persistente, sem exigir hover. Os controles de câmera permanecem abaixo da sala útil. As capturas finais e os resultados locais registram ausência de overflow horizontal nos três tamanhos.

Em Diretório 2D, o Canvas sai do layout. Desktop divide lista e detalhes em proporção 1/1,6; no celular empilha e prioriza os detalhes selecionados. O atalho “Evergreen Finanças” fica disponível acima de ambas as vistas, ocupando a largura disponível até 640px.

## Elevation & Depth

A interface mantém superfícies tonais e bordas; a profundidade expressiva pertence à geometria da sala. Piso com tábuas, duas paredes de estantes, livros modelados, gaveteiros, monitores, cadeiras com couro verde, luminárias de leitura e plantas formam o ambiente. Livros são decorativos e não representam documentos corporativos.

Materiais foscos de madeira contrastam com metal e telas levemente emissivas. Iluminação ambiente, hemisférica e direcional quente dá volume; luz secundária verde e luz do cofre preservam a família cromática. A qualidade econômica remove sombras e antialiasing e usa DPR 1; a detalhada permite sombras e DPR até 1,5. O modo automático usa economia em telas compactas, hardware com até quatro processadores lógicos ou após detectar lentidão. Isso é adaptação local, não um resultado medido em dispositivos físicos.

O renderer trabalha sob demanda e suspende frames com aba oculta. Movimento reduzido remove amortecimento e interpolação de câmera e conclui o acesso ao cofre sem esperar animação. Falha de carregamento, perda de contexto ou ausência de WebGL2 levam ao diretório com aviso e tentativa explícita de retorno ao 3D.

## Shapes

Sala e inspetor têm cantos suaves; no celular o inspetor reduz de 12px para 10px. Etiquetas usam recorte pequeno e borda fina; controles e seleção têm raio de 6px. Mesas compartilham tampo retangular, dois gaveteiros, monitor, luminária e cadeira de mesma escala. Nenhuma recebe forma ou pedestal de autoridade superior.

O cofre é uma caixa metálica com porta articulada, volante circular, dobradiças e base. A escala da biblioteca é 1,65 em relação ao cofre existente. As formas da sala são objetos reais da cena; não são uma imagem de fundo cobrindo os alvos de interação.

## Components

### Marca e cabeçalho

A árvore isolada branca identifica a biblioteca junto ao título e contexto compartilhado. O ativo e o filtro incumbentes permanecem. “Sala 3D” e “Diretório 2D” expõem seleção por `aria-pressed`; indisponibilidade gráfica recebe mensagem própria.

### Três mesas e consulta do titular

Mesas e cadeiras visíveis carregam seleção por raycast. A etiqueta da cena é uma apresentação visual oculta para tecnologias assistivas; o diretório oferece botões nomeados equivalentes. Selecionar apresenta nome, estado, cargo, empresa/contexto, avatar retornado ou iniciais, última presença quando disponível e foco compartilhado autorizado. A biblioteca não inclui o painel de tarefas/projetos da empresa nem inventa progresso para preencher a consulta.

Os três lugares vêm dos assentos permanentes, não da contagem online. Assento sem conta confirmada continua visível como vaga. Nomes conhecidos ou texto “Chairman” não substituem a associação validada; o material da mesa também não concede acesso.

### Cofre e Finanças

O cofre permanece no canto superior esquerdo inicial, com etiqueta visível. Clique com deslocamento inferior a 5px inicia a abertura; arrastar continua sendo movimento da câmera. A porta abre em aproximadamente 750ms, com proteção de conclusão em 1200ms no controlador. Em 2D ou movimento reduzido, a ação navega diretamente. A conclusão chama o mesmo callback financeiro uma vez, conservando rota `/economy` e contexto atual; a sala não consulta saldos nem concede capacidade financeira.

### Diretório, teclado e acesso exclusivo

Busca tem label acessível; botões de mesa usam nome completo e estado textual. Controles de câmera têm labels de aproximação, direção e recentralização. Em telas até 768px os controles principais, paginação e fechar detalhes têm alvo mínimo de 44px; o seletor de qualidade também mantém 44px. Não generalizar essa medida a todas as ações compactas desktop.

`HoldingOffice` obtém o conjunto autorizado por `eg_founder_library`. Falha ou negativa descarta os dados e mostra explicação com retorno ao Trabalho, sem Canvas. Os RPCs limitam o acesso aos titulares dos três assentos associados ao grupo; após ativação, exige-se aceite do assento. Cargo, papel legado ou acesso financeiro isolados não bastam. A presença vem de heartbeat restrito à própria conta, com horário/sessão validados no servidor; a interface não converte falha em online. O modo pessoal local continua em contexto separado. Esses limites são especificação e evidência local descritas no relatório funcional, sem homologação hospedada nesta documentação.

## Do's and Don'ts

### Do

- Do preservar o sistema incumbente, a árvore branca, títulos locais e controles sans.
- Do manter três mesas físicas equivalentes e seus lugares permanentes, incluindo vagas.
- Do exibir nome completo e estado textual, com quebra em nomes longos e identificação persistente do cofre.
- Do conservar consulta e financeiro por teclado, em 2D e sem WebGL.
- Do distinguir dados autorizados, ausência, erro e fixtures QA nas evidências.

### Don't

- Don't usar nomes informados, cargos ou decoração para atribuir assento, presença ou permissão.
- Don't esconder o cofre com callouts no celular nem exigir hover para identificá-lo.
- Don't transformar livros decorativos em documentos ou adicionar tarefas corporativas ao painel da biblioteca.
- Don't alterar o contexto financeiro ou apresentar o acesso à sala como autorização financeira.
- Don't promover materiais desta sala à identidade global ou chamar testes locais de Auth/presença E2E hospedados.

Fontes: `PRODUCT.md`; sistema incumbente e extensão OS V2; `src/features/world/libraryGeometry.ts`, `WorldPane.tsx`, `WorldScene.tsx`, `FinancialVault.tsx`, `world.css`, `model.ts`; `src/features/holding/HoldingOffice.tsx`, `useFounderPresence.ts`; `src/components/EvergreenBrand.css`; relatório e revisão citados. Esta passagem documental criou somente este arquivo; não alterou tokens, código, banco ou publicação.
