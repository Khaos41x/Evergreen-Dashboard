# Evergreen Android 1.2.1 e atualizacoes automaticas

Publicado em 01/11/2026. APK Android debug, build 5, com a mesma assinatura da primeira instalacao.

- Download: https://evergreen-android-downloads.vercel.app/releases/5/Evergreen.apk
- Pacote: com.evergreen.holdings; 13.577.250 bytes.
- APK SHA256: 685057147fffd3719d9892304ef73e99397d9aca401ccd925a3f159aa168caba.
- Certificado SHA256: df860fd91807fd1a09a8ce9d9240e52c126151448544085b8db5faf591460d02.
- Site principal: deployment dpl_CvaqpE54ZDdJaJnY8uVJ7Pm1vcWg, READY.
- Downloads: deployment dpl_9TK9f11YQiiDWqQbCivwTwA5mgHd, READY.

## O que atualiza sozinho

Instale este APK uma vez por cima do anterior, sem desinstalar. Nas proximas publicacoes de producao que executarem npm run build, a Vercel gera automaticamente um pacote de HTML/CSS/JavaScript e um manifesto assinado. O app Android verifica ao abrir/retornar e quando a rede volta. Consultas bem-sucedidas respeitam intervalo minimo de dez minutos; falhas permitem nova tentativa apos um minuto. Nao existe servico permanente com o app encerrado.

O pacote compativel e baixado em segundo plano. next() do plugin agenda a ativacao para uma transicao posterior ao segundo plano/reinicio, sem recarregar a conversa ou editor enquanto estiver em primeiro plano. Uma verificacao assinada invalida, falha de rede ou pacote nativo incompativel mantem a versao atual. A sessao continua no cofre nativo existente; o atualizador nao manipula senha ou sessao.

Apenas a camada web muda por este fluxo. Plugins, permissoes, configuracao Android e codigo Java/Swift continuam exigindo novo APK/binario. O aviso anterior para baixar um APK maior foi preservado. A compatibilidade inicial aceita somente build 5. Nao expandir minBuild/maxBuild sem revisar o contrato nativo. Alteracoes nas dependencias Capacitor/updater interrompem a publicacao ate atualizar a politica explicitamente.

## Infraestrutura e seguranca

Usado @capgo/capacitor-updater 8.54.0, compativel com Capacitor 8.6.0. Nao foi criada conta Capgo, ativada assinatura paga, contratada loja ou alterado plano de hospedagem. O plugin esta em modo manual, acionado automaticamente pelo codigo Evergreen; endpoints de update/stats/channel da nuvem Capgo estao vazios.

Cada manifesto recebe assinatura RSA-PSS SHA256. O cliente valida assinatura, appId, Android, intervalo de build, sequencia crescente, tamanho e origem/caminho HTTPS exatos. Metadados usam fetch sem cookies, sem redirects, com timeout e limite de 16KiB. O download nativo exige pacote no formato de criptografia V2 do plugin: AES-CBC com chave/IV por pacote e checksum/chave de sessao autenticados pelo RSA fixado no binario. Este formato nao promete confidencialidade do codigo: quem tem a chave publica do app pode ler o pacote. A garantia aqui e autenticidade/integridade.

A chave privada foi criada uma vez, preservada em arquivo local ignorado e configurada como segredo Sensitive somente em Production do projeto evergreen-holding. Nao foi impressa, copiada para dist/APK, exposta como VITE_ ou enviada ao projeto de downloads. O manifesto contem somente dados publicos de distribuicao. Preview nao publica canal e producao falha sem a chave ou com chave diferente. Nao rotacionar implicitamente a chave: apps instalados fixam a publica correspondente.

O APK empacota a mesma base React/TypeScript e a logo oficial. A CSP dos pacotes nativos permite o dominio oficial para o manifesto; o dist web permanece com suas politicas existentes. Nao e usado server.url remoto, senha/token no localStorage, instalacao silenciosa de APK ou execucao de codigo nao assinado. O plugin recupera a versao anterior se um bundle novo nao chamar notifyAppReady dentro de 30s; esta chamada confirma inicializacao de JavaScript, nao sucesso de APIs ou de todas as funcoes do produto.

## Arquivos alterados

- android/app/build.gradle: 1.2.1 / build 5.
- package.json e package-lock.json: plugin fixado, compactador fflate fixado, geracao apos o build e teste OTA.
- capacitor.config.ts e arquivos Android/iOS de plugins gerados pelo sync: atualizador nativo, chave publica e limites.
- src/main.tsx e src/mobile/live-updates.ts: inicializacao, verificacao e agendamento.
- src/mobile/live-update-key.json, live-update-policy.json, live-update-native.json: chave publica e compatibilidade.
- scripts/native-csp.mjs, native-hardening.mjs, mobile-ota.mjs e mobile-ota-key.mjs: mesmo HTML nativo, arquivo assinado e criacao explicita de chave.
- scripts/mobile-ota-check.mjs, mobile-ota-live-check.mjs, mobile-ota-browser-check.mjs e ajuste de mobile-update-check.mjs: verificacoes.
- vercel.json, .vercelignore e .gitignore: arquivos estaticos de distribuicao, cache/CORS e exclusao da chave.
- scripts/mobile-release.mjs e esta documentacao: preparacao e orientacoes.

## Verificacoes e limites

- TypeScript/Vite passaram; permanece o aviso anterior do chunk 3D. Capacitor sync e assembleDebug com o novo plugin passaram.
- apksigner/aapt2 e teste de release: assinatura igual a primeira instalacao, appId/versao, imutabilidade e downgrade verificados.
- Inspecao do APK: plugin registrado, chave fixada, CSP correta, logo byte-identica, sem server.url/arquivos secretos e assets iguais ao dist.
- Sete grupos OTA locais: assinatura real/adulteracao, arquivo cifrado real/checksum, chave errada, falha/rede/tamanho, agendamento sem reload ativo, compatibilidade/retrocesso/versao falha e alteracao de dependencias nativas.
- Build sem chave em producao foi recusado; preview nao gerou canal. O build local comum sem chave privada permanece permitido, sem exportar atualizacao.
- Identidade: 16 grupos locais passaram, com provedor HTTP de teste. Bridge: 5 grupos locais; avisos de APK: 7 grupos. Nao sao autenticacao ou push reais.
- Interface mobile e timer passaram em 390/430/768/1440, com safe areas e tempo sinteticos. A primeira tentativa de navegador e a primeira de identidade foram bloqueadas pelo isolamento; a repeticao fora dele passou.
- Downloads reais de /Evergreen.apk e /releases/5/Evergreen.apk retornaram 200, MIME e hashes iguais ao arquivo local. As versoes 1 a 4 foram preservadas.
- O build hospedado gerou o manifesto com a chave correta. O pacote remoto foi baixado, validado, decifrado com material publico e comparado: 57 arquivos identicos ao app empacotado. CORS e no-store do manifesto conferidos.

Evidencias em output/native: apk-result.json, apk-content-check.json, update-release-guard-results.json, live-update-check.json, live-update-build-guard.json, live-update-publication.json, update-publication.json, browser-results.json, ota-source-manifest.json e ota-browser-results.json.

Nao foi instalado/atualizado em aparelho fisico nesta rodada. Aplicacao real do bundle, rollback nativo, persistencia da sessao durante a troca e comportamento do fabricante continuam NOT_VERIFIED. iOS nao foi compilado neste Windows; atualizacoes automaticas estao habilitadas apenas no Android. Push e o incidente preexistente de links de e-mail continuam pendentes. Supabase, contas, permissoes e templates de e-mail nao foram alterados. Nao houve commit ou push; a publicacao usou o checkout local auditado.

Fontes oficiais: https://capgo.app/docs/plugins/updater/self-hosted/getting-started/ e https://capgo.app/docs/plugins/updater/settings/ ; o formato criptografico tambem foi conferido na fonte Java da versao instalada.

Revisao final de producao: source SHA256 0726003d5df294bf3b352075e9e4a20be145e413eed3ac6a36b8d7e713d37a98. A verificacao do navegador ocorreu no primeiro deployment desta mesma interface; a revisao final alterou apenas a permissao de compilar localmente sem chave, mantendo o bloqueio de producao. O pacote da revisao final foi novamente conferido por assinatura, checksum e comparacao dos 57 arquivos.


## Teste da primeira atualização visível — revisão 02

Em 01/11/2026 o usuário informou ter instalado a 1.2.1. Foi publicado o deployment dpl_SZKWHbuRZmHTB8WdkEBh56bMrFb4 com a identificação “Acesso · revisão 02” na tela de login, novas instruções de confirmação e o mesmo contrato nativo build 5. Isso substitui somente o pacote web; o APK de download mantém seus bytes e certificado anteriores. A prova de recebimento/aplicação no celular fica pendente da observação do usuário. Assinatura e conteúdo remoto são verificados separadamente em output/native/auth-revision-02-verification.json. Não confundir disponibilidade do pacote com aplicação nativa.


## Relato de não aplicação e instalação direta 1.2.3

O usuário informou que não apareceu revisão 02 no APK 1.2.1. Sem aparelho conectado e sem depuração USB disponível, a causa permanece não identificada. Não declarar OTA homologado. Foi preparado novo APK 1.2.3/build 7 com a interface atual incluída e versão no login/perfil. Veja [ANDROID-1.2.3.md](ANDROID-1.2.3.md).
