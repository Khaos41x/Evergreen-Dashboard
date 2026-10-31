# Evergreen Holdings — Capacitor

Implementação local em 31/10/2026, sobre a aplicação existente. Não houve publicação na Vercel nem migração no Supabase hospedado nesta etapa.

## Resultado e limites

Capacitor estável **8.6.0**, com `core`, CLI, Android e iOS fixados na mesma versão e lockfile atualizado. Plugins oficiais: App 8.1.2, Browser 8.0.5 e Push Notifications 8.1.3. Android e iOS foram gerados pelo CLI e sincronizados com o mesmo `dist` do Vite. O projeto iOS usa Swift Package Manager.

React, TypeScript, Vite, Tailwind, Supabase, schema existente e identidade visual foram preservados. Home, tarefas, foco, objetivos, ocorrências, mensagens, trabalho, informações, economia, fundadores e escritório 3D usam os componentes e permissões existentes. A biblioteca continua reservada aos três assentos; instalar o app não concede acesso adicional.

**Não há APK entregue:** `npm run mobile:apk` foi executado e encerrou em `BLOCKED_ENVIRONMENT`, antes do Gradle, porque o SDK Android 36 e JDK 21 válido não foram localizados. `JAVA_HOME` aponta para `C:\Program Files\Java\jdk-17`, mas nem esse diretório foi confirmado pelo verificador. Android Studio/adb não foram encontrados no ambiente auditado. Não foram instalados SDKs, aceitas licenças ou criadas chaves de assinatura.

**iOS não foi compilado:** este ambiente é Windows, sem Xcode. Também não há evidência de Apple Developer Team/provisionamento, Firebase ou credenciais APNs configurados. Código Java/Swift, armazenamento nativo de cookies, SSE nativo, teclado real, gestos, desempenho 3D e suspensão pelo sistema ainda precisam de compilação e validação em simulador/aparelho.

## Comandos

Execute na raiz `Evergreen-Dashboard`:

```powershell
npm ci
npm run mobile:doctor
npm run mobile:sync
npm run mobile:android
npm run mobile:apk
```

`mobile:sync` executa build web, `cap sync` e aplica CSP apenas às cópias HTML empacotadas. Use esse comando após alterações; `cap sync` isolado não reaplica o endurecimento do HTML. O mesmo `dist` serve a versão web e não recebe a CSP específica nativa.

Para Android, instale Android Studio compatível com Capacitor 8, JDK 21+, Android SDK Platform 36, Build Tools 36 e Platform Tools. Configure `JAVA_HOME` e `ANDROID_HOME`; o verificador procura `platforms/android-36/android.jar`. Abra o projeto `android/`, aguarde o Gradle e execute o app em emulador/dispositivo. O debug APK ficará em `output/native/Evergreen-Holdings-debug.apk` após uma compilação bem-sucedida. Debug APK não é assinatura de distribuição/Play Store.

Há um workflow **somente manual**, `.github/workflows/mobile-android.yml`, que prepara Node22/JDK21/SDK36 e gera um artefato debug. Defina as variáveis públicas do repositório `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` antes de executá-lo. Ele não foi enviado ao GitHub nem executado nesta entrega. Nunca coloque `service_role`, chaves de provedor ou segredos em variáveis `VITE_`.

Para iOS, use um Mac com Xcode26+ e Command Line Tools, iOS15+:

```sh
npm ci
npm run mobile:sync
npm run mobile:ios
```

Abra `ios/App/App.xcodeproj`, resolva os pacotes Swift, configure Team/Signing e compile primeiro em simulador. Para dispositivo/TestFlight são necessários certificados/provisionamento da sua equipe. O identificador preparado é `com.evergreen.holdings`; confirme sua disponibilidade nas contas de distribuição antes de publicar.

## Autenticação e sessão

O backend existente permanece responsável por Supabase Auth, validação da sessão do provedor, RLS, rate limiting e reautenticação financeira. A aplicação nativa **não usa Supabase Auth com tokens no localStorage**.

`src/mobile/transport.ts` encaminha as chamadas `/api/` ao plugin local `EvergreenSession`. A allowlist nativa aceita apenas `https://evergreen-holding.vercel.app/api/`, não segue redirecionamentos HTTP e não exporta cookies ou `Set-Cookie` ao JavaScript. O nativo fixa o header Origin esperado; o backend mantém as verificações existentes. Não foi aberto CORS geral. Documentos e links externos abrem no navegador do sistema, fora da origem local confiável.

No Android, os cookies HttpOnly/Secure do backend ficam em um cofre privado cifrado por AES-GCM, com chave Android Keystore e backup desativado. No iOS, ficam no Keychain `AfterFirstUnlockThisDeviceOnly`; URLSession usa configuração efêmera sem cookie jar compartilhado. Os plugins genéricos CapacitorHttp/CapacitorCookies ficam desativados para evitar getters de credenciais. O transporte é do app; emissão, renovação e revogação da sessão continuam sendo Supabase Auth. Essas declarações de código ainda não substituem teste nativo de persistência/revogação.

Mensagens e presença usam o mesmo SSE autenticado do backend. O bridge encaminha linhas completas; o adaptador reconecta quando o stream termina. No web, fetch e EventSource continuam com o comportamento anterior. Uploads nativos aceitam até 8MB por transporte, acima dos limites existentes de anexos (4MB) e foto (2MB).

### Google, e-mail e deep links

Login por senha e código de e-mail reutilizam os endpoints existentes. O novo fluxo por link/Google requer **publicar o backend preparado**, configurar `NATIVE_AUTH_ENABLED=true` e permitir no Supabase a URL exata da aplicação com o callback `/api/identity/native-callback` e seu parâmetro `state`. Use um padrão restrito a essa origem/rota na allowlist; não libere domínios genéricos. Google também depende de `GOOGLE_AUTH_ENABLED=true` e do provedor Google configurado no Supabase.

O esquema nativo registrado é `evergreen://auth/callback`. O navegador externo devolve somente o código de autorização e o estado aleatório. O app confere o estado iniciado em memória, e o backend confere o cookie correspondente e troca o código com o verificador PKCE guardado no cofre nativo. O retorno recupera a rota autorizada, sem pôr tokens em URL ou armazenamento JS. Fluxos expiram em dez minutos; repetição e estado incorreto são negados.

Se o sistema encerrar o processo durante a ida ao navegador, o estado em memória se perde e o acesso deve ser reiniciado. A sessão previamente estabelecida permanece no cofre. Não há promessa de continuar uma operação de login interrompida por encerramento do processo. Passkeys web existentes são preservadas; ficam ocultas no app até existir integração/associação de domínio nativa validada. Senha e e-mail continuam como alternativas.

## Push nativo: preparado, desativado

O plugin oficial e o controle “Notificações neste aparelho” estão ligados ao perfil nativo. A permissão só é solicitada quando a pessoa toca em ativar e o servidor informa configuração disponível. Não são exibidos sucessos simulados.

Para ativar, depois de aprovação de produção:

1. Aplicar `supabase/migrations/20261031152704_native_push.sql` no projeto dedicado.
2. Publicar o backend preparado e configurar, somente no servidor, `NATIVE_PUSH_ENABLED=true`, `NATIVE_PUSH_SERVICE_KEY`, `INTEGRATIONS_ENCRYPTION_KEY` e `CRON_SECRET` com pelo menos 32 caracteres.
3. Android: cadastrar `com.evergreen.holdings` no Firebase, fornecer `android/app/google-services.json`, habilitar FCM HTTPv1 e configurar `FCM_SERVICE_ACCOUNT_JSON` no servidor. O JSON do app não é a chave administrativa; ambos ficam fora do Git por padrão.
4. iOS: habilitar Push Notifications no App ID e no Signing & Capabilities do target, configurar os entitlements/provisionamento reais, e definir no servidor `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` e `APNS_ENVIRONMENT=sandbox` ou `production` de acordo com o binário. O plugin usa token APNs no iOS, sem presumir que seja token FCM.
5. Configurar um scheduler externo para `POST /api/mobile/push/dispatch` com `Authorization: Bearer <CRON_SECRET>`. Nenhum scheduler ou envio foi ativado automaticamente. O worker processa dois itens por execução para respeitar o tempo da função.
6. Testar em aparelhos reais, primeiro sandbox, incluindo sair da conta, revogar sessão, trocar usuário, negar permissão e remover acesso ao workspace.

Tokens de dispositivo são cifrados no servidor. As tabelas de dispositivos/fila têm RLS e grants apenas para serviço; usuários autenticados não podem consultar os tokens. O worker faz claim atômico com lease, retentativas limitadas e revalida destinatário, associação atual ao workspace, sessão, preferência e leitura da notificação antes de enviar. O texto da tela bloqueada é genérico, sem saldos ou conteúdo de mensagens. A aceitação FCM/APNs não prova visualização; entrega pode repetir após falha de confirmação, com tag/collapse para reduzir duplicações. A migração enfileira notificações novas, não envia histórico antigo.

**Não foram testados envios FCM/APNs reais.** Não foram solicitadas chaves ou acessadas credenciais de outras empresas.

## Timer e ciclo de vida

O banco mantém `started_at`, `paused_at` e `paused_ms` para sessões compartilhadas. O modo pessoal já persiste os timestamps locais. O tempo é `agora − início − pausas`, sem contar ticks. Ao retomar o app, `evergreen:resume` recalcula o relógio e atualiza sessão/dados do servidor. Pause/resume não conta o tempo pausado; conclusão continua idempotente para o diálogo.

Não foi criado serviço permanente de execução em segundo plano nem alarme nativo de conclusão. O horário continua correto ao voltar, mas o sistema pode suspender JavaScript, conexão e desenho. Não declarar que um som/alerta de foco será entregue com o app encerrado.

## Verificação realizada

| Verificação | Evidência | Limite |
| --- | --- | --- |
| Build web + sincronização Android/iOS | `npm run mobile:sync` passou | Não compila Java/Swift |
| Identidade/backend | 16 grupos locais passaram | Fixture Supabase HTTP; Google/e-mail reais não homologados |
| Banco/RLS | 46 grupos locais passaram | Replay PGlite, sem migração hospedada nova |
| Bridge, JWT e FCM | `test:mobile:bridge` passou | Doubles JS + assinatura RSA/ES256 e formato HTTP; sem aparelho/provedor |
| Layout e timer | `test:mobile:ui` passou em 390/430/768/1440 | Navegador, safe areas e tempo sintéticos |
| Colaboração web e projeção CSS nativa | Conversas, tarefas, perfil, equipe/projetos, foco/ajuda e retorno da biblioteca passaram em 390/790/1440 | HTTP sintético; não é E2E nativo |
| Economia/Fundadores/Visão | Regressão existente passou em 390/478/1440, incluindo cofre e fallback sem WebGL | Navegador e fixtures |
| Dependências | `npm audit` e `--omit=dev`: zero avisos após overrides corretivos | Inventário da data, não auditoria completa |
| APK | Bloqueado em pré-requisitos | SDK36/JDK21 ausentes |
| iOS | Projeto gerado e sincronizado | Sem Mac/Xcode/provisionamento |

Capturas e relatórios ficam em `output/native/`, `output/platform/` e `output/collaboration-ui-focused-results.json`. Dados QA são sintéticos. O detector Impeccable não executou por falta do engine0.1.5/cache; não há resultado automático a declarar. A revisão de interface cobre apenas a projeção web; conformidade nativa e testes físicos permanecem pendentes.

## Pendências antes de chamar o aplicativo de pronto

Compilar Java/Swift; instalar APK em Android e app em iPhone; validar login e restauração de sessão após matar/reabrir o app e reiniciar o aparelho; testar expiração/revogação/troca de conta; validar Google/link/OTP/recovery com o backend publicado; testar SSE, anexos, teclado, Back, safe areas reais, acessibilidade e 3D; configurar e homologar push; preparar assinatura/distribuição. A versão Vercel em produção não foi substituída por este trabalho.

Fontes consultadas: [Capacitor8](https://capacitorjs.com/docs/updating/8-0), [instalação em projeto existente](https://capacitorjs.com/docs/getting-started), [ciclo de vida/deep links](https://capacitorjs.com/docs/apis/app), [Push Notifications](https://capacitorjs.com/docs/apis/push-notifications), [Supabase deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [FCM HTTPv1](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [APNs](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns).
