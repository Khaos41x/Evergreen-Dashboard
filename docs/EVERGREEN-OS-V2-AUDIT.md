# Evergreen OS V2 — auditoria e contrato de execução

Referência vigente: anexos Master Build Directive e Master Implementation V2 fornecidos em 30/10/2026. A V2 prevalece na separação Platform / Group / Company. Esta etapa preserva React/Vite, Supabase, BFF de cookies HttpOnly, RLS, livro financeiro exato e rotas existentes.

## Estado encontrado

| Área | Fonte atual | Lacuna observada |
| --- | --- | --- |
| Conta | server/identity.mjs, auth-actions.mjs | Google/passkeys dependem de ativação e homologação do provedor |
| Empresas | eg_workspaces, eg_group_companies, eg_holding_context | criação e vínculo em duas chamadas; falta cadastro completo independente e pedido de vínculo bilateral |
| Grupo | eg_groups, eg_group_members | centro estratégico existe, mas falta workspace geral da Evergreen separado do canal reservado de fundadores |
| Níveis | eg_professional_roles, eg_original_founders | vínculos descritivos; falta níveis técnicos explícitos e três assentos protegidos |
| Conselho | eg_decisions, eg_decision_votes | votações existem; governança crítica ainda centrada em um proprietário e sem assentos de igual autoridade |
| Colaboração | eg_channels, eg_messages, Chat, Attachments | canais/DM/threads/menções/reações/arquivos persistentes existentes; falta conversa em grupo e compartilhamento interempresarial restrito |
| Trabalho | eg_records e produtividade | lista/Kanban/prazos/responsáveis/comentários/anexos existentes |
| Financeiro | eg_fin_* e eg_financial_* | centavos exatos, idempotência, reservas, relatórios e transferências existentes; faltam obrigações/recebíveis e aprovações intercompany explícitas |
| Sociedade | perfis de fundador/sócio | não existem participações documentadas ou histórico de formalização |
| Foco | FocusTimer / FocusHome | atualizações de sessão rearmam a notificação; fechamento não é reconhecido após remount |
| Início | HomePage / evergreen-tree.png | frase sem empresa, aviso redundante, CTA pequeno e árvore raster sem fonte 3D original |
| Integrações | Cloudflare/Vercel/Supabase/Asaas | adaptadores existentes; credenciais operacionais não configuradas; IA não configurada |

Somente preferências de navegação/favoritos e o modo pessoal opcional usam armazenamento do navegador. Dados empresariais persistem no Supabase. A confirmação visual de fechamento de uma sessão não contém tokens nem substitui o estado de foco do servidor.

## Ciclos

1. Corrigir foco e contexto do início, preservando regressões locais.
2. Implementar Hub, organização Evergreen e navegação contextual; organizações externas independentes por padrão.
3. Company Builder transacional/idempotente, cadastro e níveis técnicos por empresa.
4. Três assentos com aceite individual e ativação segura; propostas, votos e execução colegiada auditável; bloquear rotas antigas que contornem o conselho ativado.
5. Sociedade com propostas, documentação privada e aprovação; separar vínculo, acesso e participação.
6. Obrigações e recebíveis, liquidação em livro interno e intercompany com aprovação dos dois lados.
7. Reusar comunicação, trabalho, Economy e Vision; permitir conversa em grupo e acesso estritamente contextual.
8. Expor indisponibilidade real de IA/integrações enquanto não configuradas, sem inventar resultados.
9. Testes de isolamento, concorrência/idempotência, papéis, consentimento, desktop/mobile e preservação; documentar evidência local e hospedada separadamente.

Mudanças de regras de governança existentes serão preparadas/testadas antes de qualquer aplicação em produção. Nenhuma alteração nos repositórios ou bancos da ORKTO ou ThinkerChess é necessária: os workspaces neste projeto Evergreen são independentes desses produtos.
