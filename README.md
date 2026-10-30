> Nova extensão local da holding: contextos, aplicações, fontes Cloudflare/Vercel/Supabase/Asaas, análise financeira, metas e escritório organizado. A nova migração e a publicação aguardam aprovação. [Guia e controles](docs/HOLDING-OPERATING-SYSTEM.md).

> **Estado atual30/10 após autorização:** banco atualizado no Supabase dedicado: produtividade e pacote atômico Identity/Finanças/Fundadores/cadastro comum aplicados. Restrição histórica de convites não aplicada e retirada das migrações ativas. Registros preservados,38tabelas comRLS. Logo transparente maior centralizada e sem título promocional na autenticação. Detalhes e limites em [ACTIVATION-20261030](docs/ACTIVATION-20261030.md). Os estados pendentes descritos abaixo pertencem às etapas anteriores; publicação e E2E de provedores continuam pendentes.

> **Versão local 30/10 — português e cadastro comum:** nova logo, cadastro por e-mail/senha sem convite, primeiro espaço próprio, recuperação e isolamento preservado. Sala de foco e Como usar adicionados. Consulte [mudanças atuais](docs/PT-BR-REGISTRATION.md). Regras antigas de convite obrigatório abaixo são históricas. Nenhuma migração ou publicação desta versão foi executada remotamente.

> **Atualização local 29/10:** World passa a Vision; cofre único → Economy2D; Founders com grants de empresa; Identity via BFF e cookies HttpOnly. Esta versão NÃO foi aplicada no Supabase hospedado nem publicada. Configuração, controles e limites em [SECURITY-CONTROLS](docs/SECURITY-CONTROLS.md); evidências e suites em [PLATFORM-VALIDATION](docs/PLATFORM-VALIDATION.md). As instruções/histórico abaixo antecedem essa arquitetura; para preparar um novo ambiente use o roteiro de segurança, sem reaplicar migrações já hospedadas.
# Evergreen — uso interno da holding

**World R1 (local):** nova sala isométrica na branch `codex/evergreen-world-r1`, acessível pelo seletor **Work / World** no topo. A versão publicada na Vercel ainda não contém World. Rode `npm ci` e `npm run dev`; use os dados locais existentes ou uma sessão autorizada. Sem WebGL2, selecione **Diretório 2D**. Arquitetura, testes e limites em `docs/WORLD-R1-ARCHITECTURE.md` e `docs/WORLD-R1-VALIDATION.md`.

Plataforma privada de trabalho da holding, sem planos ou cobrança. Entrada por convite; veja `docs/INTERNAL-ACCESS.md` para provisionar o primeiro responsável e aplicar a proteção de cadastro no banco.

React + TypeScript + Vite. Produtividade local preservada; núcleo de colaboração implementado com Supabase Auth, PostgreSQL e Postgres Changes.

**Núcleo conectado ao Supabase real:** projeto `dlxsakabwtpdimolsmgd`, organização Evergreen. Migração aplicada no SQL Editor em 2026-10-27, com oito tabelas protegidas por RLS e cinco publicadas no Realtime. A configuração pública deste checkout está em `.env.local` (ignorado pelo Git). Não há dados simulados ou fallback de sucesso na aplicação.

**MVP completo ainda não declarado:** as contas E2E foram provisionadas pelo Auth Admin com confirmação automática. Entrega de e-mail, cadastro com caixa real, recuperação de senha e celular físico ainda precisam de validação. Resultados do serviço real em `docs/VALIDATION.md`.

**Atualização de produtividade:** a segunda migração `20261027115328_productivity_domains.sql` está implementada e testada localmente, mas **NOT_APPLIED no Supabase hospedado**. Tasks avançadas, Goals, Focus compartilhado, DMs/threads, notificações, Presence e Storage dependem dela. A aplicação verifica o schema e mantém o núcleo anterior enquanto a migração estiver pendente. Consulte `docs/VALIDATION.md` e `docs/PHASES.md`.

## Iniciar

```powershell
npm ci
Copy-Item .env.example .env.local
# Preencha .env.local com URL e chave publishable do projeto dedicado.
npm run dev
```

Abra o endereço indicado pelo Vite (normalmente http://localhost:5173). Reinicie o Vite após mudar variáveis. Sem `.env.local`, somente a produtividade local funciona. Nunca use `service_role`, `sb_secret_...` ou senha do banco em variáveis `VITE_`.

## Configurar Supabase

1. Identifique/crie um projeto **dedicado ao Evergreen**. O núcleo já foi aplicado ao projeto dedicado abaixo; não reutilize o banco do ORKTO.
2. O projeto `dlxsakabwtpdimolsmgd` já recebeu a migração pelo SQL Editor; não a reaplique e reconcilie o histórico da CLI antes de usar db push. Em um projeto novo e vazio, execute as duas primeiras migrações em ordem, provisione o responsável inicial e seu workspace e então execute a terceira, conforme `docs/INTERNAL-ACCESS.md`. No projeto atual, a segunda e a terceira estão pendentes. É uma migração inicial transacional, não um script para reaplicar sobre tabelas já criadas. Inspecione o schema antes de executar. Para ambientes gerenciados por CLI, use o fluxo de migrations da CLI após vincular explicitamente o projeto correto; não execute reset em um banco com dados.
3. Configure Auth → URL Configuration: Site URL `http://localhost:5173`, redirect URL `http://localhost:5173/**`. Adicione também a URL LAN exata para testes no celular. Cadastros e recuperação usam PKCE: conclua o e-mail no mesmo navegador que iniciou o fluxo.
4. Mantenha email/senha com confirmação de e-mail. A criação de conta deve ser limitada pelo trigger de convites da terceira migração; não habilite entrada pública sem esse controle. Configure SMTP para entrega real; respeite limites do provedor. A interface nunca afirma que houve entrega de e-mail, apenas que a solicitação foi recebida.
5. Copie Project URL e **publishable key** para `.env.local`. O schema exposto é `public`; `evergreen_private` não deve ser adicionado aos schemas expostos. A migração concede permissões de colunas e RLS explicitamente.
6. Verifique Realtime → publicação `supabase_realtime`: mensagens, registros, membros, canais e participação estão incluídos pela migração.
7. Crie e confirme duas contas em navegadores com armazenamento independente. Uma terceira conta sem participação verifica a negação de acesso. Não envie senhas ou chaves secretas no chat.

Fluxo: entrar → Ajustes → Criar workspace → Membros → Criar convite → destinatário entra com e-mail confirmado → aceita link/código em Ajustes → abre canal → envia mensagem. Convites são links persistidos, vinculados ao e-mail, válidos por sete dias. A aplicação não envia o link automaticamente por e-mail. Em canal privado, um administrador já participante concede acesso em Membros.

## Testar no celular

Na mesma rede Wi-Fi, execute:

```powershell
npm run dev -- --host 0.0.0.0
```

Use `http://IP-LAN-DO-PC:5173` no celular e autorize o processo na rede privada caso o firewall solicite. Não exponha a porta na internet. Use a mesma URL no redirect do Supabase; substitua localhost nos convites pelo IP LAN. Para testar pelo dispositivo, o Supabase deve ser acessível por ele. Dev server/HMR pode escolher outra porta: siga a URL que o terminal imprimir. Teclado virtual e Safari/Android físicos ainda precisam de validação; viewport emulado não comprova comportamento do teclado real.

## Testes

```powershell
npm run build
npm run test:security
npm run test:mobile -- http://localhost:5173
npm run test:local -- http://localhost:5173
npm run test:preservation -- http://localhost:5173
npm run test:collaboration-ui
node scripts/productivity-review-check.mjs
node scripts/internal-access-ui-check.mjs
npm run test:e2e:real
```

`test:security`: PostgreSQL embarcado PGlite com fixture de Auth; testa a migração e políticas reais de SQL/RLS, não o serviço hospedado. `test:collaboration-ui`: respostas REST simuladas em um segundo Vite na porta 5187; valida componentes e layout, não autenticação/Realtime. `test:mobile`: tela de entrada (ou backend não configurado) e modo local nas larguras 320, 375, 390, 430, 768 e 1440. Os scripts de navegador usam Edge no Windows por padrão; `BROWSER_PATH` permite outro executável nos scripts novos. A regressão local original usa o Edge padrão. Todos usam contextos isolados e não apagam dados do navegador do usuário.

Para E2E real, defina no terminal `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `EG_TEST_URL` e `EG_TEST_A_EMAIL/PASSWORD`, `EG_TEST_B_EMAIL/PASSWORD`, `EG_TEST_C_EMAIL/PASSWORD`. Use contas descartáveis existentes e confirmadas no projeto dedicado. O script cria fixtures prefixadas E2E e não as apaga. Realtime é exigido em menos de oito segundos, antes do polling. Cadastro, entrega de e-mail e recuperação devem ser testados adicionalmente com caixas de e-mail reais. Sem variáveis, o teste registra **BLOCKED** e termina com código 2; não produz PASS fictício.

Veja `docs/ARCHITECTURE.md`, `docs/AUDIT.md` e `docs/VALIDATION.md`.


## Publicação Vercel autorizada

Frontend publicado em https://evergreen-holding.vercel.app (deployment READY). Página/assets/rota SPA verificados por HTTPS. O primeiro responsável peixotodavy831@gmail.com, os redirects de produção e as migrações posteriores ainda precisam de configuração administrativa no Supabase. Nenhuma conta foi criada nesta publicação. Detalhes em docs/DEPLOYMENT.md (ou DEPLOYMENT.md neste diretório).
