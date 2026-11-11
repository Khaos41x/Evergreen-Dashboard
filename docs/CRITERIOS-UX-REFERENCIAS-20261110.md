# Critérios de experiência para o Evergreen

Pesquisa em fontes oficiais realizada em 10 de novembro de 2026. O foco é a aplicação operacional Evergreen Holdings, com empresas, comunicação, tarefas e finanças. Os critérios abaixo são uma proposta de avaliação para o produto. A seleção de referências reúne documentação pública e decisões explicadas pelas próprias equipes.

| Referência | Critério encontrado | Aplicação proposta no Evergreen |
| --- | --- | --- |
| Apple HIG | Hierarquia, alinhamento, adaptação ao espaço e comportamento de rolagem esperado. | Empresa, módulo e tarefa atual reconhecíveis. Conteúdo inteiro alcançável na janela disponível. |
| Slack Design | Navegação previsível, regiões identificáveis, foco consistente e desenvolvimento com usuários de tecnologia assistiva. | Orientação entre empresas, canais e mensagens. Retorno de foco depois de diálogos. Destino da mensagem anunciado corretamente. |
| Linear | Conteúdo da tarefa tem prioridade visual. Navegação e separadores têm menos peso. Ações permanecem em locais previsíveis. | Reduzir a competição entre cabeçalho, contexto financeiro, filtros, abas e ações. |
| Atlassian | Tokens como fonte de decisões visuais, espaçamento, grid, tipografia e texto claro. | Componentes e estados consistentes entre módulos. |
| IBM Carbon | Texto de interface claro, útil e consistente, com terminologia padronizada. | Ações específicas e mensagens que expliquem o resultado e a recuperação. |
| Google Android | Navegação e composição adaptadas ao tamanho da janela. | Barra lateral ou inferior conforme o espaço. Organização das tarefas preservada ao mudar a apresentação. |
| W3C e Google Web Vitals | Critérios verificáveis de acessibilidade, resposta, estabilidade e carregamento. | Testes de teclado, zoom, rolagem, contraste e desempenho com métricas explícitas. |

Fontes por referência ficam ao final. As aplicações ao Evergreen são sínteses desta pesquisa.

**1. Orientação e navegação**

A pessoa deve conseguir identificar a empresa ativa, a área atual e o destino de uma ação. Trocar de empresa deve manter um comportamento previsível. Menus, abas e botões equivalentes devem repetir sua posição e terminologia. Atalhos aceleram tarefas recorrentes, com alternativas visíveis.

A Slack descreve melhorias de hierarquia, rótulos, foco e navegação entre regiões. O artigo também relata que mover o foco de formas diferentes conforme o estado de uma conversa prejudicou a orientação. O Evergreen deve validar onde o foco chega e para onde volta em cada fluxo.

**2. Hierarquia e densidade**

O trabalho em andamento recebe mais atenção visual que a navegação. Título, contexto, filtros e ações precisam formar grupos distinguíveis. Cada borda, ícone e superfície deve ajudar a reconhecer uma relação ou ação. A revisão do Linear publicada em março de 2026 aplica exatamente essa redução de competição visual.

Na captura de Finanças, o espaço acima dos resultados contém título, descrição, empresa, período, moeda, seis abas, seletor de período e duas ações. Isso é uma observação da captura. A prioridade proposta é verificar quanto desse conteúdo precisa permanecer visível durante a consulta e reunir controles relacionados.

**3. Rolagem e adaptação**

O conteúdo deve continuar alcançável quando a altura da janela diminuir, o texto aumentar ou o teclado virtual abrir. A Apple recomenda os gestos e atalhos usuais de rolagem e orienta evitar contêineres aninhados que rolem no mesmo eixo.

Para o Evergreen, testar a janela marcada de 740×622, mobile, desktop e texto ampliado. Manter uma região principal de rolagem por painel de trabalho. Tabelas e gráficos que exigem composição bidimensional podem ter tratamento próprio, com identificação clara.

**4. Acessibilidade**

Adotar WCAG 2.2 AA como objetivo de implementação. Os critérios precisam ser avaliados separadamente. Uma auditoria automática cobre parte deles.

- Contraste mínimo de texto normal de 4,5 para 1 e texto grande de 3 para 1, observadas as exceções do critério.
- Conteúdo vertical com reflow a 320 CSS px, observadas as exceções para conteúdo que exige duas dimensões.
- Funcionalidade operável por teclado, foco visível e retorno de foco coerente.
- Nomes acessíveis para controles de ícone e identificação de estado por texto ou forma, além da cor.
- Alvos de ponteiro de pelo menos 24×24 CSS px ou espaçamento equivalente, conforme as exceções de WCAG 2.5.8.
- Para toque, propor uma meta de produto de 44×44 CSS px. A orientação da Apple usa 44×44 pontos nas plataformas aplicáveis. Pontos nativos e CSS px são unidades distintas.

**5. Texto e estados**

Os textos devem ajudar a decidir e agir. Usar a mesma palavra para a mesma ação. Estados de carregamento, vazio, erro e sucesso precisam ser distinguíveis. Uma falha deve indicar a operação afetada e uma recuperação disponível. Conteúdo longo e nomes reais devem caber nos componentes.

Para Finanças, explicitar empresa, moeda, período e situação da informação apresentada. Essa aplicação é uma decisão proposta para a confiança no módulo.

**6. Consistência de componentes**

Concentrar cores semânticas, tipografia, espaçamento e estados em um sistema compartilhado. Consistência inclui comportamento de diálogos, campos, seletores, busca, navegação e mensagens. A documentação da Atlassian descreve tokens como fonte única das decisões de interface. Carbon fornece convenções para manter o texto consistente entre produtos.

**7. Velocidade e estabilidade**

Usar como metas de campo LCP de até 2,5 segundos, INP de até 200 milissegundos e CLS de até 0,1 no percentil 75, separando mobile e desktop. Medir as três dimensões. Os testes de laboratório ajudam a diagnosticar a implementação. A comprovação da experiência real requer dados de uso.

**8. Validação com tarefas**

Avaliar um conjunto fixo de operações do Evergreen. A seleção proposta é trocar empresa, abrir uma conversa, enviar uma mensagem, criar uma tarefa, localizar um documento, consultar movimentos e preparar uma operação financeira. Registrar sucesso, erros, tempo de conclusão e pontos de hesitação. Confirmar os critérios com quem usa o produto, incluindo pessoas que navegam por teclado ou leitor de tela.

A regra de avaliação proposta é corrigir primeiro impedimentos de tarefa, depois orientação e legibilidade, depois refinamentos visuais.

**Correção local da rolagem**

Na cópia em Documents/Codex/Evergreen-Dashboard, a área financeira embutida usava overflow visible dentro de um contêiner principal de altura limitada e overflow hidden. A alteração de overflow para auto restabeleceu a região de rolagem.

O comando COLLAB_SURFACES=1 COLLAB_ATLAS=1 COLLAB_WIDTHS=390,740,1440 node scripts/collaboration-ui-check.mjs passou nos três tamanhos. O caso de 740 px usa altura de 622 px. A regressão verificou conteúdo maior que a área visível, rolagem com roda, cabeçalho estável e ausência de overflow horizontal. Os demais cenários existentes de conversas, arquivos e finanças também passaram. São componentes React reais com respostas HTTP de teste.

Arquivos alterados para a correção foram src/features/economy/economy.css, scripts/company-surfaces-check.mjs e scripts/collaboration-ui-check.mjs. git diff --check passou. A mudança está local e a validação do site publicado permanece pendente. O controle do navegador conectado está desativado nas configurações.

**Fontes oficiais**

- [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple HIG — Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views)
- [Apple — UI Design Dos and Don’ts](https://developer.apple.com/design/tips/)
- [Slack Design — Accessibility with users](https://slack.design/articles/what-weve-learned-about-designing-for-accessibility-from-our-users/)
- [Slack Design — Defaults and accessibility](https://slack.design/articles/should-we-make-it-a-preference-on-customization-defaults-and-accessibility/)
- [Linear — A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh)
- [Atlassian Design — Foundations](https://atlassian.design/foundations/)
- [IBM Carbon — Content](https://www.carbondesignsystem.com/building-blocks/foundations/content)
- [Android Developers — Layouts and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- [W3C — Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [W3C — Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Google — Web Vitals](https://web.dev/articles/vitals)

**Atualização em 11/11/2026**

A correção recebeu limite de rolagem para o documento do ambiente de trabalho, scrollport próprio em Fundadores e padding inferior de 64 px em Finanças. Os níveis em Atlas usam as superfícies e cores dos tokens do tema. A suíte COLLAB_SURFACES=1 COLLAB_ATLAS=1 COLLAB_WIDTHS=390,734,1440 passou, incluindo ida a Fundadores, Governança e retorno ao Hub nos tamanhos de 734 e 1440 px. Configuração de autenticação, TypeScript e build Vite passaram. O build manteve avisos do chunk 3D e dos imports do Capacitor. A mudança foi validada com transporte HTTP de teste. O elemento claro marcado na sessão publicada segue sem identificação conclusiva.