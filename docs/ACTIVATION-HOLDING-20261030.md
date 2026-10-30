# Ativação Evergreen Holding — 30/10/2026

## Resultado real

Publicado em [evergreen-holding.vercel.app](https://evergreen-holding.vercel.app/). Deployment `dpl_Am7BTBk7XhbiWDpTnvJeDQbvYEEW`, READY/production, código `87f3e33`. A publicação foi feita pela CLI autenticada no projeto `prj_knRAOQpk2pQSfdNJX5RjJD80owDa`, equipe `peixoto-s-projects1`. Não houve push ao GitHub.

Aplicado somente no projeto dedicado Supabase `dlxsakabwtpdimolsmgd`:

- `20261030172932` — evergreen_holding_operating_system.
- `20261030172953` — evergreen_server_rate_limit.

A revisão automática inicialmente rejeitou a primeira migração por interpretar o “ok” como autorização apenas para a conta. O usuário então aprovou expressamente: “Sim, aplicar as migrações e publicar”. Só após essa confirmação a aplicação foi repetida e concluída.

## Responsável

Conta existente e com e-mail confirmado: `peixotodavy831@gmail.com`. Nenhuma senha foi coletada ou alterada. Não foi criado usuário Auth nem enviado e-mail.

Executado o bootstrap administrativo revisado em `supabase/bootstrap-holding-owner.sql`. Cria/reutiliza “Evergreen Holdings”, canal privado de Fundadores e vincula apenas as empresas já pertencentes ao responsável. O espaço real Orkto foi vinculado; não se criaram empresas de demonstração nem se concedeu acesso a espaços alheios.

Conferência hospedada: responsável da holding (`group_owner`), capacidades de visão geral, empresas, finanças, pessoas, projetos, inteligência, decisões, comunicação, governança e documentos. Escopos explícitos de empresa, incluindo finanças. Administração financeira atribuída aos livros existentes das empresas vinculadas. O papel do responsável inicial é protegido contra remoção/rebaixamento pelo fluxo comum de governança.

Para convidar outra pessoa, usar **Membros → criar convite** na empresa. Depois que ela entrar, usar **Fundadores → Governança** para conceder o papel de fundador, capacidades e escopos por empresa. O cargo profissional informado no cadastro continua sem conceder privilégios.

## Runtime e proteção

Configuração de produção: origem HTTPS canônica, prova aleatória de servidor para limitação distribuída e chave de cifragem das integrações, armazenadas como variáveis sensíveis na Vercel. Somente o hash da prova fica no schema privado do Supabase. Nenhum desses segredos está no código, evidências ou frontend.

O limitador usa incrementos atômicos reais no Postgres, janela de cinco minutos e limpeza limitada a contadores técnicos expirados. Falha de prova, rede ou configuração bloqueia a tentativa. Redis continua opcional. As políticas, as tabelas privadas e a prova foram testadas localmente antes da aplicação.

A primeira publicação revelou que o catch-all de API anterior não atendia as rotas aninhadas na hospedagem. A correção usa `api/handler.ts` e rewrites explícitos, preservando consultas de callback e do proxy. A versão corrigida foi publicada e testada antes de declarar conclusão. O envio excluiu `.env`, dados de teste, SQL, documentos e build local.

## Evidências

- 27 grupos locais de replay/segurança SQL, incluindo bootstrap idempotente e contador concorrente real; 13 grupos locais de identidade e build passaram.
- HTTPS real: HTML200, configuração BFF200, sessão sem autenticação401, quatro rotas privadas303 para login e origem externa403.
- Autenticação real com endereço inexistente: rejeições `invalid_credentials`; excesso de tentativas bloqueado por `RATE_LIMITED`/HTTP429. Nenhuma conta existente foi usada nem qualquer e-mail enviado. O teste tolera a mudança da janela de cinco minutos.
- Edge real em390/1440px: login e cadastro normal disponíveis, sem overflow/erros de página, sem carregar componentes3D durante a autenticação.
- 48 tabelas públicas `eg_*`; zero sem RLS. Os avisos restantes do assessor incluem RPCs SECURITY DEFINER deliberadas/protegidas, tabela somente por RPC e proteção de senhas vazadas ainda desativada. [RPCs autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RPCs pré-login](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Resultados em `output/activation/production-smoke.json`, `browser.json` e capturas de login. A abertura da URL no painel do Codex foi solicitada; a ferramenta retornou `queued`.

Não foram verificados: login interativo do responsável com sua senha, entrega real de e-mail, Google/passkeys ou integrações dos produtos com suas credenciais. Google e passkeys permanecem desativados. As credenciais Cloudflare/Vercel/Supabase/Asaas não foram fornecidas, o armazenamento administrativo das métricas ainda precisa ser configurado no servidor e nenhum cron foi agendado. Essas pendências não alteram o papel de proprietário já confirmado no banco.
