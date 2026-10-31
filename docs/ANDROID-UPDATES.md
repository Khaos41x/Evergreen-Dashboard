# Atualizações do APK Evergreen — 31/10/2026

O APK Android 1.0.1 (versionCode2) adiciona um aviso opcional de novas versões. A primeira versão 1.0 (code1) não tinha o verificador: instale 1.0.1 uma vez pelo link existente para receber avisos futuros. Não desinstale a versão anterior. Não foi contratado plano pago, usado serviço de atualização OTA ou implementado instalador silencioso.

## Funcionamento

- Apenas Android consulta App.getInfo().build e o manifesto público `https://evergreen-android-downloads.vercel.app/latest.json` na abertura e retorno ao app. Consultas bem-sucedidas têm intervalo mínimo de seis horas; tentativas com erro, um minuto. O evento online também pode retentar. Não há polling permanente ou execução de código baixado.
- A consulta pública omite cookies/credenciais, não segue redirects, não usa cache, expira após oito segundos e limita o JSON a16KiB. Ela não usa nem expõe a sessão Supabase/BFF.
- Schema, appId, plataforma, versão, tamanho, SHA-256 e URL são validados. Somente um versionCode estritamente maior mostra o aviso; versão igual ou inferior não aparece. A URL tem origem HTTPS fixa e caminho exato /releases/{versionCode}/Evergreen.apk, sem credenciais, query ou fragmento.
- A faixa ocupa seu próprio espaço no shell. Não toma o foco nem cobre o formulário. O conteúdo abaixo tem rolagem própria. O erro ao abrir o navegador aparece na faixa e permite tentar novamente.
- “Baixar atualização” abre o navegador do aparelho. O Android exige confirmação da instalação. O app não baixa nem instala APK automaticamente. A primeira versão 1.0.1 não exibirá aviso enquanto ela mesma for a mais recente.
- “Mais tarde” adia a mesma versão por24h, usando apenas preferência local não sensível. Uma versão nova ignora o adiamento da anterior. Se storage não estiver disponível, a preferência vale na instância atual.
- Falhas de rede/metadados ficam silenciosas e não bloqueiam login, trabalho ou foco. Web e iOS não consultam este manifesto nem exibem o aviso.

## Preparar a próxima versão

1. Incremente versionCode e versionName em android/app/build.gradle. Preserve applicationId e o certificado da primeira instalação.
2. Execute npm run mobile:sync e npm run mobile:apk com a mesma chave de assinatura. O projeto atual ainda entrega APK debug. A chave privada local não é arquivo de distribuição, não deve ir ao Git, ao frontend ou ao site.
3. Execute npm run test:mobile:updates, npm run test:mobile:updates:ui e npm run test:mobile:release. O último exige APK compilado e SDK/JDK locais.
4. Execute npm run mobile:release [diretório-opcional]. O script verifica a assinatura com apksigner, compara o certificado com resources/android-release.json e verifica package/versão com aapt2. Prepara output/native/download-site/.vercel/output sem publicar.
5. Preserve o diretório releases das entregas anteriores ao preparar a pasta de publicação. O script recusa substituir uma versão existente por bytes diferentes e recusa retroceder o manifesto. O APK de cada versão é imutável. /Evergreen.apk é apenas o link amigável da versão atual.
6. Antes de publicar, confirme o alvo exclusivo evergreen-android-downloads, equipe peixoto-s-projects1 (team_7mNnmcZNv9miOp7pl7otO6wE), projeto prj_t83JUexMTXBCG5uHH4jbqfg7JgcP. Nunca use o projeto evergreen-holding para publicar os downloads. Esta solicitação autoriza esta atualização; futuras publicações seguem a autorização vigente do usuário.
7. Publique a pasta preparada com Vercel CLI --prebuilt e alvo explícito, após os testes. O site não recebe chaves, configurações de conta, logs, dados da holding ou código-fonte do servidor. O projeto web principal e Supabase permanecem inalterados.
8. Verifique anonimamente latest.json, a URL imutável e /Evergreen.apk: status200, MIME correto, Cache-Control/CORS e SHA-256 igual ao APK local. Confira o novo deploy READY. O manifesto público fornece apenas metadados não sensíveis; Access-Control-Allow-Origin:* não expõe a API autenticada.

A política de certificado fixa o certificado de TESTE atual. O workflow Android manual cria sua própria chave debug por padrão e, portanto, não pode substituir esta instalação local diretamente. O preparador recusará essa assinatura diferente. Preserve a chave original fora do Git e faça uma migração explícita de distribuição quando houver assinatura release/loja; não troque o pin para contornar um erro de assinatura. O Android verifica a assinatura na instalação. O aviso não verifica o hash dos bytes baixados pelo navegador; o SHA-256 é validado pelo preparador e pela conferência da publicação.

## Evidências e limites

- Build web/Capacitor e assembleDebug passaram. O APK atual tem11.623.485 bytes e SHA-256 f4e7e77ff9fc202e3fdcc889d414423be898bd1ae7602ccdaf5a90b9d9386309. O certificado tem SHA-256 df860fd91807fd1a09a8ce9d9240e52c126151448544085b8db5faf591460d02, igual ao primeiro APK. Package com.evergreen.holdings, versionCode2, versionName1.0.1.
- Testes locais de schema/comparação/adiamento/rede e guardas de preparação de release não são instalação em aparelho. Resultados em output/native/update-results.json e update-release-guard-results.json.
- A UI real foi testada em Chromium nas larguras390/430/790/1440 com bridge Android e HTTP sintéticos. Inclui teclado, toque48px, erro/tentativa, adiamento, nova versão e ausência do aviso em web/iOS/versão atual/offline. Não é Android WebView. Relatório em output/native/updates/browser-results.json.
- A revisão independente marcou U1 (aviso cobria controles de login) como resolvido após mudar para faixa em fluxo. O verdict ship cobre apenas essa correção nas projeções de navegador, não prontidão nativa. Documentação visual em DESIGN-ANDROID-UPDATES.md; identidade incumbente preservada.
- Não havia aparelho conectado e o emulador exigia mais espaço que o disponível. Instalação por cima, Browser.open real, tela do instalador, login/sessão reais e atualização entre dois APKs no dispositivo continuam NOT_VERIFIED. iOS continua sem compilação neste Windows. Push e callbacks novos de backend continuam dependendo de configuração/homologação separada.

## Publicação

Publicado e conferido em31/10/2026 às15h20 (UTC−3), exclusivamente no projeto evergreen-android-downloads. Deployment dpl_5BhuZ2ufBtFM6W1ZJGcCj7YvFNm8, estado READY; fonte funcional no commit592fd15. Link público: https://evergreen-android-downloads.vercel.app/Evergreen.apk. O site do sistema evergreen-holding preservou o deployment dpl_8CZfjvVCB1utokNUXjcTh9A9hs5x; nenhuma migração Supabase foi executada.

O verificador scripts/mobile-release-live-check.mjs buscou o manifesto real sem credenciais, confirmou CORS público/Cache-Control:no-store e conferiu os dois downloads (alias e versão2 imutável): status200, MIME de APK, attachment,11.623.485 bytes e SHA-256 local idêntico. Resultado em output/native/update-publication.json. Também foi executado fetch real em Edge com origem https://localhost simulada e a CSP efetivamente empacotada: o manifesto remoto retornou200, sem bloqueio de CORS/CSP (output/native/update-live-browser.json). Esta evidência é remota HTTP/navegador; não é instalação nativa. O verificador pode ser repetido após preparar o pacote local correspondente. Não inferir sucesso de dispositivo dos testes de fixtures.

Fontes: [Capacitor App.getInfo](https://capacitorjs.com/docs/apis/app), [Capacitor Browser](https://capacitorjs.com/docs/apis/browser), [versionamento Android](https://developer.android.com/studio/publish/versioning).
