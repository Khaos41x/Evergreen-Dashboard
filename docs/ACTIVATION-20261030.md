# Ativação do banco Evergreen — 30/10/2026

## Autorização e resultado

Usuário autorizou a aplicação no projeto dedicado dlxsakabwtpdimolsmgd. A confirmação própria do conector foi concluída para o pacote final. Nenhum outro projeto foi alterado e não houve novo deploy Vercel.

Aplicado:
- 20261030144552 — evergreen_20261027115328_productivity_domains.
- 20261030150627 — evergreen_identity_finance_founders_open_registration_release.

O segundo registro é uma transação única com as fontes 20261029100000_identity_server.sql, 20261029110000_economy_ledger.sql, 20261029120000_founders_governance.sql e 20261029225324_normal_registration.sql. O SQL efetivamente aplicado e os hashes das fontes estão em supabase/releases/20261030_open_registration_release.sql.

A migração inicial do núcleo, aplicada anteriormente pelo SQL Editor, não foi reaplicada. A migração de convite obrigatório 20261027160000 foi rejeitada pela revisão automática por contrariar o pedido atual; não foi executada. Foi retirada da sequência ativa para supabase/legacy e mantida apenas para teste de compatibilidade histórica.

## Verificação no Supabase real

- Identidade, Finanças, Fundadores e novo cadastro: funções presentes.
- 38 tabelas eg_*; zero tabelas sem RLS.
- Trigger de cadastro obrigatório por convite: ausente.
- Cadastro por e-mail habilitado; confirmação de e-mail obrigatória.
- Sessão sem linha válida em auth.sessions: active=false e zero registros visíveis no teste transacional revertido.
- Contagens antes/depois:9 espaços,15 membros,16 mensagens,3 registros. Nenhum conteúdo dos registros foi obtido para esta conferência.
- O runtime Node conseguiu ler as configurações públicas do Supabase via HTTPS, HTTP200.

Isso confirma aplicação de schema, controles inspecionados e preservação das contagens; não comprova login, entrega de e-mail, recuperação com caixa real, Realtime, Storage ou transações financeiras por usuários reais.

## Revisão de segurança

O assessor não apontou tabelas desprotegidas. Permanecem avisos de funções SECURITY DEFINER expostas: RPCs autenticadas são intencionais e validam sessão, escopo, capacidade e/ou autenticação recente no corpo; a consulta de convite retorna apenas prova booleana de token/e-mail e é legada. A exposição foi registrada, sem transformar os avisos em certificação de segurança.

- [Aviso de RPCs anônimas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Aviso de RPCs autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)

O provedor também informa proteção contra senhas vazadas desabilitada. A configuração não foi alterada nesta ativação: [documentação do controle](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Testes locais da sequência atual

- test:security:17 grupos do núcleo/compatibilidade histórica.
- test:platform:security:18 grupos com sequência ativa sem convite obrigatório.
- test:platform:release:15 grupos usando exatamente a transação final.
- Build de produção:PASS.
- Identidade HTTP e interfaces já exercitadas com SDK/fixtures locais; não são Auth hospedado.

A criação de funções auxiliares da identidade revoga EXECUTE público/anon/authenticated para o helper histórico require_staff_invite, pois ele não fica conectado a trigger no modelo atual.

## Ajuste visual solicitado

O bloco “Seu espaço. Sua equipe.” e a frase de apoio foram removidos da autenticação. Logo centralizada acima do formulário,320px no desktop e até280px no celular, proporcional3:2, sem placa de fundo. Filtro CSS claro preserva o canal alfa e os bytes do PNG fornecido.

Login e cadastro foram conferidos em320/390/790/1440px: centralização medida, transparência, ausência do título e sem overflow. Marca compartilhada nos demais módulos também não possui fundo claro. Nenhuma imagem foi reconstruída ou editada.

## Pendências

E-mail/recuperação com conta real, Google, passkeys/biometria real, Redis compartilhado e runtime SSE hospedado continuam NOT_VERIFIED. Google e passkeys seguem desativados. Esta etapa não publicou a nova versão na Vercel e não criou usuários nem enviou e-mails reais.
