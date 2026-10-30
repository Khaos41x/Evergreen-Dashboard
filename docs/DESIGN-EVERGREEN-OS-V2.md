---
name: Evergreen OS V2 — extensão do sistema existente
description: Organizações, governança e operação nas superfícies escuras e esmeralda do Evergreen
colors:
  background: "#070a09"
  text: "#f3f4f2"
  primary: "#10d994"
  control-surface: "#102218"
  control-border: "#294233"
  control-hover: "#1d3b2a"
  field-surface: "#0a1510"
  field-border: "#36523e"
  field-text: "#e5f3e9"
  group-entry: "#102b1c"
  seat-surface: "#102519"
  seat-divider: "#31533b"
  tab-active: "#16452e"
typography:
  page-title:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "clamp(30px, 3vw, 42px)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  section-title:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    lineHeight: 1.65
  field:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
  control:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  control: "8px"
  group-and-seats: "12px"
spacing:
  small: "8px"
  medium: "16px"
  section: "24px"
  content: "32px"
components:
  os-button:
    backgroundColor: "{colors.control-surface}"
    textColor: "#e1f3e7"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  os-field:
    backgroundColor: "{colors.field-surface}"
    textColor: "{colors.field-text}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Evergreen OS V2 — sistema visual da extensão

## Overview

Registro extraído da implementação em 30/10/2026. O sistema incumbente continua em `../DESIGN.md` e `../.impeccable/design.json`; ambos foram preservados. Este documento descreve a extensão OS V2 e seus valores observados, sem criar outra identidade ou substituir os tokens gerais.

O Evergreen mantém o ambiente Operate: fundo quase preto, superfícies verdes escuras, ações esmeralda, títulos serifados e controles sans. O diretório usa linhas planas; a entrada do grupo e o conjunto de assentos recebem superfícies próprias para comunicar contexto e estrutura. A árvore branca fornecida identifica a navegação interna.

**Key Characteristics:**

- Platform, Evergreen Group e empresa são contextos distintos e nomeados.
- Três assentos permanentes têm a mesma hierarquia visual e autoridade-base.
- Pessoas, empresas, participações e contas aparecem por nomes autorizados.
- Dados, acesso, presença e sucesso dependem do estado real; exemplos QA pertencem somente à validação.

## Colors

O fundo, texto e esmeralda do frontmatter coincidem com os tokens incumbentes em `src/styles.css`. As superfícies locais vêm de `src/features/organizations/organizations.css`.

### Primary

A esmeralda marca a ação principal e o foco. O botão primário OS usa texto `#051a0d`, uma variante local do texto incumbente `#04150f`. A aba selecionada usa o verde tonal `tab-active`, sem promover todas as opções à mesma ênfase.

### Neutral

Campos, controles, entrada do grupo e assentos usam as superfícies extraídas acima. Divisórias de 1px separam registros. Texto secundário dos parágrafos OS usa `#bdd0c2`; labels usam `#c0d3c5`; texto auxiliar usa `#adc6b4`. Esses valores locais não redefinem `--soft`.

Erros e carregamento permanecem explícitos. Estado não pode depender só de cor: “Aceite pessoal pendente”, “Independente”, “Aguardando aprovações” e os estados de votação acompanham o tratamento visual.

## Typography

Libre Caslon Display regular é servida localmente por `src/components/EvergreenBrand.css`, usando `/fonts/LibreCaslonDisplay-Regular.ttf`. A licença permanece em `public/fonts/LibreCaslonDisplay-OFL.txt`. A marca é imagem fornecida, sem recomposição tipográfica.

Os títulos OS ampliam a escala incumbente de 28px: h1 usa o clamp registrado e 32px até 600px; h2 usa 28px; h3 usa 23px. Há variantes observadas: títulos do diretório usam 28px, propostas 29px e introdução do grupo 40px, reduzida para 34px até 1000px. Corpo e controles permanecem sans; parágrafos têm entrelinha 1.65 e largura máxima de 74ch. Campos usam 16px.

Valores financeiros nas listas usam 26px, a fonte de título e números tabulares. Percentuais são exibidos em formato pt-BR; centavos e basis points continuam como representação exata de transporte, sem obrigar a pessoa a calculá-los.

## Layout

As páginas OS têm rolagem própria, `min-height: 0` e padding de `32px clamp(16px, 3.5vw, 48px)`. Até 600px, usam 24px por 16px. O Builder tem largura máxima de 1080px, formulário de 690px e oito etapas que quebram linha. Formulários gerais ficam em até 760px; duas colunas viram uma até 600px.

O diretório de empresas é uma sequência de linhas com divisória inferior, monograma de 52px, nome, descrição, vínculos e ação “Entrar”. A entrada do grupo é uma superfície larga e separada, sem sugerir que todas as empresas pertencem ao grupo. No celular, linhas e ações quebram sem exigir rolagem horizontal.

Os três assentos usam `repeat(3, minmax(0, 1fr))`, gap zero e divisórias internas. Até 1000px, empilham em uma coluna, conservando ordem e peso visual. Não dar ao primeiro assento uma escala, cor ou posição de comando diferente.

Resumos de deliberações são listas de definição legíveis. O padrão `.os-proposal-review` usa label de 150px e conteúdo flexível; até 600px, cada par label/valor empilha. As capturas locais cobrem 390, 790 e 1440px; isso não substitui validação em dispositivos físicos.

## Elevation & Depth

A organização visual usa superfícies tonais, bordas e espaço, sem sombras decorativas. A profundidade da árvore do início é um efeito específico, separado da hierarquia dos controles.

`HeroTree.tsx` projeta no canvas 45.190 pontos XYZ do arquivo `public/evergreen-tree.geometry.bin`. X/Y e intensidade derivam da referência 2D existente; Z foi reconstruído. Não é o arquivo 3D original nem uma recuperação comprovada de sua profundidade. `public/evergreen-tree.geometry.json` registra a proveniência e `runtime_raster: false`. O canvas decorativo fica oculto para tecnologias assistivas e ignora interação direta; movimento de ponteiro é desativado sob preferência por movimento reduzido.

## Shapes

Controles e campos OS usam raio de 8px; entrada do grupo e moldura conjunta de assentos usam 12px. Linhas do diretório, propostas, pessoas e compromissos continuam planas. Evitar adicionar contêineres sucessivos a esses registros.

Botões, inputs e selects gerais têm altura mínima de 44px. Textareas começam em 92px. Isso não descreve todo elemento como alvo de 44px: summaries OS têm mínimo de 40px e os checkboxes têm geometria própria de 18px. O foco OS usa contorno esmeralda de 2px com afastamento de 3px.

## Components

### Marca e início

`EvergreenBrand.tsx` usa `public/evergreen-symbol.png` internamente e a marca completa na autenticação. A apresentação branca usa CSS, preservando proporção e os bytes dos ativos. A geometria do início é outro artefato derivado, com sua proveniência própria.

`HomePage.tsx` inclui o nome da organização na saudação contextual. `HeroTree.css` amplia a primeira ação de foco para largura de 236px, altura mínima de 64px, fonte de 20px e padding de 17px por 26px. No celular, a largura limita-se ao espaço disponível, a fonte reduz para 18px e a regra final mantém 64px de altura mínima. O hero móvel reserva 520px para texto, CTA e temporizador, sem sobreposição nas capturas verificadas.

O reconhecimento de fechamento do resumo de foco em `FocusHome.tsx` é preferência visual de sessão. Não contém credenciais nem substitui a persistência do foco no servidor. Início vazio apresenta ausência de tarefas, objetivos e equipe; não preenche indicadores com atividade inventada.

### Contextos, assentos e autorização

Platform sustenta conta e sessão; Evergreen Group é uma organização interna com workspace geral; empresas têm workspaces independentes. Comunicação reservada de fundadores continua separada. O Hub só mostra vínculos autorizados, descreve empresa sem vínculo como “Independente” e explica o limite do acesso do grupo.

`CouncilSeats` mostra “Assento 1/2/3”, nome e estado do aceite, sem fragmentos do ID. Convites e nomes não criam contas nem preenchem assentos. E0–E6 identifica níveis do grupo; A0–A6, da empresa. Cargo, nível, participação e capacidade são registros distintos. A aparência de um selo não concede permissão.

### Deliberações e finanças legíveis

`Boardroom.tsx` oferece seletores nomeados para pessoas, assentos, empresas, pedidos de vínculo e participações autorizadas. IDs permanecem nos valores enviados ao backend. O formulário societário mostra nome, percentual e estado; a troca de assento explicita os três votos e o aceite pessoal exigidos.

Autorizações financeiras partem da ação do compromisso/Cofre, com dados preenchidos a partir do lançamento. `ProposalSummary.tsx` apresenta conta, tipo, valor em moeda e descrição em pares label/valor. JSON, UUID e centavos brutos não são o formulário de deliberação. O texto distingue registro no livro interno de pagamento bancário. Fallbacks como “Conta autorizada do Cofre” não afirmam um nome que o contexto não retornou.

`EquityPanel.tsx` distingue proposta e participação documentada, comprovação privada e deliberação. `FinanceOperations.tsx` distingue pedido bilateral, aprovação e registro no livro. Conclusão visual exige resposta da operação; contas reais e acesso hospedado ainda precisam de homologação própria.

## Do's and Don'ts

### Do

- Preservar o sistema incumbente, a árvore branca interna e os títulos locais.
- Nomear contexto e condições de acesso, aceite, quórum e execução.
- Exibir opções legíveis provenientes do conjunto autorizado, conservando IDs no transporte.
- Manter três assentos com o mesmo peso e empilhar em larguras menores.
- Mostrar indisponibilidade, ausência de dados, erros e operações pendentes de modo explícito.
- Usar o relatório de entrega e a revisão delimitada como evidência local, com seus limites.

### Don't

- Transformar conta da plataforma ou administração do grupo em acesso automático às empresas.
- Preencher pessoas, presença, atividade, saldo ou permissões para embelezar uma tela vazia.
- Exibir enums de transporte ou fragmentos de ID como texto principal da decisão.
- Solicitar JSON ou conversão manual para centavos no fluxo de proposta revisado.
- Chamar a árvore de modelo 3D original ou a revisão de certificação de produção.

Fontes de autoridade: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `src/styles.css`, `src/features/organizations/organizations.css`, componentes citados e `docs/EVERGREEN-OS-V2-REPORT-20261030.md`. A revisão e a comparação dos tokens estão em `EVERGREEN-OS-V2-DESIGN-REVIEW.md`.
