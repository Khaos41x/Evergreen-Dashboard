# Organização publicada — 30/10/2026

A continuação solicitada pelo usuário priorizou “Organizar empresas, equipe e projetos”. As melhorias foram publicadas no projeto Evergreen existente, sem DDL nova, alteração de variáveis, criação de empresas ou convites reais.

- Produção: [Evergreen](https://evergreen-holding.vercel.app/hub).
- Projeto Vercel: `prj_knRAOQpk2pQSfdNJX5RjJD80owDa`, equipe `peixoto-s-projects1`.
- Deployment: `dpl_2HYFK83Wxn2XtEax8xakHmDTYrVE`, READY/production.
- Código publicado: `048f4a8fb4760b9514fb9e0f2424cd22a570efc0`.
- A publicação usou a CLI autenticada com certificados confiáveis do Windows; não houve push ao GitHub.

Disponível: navegação Empresas e equipe; visão operacional por empresa; criação/vínculo de empresa com recuperação de falhas; projetos próprios com tarefas, responsável e progresso; convites de futuros fundadores por link dentro da governança; preparação das integrações conferida antes de solicitar credenciais.

Verificações locais: build;14 grupos de identidade/BFF; cinco grupos de provedores; organização em390/790/1440px; shell completo e regressões em seis larguras, com organização integrada exercitada em390/1440; Holding em três larguras; plataforma em três larguras. Três defeitos materiais corrigidos e confirmados pela revisão independente, que também concluiu o aceite visual no escopo local.

Verificações reais após publicar: HTML200, BFF/config200, sessão anônima401, rotas privadas redirecionam para login, origem externa403 e tentativas com conta inexistente bloqueadas por `RATE_LIMITED`/429. Edge real em390/1440px abriu login/cadastro sem overflow ou erros de JavaScript e sem carregar3D.

Limites: não foi automatizado o login do proprietário ou usado seu cookie. Os testes de criar/vincular empresas, convites e projetos são fixtures locais, não mutações hospedadas. Nenhum e-mail foi enviado, nenhum fundador real foi convidado e nenhuma credencial dos produtos foi conectada. A persistência das integrações ainda depende da configuração segura já documentada. A preparação só informa configuração presente; não certifica validade de credenciais.

O pedido de abertura do Hub no Codex retornou `queued`; isso não confirma por si só a página visível. O endereço público foi validado por HTTPS. As permissões reais de proprietário permanecem as da [ativação anterior](ACTIVATION-HOLDING-20261030.md).

Evidências: `output/organization/browser-results.json`,12 capturas; `output/collaboration-ui-results.json`,quatro capturas integradas; `output/activation/production-smoke.json` e `browser.json`. [Guia dos fluxos](ORGANIZATION-WORKFLOWS.md).
