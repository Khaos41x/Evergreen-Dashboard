# Revisão da adaptação Capacitor — 31/10/2026

Revisor independente: `impeccable_finish_reviewer_capacitor`, contexto novo, sem navegador e sem edição dos fontes. Avaliou sete capturas válidas de cadastro/início em 390, 430, 768, 790 e 1440 px, junto aos arquivos incumbentes e CSS/runtime nativos.

**Veredito: `ship` somente para a adaptação visual por projeção web. Entrega nativa: `BLOCKED_ENVIRONMENT` / `NOT_VERIFIED`.** Nenhuma correção visual material foi identificada nesse escopo.

O revisor confirmou continuidade da marca, cores, hierarquia serifada/sans, layout responsivo, campos de pelo menos 16px e regras de toque/áreas seguras simuladas. Os relatórios de regressão registram navegação e temporizador, sem comprovar execução Android/iOS, autenticação real ou entrega de push.

As capturas são de navegador desktop com CSS nativo e respostas sintéticas. Não são imagens de emulador ou dispositivo. HIG/Material, teclado, gestos, áreas seguras físicas, ciclo de vida real e armazenamento nativo continuam pendentes. A geração de APK foi bloqueada por falta do SDK36 e JDK21 válido; iOS exige macOS/Xcode. O detector estava indisponível, sem score ou resultado automático.

A passagem documental posterior criou `DESIGN-CAPACITOR-MOBILE.md`. Os arquivos `DESIGN.md` e `.impeccable/design.json` foram comparados antes/depois e mantiveram seus hashes; o incremento não definiu outra identidade visual. Fonte, testes, instruções e pendências em `CAPACITOR-MOBILE.md`.

## Atualização posterior — compilação Android

O bloqueio de SDK/JDK descrito na revisão acima foi resolvido em 31/10/2026. `assembleDebug` compilou Java e gerou o APK; assinatura debug v2 e manifest foram verificados com as ferramentas do Android SDK. Android Lint passou com zero erros e 35 avisos registrados no relatório. Isso não altera o escopo do parecer visual: o emulador Android36 não iniciou por espaço insuficiente (7.372,80 MiB exigidos, aproximadamente 3.473,59 MiB disponíveis), e não havia aparelho conectado. Instalação, autenticação e runtime nativos continuam `NOT_VERIFIED`. Evidências atuais em `CAPACITOR-MOBILE.md` e `output/native/`.
