# Teste OTA — versão exibida 1.3

Em 01/11/2026 o usuário solicitou uma publicação que alterasse somente a versão para testar a aplicação automática no APK instalado.

Foram alterados apenas src/components/AppVersion.tsx e src/mobile/live-update-policy.json em relação ao manifesto fonte da entrega 1.2.3. Acrescentado displayVersion=1.3, usado pelo componente compartilhado de login e perfil. nativeVersion=1.2.3, builds compatíveis 5–7, plugins, assinatura e fluxo de atualização foram mantidos. Nenhum APK foi compilado ou substituído.

Fonte SHA256 5a42da2648392740328cd1d931b311af0e48c54cc34876abc7a71bd96c4c600f. Deployment dpl_EvWXxq18BXqC8BU2Pz3xFQ8pPFbC, preparado para produção, conferido READY e promovido após validação da assinatura do manifesto com a chave pública instalada.

Build TypeScript/Vite e geração assinada passaram; diff sem erros. Evidências de publicação, assinatura, comparação de arquivos e telas públicas em output/native/display-1.3-verification.json, display-1.3-source.json e capturas display-1.3-390.png/1440.png. O APK anterior permanece 1.2.3/build 7 e hash 33737d96d84469c7d131673ea89242381772bb50219cf698b86caab21a4f7de3; conferência em display-1.3-apk-preserved.json.

A aplicação da atualização em celular físico continua pendente. O usuário havia informado que a revisão anterior não apareceu e não pôde conectar o aparelho por USB; não houve diagnóstico da causa nem evidência de que foi corrigida. Esta publicação fornece apenas um marcador visual diferente. Não declarar que o teste nativo passou até o usuário observar 1.3 dentro do aplicativo.

Não foram modificados Supabase, templates, SMTP, contas ou permissões; nenhum e-mail foi enviado; não houve commit/push.
