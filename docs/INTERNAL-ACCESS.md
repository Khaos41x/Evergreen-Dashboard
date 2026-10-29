# Operação interna da holding

## Política

Sem cadastro público. Um owner/admin cria convite em Membros e entrega o link ao colega pelo meio interno utilizado pela holding. O aplicativo não envia esse convite por e-mail automaticamente. A seleção do destinatário é a aprovação: apenas o e-mail informado pode aceitar. Convites expiram em sete dias e podem ser revogados antes do aceite.

Quem já tem conta entra e aceita o convite em Ajustes. Quem não tem conta abre o link, escolhe Ativar meu acesso, usa o mesmo e-mail e confirma a mensagem de Auth no mesmo navegador. Depois entra e aceita o convite. Nenhuma senha administrativa é enviada ao frontend.

O botão de ativação só aparece para links com formato válido. Isso é UX, não autorização. A migração 20261027160000_internal_holding_access.sql protege INSERT em auth.users com um trigger: token e e-mail precisam corresponder a uma linha válida, pendente e não expirada em eg_invites. Metadata só transporta o token; role/company enviados pelo usuário não concedem permissão. A aceitação continua exigindo e-mail confirmado e concede papel member. Apenas owner promove papéis pelo fluxo existente.

Criar workspace exige ser owner de um espaço já existente. Usuário sem membership ou membro comum não cria um espaço próprio para contornar o acesso. Canais privados e DMs conservam autorização própria. Workspaces são espaços internos de empresa/equipe; não representam clientes de um serviço vendido.

## Aplicação e primeiro responsável

Esta migração está NOT_APPLIED no Supabase hospedado. Não confundir a interface atualizada com proteção já ativa no serviço.

1. Conferir o projeto dedicado e seus dados. A primeira migração já foi aplicada via SQL Editor; não reaplicar nem resetar.
2. Aplicar a segunda migração de produtividade, ainda pendente.
3. Identificar a conta confirmada do responsável real da holding e seu primeiro workspace. Revisar os owners existentes: contas descartáveis E2E não são colaboradores aprovados. Não inferir que qualquer owner atual representa a holding.
4. Somente após essa revisão, aplicar a terceira migração de acesso interno. Ela exige um owner confirmado preexistente e aborta se não houver um, para evitar bloquear o primeiro acesso. Não cria, promove ou apaga contas automaticamente.
5. Confirmar confirmação de e-mail habilitada no painel Auth e SMTP/redirects corretos. O config.toml local também exige confirmação; isso não altera o painel hospedado.
6. Testar a API pública de cadastro sem convite: deve ser negada mesmo sem usar a interface. Testar email diferente, revogado, expirado, consumido, confirmação e remoção. Verificar logins existentes e não apagar dados de teste sem decisão explícita.

Em projeto novo: aplicar as duas primeiras migrações, provisionar administrativamente a conta confirmada do responsável real e o primeiro workspace, conferir seu papel e então aplicar a terceira. Após a terceira, novas criações de usuário — inclusive pela API administrativa — também exigem convite válido em metadata evergreen_invite. O fluxo de provisionamento de testes anterior precisa ser adaptado. Não há bypass secreto nem usuário hardcoded.

## Evidência e limites

Testes locais: scripts/security-check.mjs cobre três grupos de acesso interno, além dos grupos anteriores; scripts/internal-access-ui-check.mjs verifica entrada sem cadastro público, link inválido, ativação por convite, preservação do convite na recuperação, erro sem perder email e ausência de login falso em 320/390/1440 px.

O trigger deve ser testado com GoTrue/Auth hospedado antes de habilitar o uso diário: o teste embarcado usa schema Auth simplificado. A documentação do Supabase confirma que triggers em auth.users podem bloquear cadastros; sua execução correta é parte essencial do teste real: https://supabase.com/docs/guides/auth/managing-user-data.

Para desligamento, remover memberships e convites das equipes às quais a pessoa tinha acesso. Bloqueio global da identidade Auth e revogação de sessões são operação administrativa separada. A remoção de um workspace não remove automaticamente acesso legítimo a outro workspace. Contas antigas não são apagadas por esta migração.
