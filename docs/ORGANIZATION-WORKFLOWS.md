# Empresas, equipe e projetos — 30/10/2026

Esta etapa responde à prioridade escolhida pelo usuário: organizar empresas, equipe e projetos. Amplia os módulos existentes, sem migração de banco ou concessão automática de acesso. A ativação anterior do responsável e os controles do Supabase permanecem preservados.

## Fluxos

**Empresas e equipe:** novo acesso na navegação lateral. Em Empresas, a visão “Equipe e trabalho por empresa” mostra pessoas, projetos, tarefas abertas e tarefas sem responsável nos dados operacionais autorizados. Os atalhos abrem Equipe e convites, Projetos, Tarefas e Objetivos no espaço correto. Empresas com acesso apenas estratégico não recebem esses atalhos. Caso o conjunto carregado alcance o limite de 1.000 linhas, as contagens são identificadas como parciais.

**Criar empresa:** o proprietário do grupo pode criar um espaço e vinculá-lo à holding. O fluxo reutiliza `eg_create_workspace` e `eg_founders_action`, com suas autorizações existentes. O espaço criado é preservado em caso de falha do vínculo ou reautenticação; repetir a etapa não cria outro espaço. Erros explícitos de validação permitem corrigir o nome. Uma falha de transporte com resultado de criação desconhecido bloqueia novas tentativas nessa tela e orienta conferir a lista/Configurações. A criação é executada somente após o usuário preencher e enviar o formulário.

**Projetos:** a tela específica apresenta projetos ativos, concluídos ou arquivados, busca, responsável, objetivo e tarefas vinculadas. Com tarefas, o progresso usa sua conclusão; sem tarefas, o percentual manual é rotulado como informado no projeto. “Adicionar tarefa” reutiliza o editor existente com o projeto selecionado. Tarefas sem projeto podem ser abertas para receber um vínculo. Registros de outro workspace são excluídos antes da apresentação; RLS segue como controle definitivo. O vínculo de uma tarefa a um projeto já arquivado é preservado ao editar outros campos.

**Futuros fundadores:** Governança inclui o formulário de convite para uma empresa que a pessoa realmente administra. Usa `eg_invites` e a política de administrador existente. O convite exige o e-mail confirmado correspondente; não concede capacidades de fundador. Depois do aceite, o proprietário atribui o papel, capacidades e escopos pela governança já existente. A consulta ao banco é repetida antes de reutilizar ou mostrar um convite, evitando divulgar como válido um link expirado/revogado/aceito em outra sessão. É possível revogar e compartilhar o link manualmente. Nenhum e-mail é enviado automaticamente.

**Preparação das integrações:** `GET /api/integrations/status?workspace_id=...` exige sessão e administração da empresa. Retorna somente booleanos de configuração e os nomes dos provedores; não retorna chaves, tokens ou valores de variáveis. A interface solicita credenciais de serviços somente quando cifragem e persistência estão configuradas. O servidor também bloqueia `discover`, `connect` e `sync` sem essa preparação. Desconexão continua disponível para remover credenciais existentes. Presença de configuração não comprova validade da chave nem conectividade da API real. A autenticação de um cron configurada não significa que sua frequência já foi agendada.

## Verificação

- Build TypeScript/Vite passou. O alerta do bundle 3D sob demanda permanece conhecido e não envolve a autenticação.
- Identidade/BFF: 14 grupos locais com sessão/provedor de fixture. Inclui status de integração negado sem sessão, negado sem administração, sem exposição de segredos e bloqueio antes da consulta de recursos externos.
- Organização: Edge local em 390/790/1440px. Testa empresa estratégica sem ação operacional, recuperação de erro de nome, falha do vínculo, reautenticação sem duplicar o espaço, convite expirado entre consultas, reuso, revogação com erro/reenvio, ausência de grant automático, isolamento de projetos, projeto inicial da nova tarefa e preparação das integrações.
- Shell completo: regressão em 320/375/390/430/768/1440px; atalhos de empresa para projetos e equipe exercitados especificamente em390/1440px, incluindo criação de projeto no editor existente. Mensagens, tarefas, foco, ajuda e navegação mantidos.
- Central da holding em390/790/1440px, plataforma existente em390/478/1440px e cinco grupos de conectores determinísticos passaram.
- Revisão independente: três defeitos materiais corrigidos e confirmados. Doze recapturas com CSS completo receberam aceite visual no escopo local revisado. DESIGN.md, sidecar e marca original preservados.

As evidências em `output/organization`, `output/playwright` e `output/platform` usam dados sintéticos e APIs interceptadas. Não são prova de convite real enviado, sessão de proprietário automatizada ou conexão a serviços reais. Nenhuma empresa real foi criada, nenhuma pessoa recebeu convite e nenhum cargo/permissão real foi alterado nesta etapa.

Não se adicionou serviço externo, gateway, chave administrativa ou agendamento. A persistência das integrações continua dependente da configuração segura no servidor. O acesso de proprietário já concedido a `peixotodavy831@gmail.com` permanece registrado em [ACTIVATION-HOLDING-20261030.md](ACTIVATION-HOLDING-20261030.md).

Testes novos e relevantes:

```text
npm run test:organization:ui
npm run test:identity
npm run test:collaboration-ui
npm run test:holding:ui
npm run test:platform:ui
npm run test:holding:providers
npm run build
```
