# Evergreen Android 1.2.3 — versão no login e no perfil

Publicado em 01/11/2026. Esta entrega inclui os pedidos adicionais recebidos durante a geração do APK 1.2.2.

- Novo APK: https://evergreen-android-downloads.vercel.app/releases/7/Evergreen.apk
- Android: versionName 1.2.3, versionCode 7, com.evergreen.holdings.
- 12.989.650 bytes, SHA256 33737d96d84469c7d131673ea89242381772bb50219cf698b86caab21a4f7de3.
- Certificado preservado: df860fd91807fd1a09a8ce9d9240e52c126151448544085b8db5faf591460d02.
- Web: deployment dpl_44XgqTWYsX566Ceqn4NdQ4J5LXmc; fonte SHA256 459da1e0c92d939058bdb3af343944f54662f9bd4d4a7335340c2041580ae6ee.

## Alterações

O componente compartilhado src/components/AppVersion.tsx e app-version.css mostra “Versão 1.2.3 · revisão 04” no rodapé do login, abaixo do perfil no menu lateral e no final da página do próprio perfil. AuthScreen.tsx, WorkspaceNavigation.tsx e ProfessionalProfile.tsx reutilizam o componente. A versão vem de live-update-policy.json. Empresas e atuação mantém sua estrutura e estilo.

android/app/build.gradle incrementa para build 7; a política de pacote web aceita builds 5 a 7, cujo contrato de plugins permanece igual. O teste de limite usa os extremos declarados da política. Não houve mudança na chave, nos plugins, nas permissões ou no transporte de autenticação.

## Verificações

Build TypeScript/Vite, Capacitor sync e assembleDebug passaram. apksigner/aapt2 confirmaram assinatura anterior, pacote e versão. O teste de preparação confirmou bloqueios de downgrade e de substituição de uma versão imutável. A inspeção do APK confirmou os assets atuais, texto de versão, logo oficial byte-idêntica, ausência de arquivos secretos e ausência de server.url remoto.

O teste existente de perfil (PROFILE_ONLY=1, COLLAB_WIDTHS=390,1440) passou com respostas REST sintéticas, sem overflow/erros de página, preservando as linhas de empresas. A captura desktop foi inspecionada e mostra o número abaixo de Ver meu perfil. Também passou a revisão React do componente: estático, importação direta, sem novos efeitos/listeners/chamadas de rede, pequena folha de estilo própria.

A conferência web real em 390/1440 mostrou a versão no login, sem overflow/erros. O pacote remoto assinado foi baixado e comparado com o dist: 57 arquivos idênticos, com a transformação CSP nativa no HTML. O teste público de token inválido confirmou que o Supabase já retorna ao domínio oficial após a edição das URLs feita pelo usuário. Isso não prova entrega nem confirmação real de e-mail.

Evidências: output/native/android-1.2.3-web-verification.json, android-1.2.3-web-source.json, apk-1.2.3-content.json, update-release-guard-results.json e update-publication.json; output/playwright/profile-v2-results.json e profile-390.png/profile-1440.png. As versões 1 a 6 de APK foram preservadas.

## Limites observados

O usuário informou que instalou a 1.2.1 e ainda não viu revisão 02. Não houve aparelho conectado em adb; o usuário não pôde conectar por USB. Portanto, a atualização OTA no aparelho NÃO está homologada, e a causa da não aplicação não foi identificada. O APK 1.2.3 é uma instalação direta que já inclui os ajustes, para não depender desse mecanismo. Ele não deve ser apresentado como correção comprovada do OTA.

Instalação por cima, execução nativa, persistência da sessão e login/recuperação reais continuam não verificados nesta rodada. Nenhum e-mail real foi enviado, nenhum template/SMTP hospedado ou conta foi alterado. O conteúdo do template de código e a entrega na caixa continuam pendentes. iOS não foi compilado. Nenhum plano pago foi contratado. Não houve commit ou push.

Download final confirmado: deployment dpl_88uZcgxspJtr3jN7be1ELG1Evwx2 READY. URLs amigável e imutável retornaram 200 e SHA256 igual ao arquivo local. Relatório final em output/native/release-1.2.3.json.
