> Extensão Holding de 30/10: [implementação, controles e limites de ativação](HOLDING-OPERATING-SYSTEM.md). A nova migração e os provedores reais continuam não verificados no ambiente hospedado.

> **Estado atual30/10 após autorização:** banco atualizado no Supabase dedicado: produtividade e pacote atômico Identity/Finanças/Fundadores/cadastro comum aplicados. Restrição histórica de convites não aplicada e retirada das migrações ativas. Registros preservados,38tabelas comRLS. Logo transparente maior centralizada e sem título promocional na autenticação. Detalhes e limites em [ACTIVATION-20261030](ACTIVATION-20261030.md). Os estados pendentes descritos abaixo pertencem às etapas anteriores; publicação e E2E de provedores continuam pendentes.

# Evergreen Identity, Economy e Founders — controles e operação
Data: 2026-10-30. Implementação local, sem aplicação no banco hospedado e sem novo deploy.

## Fronteiras
Supabase Auth é a única autoridade de identidade. O BFF Node usa @supabase/ssr e SDK oficial; não cria senhas, chaves WebAuthn ou JWT próprios. Navegador recebe apenas identidade pública, workspace autorizado e expiração. Cookies de sessão e verificador PKCE são HttpOnly; Secure em HTTPS/produção, SameSite=Lax, Path=/, sem Domain. Produção usa prefixo __Host-. Lax permite retorno OAuth por navegação GET. Respostas privadas usam no-store, Vary: Cookie e no-referrer.

O SDK de dados no navegador não persiste nem renova tokens. REST/Storage passam pelo BFF de mesma origem; este acrescenta o JWT do usuário apenas na chamada ao Supabase. Realtime usa SSE autenticado, com WebSocket Supabase somente no servidor. Dados pessoais offline continuam em storage próprio; não contêm credenciais nem dão acesso à holding. Tokens antigos do SDK são removidos na entrada, sem apagar tarefas. Não há migração de tokens antigos para novas sessões.

## Fluxos de acesso
- Google: SDK oficial Authorization Code + S256 PKCE, verificador HttpOnly, troca de código no callback do servidor e destinos internos permitidos. Não usa implicit flow.
- Cadastro comum: Supabase auth.signUp com nome, e-mail e senha; cargo opcional e sem convite. A migração normal_registration remove o trigger histórico. Confirmar o e-mail antes de criar espaço próprio. Nova conta não ganha associação, função ou acesso à holding por metadados; o acesso a equipes existentes continua explícito. OTP/link permanece como alternativa de login.
- Recuperação de senha: resetPasswordForEmail com PKCE, seguido de updateUser no servidor com sessão validada e AMR recente de autenticação ou recuperação. As outras sessões são revogadas. AMR de recuperação isolado não satisfaz a reautenticação financeira.
- Passkeys: APIs nativas Supabase Auth2.118 e WebAuthn do navegador para registro, autenticação, listagem, renomeação e exclusão. Origem/RP, desafio, assinatura e unicidade são verificados pelo provedor, nunca simulados no produto. Recurso nativo ainda experimental: desativado por padrão até configuração e teste real do projeto. Navegadores sem os parsers WebAuthn modernos devem usar o e-mail alternativo.
- Senha: compatibilidade com contas Supabase existentes, enviada ao Auth pelo servidor. Nenhuma senha é armazenada localmente.
- Recuperação: e-mail alternativo, erro de rede explícito, repetição de verificação, erro de código inválido e novo acesso após expiração. Google/passkey não configurados aparecem indisponíveis.
- Autenticado: acesso ao último workspace se ainda autorizado; seleção antiga é uma preferência, nunca permissão. As rotas /hub, /vision, /economy e /founders validam a sessão no servidor em acesso direto. Navegação SPA continua protegida nos endpoints de dados. /login continua leve e não carrega o motor3D.

## Validação, revogação e reautenticação
Cada request de dados chama Auth.getUser e RPC eg_identity_context. O banco confere auth.sessions usando session_id do JWT assinado, usuário e not_after. RLS restritiva cobre tabelas existentes, Storage e Realtime; helpers e guards protegem também escritas feitas por RPCs anteriores SECURITY DEFINER. Novas tabelas Finance/Founders não concedem DML direto: somente RPCs autorizadas.

Logout suporta sessão atual, outras sessões e todas as sessões pelo Supabase. O banco bloqueia JWT de sessão revogada; SSE revalida a cada10s e reconecta em45s. Presença pode levar até10s para refletir revogação/remoção; novas consultas SQL são bloqueadas imediatamente. Auth no browser verifica novamente ao voltar à aba e a cada60s visível; um401 do BFF encerra a interface autenticada. Dados já vistos não podem ser apagados de memória/capturas de outra pessoa.

Operações financeiras e de governança exigem AMR assinado de autenticação nos últimos5min e sessão ativa, no BFF e no SQL. OTP, senha, TOTP e métodos nativos passkey/webauthn são aceitos. Refresh e OAuth isolados não satisfazem esse controle. O diálogo pede novo código ou passkey, vincula confirmação à mesma conta e só repete a ação depois da confirmação. Registrar/renomear/excluir passkeys também exige confirmação recente. Cargo, papel declarado, query string e booleano do cliente não autorizam ações.

## Abuso, CSRF e proxy
Escritas Identity exigem Origin exata + JSON. Proxy exige mesma Origin em escritas, destino Supabase fixo, prefixos/métodos permitidos, limite4MiB (abaixo do teto4,5MB das Functions Vercel) e timeout25s. Identity limita corpo256KiB e requests de provedor15s. Destinos externos são rejeitados. Erros internos são sanitizados; o formato REST mantém códigos adequados ao SDK. Não se logam cookies, códigos, senhas ou tokens.

Produção exige Redis REST compartilhado com EVAL atômico INCR+EXPIRE:25 tentativas/IP e8/conta por ação a cada5min, identificadores SHA256. SSE:600/IP e120/usuário por5min, até16 assinaturas/request,45s por stream. Limiter ausente/indisponível falha fechado. Em desenvolvimento há limiter real por processo, apenas com origem loopback; não é proteção distribuída. Vercel fornece os headers IP sobrescritos pela plataforma. Se hospedar em outro proxy, adapte a origem confiável do IP antes de liberar produção. Supabase mantém também os limites próprios do Auth.

Vercel inclui headers de CSP, nosniff, referrer, frame denial. CSP deve ser revista se a origem Supabase ou fontes mudarem. Uploads novos passam pelo limite4MiB; arquivos anteriores permanecem acessíveis por URLs assinadas. Não há permissões CORS públicas para respostas privadas. Arquivos assinados têm TTL curto; URLs já emitidas permanecem válidas até expirar (60s documentos Founders,120s avatares da equipe,300s perfil próprio).

## Isolamento
Workspaces continuam sendo empresas/espaços operacionais. Grupos apenas vinculam empresas formalmente. Founders usa role + capacidades + escopo de empresa, sem isFounder. group_owner governa o grupo; founder/group_executive não recebem acesso irrestrito. O grupo só vincula empresas cujo responsável é também o responsável do grupo neste fluxo. Aprovação bilateral entre responsáveis diferentes não é implementada; não existe bypass dessa restrição.

Financeiro exige membro financeiro admin/editor/viewer e membership atual no workspace. O fundador precisa, adicionalmente, do grant financeiro do grupo para a empresa. Um workspace pode manter mais de uma entidade/livro financeiro com moeda própria. Total por moeda; sem câmbio implícito. A comunicação Founders reutiliza canal privado do chat existente em workspace dedicado, com guard contra convites comuns contornarem os grants executivos.

Documentos Founders ficam no mesmo bucket privado, com novo autorizador por grupo/empresa/capacidade. Auditoria de governança registra ação/IDs, sem copiar conteúdo estratégico para quem só governa acessos. Auditoria financeira permanece no domínio financeiro, separada do feed operacional. Aprovar proposta não executa transações.

## Livro e consistência
Centavos bigint no PostgreSQL, strings/BigInt no cliente; soma nunca deriva da página de histórico. Eventos e pernas imutáveis, estorno append-only único. Transferências têm duas pernas opostas na mesma transação, locks em ordem de conta e idempotência por usuário/request UUID. Retry do mesmo formulário conserva UUID até sucesso, inclusive após step-up. Reutilizar UUID com payload diferente é rejeitado. Sem saldo negativo, valores positivos e moeda igual obrigatórios.

Transferências entre workspaces exigem vínculo formal ao mesmo grupo e acesso de edição nas duas pontas. Ambas as contas entram uma vez no consolidado. Se apenas uma empresa é visível, só sua perna aparece e o texto da contraparte fica restrito. Reservas são contas do mesmo livro, sem soma duplicada. Receita/despesa excluem transferências e consideram estornos. Orçamentos são estimativas mensais separadas, com controle de versão. Decisões congelam elegibilidade inicial, rechecando grants ativos ao votar/apurar, prazo e quórum, com lock de proposta.

## Preparação de ambiente (não executada remotamente)
1. Preservar backup e conferir migração inicial já aplicada; não reaplicar a inicial nem usar reset/db push.
2. Aplicar produtividade pendente e revisar a etapa histórica de restrição interna: ela exige responsável confirmado já existente. A consulta atual confirmou que há um, mas a conta indicada do responsável real ainda não está confirmada. O novo fluxo dispensa bootstrap administrativo para novos cadastros/espaços próprios. Não atribuir acesso a empresas existentes automaticamente.
3. Revisar/aplicar em ordem:20261029100000_identity_server.sql;20261029110000_economy_ledger.sql;20261029120000_founders_governance.sql; por último 20261029225324_normal_registration.sql, que substitui a exigência de convite no cadastro. Testar em cópia de staging antes de produção.
4. Configurar APP_ORIGIN HTTPS exata, URL/chave publishable no servidor e Redis REST. Nenhuma chave administrativa é necessária no runtime. Variáveis REDIS nunca recebem prefixo VITE_.
5. Configurar Site URL e redirect exato ORIGIN/api/identity/callback no Supabase. Ativar Google no provedor e validar e-mail verificado, isolamento de nova conta e PKCE antes de GOOGLE_AUTH_ENABLED=true.
6. Confirmar suporte nativo passkeys do projeto, RP ID do domínio e origins HTTPS. Testar registro, autenticação, exclusão, biometria e AMR assinado real antes de PASSKEY_AUTH_ENABLED=true. O provedor é experimental, não declarar disponibilidade sem essa prova.
7. Validar SMTP/OTP/template com código e link, expiração, redirecionamento e recuperação em desktop/mobile físicos. Validar Redis compartilhado/limites e SSE no plano Vercel. Nenhum e-mail real foi enviado nesta etapa.
8. Só publicar depois de aprovação explícita, com rollback coordenado entre BFF, cookies e schema. Não publicar o frontend antigo sobre esse backend nem expor evergreen_private no Data API.

## Evidência e limites
- Build TypeScript/Vite, SQL/PGlite e suites BFF/DOM locais são testes automatizados.
- PGlite usa fixtures de auth.users/auth.sessions/JWT/Storage/Realtime. HTTP do BFF usa provedor local de teste com SDK oficial. Interfaces usam respostas de fixture; passkey usa autenticador virtual. Isso não comprova Google, SMTP, Redis gerenciado, Supabase hospedado ou biometria física.
- Testes novos e migrações não foram executados em produção. A confirmação da conta indicada para responsável continua pendente; novos usuários devem usar o cadastro comum quando a versão for ativada.
- SSE usa conexões de45s e necessita validação de escala/custo no plano real. Grupos/Founders ainda carregam o snapshot autorizado integral; auditoria UI limita100 eventos e o histórico financeiro pagina50 linhas. Escala empresarial grande exige medir esse snapshot antes de liberação.
- Fonte3D continua lazy (~947KB minificado,~251KB gzip), com fallback2D e aviso de chunk grande. Métricas locais usam GPU por software, não hardware móvel real.

## Referências oficiais

- Supabase PKCE: https://supabase.com/docs/guides/auth/sessions/pkce-flow
- Supabase passkeys (recurso experimental): https://supabase.com/docs/guides/auth/passkeys
- Vercel Functions, limites de payload: https://vercel.com/docs/functions/limitations

Essas referências descrevem capacidades e limites dos provedores; não substituem a validação hospedada pendente.

## Consulta remota somente de leitura — 30/10/2026

Projeto dlxsakabwtpdimolsmgd: somente oito tabelas do núcleo; funções Identity, Economy, Founders e novos lembretes ausentes. Trigger de convite no Auth ausente; histórico gerenciado de migrações vazio, coerente com a aplicação inicial por SQL Editor. Não reaplicar o núcleo nem usar reset/db push. Esta consulta não alterou produção.
