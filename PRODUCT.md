# Evergreen — plataforma interna da holding

O Evergreen organiza comunicação e execução das empresas e equipes da holding. Uso exclusivo de pessoas convidadas e aprovadas pelos responsáveis internos. Não é um SaaS para venda: sem planos, cobrança, assinatura ou onboarding público de clientes.

Prioridade diária: decisões em canais/DMs viram Tasks/Issues; responsáveis recebem notificações, executam com Focus, e alimentam objetivos, histórico e métricas verificáveis. Workspaces representam espaços internos de empresas/equipes, com canais restritos para informações que não devem circular por todo o grupo.

Entrada: login de contas existentes; ativação de conta apenas a partir de convite válido vinculado ao e-mail. Confirmação de e-mail exigida para aceitar. Nome de domínio ou metadata enviada pelo usuário não autorizam acesso. Somente owners já autorizados criam novos workspaces; owners/admins convidam pessoas para os espaços que administram. Membership/RLS define o acesso, inclusive após remoção. Não há aprovação automática por domínio.

Preservar identidade Evergreen preta/esmeralda, produtividade local e dados existentes. Modo local é pessoal, separado e sem acesso ao conteúdo da holding. Não inventar dados, sucesso ou comprovação remota. Sem push, deploy, gastos ou ações destrutivas sem autorização explícita.

Estado: núcleo da primeira migração validado no Supabase dedicado dlxsakabwtpdimolsmgd. Migrações de produtividade e acesso interno implementadas/testadas localmente, ainda NOT_APPLIED remotamente. Testes SQL/Auth de fixture não substituem Auth hospedado, SMTP, Storage ou Presence. Ver docs/VALIDATION.md e docs/INTERNAL-ACCESS.md.

Evergreen World R1 adiciona uma projeção isométrica dos mesmos dados e ações do Work. É extensão da plataforma interna, com diretório2D acessível, sem equipe ou presença fictícia. Nesta entrega FaseB local, sem novo deploy; personalização/avatares/voz ficam para fases posteriores.


Atualização29/10: a porta visual agora é Evergreen Vision, com um cofre único para Economy2D independente. Founders é centro estratégico do grupo, com vínculo formal e capacidades por empresa. Identity centraliza Supabase Auth no servidor com PKCE/passkeys/e-mail, cookies HttpOnly e reautenticação financeira; configuração e validação hospedadas pendentes. Cargo é perfil, não autorização. Ver docs/SECURITY-CONTROLS.md e docs/PLATFORM-VALIDATION.md.
