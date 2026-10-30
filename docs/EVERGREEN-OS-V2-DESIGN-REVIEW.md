# Evergreen OS V2 — revisão visual delimitada

Data: 30/10/2026. Extensão do mundo visual existente, com React/Vite e a identidade Evergreen preservados. Não houve exercício de identidade, comp gerada ou comparação com uma comp. A referência é o produto incumbente, o código e as capturas locais.

**Disposition final do revisor independente: `ship`. Os três itens pontuados estão resolvidos; a liberação cobre somente essas três correções de interface.** Não é nova auditoria integral, autorização de publicação, detector aprovado ou certificação de prontidão para produção.

## Escopo e autoridade

`PRODUCT.md` estabelece a separação Platform / Evergreen Group / empresas, três assentos Chairman de igual autoridade-base, aceite pessoal e dados reais. `DESIGN.md` e `.impeccable/design.json` são o sistema visual incumbente e foram preservados. A extensão extraída da implementação está em `DESIGN-EVERGREEN-OS-V2.md`.

Direção aplicada: quase preto e esmeralda, árvore branca fornecida nas superfícies internas, Libre Caslon Display local em títulos, sans em corpo/controles, diretório plano, três assentos equivalentes e empilhamento responsivo. Os controles gerais OS têm mínimo de 44px; o CTA principal de foco foi ampliado. Rótulos não substituem autorização no servidor.

## Ciclo de correção e disposition

A primeira revisão independente retornou **fix**, apontando três problemas. A etapa final de verdict-pass limitou-se à resolução desses itens, sem abrir nova busca por defeitos nem emitir uma nova aprovação ampla da superfície.

| Item pontuado | Estado inicial | Correção observada | Resultado delimitado |
| --- | --- | --- | --- |
| F1 — deliberações exigiam representação técnica | UUIDs, centavos e JSON apareciam como controles/resumos de proposta | `Boardroom.tsx` usa opções autorizadas com nomes; `ProposalSummary.tsx` traduz a pauta para pares legíveis. Participação mostra pessoa/percentual/estado. Finanças parte da ação do compromisso ou Cofre, com valor/conta/descrição preenchidos e resumo em moeda | Resolvido; os exemplos de assento, sociedade e autorização financeira foram recapturados |
| F2 — enum no diretório | `EXTERNAL` aparecia como rótulo de produto | `OrganizationHub.tsx` mostra “Independente” para empresa sem vínculo ao grupo; o tipo de transporte permanece no modelo | Resolvido; sem atribuir empresa ao grupo por ter conta na plataforma |
| F3 — identificadores nos assentos | Fragmentos do ID permanente apareciam no resumo visual | `CouncilSeats`, em `Boardroom.tsx`, mostra posição, titular e aceite; ID permanece na chave e no transporte | Resolvido; três assentos conservam hierarquia equivalente |

A aprovação de F1 cobre o fluxo de propostas revisado. Não afirma remoção de todo identificador técnico em todas as ferramentas administrativas, convites, auditorias ou solicitações de organizações externas.

## Evidência visual

O revisor independente informou ter aberto e validado as **30 capturas** em `.impeccable/review/os-v2/`, nas larguras **390, 790 e 1440px**. Há dez estados, cada um nas três larguras:

| Conjunto | Capturas |
| --- | --- |
| Primeiras 18 | `hub-{largura}.png`, `builder-{largura}.png`, `council-{largura}.png`, `equity-{largura}.png`, `commitments-{largura}.png`, `home-{largura}.png` |
| Doze adicionais | `boardroom-seat-{largura}.png`, `boardroom-equity-{largura}.png`, `boardroom-finance-{largura}.png`, `home-idle-{largura}.png` |

Essas imagens são capturas da interface com fixtures HTTP locais. Nomes “QA”, empresas de teste, valores e controles auxiliares do harness são evidência de teste, não cadastros, permissões ou transações de produção. O conjunto equivalente em `output/os/` é gerado por `scripts/os-browser-check.mjs`.

Na documentação, foram inspecionadas novamente amostras do Hub desktop, conselho móvel, seletor de assento desktop, proposta societária móvel, autorização financeira desktop e início ocioso móvel. Essa leitura não foi uma segunda revisão integral das 30 capturas nem uma nova execução do navegador.

## Comparação com o sistema incumbente

Valores conferidos diretamente em `DESIGN.md`, `.impeccable/design.json`, `src/styles.css`, `src/features/organizations/organizations.css` e `src/components/HeroTree.css`:

| Aspecto | Sistema incumbente | OS V2 observado | Avaliação |
| --- | --- | --- | --- |
| Fundo/texto/ação | `#070a09`, `#f3f4f2`, `#10d994` | Mesmos tokens `--bg`, `--text`, `--emerald` | Preservados |
| Fontes | Libre Caslon Display local / sans | Títulos OS usam `--heading-font`; controles e campos sans | Preservadas |
| Títulos | Headline 28px/1.2, peso 400 | h1 `clamp(30px,3vw,42px)/1.15`, h2 28px/1.2, h3 23px/1.2 | Ampliação local de hierarquia, sem substituir o token geral |
| Controles | Raio 8px, mínimo geral de 44px, foco esmeralda 2px/3px no workspace | Mesmo raio/mínimo/foco nos controles gerais OS; campos 16px | Continuidade; não é certificação de todos os alvos de toque |
| Superfícies | Camadas tonais e divisórias discretas | Botão `#102218`, campo `#0a1510`, assentos `#102519`, divisória `#31533b` | Extensão local da mesma família |
| Texto primário do botão | `#04150f` | Variante OS `#051a0d` | Diferença registrada; token incumbente preservado |
| Layout | Conversa/listas planas; três colunas nos níveis profissionais | Diretório em linhas; três assentos iguais; empilhamento até 1000px | Adequação ao contexto do conselho |
| Foco no início | Controles gerais de 44px | Primeira ação de 236px e mínimo de 64px; 18px no celular/20px desktop | Ênfase intencional da ação pedida |

Há uma diferença de contexto a registrar: o texto histórico de perfis em `DESIGN.md` ainda descreve Chairman/APEX/NÍVELO como vínculos profissionais; OS V2 usa três assentos E0 protegidos, níveis E/A e nomeação personalizável. `PRODUCT.md` e a extensão OS V2 são a autoridade vigente nesses pontos. O sistema visual incumbente e seu sidecar não foram sobrescritos para resolver essa diferença.

## Evidência de funcionamento local

`output/os/browser-results.json` declara explicitamente `Local UI/API fixtures; NOT hosted authentication, Storage, or user validation`. Nas três larguras, registra `namedGovernanceSelectors`, `prefilledHumanCurrencyApproval`, `largeFocusCTA`, `contextualGreeting`, `noRasterTreeRuntime`, `noOverflow` e `pageErrors: []`, além dos demais fluxos OS exercitados.

O script local também verifica percentuais em basis points e compromissos em centavos, pedido intercompany sem execução com uma aprovação, aceite/voto na UI, fechamento de resumo de foco preservado após quatro atualizações e remount e revisão manual da sessão ainda disponível. Asserções sobre UI e respostas sintéticas não provam regras remotas de banco ou a entrega de provedores.

O relatório `EVERGREEN-OS-V2-REPORT-20261030.md` registra build, replay de segurança, identidade, colaboração, plataforma e regressões locais. Esses resultados são atribuídos à execução de implementação; o documentador não repetiu as suites. A evidência de SQL/PGlite continua separada da evidência de interface.

A árvore tem 45.190 pontos segundo `public/evergreen-tree.geometry.json`; `HeroTree.tsx` projeta XYZ e identifica profundidade reconstruída. O teste verifica a ausência do PNG da árvore durante a execução. A fonte original é 2D; nenhum arquivo 3D original foi fornecido ou validado.

## Detector e limites da aprovação

O detector Impeccable foi tentado uma vez e permaneceu **indisponível/sem veredito**: engine 0.1.5 ausente e bloqueios de acesso ao cache/rede no ambiente. Não houve resultado de detecção utilizável, detector pass ou rerun nesta documentação. Ausência de findings não foi interpretada como ausência de defeitos.

**NOT_VERIFIED nesta etapa:** aplicação hospedada da migração OS V2, publicação deste frontend, Auth/Realtime/Storage com duas contas reais, provedores, aparelhos físicos, volume real e prontidão integral de produção. A ativação hospedada anterior documentada no projeto não equivale à ativação OS V2. A migração `supabase/migrations/20261030211959_evergreen_os_v2.sql` permanece preparada e validada localmente, conforme o relatório desta entrega.

A conclusão é restrita: os três problemas pontuados estão resolvidos e liberados pelo finish reviewer nesse escopo. Os limites de homologação e configuração permanecem no relatório de entrega. Esta documentação não executa migração hospedada, deploy, ativação de assentos ou envio externo.
