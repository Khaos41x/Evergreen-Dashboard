# Biblioteca dos fundadores — publicação de 31/10/2026

O usuário aprovou explicitamente “Aplicar a biblioteca e publicar” para a versão `c67fda0`. Migração e publicação foram concluídas no projeto dedicado Evergreen.

## Identificação da versão

- Fonte publicada: `c67fda0830c93a99f8ef40fa703aa8a352a13a48`.
- Endereço: https://evergreen-holding.vercel.app/vision.
- Vercel: `dpl_8CZfjvVCB1utokNUXjcTh9A9hs5x`, produção, `READY`, alias canônico confirmado e metadados correspondentes ao commit aprovado.
- Projeto Vercel: `prj_knRAOQpk2pQSfdNJX5RjJD80owDa`; equipe `team_7mNnmcZNv9miOp7pl7otO6wE`.
- Supabase dedicado: `dlxsakabwtpdimolsmgd`; migração remota `20261031145209 evergreen_founders_library`.
- Arquivo: `supabase/migrations/20261031142237_founders_library.sql`; SHA256 dos bytes locais aplicados: `53473752db3b72ed0d3f49e13c2b5d28b27fbe7ca02ccb4182dd1ed22a939a77`.

As alterações do banco foram enviadas por `apply_migration`. O frontend foi enviado pelo CLI Vercel a partir do checkout local aprovado. Não houve push ou merge no GitHub, criação de contas, convite por e-mail, alteração de credenciais ou movimentação financeira.

## O que foi confirmado no servidor

| Controle | Releitura remota |
| --- | --- |
| `eg_founder_presence` com RLS | Habilitada |
| Acesso direto à tabela para `anon` e `authenticated` | Negado para leitura/escrita |
| RPC de biblioteca e heartbeat para anônimos | Sem permissão de execução |
| RPC de biblioteca e heartbeat para autenticados | Execução permitida, com verificação interna de sessão e assento |
| Helper privado e contexto anterior | Sem execução direta por autenticados |
| Assentos permanentes | Exatamente três |
| Aceites pessoais registrados | Zero; conselho ainda inativo |
| Linhas de presença no momento da conferência | Zero; nenhum estado online foi semeado |

Davy está designado ao primeiro assento. Miguel Mármore e Gabriel continuam aguardando contas confirmadas e designação/aceite. Os lugares vagos são exibidos como tal; nomes informados no chat não atribuem identidades. Antes da ativação inicial, o titular designado associado ao grupo pode acessar a biblioteca; após ativação, o aceite também é exigido. O frontend não concede acesso financeiro pela entrada na sala.

## Testes e limites

Passaram contra HTTPS de produção, em modo público e somente leitura: HTML, BFF, rejeição de sessão anônima sem devolver tokens, redirecionamento de `/hub`, `/vision`, `/economy` e `/founders` para login, SHA256 de árvore/fonte e login responsivo em 390/1440 px sem carregar 3D ou gerar overflow/erros JavaScript. O deployment retornou `READY` e foi relido pelo conector Vercel.

Os 44 grupos de testes SQL locais, a biblioteca em 390/1238×715/1440 px e a regressão de colaboração em 390/1440 px estão em `FOUNDERS-LIBRARY-20261031.md`. WebGL por software é real, mas nomes, sessões e respostas HTTP dessas capturas são sintéticos. A revisão independente considerou resolvidas suas duas correções materiais: cofre livre no celular e nomes completos legíveis.

**Não verificado:** interface da biblioteca com a sessão real do proprietário; heartbeat e isolamento de ponta a ponta com duas contas reais; aceites individuais e dispositivos físicos. Foi tentada a localização de uma janela de navegador autenticada por Computer Use, mas a sessão Evergreen indicada pelo usuário fica no app e não foi acessada por essa ferramenta. Não foram automatizados login ou diálogos de autenticação, nem reutilizados tokens/cookies extraídos.

## Advisors de segurança

A consulta hospedada posterior à migração retornou seis avisos informativos de RLS sem políticas, dois avisos de funções anônimas preexistentes, 52 de funções `SECURITY DEFINER` autenticadas e um sobre proteção de senha vazada. Não foi um resultado de auditoria limpa.

A tabela de presença usa RLS sem políticas e sem grants diretos por intenção: somente RPCs restritos fazem leitura/escrita. Os dois novos RPCs são `SECURITY DEFINER` com `search_path` vazio, sessão válida e vínculo ao assento verificados internamente. Não foram abertas permissões diretas para silenciar o advisor. Consulte [RLS sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) e [funções autenticadas com privilégios](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Os dois endpoints anônimos anteriores são consulta limitada de convite e rate limit com prova do servidor; veja [aviso de funções anônimas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). A [proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) permanece desativada na configuração Auth existente e não foi alterada nesta publicação.

## Continuidade

O deployment imediatamente anterior é `dpl_3dcEWZMbbJKRdNgixMZCS3SFHcBK`, fonte `57c94c4`. Voltar somente o frontend não desfaz o banco: a migração nova é aditiva e o RPC antigo do escritório permanece restrito aos mesmos titulares. Não foi executado rollback.

O pacote de evidências e código está em `outputs/evergreen-founders-library-20261031`, no workspace de entrega. O ZIP de fonte conserva o commit aprovado e os documentos de preparação como estavam; este registro posterior e o manifesto de ativação distinguem o que efetivamente foi publicado da homologação ainda pendente.
