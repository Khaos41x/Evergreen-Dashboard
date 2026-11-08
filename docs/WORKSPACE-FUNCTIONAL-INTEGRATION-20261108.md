# Evergreen — integração funcional da direção aprovada

Data: 08/11/2026. Checkout: `C:/Users/sobooa7iqytvqheo/Documents/Codex/Evergreen-Dashboard`.
Incremento local sobre a base existente, sem recriar o aplicativo. O checkout já continha mudanças de trabalhos anteriores, que foram preservadas. Sem commit, push, migração, deploy ou atualização distribuída ao Android nesta etapa.

## Pedido preservado

- Manter a composição da barra vertical de empresas da produção.
- Manter a saudação, a árvore geométrica e o cronômetro circular grande. Removidas as regras da proposta anterior que compactavam esse bloco e tornavam os botões da barra transparentes.
- Manter a composição de “Empresas e atuação”; nenhum componente do perfil foi redesenhado neste incremento.

## Auditoria e alterações

| Evidência no código anterior | Consequência | Alteração |
| --- | --- | --- |
| Prioridade, próxima ação e títulos de tarefas chamavam apenas openTasks | A pessoa perdia o item escolhido ao chegar à lista | Cada item abre seu registro no TaskEditor existente. O pai verifica ID, tipo e empresa antes de abrir. |
| A caixa de conclusão em Meu dia era um span | Parecia um controle, mas não executava uma ação | Botão acessível envia a mudança de status pelo repositório existente, aguarda atualização dos dados e mostra erro em caso de falha. |
| requestCreate permanecia positivo ao desmontar Tarefas | Voltar à lista podia reabrir o formulário novo | O pedido é consumido após abrir o editor. |
| Nome da empresa ocultado pela regra mobile de world.css | O contexto desaparecia quando a navegação lateral fechava | Nome visível no cabeçalho mobile, inclusive com nomes longos. |
| Troca no seletor podia manter a tela anterior do grupo | Empresa nova com destino ou pedido anterior | Empresa operacional abre Hoje, fecha o menu e limpa os pedidos de tarefa/foco e o perfil externo ao trocar workspace. |
| FocusHome não tinha chave por empresa | Estado visual de diálogo podia sobreviver à mudança de contexto | Instância por workspace; dados, timestamps e ações continuam no serviço de foco existente. |
| Colunas legadas da lista Meu dia cortavam o controle final | Conteúdo e alvos inconsistentes em larguras intermediárias | Três colunas: concluir, título e detalhes; botões de 44px e texto que pode quebrar. |

A edição e a conclusão usam `productivityRepository.saveRecord`, com controle de versão existente. Foco usa `eg_focus_action` e timestamps devolvidos pelo servidor. Nenhum conjunto de dados de exemplo foi inserido no aplicativo ou no banco. Os dados sintéticos ficam nos scripts de teste.

## Arquivos desta etapa

- `src/App.tsx`: abertura e conclusão de tarefa no modo pessoal, usando os métodos existentes.
- `src/pages/HomePage.tsx`: ações específicas por tarefa, conclusão acessível e bloqueio durante gravação.
- `src/features/productivity/FocusHome.tsx`: integração das ações com o repositório compartilhado.
- `src/features/productivity/TasksModule.tsx`: consumo do pedido de criação.
- `src/collaboration/Collaboration.tsx`: editor específico, foco a partir de tarefa e limpeza de contexto.
- `src/collaboration/workspace-product.css`: preservação da barra/bloco de foco, contexto mobile e linha de tarefa.
- `scripts/collaboration-ui-check.mjs`: modo de fluxo com duas empresas; navegação aguarda DOM e elementos, sem depender de networkidle durante Realtime.
- `scripts/workspace-workflow-check.mjs`: testes do fluxo completo nos componentes reais com respostas HTTP controladas.
- Este relatório.

## Verificação

| Verificação | Resultado | Limite |
| --- | --- | --- |
| Fluxo compartilhado, Evergreen, 320/390/835/1440px | PASS | Respostas de API controladas em memória |
| Mesmo fluxo, Atlas, 390/1440px | PASS | Respostas de API controladas em memória |
| Criar, reler, editar, buscar, abrir pela Home e concluir tarefa | PASS | Verifica chamadas e renderização; não é escrita no Supabase real |
| Falha temporária ao salvar e nova tentativa | PASS | Falha HTTP 503 injetada; conteúdo preservado e um registro criado na tentativa bem-sucedida |
| Iniciar foco por uma tarefa, pausar, retomar e remontar a aplicação | PASS | Timestamps persistidos no serviço duplo; não é execução em celular físico |
| Alternar duas empresas: tarefas, foco e canais | PASS | Isolamento da interface e parâmetros; não comprova RLS |
| Enviar mensagens em canais separados | PASS | Não comprova entrega Realtime entre pessoas reais |
| Atlas: teclado, toque, menções, cores forçadas e perfil preservado | PASS, 390/1440px | Inspeção automatizada em Edge |
| Finanças: seis abas, período, moeda, valores exatos, reautenticação e repetição idempotente | PASS, 320/390/478/1440px | API controlada e autenticação simulada exclusivamente no teste |
| Regressão do modo pessoal | PASS | CRUD, checklist, objetivos, projetos, timer, backup e dados corrompidos preservados; seis larguras de 320 a 1440px |
| Build web | PASS | TypeScript, Vite e geração/verificação local do pacote OTA; sem distribuição |
| Servidor real local, rota / e configuração pública de login | PASS | HTTP 200, login renderizado, sem erro de execução ou overflow em 390px |
| Sessão anônima no servidor real local | HTTP 401 esperado | Rotas privadas não foram testadas com conta autenticada nesta etapa |
| Supabase real: persistência, permissões e duas contas | NOT_VERIFIED | Não foi usado login real nem sessão administrativa |
| Android físico, push e atualização instalada | NOT_VERIFIED | Sem aparelho conectado |
| Publicação | NÃO EXECUTADA | Requer aprovação específica da versão a publicar |

Build mantém avisos sobre o tamanho do chunk 3D e imports mistos do Capacitor. Não são erros de compilação e não foram tratados como prova de desempenho em aparelho.

## Evidências

Capturas são dos componentes reais com dados de teste identificados (“UI fixture workspace” e “Fixture Alice”).

- [Hoje Evergreen, largura 835px](../output/playwright/workflow-final-835.png)
- [Hoje Atlas, celular](../output/playwright/workflow-final-atlas-390.png)
- [Hoje Atlas, desktop](../output/playwright/workflow-final-atlas-1440.png)
- [Resultados do fluxo Evergreen](../output/workspace-workflow-results.json)
- [Resultados do fluxo Atlas](../output/workspace-workflow-atlas-results.json)
- [Resultados de Finanças](../output/platform/finance-results.json)
- [Resultados da inspeção Atlas](../output/collaboration-ui-focused-results.json)
- [Resultados mobile do modo pessoal](../output/mobile-results.json)
- [Preservação de dados locais](../output/local-preservation-results.json)

Os arquivos de output são gerados e podem ser ignorados pelo Git.

## Como reproduzir

No PowerShell, a partir do checkout:

```powershell
$env:COLLAB_WORKFLOW='1'
$env:COLLAB_WIDTHS='320,390,835,1440'
node scripts/collaboration-ui-check.mjs
$env:COLLAB_ATLAS='1'
$env:COLLAB_WIDTHS='390,1440'
node scripts/collaboration-ui-check.mjs
Remove-Item Env:COLLAB_WORKFLOW
node scripts/collaboration-ui-check.mjs
Remove-Item Env:COLLAB_ATLAS
Remove-Item Env:COLLAB_WIDTHS
$env:EG_PLATFORM_FOCUS='finance'
$env:EG_PLATFORM_THEME='atlas'
node scripts/platform-browser-check.mjs
Remove-Item Env:EG_PLATFORM_FOCUS
Remove-Item Env:EG_PLATFORM_THEME
npm run test:local:regression
npm run build
```

Homologação pendente: autenticar contas autorizadas no ambiente acordado, criar tarefa de QA, recarregar e reler, confirmar separação entre empresas e repetir mensagens em duas sessões reais. Confirmar também o comportamento no Android físico antes de declarar a atualização do app concluída.
