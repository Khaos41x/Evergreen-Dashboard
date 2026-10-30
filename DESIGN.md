---
name: Evergreen
description: Espaço escuro e esmeralda de produtividade e colaboração da holding
colors:
  background: "#070a09"
  sidebar: "#090e0d"
  panel: "#0a0f0e"
  raised: "#0d1312"
  text: "#f3f4f2"
  soft: "#bdc7c3"
  line: "#1b2320"
  primary: "#10d994"
  primary-ink: "#04150f"
  primary-hover: "#36e7ac"
  workspace-rail: "#0b211a"
  workspace-sidebar: "#0b1410"
  workspace-active: "#153e30"
  workspace-muted: "#afc1b7"
  conversation: "#0c110f"
  composer: "#121e17"
  profile-cover: "#123626"
  profile-badge: "#153a29"
  profile-badge-text: "#cbf4da"
typography:
  headline:
    fontFamily: "Libre Caslon Display, Georgia, Times New Roman, serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.018em"
  profile-name:
    fontFamily: "Libre Caslon Display, Georgia, Times New Roman, serif"
    fontSize: "36px"
    fontWeight: 400
    letterSpacing: "-0.018em"
  body:
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  message:
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.65
  navigation:
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  navigation: "6px"
  control: "8px"
  composer: "10px"
  company: "12px"
  dialog: "14px"
spacing:
  small: "8px"
  medium: "16px"
  section: "24px"
  content: "32px"
components:
  primary-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  primary-button-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-ink}"
  secondary-button:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  workspace-navigation-active:
    backgroundColor: "{colors.workspace-active}"
    textColor: "#d4ffea"
    rounded: "{rounded.navigation}"
    padding: "8px 10px"
    typography: "{typography.navigation}"
  profile-badge:
    backgroundColor: "{colors.profile-badge}"
    textColor: "{colors.profile-badge-text}"
    rounded: "{rounded.navigation}"
    padding: "6px 10px"
---

## Overview
O Evergreen existente é a referência: superfícies escuras, esmeralda nas ações e identidade serifada. A direção aprovada aproxima a navegação de empresas e mensagens dos padrões de Slack/Discord, preservando as cores e os dados reais do produto.

**Key Characteristics:**

- Superfícies tonais escuras e divisórias discretas.
- Barra de empresas, navegação contextual e conversa central.
- Títulos serifados, corpo e controles sans-serif.
- Perfis profissionais com vínculos explícitos e estados verificáveis.

## Colors
A paleta incumbente permanece; o workspace acrescenta superfícies verdes para separar empresa, navegação e conversa. Os valores normativos estão no frontmatter.

### Primary

- **Esmeralda Evergreen:** ações principais, empresa selecionada, foco e caret. O texto escuro da ação principal mantém sua leitura.
- **Verde de seleção:** contexto ativo da navegação lateral; distingue seleção sem transformar todas as linhas em ações primárias.

### Neutral

- **Fundo, sidebar, painel e superfície elevada:** base compartilhada do produto, preservada de `src/styles.css`.
- **Texto, texto suave e divisória:** hierarquia de informação e separação de listas.
- **Barra de empresas, sidebar contextual e conversa:** camadas tonais do workspace implementado.
- **Capa e selo profissional:** distinguem identidade e vínculo sem sugerir uma permissão concedida.

Texto de erro claro sobre superfície escura avermelhada; confirmação por texto persistente.

## Typography
Títulos usam Libre Caslon Display regular, servida localmente em `/fonts/LibreCaslonDisplay-Regular.ttf`, com licença SIL OFL em `public/fonts/LibreCaslonDisplay-OFL.txt`. Georgia/Times New Roman são fallbacks. A imagem da marca continua sendo um ativo próprio; não é recomposta com uma fonte.

Corpo e controles usam Inter e a pilha sans do projeto. A fonte serifada aplica-se aos títulos dos módulos de colaboração, Visão, Finanças e Fundadores; labels de navegação continuam sans. Não substituir os controles pela fonte de título.

O título da conversa usa o papel headline e reduz para 25px no celular. O nome do perfil usa o papel profile-name; cabeçalho da página de perfil tem 32px, seções 25px e empresas 23px. Mensagens usam o papel message. Formulários gerais têm 16px; busca compacta e composer desktop têm tamanhos próprios, e o composer volta a 16px até 600px.

## Layout
No workspace atual, desktop combina barra de empresas (64px), sidebar contextual (240px) e conteúdo flexível. Até 1200px, as duas primeiras colunas reduzem para 56px e 218px. Até 1000px, a barra continua e a sidebar abre como drawer com scrim, sem navegação inferior. Até 600px, a barra some, o drawer parte da esquerda e aparece a navegação inferior, com espaço de 66px mais safe-area. A estrutura usa `100dvh`, áreas roláveis independentes e composer no fluxo flex do chat.

A sidebar prioriza favoritos, canais e mensagens diretas antes dos módulos. Início, Mensagens, Tarefas e Projetos ficam visíveis; os demais módulos ficam em “Mais ferramentas”. Um seletor contextual controla a empresa; o rail oferece atalhos para empresas operacionais. Seleção e contagens vêm do estado real.

O chat tem histórico plano, separadores de data e autor que abre o perfil. Em desktop, a mensagem reserva 76px à esquerda para avatar de 36px; até 600px, reserva 58px com avatar de 32px. O composer mantém altura máxima de 180px para o campo.

Perfis têm largura de conteúdo máxima de 860px, capa, avatar de 96px sobreposto e seções de apresentação e atuação. O painel de níveis usa três colunas e uma linha para liderança/equipe, reduzindo a uma coluna até 600px. Essas medidas descrevem as superfícies implementadas; não substituem as grades de outros módulos.

## Elevation & Depth
O workspace usa superfícies tonais e divisórias de 1px, sem sombra decorativa. Drawer e modal se separam por scrim e ordem de sobreposição. A capa do perfil organiza a identidade com cor e sobreposição do avatar. Botões transitam cor de fundo, borda e texto em 150ms; `prefers-reduced-motion: reduce` remove essa transição.

## Shapes
Linhas de navegação e selos têm cantos discretos; campos e botões usam o raio de controle. Rail usa botões quadrados de 44px com raio de empresa; a foto dentro do botão mantém geometria de 28×28px, recorte circular e `object-fit: cover`. O composer compartilha uma borda contínua com sua barra de ações, usando cantos superiores e inferiores complementares. Diálogos preservam o raio incumbente. Mensagens permanecem linhas planas.

## Components
### Marca

A árvore isolada fornecida em `public/evergreen-symbol.png` identifica as superfícies internas. O wordmark completo em `public/evergreen-holdings-logo.png` permanece centralizado acima do formulário de autenticação. Ambos preservam proporção e transparência; branco é aplicado por `brightness(0) invert(1)` sem alterar os bytes dos arquivos.

### Botões e campos

Botões gerais têm altura mínima de 44px; ações compactas de navegação/chat possuem dimensões específicas no fonte e ampliam no celular. Ícones Lucide mantêm traço de 1.7 no workspace, alinhamento e labels acessíveis. Foco no workspace usa contorno esmeralda de 2px com afastamento de 3px; summaries têm afastamento de 2px. Loading, erro, empty e disabled são explícitos. Sucesso exige resultado da operação.

### Navegação e conversa

Favoritos são preferências locais por usuário; canais, DMs e contagens dependem de dados reais. O drawer usa estado modal, isolamento dos controles de fundo e retorno de foco. Ações adicionais de mensagem ficam em um disclosure acessível, disponível sem hover. Código e emoji inserem texto no composer. Evitar prometer formatação que o envio não aplica. Editor preserva foco contido e Escape.

### Perfil profissional e níveis

Foto e fallback de iniciais identificam a pessoa. Perfil contém apresentação, cargo, status e vínculos visíveis por empresa. Chairman representa fundador original da Evergreen; APEX, fundador de empresa; NÍVELO, CEO. Sócio é um vínculo separado. Indicações pendentes têm texto próprio e não criam conta nem acesso. A confirmação de identidade e as permissões continuam verificadas no servidor; os selos apenas comunicam o vínculo retornado.

## Do's and Don'ts
### Do:

- Do preservar dados e contexto e mostrar estados indisponíveis ou não configurados.
- Do usar a árvore branca fornecida internamente e a marca completa na autenticação.
- Do manter títulos serifados e corpo/controles sans-serif.
- Do priorizar canais e mensagens diretas antes dos módulos na sidebar contextual.
- Do comunicar vínculos profissionais e atribuições pendentes com texto explícito.

### Don't:

- Don't usar toast fictício, presença inventada ou contador de notificações fictício.
- Don't usar identidade local, cargo, nome ou selo profissional para autorização remota.
- Don't atribuir acesso financeiro ou governança automaticamente a Chairman, APEX ou NÍVELO.
- Don't distorcer, redesenhar ou editar os bytes dos ativos da marca fornecidos.

