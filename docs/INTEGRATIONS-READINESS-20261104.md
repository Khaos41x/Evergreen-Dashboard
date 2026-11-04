# Integrações — preparação e validação, 04/11/2026

O fluxo existente continua real: consulta recursos da credencial autorizada, salva a credencial cifrada com AES-GCM e vincula a aplicação/empresa via RPC; sincronização escreve indicadores pelo servidor. Criar uma conexão não significa que indicadores foram sincronizados. A interface agora explicita essa distinção.

Correções desta rodada: respostas de descoberta inválidas são recusadas em vez de gerar erros de JavaScript; credenciais recusadas têm instrução de recuperação; leitura de resposta HTTP é limitada durante o streaming a 2 MiB, cancelando antes de alocar uma resposta inteira; mudar serviço, aplicação, equipe ou ambiente invalida a descoberta anterior; controles de configuração ficam indisponíveis durante a consulta; reautenticação não pode aplicar uma seleção que já foi alterada.

## Dependências reais para ativação

Em cada servidor que executa o BFF (localhost e Vercel são ambientes diferentes), configurar:

- INTEGRATIONS_ENCRYPTION_KEY: 32 bytes aleatórios em Base64. Localhost e produção que compartilham o mesmo banco precisam usar a mesma chave. Não gerar uma nova chave local se já existir uma na produção. Preservar a mesma chave enquanto existirem credenciais cifradas; trocar a chave exige reconectar fontes.
- INTEGRATIONS_STORAGE_SERVICE_KEY: segredo de servidor do projeto Supabase Evergreen, nunca uma chave do projeto externo e nunca prefixado com VITE_. Necessário para escrever indicadores após autorização da sessão no BFF.
- CRON_SECRET: opcional para agendamento. Sem ele, o fluxo manual funciona quando as duas variáveis anteriores estão corretas.

Não colocar esses valores no Git nem no frontend. Na Vercel, criar variáveis privadas e fazer um novo deployment; no localhost, configurar em .env.local e reiniciar o Vite. A tela de preparação expõe somente presença/validade estrutural, sem ler ou revelar segredos. Presença não valida sozinha permissão remota ou autenticidade da chave.

Depois, o administrador deve cadastrar uma aplicação, reautenticar se solicitado e informar uma credencial de leitura no formulário da empresa. As credenciais de Cloudflare, Vercel, Supabase e Asaas não foram disponibilizadas nesta rodada; nenhuma integração de conta real foi criada pelo agente.

Cloudflare precisa Zone:Read e Analytics:Read das zonas escolhidas. Vercel requer equipe/projeto e Web Analytics instrumentado no plano que disponibiliza os dados. Supabase usa Management API e a consulta read-only, jamais service_role do produto externo. Asaas usa carteira e cobranças do ambiente explicitamente escolhido, com livro financeiro autorizado; não faz pagamentos nem reembolsos.

## Fontes oficiais e testes

- https://vercel.com/docs/analytics/web-analytics-api (agrupamento por dia e dimensões; visitantes não são somados como pessoas únicas).
- https://supabase.com/docs/reference/api/v1-read-only-query (consulta como usuário de leitura).
- npm run test:holding:providers: criptografia e dados determinísticos dos provedores, incluindo schema incorreto, erro de permissão e limite de streaming. Não é homologação de APIs autenticadas.
- node scripts/integration-flow-browser-check.mjs: React real, Chromium em desktop/mobile com transporte substituído, verificando rascunhos e estados. Não prova conexão real.

Nenhum segredo foi lido, nenhuma configuração de produção foi alterada e nenhum envio/agendamento foi ativado nesta rodada.
