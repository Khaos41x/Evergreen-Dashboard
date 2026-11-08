# Evergreen 1.3 — revisão 08
Publicação autorizada pelo usuário e concluída em 08/11/2026.

## Resultado
| Entrega | Projeto | Ambiente / estado | Endereço |
| --- | --- | --- | --- |
| React + Vite + API | evergreen-holding | produção / READY | https://evergreen-holding.vercel.app/ |
| APK Android 1.3.0, build 8 | evergreen-android-downloads | produção / READY | https://evergreen-android-downloads.vercel.app/releases/8/Evergreen.apk |
| Canal OTA | evergreen-holding | assinatura e conteúdo verificados | https://evergreen-holding.vercel.app/mobile-updates/latest.json |

Código: commit `c956edad61a7d467fae44b00ebf89895fb0dcd30`, enviado ao branch `codex/evergreen-vision-economy` de Khaos41x/Evergreen-Dashboard. Inclui o conjunto de alterações locais anteriores e os ajustes de integração, conversas e mobile descritos nos relatórios de 08/11/2026.

Deployment web: `dpl_5ebADwwTEXtDT1cWUwWhvYEwSLHc`. Framework Vite; build remoto com saída pronta em aproximadamente 15 segundos entre buildingAt e ready. Foi criado pela CLI a partir dos arquivos locais, inicialmente sem atribuir o domínio, e depois promovido via conector Vercel. A CLI registrou o HEAD anterior `c613fcc` na metadata porque o commit foi feito após o envio dos arquivos; essa metadata não identifica sozinha o conteúdo. A comparação dos 60 arquivos OTA com o app empacotado confirmou os mesmos bytes.

Deployment de downloads: `dpl_2dnxYXAqEw18zb58pAXE7788Dzzm`. Build Output API prebuilt, promovido depois de READY.

## APK
- Identificador: `com.evergreen.holdings`.
- Versão nativa: `1.3.0`; versionCode `8`.
- Versão exibida: `1.3 · revisão 08`.
- Tamanho: 13.132.552 bytes.
- SHA-256: `133895157ff0a8b63f21f59231888b5db04d8bf527cfbfd7f368133485ed819d`.
- Certificado SHA-256: `df860fd91807fd1a09a8ce9d9240e52c126151448544085b8db5faf591460d02`, igual ao fixado para a primeira instalação.
- Distribuição direta de APK debug, sem loja ou assinatura paga.
- Instalar por cima da versão anterior. Não é necessário desinstalar.
- O APK inclui a revisão 08: inspeção real do ZIP confirmou 62 arquivos públicos empacotados iguais aos arquivos preparados, incluindo o marcador da revisão.
- As versões imutáveis antigas no site de downloads foram preservadas.

O JDK 21 e as plataformas/build tools Android tinham sido removidos do ambiente. Foram restaurados de arquivos oficiais Adoptium/Google com SHA-256/SHA-1 publicados conferidos. A chave de assinatura existente foi preservada; não foi criado outro certificado nem alterado o estado de aceitação de licenças do SDK. O Gradle exibiu aviso de licença do Platform-Tools; isso não impediu a compilação. O build `assembleDebug` terminou com sucesso em 4m54s.

## Atualização automática
- Builds Android compatíveis: 5 a 8, com os mesmos plugins e a chave pública já instalada.
- Manifesto: `1.3.0+1794151372768`.
- Pacote criptografado: 4.740.096 bytes.
- SHA-256 do pacote: `7e303782b4e8c14cfdfdc8016dae2a695a8b452163993c4ff610d83aae7301a3`.
- Assinatura RSA-PSS, checksum, descriptografia pública de verificação, CORS e ausência de arquivos privados verificados no arquivo realmente publicado.
- Todos os 60 arquivos do pacote OTA são idênticos aos arquivos web preparados para o APK.
- O mecanismo baixa em segundo plano e agenda a ativação; não recarrega editor, conversa ou timer em uso. Mudanças nativas futuras continuam exigindo outro APK.
- Publicação no canal não comprova recebimento ou execução em aparelho físico.

## Verificação executada nesta entrega
- `npm run mobile:sync`: build TypeScript/Vite, cópia Android/iOS e CSP nativa — PASS.
- `npm run test:mobile:bridge`: transporte fixo, bloqueio de headers sensíveis, SSE e verificações locais/criptográficas — PASS; bridge e providers são doubles.
- `npm run test:mobile:ota`: assinatura, metadados inválidos, round-trip do pacote, checksum e ciclo controlado de atualização — PASS.
- `npm run mobile:apk`: compilação Android real — PASS.
- `npm run mobile:release`: certificado, package ID e versão contra Gradle — PASS.
- `npm run test:mobile:release`: bloqueios de downgrade, mudança de checksum e substituição de versão imutável — PASS.
- `scripts/mobile-ota-live-check.mjs`: manifesto/bundle reais de produção, conteúdo idêntico ao app preparado — PASS.
- `scripts/mobile-release-live-check.mjs`: downloads anônimos dos links atual e imutável, HTTP 200, MIME de APK, tamanho e hash conferidos — PASS.
- `scripts/mobile-ota-browser-check.mjs`: assinatura do manifesto sob CSP nativa no navegador; lifecycle do plugin é double. Cadastro público em 390/1440 px sem overflow, erros de página ou 3D durante autenticação — PASS. Nenhuma conta criada ou e-mail enviado.
- `output/native/revision08-public-smoke.mjs`: login publicado exibe revisão 08 em 390/1440 px; download aponta para 1.3.0; rotas privadas redirecionam ao login; sessão e nova API de prévia recusam acesso anônimo — PASS.
- `scripts/hosted-release-check.mjs`: RPCs de equipe e convites resolvidos no Supabase hospedado e negados ao acesso anônimo — PASS. Não equivale a E2E autenticado.
- `git diff --check`: PASS antes do commit.

Os testes de funcionalidade e segurança do conjunto de código já haviam passado na etapa anterior: 61 verificações SQL locais; provedores/handler de integração com transporte controlado; integração UI em 390/495/1440 px; conversas/arquivos/finanças e isolamento de empresas; apresentação em 320/390/495/1440 px. Ver relatórios associados.

## Observabilidade e limites
A consulta dos logs de runtime do deployment web, níveis error/fatal nos 15 minutos anteriores à consulta, não retornou registros. Isso não comprova ausência de problemas em fluxos não executados. Drains e monitoramento contínuo não foram auditados nesta entrega.

Instalação, execução e rollback nativos em aparelho físico permanecem NOT_VERIFIED. iOS foi sincronizado, mas não compilado no Windows. Push não foi ativado. Não houve migração ou alteração de permissões, SMTP, Auth, contas ou dados financeiros em produção. O usuário ainda não escolheu nem cadastrou credenciais de uma fonte externa real; coleta de provedor continua pendente dessa configuração.

A revisão automática recusou a criação de link temporário de compartilhamento do deployment protegido por considerar uma exposição adicional não coberta pela autorização de publicação. Esse link não foi criado; a publicação ocorreu nos domínios oficiais autorizados. Um teste com vercel curl também encontrou indisponibilidade de checagem de revogação do certificado no cliente local; nenhuma validação TLS foi desabilitada.

## Evidências
- `output/native/apk-result.json`
- `output/native/release-preparation.json`
- `output/native/update-release-guard-results.json`
- `output/native/live-update-publication.json`
- `output/native/update-publication.json`
- `output/native/ota-browser-results.json`
- `output/native/revision08-public-smoke.json`
- `output/native/revision08-login-390.png`
- `output/native/revision08-login-1440.png`
- `output/native/revision08-download-390.png`

## Fontes das ferramentas
- [Adoptium — instalação por API](https://adoptium.net/installation/ci-scripts).
- [Android — ferramentas de linha de comando](https://developer.android.com/tools).
