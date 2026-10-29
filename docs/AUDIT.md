# Auditoria inicial — 2026-10-26

Branch: `codex/evergreen-functional-core`. Checkout inicialmente limpo. Build original: PASS (TypeScript + Vite 8.3.4).

| Área | Estado inicial | Evidência |
|---|---|---|
| Tarefas, projetos, objetivos | PARCIAL | CRUD local; `useWorkspaceStore`, chave `evergreen.workspace.v1`; sem servidor ou autorização |
| Foco | FUNCIONAL local | Timer/stopwatch, pausa, retomada, conclusão e persistência em `evergreen.focus-session.v1` |
| Identidade | AUSENTE | João fixo em `initialData.ts` e autor fixo nos comentários |
| Auth, recuperação, sessão autenticada | AUSENTE | Nenhum cliente ou backend |
| Workspaces, membros, papéis, canais | AUSENTE | Nenhum modelo ou serviço |
| Chat e histórico compartilhado | AUSENTE | Não existe transporte ou persistência remota |
| Convites | QUEBRADA | Botão copia URL atual, sem convite persistido |
| Anexos | QUEBRADA | Insere apenas nome do arquivo no comentário |
| Sugestões | PARCIAL | Registra atividade genérica; campos não usados |
| Handoff | PARCIAL | Primeiro colega; campos de contexto ignorados |
| Pesquisa | PARCIAL | Paleta filtra comandos; tarefas pesquisáveis por título |
| Navegação | PARCIAL | Home/Tasks reais; demais atalhos rolam seções |
| Presença/notificações | AUSENTE | Elementos visuais, sem serviços |
| Segurança multiusuário | AUSENTE | Nenhum backend ou RLS |
| Mobile | PARCIAL | CSS responsivo existente; sem navegação inferior ou chat |
| Testes autenticados A–G | BLOQUEADA | Nenhum Supabase dedicado identificado/configurado |

Inventário: `src/App.tsx`, pages, componentes, state, data, styles, scripts de captura e functional-check. Dependências e scripts analisados. Auditoria de armazenamento: estrutura do código inspecionada; nenhum dado local do usuário apagado. A inspeção responsiva e regressão executável está registrada em VALIDATION.md após a implementação.

Não alterar os projetos Supabase existentes sem identificação explícita de qual pertence ao Evergreen. Não fazer deploy/push. Manter dados locais e exportação explícita antes de qualquer importação remota.
