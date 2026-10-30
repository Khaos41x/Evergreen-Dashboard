# Evergreen — extensão da holding

Registro da implementação inspecionada em 30/10/2026. Modo: extensão do sistema existente, sem redesenho, nova identidade ou novo North Star. Este documento complementa `DESIGN.md` e `.impeccable/design.json`; não substitui seus tokens normativos. A documentação foi a única escrita desta passagem.

## Overview

A extensão distingue três níveis: holding/grupo, empresa/espaço de trabalho e produto/aplicação. O seletor global apresenta uma empresa ou “Todas as empresas” de um grupo autorizado. Consolidar não concede acesso às empresas: o texto permanece “Consolidado dos dados autorizados”, e o financeiro explicita quando o escopo é parcial.

`src/features/holding/context.tsx` carrega os contextos permitidos. `Collaboration.tsx` conserva o workspace operacional e permite consultar uma empresa com acesso apenas estratégico pela central. Sair dessas superfícies para a operação remove o contexto consolidado. `HoldingCenter.tsx` oferece Informações, Empresas e Integrações; Objetivos globais aparece no contexto do grupo. Empresas e aplicações têm cadastros separados.

A Central Econômica amplia o livro financeiro com períodos, moeda, série diária, comparação tracejada, metas, comprovantes opcionais e histórico exportável. A Central de Informações também oferece séries por indicador da fonte. Asaas ocupa uma seção própria: observações do gateway não são somadas ao livro manual como se fossem novas receitas. O escritório reutiliza Visão e seu diretório, agora com dimensões fixas e posições persistidas. São superfícies operacionais do mesmo produto, com linguagem em português do Brasil e sem métricas ou presença inventadas.

**Autoridade atual:** `PRODUCT.md` de 30/10 prevalece sobre os contratos históricos que exigiam convite para criar conta. O cadastro comum já faz parte da direção vigente; esta extensão não altera esse fluxo. A ativação anterior documentada em `docs/ACTIVATION-20261030.md` também não comprova a nova migração da holding.

## Colors

O sistema incumbente conserva fundo quase preto, neutros verdes, divisórias discretas e ação esmeralda. `src/styles.css` e os arquivos normativos não foram alterados nesta passagem. A extensão usa valores literais locais em `holding.css`, sem criar tokens globais.

| Papel | Incumbente | Extensão observada |
| --- | --- | --- |
| Fundo e superfície | `--bg` / `--raised` | Contexto `#0b1511`; campos `#0d1812`; botões `#11251b` |
| Texto principal / apoio | `--text` / `--soft` | Conteúdo `#e8f3ee`; apoio `#b6c8bd` |
| Ação e seleção | `--emerald` | Aba ativa `#07583e`, borda `#0bcf93`; gráfico `#10d6a1` |
| Divisórias | `--line` | Seções `#25392e`; tabelas `#2a4033` |
| Aviso persistente | Texto de erro claro sobre superfície escura | Fundo `#2c221a`, texto `#f6d5b5` |
| Foco | Contorno esmeralda global | Contorno `#38e5b4`, 2px, afastamento 3px |

Essas diferenças já existiam ao iniciar a documentação. Mantêm a família preta/esmeralda, mas não equivalem a reutilização literal de todos os tokens. Não foram normalizadas nem promovidas a regra de marca. O gráfico possui cor e valores textuais; o estado de uma meta também tem texto, sem depender apenas da barra.

## Typography

A extensão herda a pilha sans do projeto; não introduz download de fonte. Títulos principais usam `clamp(26px, 3vw, 36px)`, peso 600 e tracking de `-.025em`; títulos de seção usam 21px/`-.02em`; subtítulos, 16px. Parágrafos têm entrelinha 1.65 e limite de 75ch. Indicadores usam 20–28px, figuras tabulares e quebra de valores longos; no mobile, 21px. Tabelas usam 13px e figuras tabulares.

Diferenças descritivas em relação a `DESIGN.md`: a escala dos novos títulos supera os 28px/24px da colaboração; campos Holding herdam o tamanho tipográfico em vez de fixar 16px. Algumas labels têm 12–13px. Isso não constitui verificação de zoom de formulário em Safari/iPhone. A tipografia serifada da marca continua nos pixels da logo fornecida, sem reconstrução tipográfica.

## Layout

O contexto fica em faixa própria, com seleção nativa e indicação textual do escopo. A central tem largura máxima de 1500px, margem automática e padding lateral `clamp(16px, 3vw, 44px)`. Cabeçalhos, filtros, ações e abas quebram linha. Formulários mantêm largura máxima de 560px; as listas são linhas abertas separadas por divisórias.

Até 600px, o seletor ocupa a largura disponível, o conteúdo usa 16px laterais, filtros distribuem espaço a partir de 130px, e indicadores formam duas colunas. Em telas maiores, a grade usa `auto-fit` com mínimo de 190px. Tabelas conservam suas colunas em uma região com rolagem horizontal; isso é rolagem do conteúdo, não da página inteira. A série financeira tem 320px de altura, reduzida a 250px até 600px.

As capturas de 390, 790 e 1440px mostram essas quebras, os estados sem fonte sincronizada, o formulário Asaas e os valores parciais da holding. São capturas do harness local: os botões “Informações QA / Finanças QA / Escritório QA” pertencem ao teste e não documentam a navegação final do shell. A central real está integrada a `Collaboration.tsx`, mas esse shell completo não aparece nessas doze imagens.

### Escritório e posições

`layoutWorld` em `src/features/world/model.ts` fixa largura 22 e profundidade 20. Cada sala comporta 12 posições em quatro colunas (`-5.25`, `-2.05`, `2.05`, `5.25`) e três fileiras, preservando o corredor central. `seat % 12` determina a posição; `floor(seat / 12)` determina a sala. Buscar uma pessoa não redistribui as estações: a busca leva à sala de seu assento.

A migração `20261030155415_holding_operating_system.sql` contém assentos de workspace e `eg_holding_seats`, com unicidade por grupo/pessoa e grupo/assento. O servidor atribui a posição; o cliente não oferece escrita direta de assento. `WorldPane.tsx` consome as posições recebidas. O cofre continua único; a cena o coloca em `[width / 2 - 2.1, 0, depth / 2 - 2.2]`, no canto fixo, independente da quantidade de membros.

**Limite visual:** `office-{390,790,1440}.png` registra o Diretório 2D com pessoa buscada e inspector aberto. Não é imagem do novo escritório 3D. Dimensões, corredor e cofre no canto têm evidência de fonte/modelo e testes locais; essas capturas não comprovam renderização final ou desempenho 3D em aparelho físico.

## Elevation & Depth

A Central de Informações e a Central Econômica conservam superfícies tonais e bordas de 1px. A leitura é plana: indicadores, seções, linhas e tabelas, sem empilhar cartões decorativos. O gráfico ganha uma superfície própria escura e o foco visível; o aviso de conexão/webhook é um bloco persistente com texto. Não há nova sombra decorativa no CSS Holding.

A profundidade espacial continua sendo responsabilidade do escritório existente. A nova organização altera dimensões e ocupação, sem definir outra linguagem visual para a interface 2D.

## Shapes

Campos e botões usam cantos de 8px, em continuidade com o controle incumbente. O gráfico usa 12px, seu valor flutuante 7px e avisos 10px. Essas formas são locais. O diálogo de confirmação recente reutiliza `Reauthenticate`, sem substituir o diálogo global por uma nova família.

Há uma diferença objetiva de alvo: `holding.css` define altura mínima de 42px para botões e campos, enquanto `DESIGN.md` descreve 44px para alvos principais. O contexto tem padding próprio e o `summary` mínimo de 38px. Não se declara conformidade de todos os alvos com 44px; esta passagem não reparou medidas.

## Components

| Componente existente na extensão | Comportamento e evidência |
| --- | --- |
| Contexto da Evergreen | Select com label acessível; empresas e grupos autorizados; texto diferencia empresa e consolidado. Falha ao carregar limpa contextos e conserva erro no hook. |
| Central da holding | Navegação nativa com `aria-current=page`, filtros de data/aplicação, loading com `role=status`, erro com `role=alert` e repetição explícita. Ausência de indicadores convida a conectar uma fonte, sem apresentar zero inventado. |
| Empresa / aplicação | Perfil, logo HTTPS e responsável da empresa separados do produto/aplicação. O editor oferece membros da empresa no seletor de responsável; o servidor rejeita pessoa de fora da empresa. Edição exige administração do escopo. Arquivamento é ação explícita; links externos usam `noopener noreferrer`. |
| Fonte integrada | Serviço, aplicação e recurso pertencem à empresa selecionada. Cloudflare, Vercel, Supabase e Asaas têm texto de permissão/contexto próprio. Descobrir, escolher recurso e conectar são etapas distintas; última sincronização e erro aparecem por fonte. |
| Credencial e webhook | Token de leitura é campo password, sem autocomplete, limpo após descoberta e mantido transitoriamente para conexão. Não é exibido no snapshot. O webhook Asaas é instrução para configuração manual; token mascarado pode ser copiado e ocultado. A captura contém `example.invalid` de fixture. |
| Confirmação recente | `useOperation` bloqueia submissões simultâneas e reutiliza o diálogo de reautenticação ao receber `REAUTH_REQUIRED`/428. Confirmar repete a operação pendente; cancelar a descarta. Isso descreve fonte, não prova de provedor hospedado. |
| Indicadores de fontes | Soma apenas métricas declaradas aditivas, com mesma fonte/unidade e deduplicação por recurso. Visitantes, IPs, contas e snapshots não são fundidos como uma população equivalente. Fonte, período, fuso, atualização e indisponibilidades ficam explícitos. `MetricSeries.tsx` acrescenta seletor de indicador, linha SVG, ponto consultável por ponteiro/setas e valor textual com `aria-live=polite`; a tabela diária anterior continua disponível. Sem série válida, há mensagem explícita. |
| Gráfico financeiro | Série SVG diária, indicador selecionável, saída textual `aria-live=polite`, grupo focável com setas esquerda/direita, sliders nativos para início/fim e tabela diária equivalente. O SVG é `aria-hidden`; valores seguem acessíveis fora dele. |
| Totais e comparação | Períodos e moeda explícitos, até 366 dias, erro para intervalo inválido e comparação anterior com base identificada. Ao comparar, `FinancialAnalysis.tsx` desenha a série anterior em cinza `#92a99a`, tracejada `5 4`, além da série atual esmeralda; a variação textual permanece. Resultado operacional é rotulado estimado. Sem dados é diferente de saldo zero. |
| Metas | Progresso nativo acompanhado de valores e texto. Limite de despesa mede consumo de teto. Escopo parcial ou fonte Asaas incompleta impede texto de conclusão verificada. Formulário liga empresa, responsável e objetivo quando disponíveis. |
| Histórico e CSV | Busca/tipo/moeda limitam linhas e exportação. Exporta centavos, moeda, origem, ator e evento, com tratamento de conteúdo que poderia virar fórmula. UI informa teto de 2.000 linhas. |
| Comprovante financeiro | Campo nativo opcional nos formulários de receita/despesa da extensão. Aceita PDF, PNG, JPEG ou WebP até 3 MB no cliente; caminho contém livro, usuário e UUID da solicitação. Upload sem sobrescrita para bucket privado `eg-finance-receipts`; o evento guarda o caminho. No histórico, “Ver comprovante” solicita URL assinada de 60s e só então oferece o link explícito para abrir. |
| Asaas | Fonte separada do livro, ambiente teste/produção identificado, confirmação distinta de disponibilidade, reembolsos concluídos e ausência de valor líquido declarada. Sem uma fonte de produção com `last_sync`, mostra “Sem observações de produção” em vez de indicadores de produção zerados. Totais cobrem cobranças observadas, não uma auditoria de repasse. |
| Escritório | Pessoa, cargo, empresa, foco e tarefas vêm dos dados autorizados. Presença consolidada permanece não verificada. Diretório HTML e alternativa sem 3D são preservados; nenhum colega é criado para preencher a sala. |

### Movimento e acessibilidade

Holding não acrescenta movimento ambiental. Somente sob `prefers-reduced-motion: no-preference`, botões transitam fundo/borda por 150ms e o caminho do gráfico por 220ms, `ease-out`. Com redução de movimento, essas novas transições não são aplicadas. Visão conserva seu tratamento existente de movimento reduzido e alternativa HTML para abrir Finanças.

A inspeção encontrou labels, controles nativos, foco visível, estado atual de navegação e anúncios de loading/erro. O teste Holding foca o gráfico e usa ArrowRight; também consulta busca de pessoa em outra sala. Não houve auditoria completa com leitor de tela, medição independente de contraste ou prova em teclado/gesto físico. Capturas estáticas não demonstram anúncio, foco, retorno de foco ou timing por si sós.

O comprovante reutiliza o editor financeiro e seu foco, sem novo modal de upload. `receipt-{390,1440}.png` mostra o arquivo selecionado, instrução de formato/tamanho e formulário em uma coluna no mobile e duas no desktop. A migração define bucket privado, MIME types, limite de armazenamento de 4 MiB e políticas por livro; o formulário aplica o limite mais restrito de 3 MB. Objetos vinculados não têm remoção comum e não podem ser sobrescritos. A URL assinada e as políticas foram conferidas em fonte/fixture SQL; o teste de navegador de comprovante verifica upload, não abertura de link assinado em Storage hospedado.

### Proveniência e preservação da marca

O arquivo vigente é `public/evergreen-holdings-logo.png`, fornecido pelo usuário como “Logotipo Evergreen Holdings.png”, com transparência e dimensões declaradas de 1536×1024. `EvergreenBrand.tsx` referencia esse arquivo diretamente, com `alt="Evergreen Holdings"`. CSS usa `object-fit: contain`, fundo transparente, 180×120px e variante compacta 72×48px. O filtro `brightness(0) invert(1)` altera a apresentação para claro sobre escuro; os bytes do PNG não são editados. Essa apresentação está prevista no `PRODUCT.md` atual.

O original anterior `public/evergreen-holdings-original.png` permanece no repositório. Na entrada desta passagem, ambos os PNGs, `EvergreenBrand.tsx` e seu CSS estavam sem alterações no status Git. O hash registra os artefatos inspecionados; não é comparação independente com o upload original fora do repositório.

| Arquivo preservado | SHA-256 |
| --- | --- |
| `public/evergreen-holdings-original.png` | `BB6F07CC8A9801E613D727F9556220D24324856ACC4C8968A6BB966925F62CE5` |
| `public/evergreen-holdings-logo.png` | `F6AA0849F3F3F69F95A59F58BDF03D1EF48DF499079D5CA42510BF6A52DB106F` |
| `DESIGN.md` | `ADF8CF8C8DB1EFC08DFBE9219AD147C15375C8A93650CB353F2A9BBFFFBDD54F` |
| `.impeccable/design.json` | `0C4F3F4A5CF8D7BB889784980DBFFD05A59FF49A2E00D20DDF398D442AD8C2ED` |
| `src/styles.css` | `FAA808BAA829FB4DCE60E25B0319D90D8A20D23C11B781A2CE580DDE622C9989` |

O comentário histórico do componente diz “No recoloring”; isso não descreve o filtro CSS atual. O sidecar ainda descreve marca Georgia de autenticação e exemplos de colaboração em inglês. Esses registros antecedem a logo transparente e o cadastro em português. Foram preservados por autorização explícita; não se inferiu que a extensão exigia regenerá-los.

## Do's and Don'ts

- **Do** preservar fundo escuro, esmeralda, listas planas, fonte local e componentes nativos ao ampliar a central.
- **Do** distinguir empresa, aplicação, livro e grupo; tornar escopo, fonte, moeda, período, estimativa e atualização legíveis.
- **Do** manter estados ausente, parcial, desatualizado e indisponível sem fabricar resultados.
- **Do** conservar alternativa HTML para a cena e posições recebidas do servidor ao filtrar pessoas.
- **Don't** tratar seletor de contexto, cargo ou capacidade visual como autorização adicional.
- **Don't** somar métricas incompatíveis, moedas diferentes, gateway e registro manual da mesma operação.
- **Don't** usar fixtures, screenshot ou texto de conexão como prova de uma API real, produção ou conciliação completa.
- **Don't** substituir a logo por glifo, traçado ou composição nova; preservar seus arquivos e proporção.

### Evidências, preservação e limites

Foram lidos `PRODUCT.md`, `DESIGN.md`, o sidecar, a referência Impeccable de documentação, os componentes/CSS Holding, os pontos de integração da colaboração/Finanças/Visão, o modelo do escritório, os scripts de teste e os JSONs de resultado. Foram abertas individualmente as doze capturas `output/holding/{information,integrations,finance,office}-{390,790,1440}.png` e as duas capturas finais `receipt-{390,1440}.png`. O delta final também conferiu `MetricSeries.tsx`, o responsável da empresa, comparação tracejada, a condição sem observações Asaas, comprovantes e `docs/HOLDING-OPERATING-SYSTEM.md`. As doze capturas anteriores não passam a comprovar estados que não mostram, como a nova série de fonte ou comparação ativa.

| Evidência local inspecionada | O que sustenta | Limite |
| --- | --- | --- |
| `output/holding/browser-results.json` | Três larguras sem overflow de página ou pageerrors; escopo, salvar aplicação, conexão Asaas de fixture, token não armazenado, filtros financeiros, CSV e busca com assento estável | Edge local, API interceptada e harness; não é sessão autenticada hospedada nem aparelho físico |
| `output/holding/integrations.json` | Cinco grupos de fixture para credencial autenticada, limites/endpoints, semântica das três fontes, Asaas exato e conciliação paginada | Não chamou APIs reais; não comprova instrumentação, plano ou permissões de conta real |
| `output/platform/sql-results.json` | 24 checks/grupos registrados no resultado final, incluindo replay Holding, isolamento, classificação, metas, assentos, Asaas, comprovante restrito ao livro e revogação | PGlite com fixtures Auth/sessão; não é execução da nova migração em Supabase hospedado |
| `output/platform/identity-results.json` | 13 grupos registrados de identidade/BFF, incluindo cadastro comum, PKCE/cookies, recuperação, step-up e revogação | HTTP/provedor de fixture; Google, e-mail/passkeys reais permanecem não verificados |
| `output/holding/receipt-results.json` | 390/1440px: upload de comprovante em caminho por livro/usuário, centavos exatos, ausência de pageerrors e overflow | API/Storage interceptados; não testa Storage hospedado nem abertura real do link assinado |
| `scripts/holding-model-check.mjs` | Asserções de calendário, valores exatos, CSV e estabilidade geométrica/assentos | A leitura do script não substitui resultado de execução; passagem documentadora não executou suites |

O handoff final informa build aprovado, sintaxe SQL corrigida, 24 checks SQL aprovados e aceitação do reviewer das quatro correções anteriores (4/4). Também informa aprovação local de identidade, UI Holding, regressão UI plataforma e comprovantes. Esta passagem conferiu os artefatos citados e não repetiu suites. O resultado 4/4 é atribuído ao handoff: nenhum arquivo de verdict Holding estava disponível em `.impeccable/review` para leitura independente. Os verdicts anteriores de plataforma/cadastro não substituem esse parecer e a aceitação das correções não é certificação adicional do delta funcional ou autorização de deploy.

`git diff --stat -- DESIGN.md .impeccable/design.json src/styles.css` estava vazio na entrada. O checkout já continha alterações de implementação Holding em componentes, scripts, servidor e nova migração; não foram revertidas, normalizadas ou atribuídas à documentação. Diferenças locais de tokens, alvos de 42px, escala tipográfica e descrições históricas estão registradas acima, sem reparos.

**Estado remoto desta extensão:** `20261030155415_holding_operating_system.sql` não aplicada remotamente; APIs reais Cloudflare/Vercel/Supabase/Asaas, Supabase hospedado para a nova extensão e nova versão Vercel: **NOT_VERIFIED**. Cron não agendado. Webhook exibido é configuração pendente, não recebimento real. Nenhuma publicação, chamada real de integração, cobrança, reembolso ou agendamento foi realizada pela passagem documentadora. O detector permanece indisponível por engine/cache; não foi executado novamente e não há aprovação inferida. Este documento não certifica produção, segurança hospedada, conciliação financeira completa ou prontidão de deploy.
