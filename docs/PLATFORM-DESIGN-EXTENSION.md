# Evergreen Platform — registro da extensão implementada

Registro documental de 29/10/2026. Escopo: Identity, Evergreen Vision, Economy e Founders em modo **Operate**, dentro da identidade Evergreen existente. Complementa `DESIGN.md`, `.impeccable/design.json` e `docs/WORLD-R1-DESIGN-NOTES.md`; não substitui esses arquivos nem aprova uma nova identidade.

## Overview

A entrada apresenta acesso corporativo por convite e uma alternativa pessoal explicitamente restrita ao navegador. Vision mantém estações, salas e diretório do World e acrescenta portas para Economy e Founders. Economy é o livro financeiro interno em uma superfície 2D independente; Founders organiza o escopo estratégico concedido a cada pessoa. O 3D serve à navegação e não representa saldos, autorização ou confirmação de operações.

A continuidade vem dos fundos escuros, superfícies tonais, listas com divisórias finas, esmeralda nas ações e ícones Lucide. A marca fornecida pela empresa passa a ser apresentada pelo componente compartilhado `EvergreenBrand`, sem criar uma versão tipográfica ou redesenhar seu símbolo. Não há comp visual aprovado para comparação pixel a pixel nesta extensão; as capturas documentam a implementação e não se tornam um North Star retroativo.

**Regra de contexto:** cada módulo explicita se o conteúdo é pessoal, financeiro interno ou restrito ao escopo autorizado. Estado vazio, acesso indisponível e confirmação pendente continuam visíveis como tais.

## Colors

O núcleo global permanece em `src/styles.css`: fundo (`--bg`, #070a09), sidebar (#090e0d), painel (#0a0f0e), superfície elevada (#0d1312), texto (#f3f4f2), apoio (#bdc7c3), divisória (#1b2320) e esmeralda (`--emerald`, #10d994). Os valores abaixo são escolhas locais efetivamente implementadas, não novos tokens globais.

| Papel local | Valor observado | Aplicação |
| --- | --- | --- |
| Ação/foco Identity e Economy | #00cda2 | Primária Economy, foco de controles e confirmação de identidade |
| Aba ativa Economy/Founders | #00d5a3 | Texto e sublinhado da navegação atual |
| Fundo / texto Economy | #090f0d / #e4ede8 | Superfície operacional e conteúdo principal |
| Texto secundário Economy | #9bafa1 | Descrições, filtros e metadados |
| Controle / hover | #111c17 / #1b3025 | Botões com borda #293a32 |
| Campo | fundo #101a15, borda #304638 | Inputs e selects de Economy; inputs do step-up |
| Confirmação/erro persistente Economy | fundo #192b22, borda #355043 | Aviso textual; erros têm `role=alert` |
| Movimento positivo / negativo | #57d9b0 / #e1b39b | Valor do livro acompanhado de sinal e descrição |
| Barras receita / despesa | #00cda2 / #b99172 | Relatório com valores numéricos e resultado textual |
| Seleção de texto | fundo #174f39, texto #e4ede8 | Economy e Founders |
| Scrollbar | #365541 sobre #090f0d | Superfície Economy/Founders |
| Vision | fundo #080e0c, cena #0b1510, inspector #0e1812 | Mantém a família material do World R1 |

**Regra do valor legível:** moeda, sinal, rótulo e texto explicam os números; cor e comprimento das barras são apoio visual. Totais permanecem separados por moeda, sem conversão inventada.

## Typography

O projeto mantém a pilha global `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`; Economy/Founders declaram `Inter, Arial, sans-serif`. Nenhuma fonte nova é carregada por esses componentes. A marca fornecida é imagem e conserva sua tipografia original.

| Papel | Medida implementada |
| --- | --- |
| Título de entrada | `clamp(42px, 5vw, 68px)`, entrelinha 1.02; 44px até 700px |
| Título Economy/Founders | `clamp(32px, 4vw, 48px)` |
| Valores consolidados | `clamp(26px, 4vw, 42px)`, numerais tabulares |
| Métricas Founders | 36px; 30px até 700px |
| Título de seção/editor | 19px |
| Campos Economy | 14px |
| Botões / labels do editor | 13px |
| Metadados e filtros | Predominantemente 10–12px |

Tracking dos títulos de entrada, introdução e grandes valores é limitado a (-.04em); seções usam (-.03em). As medidas menores dos campos/metadados são inventário local, sem substituir o padrão de campo (16px) documentado para colaboração.

## Layout

Identity usa container de até (1080px), duas colunas iguais e gap fluido de (24–90px); o cabeçalho acompanha a rolagem com posição sticky. Até (700px), cabeçalho e formulário ficam em uma coluna, com padding (28px 22px) e cabeçalho estático.

Economy/Founders usam cabeçalho com quebra de linha, retorno ao Vision, marca compacta e contexto. Conteúdo central de até (1180px), padding (48px 30px); até (640px), padding (30px 20px). Abas rolam horizontalmente, filtros quebram linha e listas ficam no fluxo normal. Editores aparecem abaixo da seção, em duas colunas e largura de até (750px), passando para uma coluna até (640px). Abrir editor foca seu título e o traz à área visível; fechar devolve foco ao acionador ainda conectado.

Founders organiza quatro métricas em colunas; até (700px), usa duas colunas. Filtros de grupo/empresa deixam o escopo explícito. Ao selecionar uma empresa, documentos do grupo inteiro e de outras empresas ficam fora da lista; aparecem apenas os documentos da empresa selecionada. A visão de todo o escopo inclui os documentos de grupo retornados pelo snapshot.

Vision conserva a grade cena/inspector e o empilhamento até (768px) descritos em `WORLD-R1-DESIGN-NOTES.md`. As portas HTML de Economy e Founders ficam acima da cena; até (640px), cada uma ocupa a largura disponível. A porta Economy continua acessível sem WebGL. A marca compacta divide o cabeçalho com título e origem dos dados.

## Elevation & Depth

As superfícies 2D usam tonalidade e bordas de (1px), mantendo listas e seções planas. O diálogo nativo de reautenticação usa fundo (#101b15), borda (#385343) e backdrop (#020906cc) com blur (5px). Essa escolha local não substitui o modal de colaboração.

O cofre e o terminal executivo são geometria nativa Three.js. O cofre usa volumes metálicos verdes/cinza, volante e dobradiça, com luz localizada; o terminal usa base, haste e monitor. São objetos de navegação, sem raster gerado, modelo baixado ou consulta financeira dentro da cena.

A porta do cofre abre em (0.75s), com easing cúbico e rotação final de aproximadamente (-1.72rad). A navegação tem limite de espera de (1200ms). Em movimento reduzido ou diretório 2D, a abertura navega diretamente. Câmera e rolagem de seleção respeitam movimento reduzido; o World desativa suas animações/transições CSS nesse modo. Economy/Founders usam rolagem imediata ao editor quando a preferência está ativa. O renderer permanece sob demanda e suspende frames com documento oculto; isso não constitui medição de FPS ou consumo em dispositivo físico.

## Shapes

Economy/Founders usam botões de (9px), campos de (7px), barras de (2px) e diálogo de reautenticação de (16px). Portas Vision usam (10px). A cena/inspector conservam (12px), com inspector mobile de (10px). Essas medidas locais convivem com o padrão global de controles (8px) e diálogos de colaboração (14px); não são uma revisão silenciosa desses tokens.

## Components

| Componente real | Estados e comportamento registrado |
| --- | --- |
| `EvergreenBrand` | Imagem original `/evergreen-holdings-original.png`, alt “Evergreen Holdings”, dimensões intrínsecas 512 × 512, `object-fit:contain`; apresentação 128px ou 56px compacta, 100px na entrada mobile e 48px compacta até 700px. Sidebar de colaboração apresenta 88px. Sem recorte, recoloração, traçado ou distorção. |
| `Auth` | Entrada por e-mail/código, convite com nome/cargo, senha de conta existente e recuperação; Google/passkey desativados quando não configurados, com explicação textual. Pending bloqueia ações; erro e aviso persistem. Acesso pessoal declara ausência de compartilhamento e sincronização. |
| `Reauthenticate` | `dialog.showModal()` nomeado pelo título, envio/confirmação de código e passkey configurada; cancelar e Escape respeitam operação ocupada; fecha restaurando o foco anterior. Mensagem de validade de cinco minutos descreve o contrato implementado, sem comprovar provedor hospedado. |
| `SecuritySettings` | Passkeys e sessões carregadas, configuração pendente explícita, confirmação de identidade, avisos e erros; ações de exclusão/revogação pedem confirmação. |
| `Economy` | Seis seções: Visão Geral, Empresas, Cofres, Movimentações, Relatórios e Planejamento. Reservas pertencem ao saldo consolidado; estimativas manuais são nomeadas como estimativas. Erro oferece nova tentativa e não estima saldo ausente. |
| Editor Economy | Empresa, conta, cofre, orçamento, acesso, receita, despesa e transferência; labels visíveis, inputs nativos, confirmação pendente e reautenticação quando exigida. Sinalização de sucesso ocorre após resposta da ação e recarga. |
| `Founders` | Navegação condicionada às capacidades retornadas: visão geral, empresas, Economy, pessoas, projetos, inteligência, decisões/documentos, comunicação e governança. Indicadores indisponíveis mostram “Restrito”. Inteligência exibe regras sobre registros carregados, sem análise de IA inventada. |
| Editor Founders | Vínculo/escopo/capacidades, proposta e documento com limite de 4MiB; campo e legenda para capacidades explícitas. Decisão aprovada não representa execução financeira. |
| Vision / `FinancialVault` / `ExecutiveTerminal` | Cofre com hover, clique/toque e indicação “Abrindo o cofre…”, acesso HTML equivalente e terminal Founders quando há callback autorizado. Os labels projetados são complementares e `aria-hidden`; o diretório e as portas HTML são a alternativa operacional. |

Foco visível usa contorno (2px) nas superfícies novas; labels, navegação atual (`aria-current`), grupos pressionados (`aria-pressed`), progressos nativos e regiões `status`/`alert` comunicam estado. Botões/campos Economy têm altura mínima de (44px); a entrada declara (46px) para botões, inputs e summary. A correção revisada mantém qualidade gráfica, câmera, paginação e alternâncias mobile em pelo menos (44px). Isso descreve os seletores inspecionados, sem certificar todos os controles da aplicação ou uma auditoria WCAG integral.

## Do's and Don'ts

- Preservar o arquivo original da marca e reutilizar `EvergreenBrand`; ícones funcionais permanecem Lucide.
- Manter acesso 2D/HTML às funções espaciais, foco visível e alternativa de movimento reduzido.
- Distinguir saldo realizado, reserva incluída, estimativa manual e ausência de dados autorizados.
- Manter empresa, moeda e capacidade visíveis no contexto; presença ou cargo não ampliam permissão.
- Não transformar fixtures, disponibilidade visual, proposta aprovada ou resposta pendente em confirmação de operação real.
- Não promover medidas locais compactas ou diferenças de tokens a um novo padrão global sem decisão explícita.

## Proveniência, evidência e limites

A marca é o ativo original fornecido pela empresa, preservado em `public/evergreen-holdings-original.png`. SHA256 verificado nesta passagem: `BB6F07CC8A9801E613D727F9556220D24324856ACC4C8968A6BB966925F62CE5`. O componente documenta essa origem; o hash confirma os bytes atuais, sem inferir direitos além da origem fornecida.

Foram lidos o sistema incumbente, seu sidecar, `PRODUCT.md`, as notas World R1, o parecer `platform-verdict.md`, os estilos e componentes citados e `output/platform/browser-results.json`. Evidência visual recebida do builder/reviewer: `auth-{390,478,1440}.png`, `economy-{390,478,1440}.png`, `founders-{390,478,1440}.png`, `vision-{390,478,1440}.png` e os seis `economy-editor-*`/`founders-editor-*`, em `output/platform/`. Não houve nova captura, inspeção de defeitos ou execução de testes por esta passagem documental.

O parecer final é **SHIP para as correções locais revisadas: 5/5 resolvidas, 0 parciais, 0 pendentes**. Sua abrangência é a lista de correções: label mobile do cofre, foco/rolagem dos editores, marca/ícone Vision, alvo de qualidade e filtro documental por empresa. O reviewer reabriu as três capturas Vision e seis capturas de editor e leu código/assertions/resultados; não reexecutou as suítes. O resultado salvo relata fixtures de API, autenticador virtual e viewports emulados de 390/478/1440px, incluindo retorno/foco e alternativa sem WebGL. Screenshot isolada não comprova essas interações.

Drift observado e não canonizado: `DESIGN.md`/sidecar descrevem sobretudo colaboração e marca Georgia; o shell pessoal conserva declaração Bodoni MT/Didot, enquanto os pontos novos usam a imagem original. Economy/Identity usam #00cda2 e medidas locais distintas de #10d994 e dos controles globais; campos Economy têm 14px, e a busca World 12px, abaixo dos 16px documentados para colaboração. Metadados compactos, raio de diálogo e blur são inventário de implementação, não regras globais novas. Nenhuma dessas diferenças foi reparada ou usada para reescrever o sistema nesta entrega.

**Limites:** Supabase/Auth/Google/SMTP/Redis hospedados, envio real de e-mail, Storage e autorização reais, passkeys/biometria física e dispositivos físicos permanecem **NOT_VERIFIED por esta documentação**. Fixtures e autenticador virtual não são E2E de provedor. O detector permanece **FAILED/indisponível**, sem passe inferido. Nenhum deploy, ação em API/provedor, operação financeira real ou escrita remota foi feito por esta passagem.
