# Evergreen World R1 — diagnóstico antes da implementação

Data: 2026-10-28. Escopo autorizado: Fase A e primeira sala funcional da Fase B, incremental, sem deploy de produção.

## Estrutura e fontes de verdade

React/TypeScript/Vite; estilos originais CSS + Tailwind, ícones Lucide. Root separa App local de Auth/Collaboration. AppShell/HomePage/TasksPage, useWorkspaceStore e useFocusSession implementam produtividade pessoal. O armazenamento local usa evergreen.workspace.v1 e evergreen.focus-session.v1. As coleções iniciais de tarefas, projetos, objetivos, pessoas da equipe e atividades estão vazias; a identidade João em initialData é um fallback local, não uma conta autenticada. World não deve apresentar esse nome como identidade verificada nem inventar colegas/presença.

Collaboration usa useLiveData para workspaces, members, channels e records; useProductivity para checklist, comentários, sessões e eventos; usePresence para canal privado por workspace. RecordItem tem escopo workspace_id, tipo, versão otimista, assignee_id e project_id. Members têm user_id e papel. World deve receber esses snapshots e callbacks existentes; nunca manter uma segunda cópia operacional em localStorage ou criar um cliente de autorização paralelo.

Tasks/Issues e projetos já possuem editores. World deve encaminhar suas ações aos mesmos editores/RPCs. A presença é transitória e não autoriza mutações. Canal de projeto ainda não possui associação normalizada: World mostrará apenas canais autorizados do workspace, com essa descrição, sem fingir que pertencem ao projeto.

## Estado verificado anterior e limites

Núcleo inicial de colaboração foi validado no Supabase real. Migrações de produtividade e acesso interno continuam registradas como NOT_APPLIED; novos recursos remotos NOT_VERIFIED. O frontend publicado em https://evergreen-holding.vercel.app não comprova backend completo. Seu primeiro responsável ainda depende de configuração administrativa. Não aplicar migrations, alterar produção ou publicar World neste trabalho sem autorização específica.

Existem suites de SQL embarcado, UI com REST simulado e regressão local. Esses ambientes precisam continuar explicitamente separados de Auth/Realtime/Storage hospedados. O novo modo deve funcionar localmente com os dados pessoais existentes e no ambiente conectado com os dados que o servidor efetivamente autoriza.

## Arquitetura e qualidade

Não existe dependência 3D. AppShell é pequeno; Collaboration concentra navegação e gestão em JSX extenso. Extrair World como módulo lazy é aditivo e evita aumentar a complexidade da raiz. Sem reescrita do Work. Três dimensões precisam de uma fronteira de erro própria; controles e painéis HTML acessíveis continuam funcionais quando WebGL falha. Sem carregar fontes/HDR/modelos remotos ou texturas pesadas.

UI existente: fundo preto/esverdeado, acento esmeralda, marca serifada, controles sans, bordas discretas. Mobile usa drawer/navegação inferior. Novo módulo deve respeitar superfícies/controles e adaptar a composição: cena e painel lado a lado em desktop, painel abaixo da cena no celular. Dados vazios, inicialização, falha de WebGL/contexto, erro de gravação e ausência de presença são estados reais, não sucesso simulado.

Riscos: contagem de draw calls proporcional a usuários; listas grandes precisam de paginação espacial; dispositivos mobile podem não suportar WebGL2; browser de teste usa GPU de software e não representa celular físico. Preferir instancing/geometrias compartilhadas, render sob demanda, DPR limitado, sombras opcionais e suspensão ao ocultar a aba. Não adicionar chamadas/voz falsas.

## Contrato R1 e critérios mensuráveis

Modelo de leitura World: scope/source, members, projects, tasks, activity e estados de conexão. Derivação determinística de distribuição/participantes/progresso por tarefas, sem métricas inventadas. Ações: selecionar estação/sala, abrir tarefa/projeto/canal existente, concluir tarefa através do mesmo store/repository e iniciar Focus existente. Work e World compartilham o snapshot.

Câmera ortográfica isométrica, pan/zoom, seleção e recentralização suave (imediata em reduced-motion). Estações e monitores clicáveis; salas de projetos reais. Alternativa 2D por teclado/toque sem depender de canvas. Uma página espacial até 12 estações e 6 projetos; paginação mantém todos acessíveis. Não gerar centenas de meshes sem limite.

Metas locais a medir: nenhum recurso Three solicitado antes de abrir World; zero overflow em320/390/768/1440; idle sem loop de desenho contínuo; ≤180 draw calls/≤100k triângulos na sala de12 membros; DPR≤1.5 desktop/1 mobile; carregamento e falhas recuperáveis; clique WebGL real abre painel; mutação persiste após recarga e aparece no Work; troca de workspace invalida seleção e dados anteriores. Não extrapolar medições de GPU de software para hardware real.
