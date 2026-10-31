# Ativação Evergreen OS V2 — 31/10/2026

O usuário aprovou explicitamente aplicar a migração e publicar o pacote `57c94c4`. A aplicação foi concluída no projeto dedicado Evergreen, sem alterar projetos Orkto ou outra conta Supabase.

## Versão publicada e verificação remota

- Commit: `57c94c4ef6b699e757bb5db826001f68c0d65b4e`.
- Endereço: https://evergreen-holding.vercel.app.
- Vercel: `dpl_3dcEWZMbbJKRdNgixMZCS3SFHcBK`, produção, `READY`, alias canônico confirmado; metadado do deployment corresponde ao commit aprovado.
- Projeto Vercel: `prj_knRAOQpk2pQSfdNJX5RjJD80owDa`, equipe `team_7mNnmcZNv9miOp7pl7otO6wE`.
- Supabase: `dlxsakabwtpdimolsmgd`; migração remota `20261031142018 evergreen_os_v2`, correspondente ao arquivo local `20261030211959_evergreen_os_v2.sql`.
- SHA256 dos bytes locais da migração aprovada: `f1ea9c7894df1f831f456b6fe17180600566de6735e5b568c697e6fb9271c7b2`.

A releitura remota confirmou um workspace geral do grupo, um conselho e exatamente três assentos permanentes. Nenhum assento tem aceite registrado; o conselho permanece inativo. Davy ocupa a primeira posição; as outras duas aguardam contas confirmadas e designação. Nenhuma conta foi criada em nome de Miguel ou Gabriel. As tabelas OS consultadas estão com RLS habilitada; os RPCs OS não foram liberados a anônimos. O bucket de documentos permanece privado.

## Evidência de produção e limites

Os scripts `production-workspace-check.mjs` e `production-browser-check.mjs` passaram contra HTTPS real: HTML, BFF de identidade, sessão anônima negada sem devolver tokens, redirecionamento das quatro rotas privadas para login, SHA256 dos ativos de marca/fonte, cadastro comum visível e login sem 3D/overflow/erros JavaScript em 390 e 1440 px.

Isso **não é um teste com a sessão autenticada do proprietário**. Aceites individuais, votação com múltiplas contas, Auth/RLS/Realtime/Storage de ponta a ponta e dispositivos físicos continuam pendentes de homologação. Os testes locais do pacote aprovado e suas limitações estão no relatório de 30/10; não foram reclassificados como testes hospedados.

Os advisors hospedados não apontaram tabelas públicas OS sem RLS. Permanecem avisos de funções `SECURITY DEFINER` acessíveis por papéis de API e tabelas com RLS sem políticas, que usam apenas RPCs com validação interna. Os dois endpoints anônimos existentes são consulta limitada de convite e rate limit com prova do servidor. A proteção de senha vazada do Supabase Auth continua desativada; esta publicação não alterou a configuração de identidade. Esses avisos não equivalem a uma auditoria de segurança concluída.

A revisão automática inicialmente rejeitou a aplicação por suspeitar de mudanças posteriores à versão aprovada. Foi comprovado que HEAD, arquivo SQL e SHA eram exatamente os de `57c94c4`; a reapresentação do mesmo pacote foi aprovada e executada. Não há rejeição pendente desta publicação.

## Biblioteca solicitada depois da aprovação

A biblioteca exclusiva dos três titulares é um incremento separado, com a migração local `20261031142237_founders_library.sql`. A consulta remota nesta etapa confirmou que sua tabela de presença ainda não existe. Não foi incluída silenciosamente no pacote OS V2 aprovado. Implementação, testes e preparação de publicação são descritos em `FOUNDERS-LIBRARY-20261031.md`.

Não houve push, merge, e-mails de convite ou movimentação financeira real nesta publicação. O deployment anterior `dpl_HRKDWToPMp3k28T2rf8vvyKiKcyg` identifica a versão anterior de frontend; voltar apenas o frontend não desfaz a migração aditiva do banco.
