# Publicação de navegação, perfis e níveis — 30/10/2026

O usuário aprovou explicitamente a nova migração, a preparação das empresas e a publicação desta versão. A execução foi concluída no projeto dedicado Evergreen.

## Versão publicada

- Endereço: https://evergreen-holding.vercel.app
- Commit de código: `9f46106674285f8c8bbebcd159fb0f2d4cea8b24`.
- Deployment: `dpl_HRKDWToPMp3k28T2rf8vvyKiKcyg`, produção, estado `READY`.
- Projeto Vercel: `prj_knRAOQpk2pQSfdNJX5RjJD80owDa`, equipe `team_7mNnmcZNv9miOp7pl7otO6wE`.
- Alias canônico confirmado no deployment publicado. A publicação usou o checkout local validado; não houve push ou merge no GitHub.

## Banco e identidades

- Supabase Evergreen: `dlxsakabwtpdimolsmgd`.
- Migração remota `20261030203725`, nome `evergreen_professional_profiles`, correspondente ao arquivo local `20261030200108_professional_profiles.sql`.
- `bootstrap-company-identities.sql` executado após a migração.
- Consulta administrativa confirmou: Davy Peixoto como fundador original/Chairman da Evergreen; vínculo fundador/APEX na Orkto e sócio na ThinkerChess; Miguel Mármore e Gabriel como indicações pendentes.
- As três novas tabelas têm RLS. As cinco novas funções não permitem execução anônima; clientes autenticados não têm escrita direta nessas tabelas. Todas as tabelas públicas `eg_` continuaram com RLS ativo.
- Miguel e Gabriel não tiveram contas criadas ou acesso concedido por nome. Nenhum convite, e-mail ou mensagem foi enviado automaticamente.

## Verificação executada

Local: build TypeScript/Vite; 30 grupos de verificações SQL/PGlite; 14 verificações BFF/identidade; colaboração em 320, 375, 390, 430, 768, 790 e 1440px; organização em 390, 790 e 1440px; autenticação, Fundadores/níveis, Finanças e cofre em desktop/celular; preservação do modo pessoal e recuperação de backup. Verificação adicional em 1440px mediu foto do rail em 28×28px e confirmou que membro comum não recebe ação de criar canal. São testes com fixtures locais, separados da produção.

Revisão visual independente: quatro achados resolvidos, disposição final `ship`. Documentação visual atualizada. O detector automatizado da skill não rodou porque o motor oficial não pôde ser baixado.

Produção real, sem sessão de usuário:

- HTML e configuração do BFF retornam 200.
- Sessão anônima retorna 401 sem tokens.
- `/hub`, `/vision`, `/economy` e `/founders` redirecionam para login com 303.
- Árvore e fonte publicadas têm o mesmo SHA256 dos arquivos locais.
- Tela pública em 390 e 1440px: cadastro disponível, sem overflow ou erros de página e sem carregar a cena 3D durante login.

Scripts: `scripts/production-workspace-check.mjs` e `scripts/production-browser-check.mjs`. Nenhuma tentativa de login, submissão de formulário, movimentação financeira ou envio externo foi feita nessas verificações.

## Limites atuais

Não foi possível validar a sessão pessoal do responsável. O controle de Windows foi interrompido porque não identificou com segurança a URL do navegador. Portanto, chat/perfis/empresas autenticados, upload real em Storage, solução do erro de proxy naquela sessão e aceite de convites permanecem **não verificados em produção**. As consultas administrativas de banco confirmam o estado dos dados, mas não substituem esse fluxo autenticado.

O ajuste do proxy usa `target` em vez de `path`, evitando colisão com a captura de rota da Vercel. A allowlist de destinos, sessão, origem e reautenticação foram preservadas. A hipótese foi coberta em teste local com parâmetro conflitante; não foi declarada como reprodução da falha da sessão original.

Advisors após a migração: tabelas técnicas sem políticas de acesso direto, funções privilegiadas com verificações internas e proteção de senhas vazadas desativada continuam sinalizadas. Os cinco avisos adicionais de funções autenticadas correspondem às novas RPCs verificadas e com execução anônima revogada. Não foi alterada configuração global de Auth nesta publicação. Referências: [funções e privilégios](https://supabase.com/docs/guides/database/functions), [segurança de senhas](https://supabase.com/docs/guides/auth/password-security).

## Próximo uso

Entrar em `/hub`, escolher a empresa em **Empresas**, abrir o próprio nome para o perfil e usar **Fundadores → Governança → Níveis da Evergreen** para as indicações. Para Miguel: convidar para ThinkerChess, aguardar aceite com e-mail confirmado, definir vínculo Fundador/APEX no perfil e confirmar sua conta como fundador original/Chairman em Governança. As capacidades e os escopos permanecem uma concessão explícita.
