# Extensão visual — workspace e perfis

Registro de 30/10/2026. A direção aprovada pelo usuário foi incorporada aos tokens de `DESIGN.md` e às extensões v2 de `.impeccable/design.json`. Este arquivo descreve o escopo e a evidência da documentação; não substitui as regras de produto de `PRODUCT.md`.

## Fonte da documentação

O fonte final é a autoridade: `src/styles.css`, `src/collaboration/collaboration.css`, `workspace.css`, `conversation.css`, `WorkspaceNavigation.tsx`, `src/components/EvergreenBrand.css`, `EvergreenBrand.tsx`, `src/features/productivity/ProfessionalProfile.tsx`, `Avatars.tsx`, `src/features/founders/ProfessionalLevels.tsx` e `professional-levels.css`. Capturas intermediárias não definem tokens.

As alterações duráveis autorizadas são a árvore branca isolada internamente, wordmark na autenticação, navegação de empresas/sidebar/chat inspirada em Slack/Discord nas cores existentes, títulos Libre Caslon Display, botões com ícones consistentes, perfis profissionais e níveis Chairman/APEX/NÍVELO. A fonte é local e inclui licença OFL. Paleta base, funcionamento dos demais módulos e limites de acesso permanecem preservados.

O shell documentado tem rail/sidebar de 64/240px, reduz a 56/218px até 1200px, usa drawer até 1000px e navegação inferior até 600px. Favoritos, canais e DMs aparecem antes dos módulos; ferramentas secundárias usam disclosure. A foto do rail tem regra explícita de 28×28px no fonte final, após a correção de geometria da revisão.

Os snippets do sidecar são amostras visuais autossuficientes com classes `ds-`, SVG inline e estados de hover/foco. Não implementam chamadas ao servidor, autenticação, reautenticação ou autorização. As cores derivadas para tonal ramps servem apenas à visualização do painel; os valores reais de produção são os tokens e o CSS do projeto.

## Perfis e verdade de acesso

Chairman significa fundador original da Evergreen; APEX, fundador de uma empresa; NÍVELO, CEO. Sócio é uma atuação distinta. Foto, apresentação, cargo e vínculos exibem dados do perfil no contexto permitido. Nome indicado, badge e cargo não criam identidade nem concedem acesso. Confirmação de conta, capacidades, escopos financeiros e operações são verificados no servidor.

As indicações de Miguel Mármore e Gabriel continuam pendentes de conta confirmada, aceite e atribuição explícita. Nenhuma associação automática por nome é documentada como concluída.

## Revisão e limites de evidência

A revisão fez correções delimitadas no fonte e encerrou os quatro achados como resolvidos. A foto final do rail foi medida em 28×28px e recapturada. A documentação confere valores e comportamento declarados no fonte final; capturas intermediárias não definem a versão entregue.

A evidência de interface desta versão usa fixtures locais. Não equivale a E2E autenticado em produção ou dispositivos reais. O download do motor do detector de screenshots não estava disponível; uma execução ausente não conta como detecção aprovada. Após aprovação explícita do usuário, a nova migração e a preparação de identidades empresariais foram aplicadas ao projeto Supabase dedicado. A publicação e a verificação autenticada da interface em produção ainda estavam pendentes ao fechar este registro. O estado operacional de entrega pertence à documentação de ativação, não aos tokens visuais.

## Divergência fora do escopo

`src/styles.css` ainda contém o shell legado de 312px e títulos específicos em Bodoni/Georgia, além de regras responsivas próprias. `collaboration.css` conserva a base antiga de sidebar de 260px/768px, sobreposta pelas regras do workspace atual. Este registro descreve as regras efetivas das superfícies novas e não declara que todos os módulos antigos foram normalizados. Nenhum desses estilos foi alterado pela documentação.
