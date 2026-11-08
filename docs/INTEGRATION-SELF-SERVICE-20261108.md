# Evergreen — sites, conversas e ajustes mobile
Data: 08/11/2026. Estado: implementado e validado localmente. Sem publicação, APK, migração ou acesso a credenciais reais nesta etapa.

## Auditoria e decisões
- O formulário de integração já descobria recursos e salvava credenciais, mas isso não consultava nem confirmava os indicadores. O usuário precisava descobrir sozinho que ainda faltava sincronizar.
- O cadastro de aplicações estava em outra aba. Agora o administrador cadastra o site na própria tela de integrações.
- O chat tinha entrada/saída do canal, mas não tinha caminho evidente de volta à lista nem criação de conversa dentro do canal.
- No tema claro, a árvore estava com opacidade 0,26; o símbolo do perfil tinha aproximadamente 28 × 38 px no celular.
- A seleção de provedor no tema Atlas usava um reset de formulário no mesmo evento do seletor. O teste encontrou a seleção voltando ao valor anterior. A troca agora remonta somente o formulário específico do provedor.
- Preservados: trilho de empresas, hero de Hoje, marca oficial e composição de “Empresas e atuação”. O aumento é restrito à marca da capa no mobile.

## Fluxo disponível
Na empresa: Ajustes → Integrações da empresa.
1. **Adicionar site**: nome, endereço HTTPS e descrição opcional. Persiste em `eg_applications` pelo RPC existente `eg_holding_action`, com empresa e autorização do usuário. O cadastro fica disponível mesmo antes de configurar a infraestrutura dos conectores.
2. Escolher Cloudflare, Vercel, Supabase ou Asaas, aplicação e token de leitura.
3. Consultar os recursos autorizados pela credencial e selecionar o recurso.
4. Para os três provedores de indicadores: **Testar conexão e buscar dados** consulta a API oficial no servidor. A prévia informa fonte, aplicação, recurso, período, UTC, horário de consulta, métricas, série e limitações.
5. **Salvar e sincronizar** cifra a credencial e executa a primeira sincronização. Só mostra sucesso completo após a confirmação de persistência.
6. Se o salvamento funcionou e a sincronização falhou, informa o resultado parcial e mantém a fonte disponível para tentar **Sincronizar período** novamente.
7. Asaas permanece separado: conectar não importa registros financeiros automaticamente. A conciliação de cobranças requer uma ação explícita.

O endereço identifica o site. Ele não concede acesso a dados privados e não transforma requisições HTTP em visitas. Ainda não há conector de API arbitrária/scraping de qualquer URL. Um site hospedado em outro serviço pode ser cadastrado, mas sua coleta exige um conector compatível.

## Conversas e perfil
- Dentro do canal: **Todas as conversas** e **Nova conversa**.
- Nova conversa permite selecionar uma pessoa real da empresa para iniciar ou abrir uma mensagem direta pelo RPC existente `eg_direct_channel`.
- Administradores também podem criar um canal. A entrada e a saída do canal continuam respeitando a associação autorizada.
- O pedido de criação é consumido: fechar o diálogo não o abre novamente.
- Mobile até 600 px: símbolo da capa 44 × 58 px, nome de 26–34 px, capa com altura mínima de 164 px e quebra de nomes longos.
- Tema claro: árvore projetada em preto, opacidade 0,72. Os temas escuros mantêm sua composição.

## Controles preservados e ampliados
- O novo POST `/api/integrations/preview` usa a mesma verificação de sessão no servidor, origem, reautenticação recente, autorização administrativa na empresa, preparação de criptografia/persistência e rate limiting das demais ações.
- Prévia verifica novamente se o recurso pertence à credencial/equipe selecionada. Não grava credenciais nem métricas.
- As chamadas ficam restritas aos hosts oficiais já permitidos; sem redirecionamento ou destino arbitrário. Limites de tempo, tamanho e período continuam ativos.
- Campos obrigatórios de métricas inválidos/ausentes e datas incompatíveis geram erro, sem conversão para zero. Uma série válida e vazia continua distinta de resposta inválida.
- Visitantes diários e fotografias não são somados como pessoas únicas da holding.
- Tokens permanecem em referências temporárias; não vão para localStorage/sessionStorage. Trocas de provedor/aplicação/configuração descartam o rascunho; recurso/período invalidam a prévia.
- Não foi adicionada chave administrativa no frontend, nem foi alterada política RLS.
- Nenhuma alteração de esquema foi necessária. A leitura do SQL existente confirmou autorização por empresa e autenticação recente para cadastrar aplicações.

## Arquivos desta etapa
Interface:
- `src/features/appearance/themes.css`
- `src/collaboration/workspace.css`
- `src/collaboration/conversation.css`
- `src/collaboration/Chat.tsx`
- `src/collaboration/ConversationDirectory.tsx`
- `src/collaboration/Collaboration.tsx`
- `src/features/holding/Integrations.tsx`
- `src/features/holding/IntegrationSetup.tsx`
- `src/features/holding/IntegrationSites.tsx` (novo)
- `src/features/holding/holding.css`

Servidor:
- `server/integrations.mjs`
- `server/integration-providers.mjs`

Testes:
- `scripts/integration-check.mjs`
- `scripts/integration-flow-browser-check.mjs`
- `scripts/collaboration-ui-check.mjs`
- `scripts/company-surfaces-check.mjs`

Este checkout já continha alterações de etapas anteriores. Elas foram preservadas; esta relação descreve o trabalho desta etapa.

## Verificação final
- `npm run build`: PASS. TypeScript + Vite + pacote OTA assinado local. Isso não publica nem confirma atualização de aparelho. Permanecem avisos do chunk 3D e imports estático/dinâmico do Capacitor.
- `npm run test:holding:providers`: PASS. Inclui o handler real de prévia contra contexto e transporte isolados: sem sessão, origem incorreta, autenticação antiga, não administrador, empresa estrangeira, configuração ausente e limite de tentativas impedem consulta; nenhuma escrita RPC é feita pela prévia. Provedores são respostas controladas.
- `npm run test:holding:connection-ui`: PASS em 390/495/1440 px, Atlas e Claro. Cadastro do site com empresa correta, rejeição de HTTP, ausência de infraestrutura impede entrada de credenciais, troca de configuração invalida rascunho, credencial recusada não mostra sucesso, prévia antes do salvamento, troca de recurso invalida prévia, falha de sincronização permite retry, salvamento seguido de sincronização e Asaas explícito.
- `COLLAB_SURFACES=1 COLLAB_ATLAS=1 COLLAB_WIDTHS=390,1440 node scripts/collaboration-ui-check.mjs`: PASS. Seleção e criação de mensagem direta, criação de canal privado, fechamento sem reabertura, fluxo existente de arquivos, contexto financeiro e revogação de acesso. Componentes React reais, transporte HTTP controlado.
- O mesmo teste de superfícies também passou em Verde Evergreen.
- `COLLAB_PRESENTATION=1 COLLAB_WIDTHS=320,390,495,1440 node scripts/collaboration-ui-check.mjs`: PASS. Árvore preta, marca mobile maior, marca contida na capa, sem overflow horizontal e sem erros de página.
- `npm run test:platform:security`: PASS, 61 verificações. Replay isolado em PGlite das migrações existentes, incluindo isolamento empresa/aplicação, recusa de gestão de fontes por membro comum, snapshots sem ciphertext e métricas restritas ao serviço.
- `git diff --check` dos arquivos relevantes: PASS.

Os testes visuais foram inspecionados em lote e tiveram uma rodada de ajuste para compactar o formulário e recolher o detalhamento técnico quando o servidor já está preparado.

## Evidências locais
- `output/holding/integrations.json`
- `output/integration-flow/results.json`
- `output/company-surfaces-results.json`
- `output/presentation-adjustments-results.json`
- `output/integration-flow/preview-atlas-390.png`
- `output/integration-flow/data-preview-atlas-390.png`
- `output/integration-flow/data-preview-atlas-1440.png`
- `output/playwright/darker-tree-light-495.png`
- `output/playwright/profile-brand-mobile-495.png`
- `output/playwright/preserved-companies-495.png`

## Limites da validação
Não foi escolhido site/provedor real pelo usuário nesta etapa. Nenhuma fonte foi conectada usando credenciais reais. Coleta de produção, permissões do provedor, instrumentação, quotas e disponibilidade de dados continuam **NOT_VERIFIED** até configurar e executar o teste da fonte. Os testes locais não equivalem a E2E autenticado com duas contas reais, entrega de push ou teste em celular físico. A tentativa de inspeção da aba do usuário encontrou o serviço de navegador indisponível; não houve acesso alternativo a cookies ou sessão. Nenhuma produção foi modificada.

## Referências técnicas consultadas
- [Vercel Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api): API oficial de agregação, parâmetros por projeto/equipe/período e métricas fornecidas pelo serviço.
- [Vercel Web Analytics](https://vercel.com/docs/analytics): interpretação das métricas e limites de visitantes.
- [Supabase Management API](https://api.supabase.com/api/v1/): consulta read-only com escopo de leitura; não exige expor service_role ao navegador.
