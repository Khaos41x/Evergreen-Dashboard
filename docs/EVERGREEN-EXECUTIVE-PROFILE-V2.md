# Perfil executivo Evergreen V2

Data: 31/10/2026. Implementação local pronta para revisão. A extensão mantém a identidade escura esmeralda com tipografia serifada e a lista compacta de empresas. `DESIGN.md` e `.impeccable/design.json` não foram alterados.

## Implementação

- `src/features/productivity/ProfessionalProfile.tsx` apresenta o perfil executivo, trajetória, indicadores, distintivos APEX e a seção de experiência inspirada no LinkedIn. A experiência mostra somente empresa, papel e data de atualização dos vínculos existentes; não inventa datas de início, duração ou localidade.
- `src/features/productivity/ProfileSettings.tsx` reúne preferências de visibilidade, especialidades e edição de avatar/capa; `src/features/productivity/ProfileImageCropper.tsx` trata o recorte da imagem; `src/collaboration/Collaboration.tsx` integra os fluxos de perfil e ajustes.
- `src/collaboration/workspace.css` implementa a apresentação responsiva, preservando o markup e a aparência compacta das linhas de “Empresas e atuação”.
- `src/collaboration/Chat.tsx` envia com Enter, mantém Shift+Enter para quebra de linha e respeita composição IME; `src/collaboration/conversation.css` limita a altura do campo em telas pequenas.
- `src/features/holding/HoldingOffice.tsx`, `src/features/world/WorldPane.tsx` e `src/features/world/model.ts` permitem que o titular renomeie apenas o próprio escritório, inclusive no diretório 2D.
- `supabase/migrations/20261031223000_profile_apex_and_founder_desks.sql` limita a designação de primeiro sócio a uma pessoa por empresa, publica a projeção autorizada do distintivo APEX e permite ao titular renomear somente o próprio escritório. O distintivo não altera permissões automaticamente; o nível APEX continua dependendo da concessão explícita pela governança da empresa.
- `supabase/migrations/20261031191056_profile_executive_v2.sql` implementa a projeção e as regras de acesso do perfil. A cobertura local usa `scripts/profile-sql-check.mjs`, `scripts/library-sql-check.mjs`, `scripts/platform-security-check.mjs` (runner `--profile-only`) e `scripts/collaboration-ui-check.mjs` (modo de interface `PROFILE_ONLY`).

## Verificações locais

| Verificação | Resultado e limite |
| --- | --- |
| `npm run build` | Passou localmente. O bundle 3D existente continua acima de 500 kB e gera aviso de tamanho. |
| Replay de segurança do perfil em PGlite | 32 verificações passaram, incluindo os novos controles de primeiro sócio e renomeação do escritório. Replay e dados de teste locais; nada foi aplicado ao Supabase hospedado. |
| Playwright focado (`PROFILE_ONLY=1`, 390/790/1440 px) | Passou em Chrome headless: perfil, APEX de fundador e primeiro sócio, experiência, vínculo/visibilidade, envio de mensagem com Enter, edição de escritório titular-only em 390 px, ausência de overflow e erros de página. As respostas REST e o armazenamento são fixtures. |
| Playwright responsivo (`npm run test:mobile`) | Passou em 320, 375, 390, 430, 768 e 1440 px: sem overflow, tarefa local persiste após recarga, dados existentes permanecem e não houve erros de página. |
| Template de e-mail (`npm run test:email-template`) | 5 verificações locais passaram; isso valida o HTML com `{{ .Token }}`, não a entrega de e-mail hospedada. |
| Conectores (`npm run test:holding:providers`) | Fixtures determinísticas passaram para Cloudflare, Vercel, Supabase e Asaas; não houve chamada a contas reais. |

Nenhuma migração hospedada ou implantação ocorreu. Os testes de interface e armazenamento usam fixtures; o replay PGlite é apenas local e não valida Auth, RLS, Realtime ou Storage do Supabase hospedado.

Em 31/10/2026, uma leitura do histórico de migrações do Supabase Evergreen encontrou como última migração hospedada `20261031145209` (`evergreen_founders_library`). As migrações locais `20261031183025`, `20261031191056` e `20261031223000` ainda não aparecem no histórico remoto. Por isso, primeiro sócio, distintivos APEX desta versão e renomeação de escritórios ainda não estão ativos na hospedagem.

## Capturas para revisão

- Perfil mobile/desktop: `output/playwright/profile-390.png` e `output/playwright/profile-1440.png`.
- Aparência compacta de “Empresas e atuação”: `output/playwright/profile-companies-390.png`.
- Experiência profissional com vínculo e selo APEX: `output/playwright/profile-history-390.png`.
- Primeiro sócio com nível APEX: `output/playwright/profile-history-first-partner-790.png`.
- Escritório renomeado pelo titular: `output/playwright/founder-office-390.png`.
- Conversa e caixa compacta no celular: `output/playwright/fixture-chat-390.png`.
- Autenticação responsiva: `output/playwright/auth-390.png`.

O diretório `evergreen_evidencias` e seu `LEIA-ME-CODEX.md` continuam ausentes no checkout. As duas capturas do LinkedIn fornecidas posteriormente foram usadas apenas como referência de direção para cabeçalho e experiência. Como a captura externa da seção “Empresas e atuação” não está no repositório, não se afirma equivalência pixel a pixel; a aparência atual foi preservada e registrada na captura acima.






## Publicação 1.2 — 31/10/2026

A versão web/PWA 1.2 e o APK 1.2.0 (versionCode 4) foram publicados. As migrações pendentes foram aplicadas ao projeto Evergreen, incluindo o ajuste de nível legado para exibição no perfil. Os estados anteriores deste documento são históricos; evidências atuais, hashes, regras e limites estão em [RELEASE-1.2.md](RELEASE-1.2.md). Instalação em aparelho e operações autenticadas hospedadas ainda não foram homologadas nesta rodada.
