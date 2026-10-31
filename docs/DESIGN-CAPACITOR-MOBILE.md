---
name: Evergreen — extensão Capacitor
description: O mesmo produto e identidade, com compatibilidade de interface para o contêiner nativo
colors:
  native-background: "#070a09"
  native-accent: "#10d994"
  app-icon-background: "#f3f4f2"
typography:
  native-field:
    fontSize: "max(1rem, 16px)"
  native-world-label:
    fontSize: "11px"
spacing:
  auth-and-page-bottom: "24px"
  dialog-safe-base: "16px"
  bottom-navigation-base: "4px"
  collaboration-navigation-reserve: "66px"
  field-scroll-margin: "90px"
components:
  native-shell:
    backgroundColor: "{colors.native-background}"
  native-field:
    typography: "{typography.native-field}"
  native-world-label:
    typography: "{typography.native-world-label}"
---

# Evergreen — extensão Capacitor

## Overview

Registro extraído do código em 31/10/2026. [DESIGN.md](../DESIGN.md) e [.impeccable/design.json](../.impeccable/design.json) continuam sendo a autoridade visual; esta extensão documenta apenas a compatibilidade móvel. O produto permanece React, TypeScript, Vite, Tailwind e Supabase, com os mesmos módulos e permissões. Não houve substituição do mundo visual, comp raster ou seed conceitual.

A tese é levar o mesmo Evergreen ao celular. A sequência permanece autenticação → workspace autorizado → recursos existentes. A primeira vista conserva a marca completa no acesso e o início existente após a entrada, com foco, contexto e navegação do workspace. Superfícies escuras, esmeralda, títulos serifados locais, controles sans e ativos fornecidos mantêm a continuidade com o incumbente. O contêiner acrescenta insets, alvos de toque e integração de ciclo de vida; as regras CSS estão condicionadas a `html[data-native=true]`, sem redefinir o layout web.

**Key Characteristics:**

- Mesma identidade, conteúdo, módulos e autorização do produto existente.
- Safe areas e controles de toque aplicados apenas ao contêiner nativo.
- Estados de configuração e falha explícitos, sem confirmação fictícia.

**Disposição da revisão:** `SHIP` somente para a projeção em navegador; não foram indicadas correções visuais materiais nas sete capturas. Android está `BLOCKED_ENVIRONMENT`; execução iOS e homologação nativa permanecem `NOT_VERIFIED`. Projetos gerados e sincronizados não constituem aplicativo compilado ou validado.

## Colors

O fundo nativo repete a base escura incumbente. Esmeralda, textos, divisórias e superfícies dos módulos continuam definidos no sistema existente; não surgem novas cores de interface nesta extensão.

As declarações do shell também repetem essa paleta: Android usa `native-accent` em `colorPrimary`/`colorAccent`, `native-background` em `colorPrimaryDark` e nas barras de status/navegação, e `app-icon-background` em `evergreen_launch_background`. No iOS, `SceneDelegate` declara `window.tintColor` com o mesmo esmeralda. Essas declarações substituem cores de tema herdadas do pacote; não alteram React, CSS ou ativos. Não foram compiladas nem observadas em aparelho e permanecem `NOT_VERIFIED`.

O fundo claro de ícone/splash pertence aos recursos de instalação, não à paleta dos módulos. `npm run mobile:assets`, com `@capacitor/assets`, gera os recursos Android/iOS a partir de `resources/logo.png`. Esse arquivo é byte a byte idêntico a `public/evergreen-symbol.png` (SHA256 `C1081DF82272C22CD4DFE45E9D6F0D9214C95C032FECCD76B9DB0FA342ABA2D7`). O ícone gerado conserva o símbolo verde original sobre o fundo claro; não há recoloração do arquivo fornecido. A autenticação mantém a marca completa e o interior mantém o tratamento branco por CSS documentado no sistema incumbente.

## Typography

Libre Caslon Display local e a pilha sans incumbente permanecem. O contêiner impõe o tamanho do papel `native-field` a inputs, textareas e selects para reduzir zoom automático de campos. Até 768px, etiquetas da Visão usam o papel `native-world-label`. Esses ajustes locais não substituem a hierarquia dos módulos nem provam o comportamento do teclado iOS real.

## Layout

`--safe-top` e `--safe-bottom` usam o maior valor entre `env(safe-area-inset-*, 0px)` e a variável auxiliar correspondente. O body recebe padding superior e insets laterais; `#root` usa `calc(100dvh - var(--safe-top))`, com `min-height: 0`. O documento desativa overscroll.

Autenticação e páginas de Economia, Fundadores e Visão somam o inset inferior ao espaçamento de fim de página. Overlays e modais acrescentam os insets às bases superior/inferior; a barra inferior acrescenta o inset à sua base. Campos mantêm margem de rolagem vertical para aproximação ao teclado.

Até 768px, a aplicação reserva espaço para a navegação inferior mais inset, a sidebar recebe o inset superior e o conteúdo flexível permite redução de altura. Os breakpoints e a composição dos módulos continuam incumbentes; a regra nativa de 768px não redefine globalmente o breakpoint da navegação web. Insets de aparelho, rotação e teclado ainda exigem verificação nativa.

## Elevation & Depth

Nenhuma sombra, material ou profundidade nova foi acrescentada ao shell. Superfícies tonais, scrims, modais e a cena 3D conservam suas implementações. Movimento reduzido também força rolagem automática, sem animação de scroll, no contêiner.

## Shapes

Raios e formas permanecem incumbentes. A alteração de toque é dimensional: até 768px, botões, elementos com papel de botão e summaries têm altura mínima de 48px; botões com `aria-label` e controles de câmera têm largura mínima de 44px. A regra não estabelece largura mínima global para todos os controles.

## Components

### Controles e navegação

Botões e summaries usam `touch-action: manipulation`; o destaque de toque do body é transparente. O runtime trata Back primeiro no diálogo, depois no evento cancelável `evergreen:back`, depois no histórico; sem histórico, solicita minimizar o app. Links HTTP(S) abrem pelo navegador do sistema. Esses são comportamentos implementados, ainda sem validação de gesto/Back em aparelho.

### Tema e abertura nativos

O tema Android declara `Theme.AppCompat.DayNight.NoActionBar`, barras escuras e `windowLightStatusBar=false`. O tema de abertura usa o fundo claro, o ícone gerado do símbolo original e transição por `postSplashScreenTheme` ao tema sem ActionBar. O tint do iOS pertence à janela nativa. Essas regras não aparecem nas capturas web existentes; não há evidência visual nova nem aprovação de aparência/comportamento do sistema operacional.

### Sessão e notificações

A entrada reutiliza a identidade e a autorização existentes. O transporte nativo declara cofre de cookies e não disponibiliza tokens ao armazenamento JavaScript; detalhes, configuração e limites estão em [CAPACITOR-MOBILE.md](CAPACITOR-MOBILE.md). Não apresentar essas declarações como auditoria de segurança ou persistência nativa aprovada.

“Notificações neste aparelho” aparece apenas no nativo, com status textual, ativar/desativar e estado ocupado. A mensagem inicial informa dependência de Firebase/APNs. Solicitar permissão depende de ação da pessoa e disponibilidade informada pelo servidor; configuração e envio real continuam pendentes.

### Foco e retomada

O ciclo de vida emite `evergreen:resume`/`evergreen:pause`; a retomada recalcula o relógio por timestamps e atualiza dados. A contagem não depende de ticks para representar o tempo transcorrido. Não existe serviço permanente ou alarme nativo garantindo aviso com o app encerrado.

### Evidência e limites

Fontes: [PRODUCT.md](../PRODUCT.md), sistema incumbente, [mobile.css](../src/mobile/mobile.css), [runtime.ts](../src/mobile/runtime.ts), [NativePushSettings.tsx](../src/mobile/NativePushSettings.tsx), [main.tsx](../src/main.tsx), [configuração Capacitor](../capacitor.config.ts), script `mobile:assets` e relatório técnico citado.

Fontes adicionais do shell: [colors.xml](../android/app/src/main/res/values/colors.xml), [styles.xml](../android/app/src/main/res/values/styles.xml) e [SceneDelegate.swift](../ios/App/App/SceneDelegate.swift), inspecionados somente como código-fonte.

| Evidência local | Alcance |
| --- | --- |
| Sete capturas: `output/native/signup-{390,430,768,1440}.png` e `home-{390,790,1440}.png` | Navegador desktop com fixtures e projeção CSS nativa, insets sintéticos de 28px no topo e 24px na base; sem emulador |
| [Relógio/layout](../output/native/browser-results.json), quatro larguras | Avanço por timestamp, pausa, reload e conclusão única com tempo sintético; não testa suspensão pelo sistema |
| [Colaboração](../output/native/collaboration-results.json), três larguras, e regressões web | Navegação, chat, tarefas, perfil, equipe/projetos, foco/ajuda e retorno da biblioteca em web/projeção CSS; Economia/Fundadores/Visão também passaram nas regressões existentes |
| 16 grupos de identidade e 46 grupos SQL | Fixtures HTTP e replay PGlite locais; não é Auth/RLS hospedado ou segurança de provedor homologada |
| Android/iOS gerados e sincronizados | Mesmo build Vite empacotado; não comprova compilação Java/Swift |
| [Tentativa de APK](../output/native/apk-result.json) | `BLOCKED_ENVIRONMENT`: SDK36/JDK21 não verificados; nenhum APK. iOS sem compilação neste Windows, sem Xcode |

As sete capturas foram consideradas válidas na revisão da projeção em navegador. Não há resultado do detector Impeccable: engine 0.1.5/cache indisponível. Acessibilidade nativa, teclado, safe areas reais, restauração/revogação de sessão, deep links, push FCM/APNs e desempenho em aparelhos continuam `NOT_VERIFIED`. Esta etapa não publicou backend/app nem aplicou migração hospedada.

## Do's and Don'ts

- Do preservar marca, módulos, contexto autorizado e tokens incumbentes.
- Do manter insets e ajustes de toque restritos ao shell nativo.
- Do comunicar dependências e falhas antes de apresentar sucesso.
- Don't tratar fixtures, geração de projeto ou sincronização como execução nativa.
- Don't prometer notificações, alarme em segundo plano ou segurança de provedor homologados.

Esta passagem documental escreveu somente este arquivo; `DESIGN.md` e `.impeccable/design.json` permanecem inalterados.
