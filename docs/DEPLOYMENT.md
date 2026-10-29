# Publicação Evergreen

URL de produção: https://evergreen-holding.vercel.app

Vercel: `peixoto-s-projects1/evergreen-holding`. Deployment `dpl_2y3DpejUuQsWkwte6mTP5V8gN9qz`, READY/production. Publicação solicitada explicitamente pelo usuário. Não houve push nem alteração dos projetos ORKTO.

Somente VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY foram configuradas. Arquivos .env, dados de teste, SQL, documentação e scripts foram excluídos do upload pelo .vercelignore. A cópia local do token OIDC baixado automaticamente pelo link da CLI foi removida. A conexão CLI usa a CA já confiada pelo Windows, sem desativar validação TLS.

Verificação HTTPS real: raiz 200, JavaScript/CSS 200, rota SPA 200, headers nosniff/DENY, chunk Auth com Tenho um convite e SDK com configuração pública do projeto dedicado. Isso comprova a hospedagem do frontend, não os novos serviços de backend. Testes de ativação por convite passaram localmente com respostas simuladas em 320/390/1440.

## Primeiro responsável e Supabase — PENDENTES

E-mail confirmado pelo usuário: peixotodavy831@gmail.com. Nenhuma senha foi coletada, nenhuma conta foi criada e nenhum e-mail foi enviado nesta publicação.

1. No projeto dlxsakabwtpdimolsmgd, conferir a conta desse e-mail em Authentication > Users. Se ausente, criar administrativamente a conta com o responsável controlando a senha e confirmar o e-mail pelo procedimento legítimo. A conta deve existir e estar confirmada antes do bootstrap; o script aborta sem alterar nada caso contrário.
2. Conferir e executar `supabase/bootstrap-owner.sql` no SQL Editor. Cria/reutiliza o workspace Holding desse usuário, seu papel owner e o canal geral. É um procedimento administrativo separado, não uma migração automática. Não cria usuário Auth nem apaga workspaces anteriores.
3. Configurar Auth URL Configuration: Site URL https://evergreen-holding.vercel.app e redirect https://evergreen-holding.vercel.app/**. Manter os endereços localhost apenas para desenvolvimento. Validar SMTP com caixa real. O frontend já mantém o convite no retorno de confirmação e recuperação.
4. Aplicar a migração de produtividade pendente. Revisar owners antigos/contas E2E e então aplicar a migração de acesso interno. Não reaplicar a inicial e não executar reset. Ver INTERNAL-ACCESS.md.
5. Entrar como responsável na URL publicada. Criar convite por email em Membros e entregar o link ao colega. O colega abre o link ou usa Tenho um convite para ativar e confirmar a conta. Testar os fluxos reais e as negações antes de declarar uso interno pronto.

O painel continua inacessível à ferramenta de navegador nesta conversa. Sem outra conexão administrativa ao projeto, os passos acima não foram executados. Deploy concluído; primeira conta, redirects, migrações posteriores e colaboração completa permanecem pendentes. A restrição de cadastro no frontend não comprova restrição ativa na API Auth hospedada.
