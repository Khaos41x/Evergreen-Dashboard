# Evergreen — entrada simplificada dos fundadores

Implementado e publicado em 01/11/2026, após aprovação explícita para aplicar a migração e publicar. Não foram feitos novos envios de e-mail nesta ativação.

O cadastro continua por nome, e-mail e senha. Depois da autenticação, a pessoa seleciona Orkto e/ou ThinkerChess e informa se é fundadora ou sócia em cada empresa. As informações ficam salvas por conta e por empresa e podem ser atualizadas pelo próprio perfil.

O responsável confirma o vínculo em Membros → Pessoas e equipe → Vínculos informados, com um botão. Não é necessário criar um convite para esse fluxo. A confirmação grava o vínculo profissional e concede colaboração na empresa, sem conceder APEX, Chairman, administração, medalhas de primeiro fundador/sócio ou acesso financeiro. A autoridade de quem já era responsável não é reduzida. O acesso existente não é revogado ao desmarcar uma empresa no formulário.

O diretório inicial usa os dois workspaces reais existentes, encontrados por nome único; não cria cópias de empresas ou usuários. A migração hospedada vinculou Orkto e ThinkerChess ao catálogo. Usuários, workspaces, membros e vínculos profissionais existentes foram preservados.

As solicitações e o catálogo ficam em tabelas privadas com RLS e sem acesso direto de clientes. As funções expostas exigem sessão viva e e-mail confirmado, vinculam a solicitação à conta autenticada, limitam a seleção às duas empresas e restringem a confirmação à administração competente. A revisão exige autenticação recente e a revisão exata da solicitação. Reenvios idênticos são idempotentes; mudanças concorrentes exigem atualizar a revisão. Suspensão, sessão revogada e atuação autodeclarada não contornam permissões.

Arquivos principais:

- `supabase/migrations/20261101155227_founder_company_onboarding.sql`: catálogo e solicitações privados; leitura, envio e confirmação no servidor.
- `server/auth-actions.mjs`, `server/proxy.mjs`: rotas do onboarding e reautenticação na revisão.
- `src/features/identity/CompanyOnboarding.tsx`, `company-onboarding.css`, `AuthScreen.tsx`: seleção simples após login, persistência e atualização do acesso.
- `src/features/people/CompanyOnboardingReview.tsx`, `CompanyPeople.tsx`, `src/collaboration/Collaboration.tsx`: confirmação por empresa com identificação da conta.
- `src/features/productivity/ProfessionalProfile.tsx`: atualização dos vínculos pela própria pessoa, preservando a aparência de Empresas e atuação.
- `scripts/onboarding-sql-check.mjs`, `platform-security-check.mjs`, `auth-fixture.mjs`, `auth-p0-browser-check.mjs`: regressões e fixtures locais.

Verificações executadas:

- `npm run build`: TypeScript/Vite aprovados. Permanece o aviso anterior do chunk 3D.
- `node scripts/platform-security-check.mjs`: 61 grupos aprovados em PGlite, incluindo replay da nova migração e três grupos específicos de onboarding. Testadas declaração sem privilégios, isolamento, confirmação por administrador recente, revisão desatualizada, repetição, preservação do responsável, recusa, retirada, suspensão, revogação e acesso anônimo.
- `node scripts/auth-p0-browser-check.mjs`: fluxo aprovado em 320, 390 e 1440 px. Seleção independente nas duas empresas, dados preservados após recarregar, confirmação e recusa pela tela de equipe. Também passaram as regressões locais de cadastro/login/recuperação, ausência de overflow e erros de página.
- `node scripts/identity-check.mjs`: 16 grupos existentes de identidade aprovados após a alteração.
- `git diff --check`: sem erros; apenas avisos de normalização CRLF em arquivos existentes.

Evidências: `output/platform/sql-results.json`, `output/auth-p0/browser.json`, `output/auth-p0/companies-320.png`, `companies-390.png`, `companies-1440.png`, `company-review-320.png`, `company-review-390.png` e `company-review-1440.png`.

Os testes locais de banco usam PGlite e identidades de fixture; os de navegador usam o React/BFF/SDK reais com provedor HTTP local de teste e touch emulado. Não são prova de funcionamento autenticado hospedado ou em celular físico. A ativação e as verificações públicas estão registradas abaixo. O incidente de redirecionamento dos e-mails hospedados continua separado e aberto em `docs/AUTH-P0-20261101.md`.

## Ativação autorizada — 01/11/2026

- Projeto Supabase: `dlxsakabwtpdimolsmgd`. Migração remota `20261101161914_founder_company_onboarding`, aplicada com sucesso a partir do arquivo local `20261101155227_founder_company_onboarding.sql`, SHA256 `f1d3a95993d1a055918fe1b75ec2c244161cc6f221876a738c3ac6ae9111fe0a`.
- Publicação: [Evergreen Holdings](https://evergreen-holding.vercel.app/), deployment `dpl_66X9FuCxUuQoAe1eiPaQgNduf8QF`, estado READY, promovido após verificações iniciais. Fonte auditada SHA256 `5b8006406b197260b5734d0ea8f840a36da7ef5150563c9ad9e75055facf0b4f`; base Git `75836a84f2c8cb1941329d83c2f8b495fc30d5d0` com alterações locais incluídas. Não houve commit ou push.
- Empacotamento: `.vercelignore` permite somente `scripts/auth-config-check.mjs` dentre os scripts, necessário ao build; scripts de QA, evidências e segredos continuam excluídos.
- Leitura antes/depois: 6 usuários, 13 workspaces, 19 membros e 2 vínculos profissionais, sem alteração. Catálogo com Orkto e ThinkerChess; zero solicitações antes de qualquer uso real.
- As duas tabelas privadas estão com RLS e sem SELECT direto para anon/authenticated. As quatro RPCs são exclusivas de authenticated e exigem identidade válida. Teste transacional sem JWT, sem representar usuário, confirmou recusa e foi revertido.
- REST hospedado: as quatro RPCs resolveram no schema cache e recusaram anon com HTTP 401/código 42501. BFF sem sessão: `/api/identity/company-onboarding` respondeu 401; raiz/config responderam 200, com cookieSessions habilitado.
- Navegador publicado: login e cadastro em 390/1440 px; nome, e-mail, senha e confirmação presentes, sem convite/cargo, overflow, erros de página ou respostas 5xx observadas. A rota privada não exibiu o workspace sem login. Nenhum componente 3D foi carregado na autenticação. Mobile emulado, sem aparelho físico.
- Advisors: nenhum ERROR; avisos anteriores de funções SECURITY DEFINER e proteção de senha vazada permanecem. As novas tabelas privadas sem políticas e quatro funções controladas aparecem nos lints esperados. Isso não constitui auditoria completa.
- A consulta limitada de logs de erro/fatal deste deployment, nos 15 minutos da verificação, não retornou grupos; isso não comprova o fluxo autenticado.

Evidências em `output/founder-onboarding-release/`: `source-manifest.json`, `deploy-dry.json`, `deployment.json`, `hosted-check.mjs`, `hosted-check.json`, `signup-390.png`, `signup-1440.png` e capturas de login. As capturas de cadastro foram inspecionadas visualmente.

**Limites:** não foi realizado novo cadastro, envio de e-mail, login real ou aprovação de vínculo em produção; esses fluxos têm apenas as provas locais descritas acima. Site URL/allowlist/templates/SMTP hospedados não foram alterados e a falha relatada do link continua pendente. Nenhum novo APK foi compilado ou distribuído.
