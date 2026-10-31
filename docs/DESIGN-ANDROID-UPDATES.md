# Evergreen — aviso opcional de atualização Android

Registro da extensão visual em 31/10/2026. Escopo: `src/mobile/UpdateNotice.tsx`, `src/mobile/releases.ts`, regras correspondentes de `src/mobile/mobile.css` e composição do shell em `src/collaboration/Root.tsx`. Este documento complementa o sistema incumbente; não redefine seus tokens. `PRODUCT.md` continua sendo a fonte de verdade do produto, e `DESIGN.md` e `.impeccable/design.json` permanecem preservados.

## Overview

O aviso permite que quem usa o aplicativo Android escolha baixar uma versão posterior e confirme manualmente sua instalação no Android. É uma faixa utilitária opcional, sem modal, sem foco automático e sem impedir o acesso às ações existentes. O texto informa a versão e a etapa manual: “Evergreen {versão}. Baixe e confirme a instalação no Android.”

A implementação consulta a identidade e o build instalados por `App.getInfo()`, busca metadados públicos de versão e compara `versionCode`. A exibição fica restrita à plataforma nativa Android. Web e iOS não devem consultar esse manifesto nem mostrar o aviso. O botão usa `Browser.open` com a URL validada do APK; abrir o navegador não representa download concluído ou instalação realizada.

## Colors

A faixa herda a superfície elevada escura, a divisória e os papéis de texto do sistema. A ação principal usa esmeralda com texto escuro; “Mais tarde” usa texto claro e fundo transparente, com a superfície verde ativa no hover. Os valores são referenciados pelos tokens existentes, com fallbacks compatíveis no CSS.

O erro de abertura usa texto claro avermelhado sobre a mesma superfície escura. É um estado local deste componente, não uma nova cor normativa do sistema.

## Typography

Texto e controles permanecem em Inter/sans-serif. O título utilitário usa peso semibold (16px, entrelinha 1,4); descrição, erro e botões usam texto compacto legível (14px, entrelinha 1,5 para descrição/erro e 1,4 para botões). Não há nova fonte ou tratamento de marca. Os títulos serifados e os ativos oficiais das superfícies existentes permanecem como definidos no sistema incumbente.

## Layout

A faixa ocupa uma região própria no topo de `.mobile-app-shell`, que no modo nativo é uma coluna flex com altura disponível delimitada. `.mobile-app-content` ocupa o espaço restante e rola separadamente, com `min-height: 0`. A faixa permanece no fluxo e não cobre o formulário de autenticação ou suas ações alternativas.

O aviso tem largura total e grade de duas colunas: conteúdo flexível e grupo de ações. Até 600px, a grade passa a uma coluna, colocando as ações abaixo do texto. Os dois botões podem permanecer lado a lado quando couberem; o grupo permite quebra. O espaçamento entre texto e ações reduz de 16px para 12px nessa largura. A faixa limita sua altura a 45dvh e permite rolagem própria para conteúdo maior.

A altura mínima dos botões é 48px, com intervalo de 8px entre ações. O erro acrescenta uma linha à região reservada e desloca o conteúdo para baixo. Criar conta, recuperar senha e entrar por código de e-mail devem continuar alcançáveis pela rolagem do conteúdo sem exigir o adiamento da atualização.

## Elevation & Depth

A separação usa superfície tonal e divisória inferior de 1px, sem sombra decorativa. A faixa não exige uma camada flutuante sobre os controles existentes.

## Shapes

Os botões usam o raio de controle incumbente (8px). O contêiner é uma faixa plana de largura total. O ícone de download vem do Lucide; não foram criados novos ativos raster ou alterados os arquivos da marca.

## Components

### Aviso e ações

| Estado | Comportamento e comunicação |
| --- | --- |
| Versão posterior válida | Exibe “Nova versão disponível”, versão, instalação manual, “Baixar atualização” e “Mais tarde”. |
| Abrindo download | Exibe “Abrindo…” e desabilita as duas ações enquanto `Browser.open` está pendente. Não declara sucesso da instalação. |
| Falha ao abrir | Mantém o aviso e exibe “Não foi possível abrir o download. Tente novamente.”; permite nova tentativa. |
| Mais tarde | Oculta o aviso e registra uma preferência local por build durante 24 horas. Uma versão posterior pode reaparecer antes desse prazo. Falha no armazenamento conserva apenas a preferência em memória. |
| Versão atual/anterior, offline ou manifesto inválido | Não mostra o aviso. A falha de consulta não bloqueia login, workspace ou foco. |

O título usa `role="status"`; a mensagem de falha usa `role="alert"`. O ícone é decorativo e o botão tem texto visível. Foco por teclado usa contorno esmeralda de 2px, afastado 3px; hover e disabled têm estados explícitos.

### Origem dos dados e destino

O manifesto configurado no código é `https://evergreen-android-downloads.vercel.app/latest.json`. O parser exige o aplicativo e a plataforma esperados, metadados tipados e uma URL HTTPS da origem fixa no formato `/releases/{versionCode}/Evergreen.apk`, sem credenciais, query ou fragmento. A intenção é usar um caminho imutável por build; a validação do formato não comprova imutabilidade ou disponibilidade do arquivo publicado.

A consulta é pública, omite credenciais e rejeita redirecionamentos. Isso descreve o código consultado; não constitui auditoria de segurança, validação de provedor ou verificação remota. O manifesto inclui hash e tamanho, mas o aviso não baixa/verifica o binário nem conduz uma instalação automática.

## Do's and Don'ts

- Do preservar a região de layout da faixa também quando há erro e garantir acesso às ações de autenticação por rolagem.
- Do manter a atualização opcional e comunicar a confirmação manual de instalação no Android.
- Do herdar Inter, superfícies escuras, esmeralda, foco e geometria de controle existentes.
- Don't tratar abertura do navegador como instalação concluída.
- Don't transformar o aviso em overlay fixo sobre controles, bloquear o uso até atualizar ou criar uma nova identidade visual.
- Don't alterar a marca oficial ou promover decisões locais desta faixa a tokens globais sem autorização de mudança do sistema.

## Evidência e limites

Foram consultados `PRODUCT.md`, o sistema incumbente, os quatro arquivos de implementação citados, `output/native/updates/browser-results.json`, `finish-review.md` e `verdict-pass.md`. As cinco imagens abaixo foram abertas e comparadas com o sistema: superfície elevada escura, ação esmeralda, Inter nos controles, divisória discreta, raio e foco compatíveis. Nenhuma correção do sistema incumbente foi necessária para esta extensão.

| Captura | Evidência disponível |
| --- | --- |
| `output/native/updates/notice-390.png` | Estado normal; ações abaixo do texto e conteúdo de autenticação após a faixa. |
| `output/native/updates/notice-430.png` | Mesmo comportamento na largura de 430px. |
| `output/native/updates/notice-790.png` | Conteúdo e ações em colunas; autenticação abaixo. |
| `output/native/updates/notice-1440.png` | Faixa de largura total com ações à direita. |
| `output/native/updates/error-390.png` | Erro expande a faixa no fluxo e desloca o conteúdo. |

Essas capturas são projeções em Chromium desktop com bridge nativa sintética e respostas HTTP de teste. Não são capturas de emulador ou dispositivo Android. `browser-results.json` registra sucesso nesses fixtures para as quatro larguras: ausência de overflow horizontal, alvos de toque, teclado, falha/nova tentativa, adiamento, nova versão após adiamento e limitação das consultas no retorno ao aplicativo. Também registra os casos sem aviso: versão atual, versão instalada posterior, offline, URL não autorizada, web e iOS.

A revisão inicial encontrou U1: o overlay anterior cobria ações da autenticação. Após a correção para faixa no fluxo e conteúdo rolável separado, o revisor marcou **U1 resolvido**, com **disposition: ship** em `verdict-pass.md`. Esse veredito cobre apenas a correção U1 nas projeções fornecidas; não é aprovação integral de prontidão da versão nativa.

Runtime Android, insets reais, escala de fonte, teclado do sistema, handoff real ao navegador e instalação permanecem **NOT_VERIFIED**, devido ao bloqueio de espaço para o emulador. Esta documentação não comprova disponibilidade pública de APK, publicação, comportamento de provedor, segurança ou homologação autenticada. Não foi executado detector: o alvo é nativo, conforme o fluxo da skill; `engine0.1.5` também estava ausente no ambiente informado.

### Preservação do sistema incumbente

SHA-256 conferido antes e depois desta documentação; os dois arquivos permanecem byte a byte iguais aos hashes recebidos:

- `DESIGN.md`: `0cde4dc46966b5c945eed346614d7b8634ebd977136c12816bf8bd00abdfac93`
- `.impeccable/design.json`: `d2b8f6d14a29953ee264bb5873777ca8ed2ba0200ef19407a0627296f985c120`

Esta etapa escreve somente `docs/DESIGN-ANDROID-UPDATES.md`. Não altera os arquivos incumbentes, código, ativos ou documentos de engenharia/publicação.
