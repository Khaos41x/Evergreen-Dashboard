---
name: Evergreen
description: Existing Evergreen dark productivity interface
colors:
  background: "#070a09"
  sidebar: "#090e0d"
  panel: "#0a0f0e"
  raised: "#0d1312"
  text: "#f3f4f2"
  soft: "#bdc7c3"
  line: "#1b2320"
  primary: "#10d994"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  brand:
    fontFamily: "Georgia, serif"
    fontSize: "32px"
rounded:
  control: "8px"
  dialog: "14px"
spacing:
  small: "8px"
  medium: "16px"
  content: "32px"
components:
  primary-button:
    backgroundColor: "{colors.primary}"
    textColor: "#04150f"
    rounded: "{rounded.control}"
    height: "44px"
---

## Overview
Operação: ler conversas, responder, atribuir trabalho e administrar acesso. Extensão do Evergreen existente, sem trocar identidade.

## Colors
Tokens de `src/styles.css`; colaboração reutiliza fundo, superfícies, esmeralda e divisórias. Texto de erro claro sobre superfície escura avermelhada; confirmação por texto persistente.

## Typography
Marca serifada existente. Conteúdo e controles usam a pilha sans do projeto, sem download de fonte. Títulos de conteúdo de 28px desktop/24px mobile; cabeçalho de chat de 22px/18px; formulário de 16px para evitar zoom automático.

## Layout
Sidebar de 260px em colaboração desktop. Até 768px: menu lateral e navegação inferior; conteúdo com 16px lateral, safe-area e `100dvh`. Conteúdo principal rola independentemente; composer permanece no fluxo flex do chat.

## Elevation & Depth
Superfícies tonais e divisórias de 1px. Modal com scrim escuro, sem sombra decorativa.

## Shapes
Controles de 8px; diálogos 14px. Listas planas e linhas de mensagens, sem cartões aninhados.

## Components
Alvos de toque principais de 44px, controles com labels, foco visível, loading/erro/empty explícitos. Ações de mensagem sempre visíveis, inclusive sem hover. Editor com foco contido e Escape. Ícones Lucide consistentes.

## Do's and Don'ts
Preservar dados e contexto; sinalizar recurso não configurado ou indisponível. Não usar toast fictício, presença inventada, contador de notificações fictício ou identidade local para autorização remota.

