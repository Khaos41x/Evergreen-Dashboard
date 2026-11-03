# Evergreen 1.2 — publicação de 31/10/2026

Versão técnica 1.2.0; Android versionCode 4. Publicação solicitada pelo usuário após concluir os ajustes anteriores e acrescentar menções por nome, equipe e instalação PWA.

## Endereços e artefatos

- Web/PWA: https://evergreen-holding.vercel.app/
- Android: https://evergreen-android-downloads.vercel.app/releases/4/Evergreen.apk
- Manifesto Android: https://evergreen-android-downloads.vercel.app/latest.json
- Deployment web: dpl_8C2LT2A4ZmNdCeAC6woaH5jjLCaJ (production, READY, promovido para o domínio principal).
- Deployment de downloads: dpl_Cmmtobf4rVrxosKaykg3DcmKjDym (production, READY).
- Código web enviado a partir do checkout com alterações locais, base 75836a84f2c8cb1941329d83c2f8b495fc30d5d0; sem novo commit/push. Manifesto SHA-256 do conjunto de fontes: 8ab40f5da7bc463ec66e72d4ce27a4504741e3d2cbe216bf9ef02a5a683c53b3.
- APK: 11.632.170 bytes; SHA-256 71dce9f0ed49a73613c99fbb804c08b35d3d994bbff10f0a5e9d2350fb03a2fe.
- Certificado SHA-256 df860fd91807fd1a09a8ce9d9240e52c126151448544085b8db5faf591460d02, igual ao fixado na primeira instalação. Instalar por cima, sem desinstalar.

## Comportamento entregue

- Bandeira brasileira maior, sem retângulo de fundo; árvore oficial preservada junto ao nome da empresa.
- Perfil no topo, medalhas por empresa, renomeação do próprio escritório e perfil executivo.
- Dígitos do temporizador com espaçamento positivo e tamanho relativo ao mostrador; rodapé contido no círculo. Apenas Orkto recebe a preposição “na”.
- Menções apresentam nomes no editor, na edição e na mensagem. Ranges preservam a pessoa selecionada mesmo com nomes iguais; IDs continuam canônicos no banco para notificações. Alterar o nome digitado desfaz a associação em vez de adivinhar outro destinatário.
- Equipe, cargos, departamentos, vínculos e convites receberam as migrações pendentes. A API pública agora resolve eg_company_people/eg_company_invites_snapshot e exige autenticação, em vez de retornar PGRST202.
- PWA com manifesto, ícones oficiais reaproveitados, instrução/ação de instalação e service worker. APIs e navegações privadas vão à rede; o modo sem conexão mostra apenas uma página pública. O PWA não registra credenciais ou dados de equipe no cache.

## Banco hospedado

Projeto dlxsakabwtpdimolsmgd, conferido antes da escrita. Migração atômica evergreen_1_0_2_profiles_people_mobile (20261031213212) reúne native_push, company_invitations_notifications, profile_executive_v2, profile_apex_and_founder_desks e company_profile_medals. A migração seguinte evergreen_profile_effective_levels alinha a projeção aos níveis legados do contexto organizacional, sem alterar membros, atribuições, permissões nem atestar medalhas. Os responsáveis antigos sem atribuição explícita aparecem como A0, administradores como A1 e membros como A5; uma atribuição explícita continua tendo prioridade.

A projeção de perfil passou a rejeitar sessão revogada e membro suspenso. Readback preservou 3 perfis, 13 workspaces e 2 vínculos profissionais. As novas tabelas estão com RLS habilitada. Os hashes das seis fontes estão em output/releases/1.2.0/database-sources.json.

## Validação realizada

- npm run mobile:sync: build TypeScript/Vite aprovado e mesmo build copiado para Android/iOS, com CSP nativa.
- node scripts/platform-security-check.mjs: 57 grupos locais de verificações, com replay completo, Auth/session fixtures e RLS no PGlite.
- npm run test:identity: 16 verificações do BFF com servidor Supabase local de fixture.
- node scripts/mentions-check.mjs: 8 verificações de identidade/ranges, incluindo nomes duplicados, edição e membro removido.
- Playwright: 320, 390, 567, 790 e 1440 px, perfil/equipe/medalhas/menções por nome, ida e volta da edição, teclado/touch, rodapé e dígitos dentro do círculo e ausência de overflow. Fixtures REST; não é E2E autenticado hospedado.
- npm run test:mobile:bridge e test:mobile:updates: adaptador e metadados com doubles locais; test:mobile:ui e test:mobile:updates:ui verificam CSS nativo/lifecycle e atualização em Chromium, sem aparelho.
- npm run mobile:apk: compilação Android concluída. O AAPT2 falhou no isolamento inicial; o mesmo SDK compilou com sucesso fora dele.
- npm run test:mobile:release: apksigner/aapt2 confirmaram assinatura, pacote, versão, imutabilidade e bloqueio de downgrade. npm run mobile:release preparou a publicação preservando releases 1, 2 e 3.
- node scripts/pwa-check.mjs: Chrome com build real e API local de fixture, sem erros de instalação, offline/reconexão e sem cache privado.
- node scripts/production-pwa-check.mjs: endereço público real em Chrome, versão 1.2.0, manifesto e worker ativos, zero erros de instalação, offline/reconexão e zero endpoints privados no cache. Não é instalação em telefone.
- node --use-system-ca scripts/hosted-release-check.mjs: REST real do Supabase com chave pública, funções resolvidas e chamadas anônimas negadas (401/42501).
- HTTP público: raiz 200, /hub 303 para login, sessão 401, manifesto/worker/ícones 200. latest.json informa code 4 / 1.2.0. Os dois downloads públicos foram baixados e comparados com o SHA-256 local; antigos releases 1, 2 e 3 continuam disponíveis. Cache e MIME conferidos.
- git diff --check aprovado.

Evidências: output/releases/1.2.0/, output/pwa/, output/playwright/release-home-567.png, output/playwright/release-people-567.png e output/native/update-release-guard-results.json.

## Limites e pendências

Não houve instalação ou execução no aparelho físico; o APK segue a distribuição debug direta já adotada. iOS não foi compilado nesta máquina Windows. A revisão automática rejeitou uma consulta que extrairia um ID de sessão de auth.sessions para impersonar o proprietário: o método não foi executado nem contornado. As verificações hospedadas posteriores foram públicas/sem sessão extraída. Operações autenticadas em produção e dois usuários reais continuam sem homologação nesta rodada.

Envio real de OTP/e-mail de convite e APIs de Cloudflare/Vercel/Supabase/Asaas não foram homologados. Nenhuma credencial nova de provedor, SMTP ou FCM foi configurada nesta entrega. A presença da estrutura de push no banco não ativa notificações sem a infraestrutura correspondente.

A revisão do React conferiu hooks/eventos com cleanup, identidade de menções, rotas existentes, acessibilidade dos controles e atualização de estado. A compilação continua emitindo o aviso conhecido do chunk 3D de aproximadamente 951 kB.

## Avisos do Supabase

O advisor não retornou ERROR. Permanecem avisos que exigem revisão, sem declaração de auditoria de segurança concluída:

- 6 tabelas internas/fechadas com RLS e sem política de cliente: [linter 0008](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- 2 funções SECURITY DEFINER executáveis por anon e 58 por authenticated, com controles internos a revisar: [linter 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [linter 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Proteção contra senhas vazadas desativada: [documentação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Instalação PWA e limites entre plataformas: [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).


Build final 4: o tamanho dos dígitos também depende da quantidade de caracteres, com validação em fonte Arial alternativa em 320/567/1440 px. O contador foi conferido no endereço público usando exclusivamente o modo local, sem entrar em uma conta. O build 3 intermediário foi preservado como arquivo imutável; latest.json e o link amigável apontam para o build 4. A migração de níveis efetivos foi registrada remotamente como 20261031220202.

Validação posterior autorizada: as consultas de perfil e equipe foram executadas em transação somente de leitura no contexto da conta do proprietário e retornaram os vínculos corretos de Orkto/ThinkerChess, sem alterações persistentes. Veja [AUTHORIZED-PROFILE-TEAM-READ.md](AUTHORIZED-PROFILE-TEAM-READ.md). Isso não substitui o fluxo de login nem a execução no aparelho.
