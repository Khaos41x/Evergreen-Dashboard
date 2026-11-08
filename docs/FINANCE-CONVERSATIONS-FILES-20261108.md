# Evergreen — Finanças do protótipo, Conversas e Arquivos

08/11/2026. Implementação local no checkout existente Evergreen-Dashboard. Preservadas a barra vertical de empresas, a composição de Hoje com árvore e cronômetro e a seção Empresas e atuação. Não houve migração, push, deploy ou distribuição de APK nesta etapa.

## O que faltava e o que foi integrado

| Área | Antes | Agora |
| --- | --- | --- |
| Finanças | O módulo anterior abria fora da navegação do app e não mostrava lançamentos recentes na visão geral | A rota /economy mantém a navegação da empresa. Empresa, período e moeda ficam junto dos saldos; a visão geral traz saldo atual, receitas/despesas do período e lançamentos recentes. |
| Transferência | O formulário chamava a ação sem uma etapa própria de conferência | Origem, destino, moeda, valor, descrição e data são apresentados antes da confirmação. A ação existente conserva idempotência, exigência de reautenticação e permissões do backend. |
| Conversas | O destino principal abria diretamente o canal selecionado | Diretório com busca, lista de canais, mensagens diretas, estados vazios e criação real de canal para administradores. Cada linha abre o Chat existente. A referência Slack foi adaptada à identidade Evergreen. |
| Arquivos | Anexos acessíveis apenas dentro de cada canal/tarefa | Destino Arquivos na empresa, com índice de anexos acessíveis, busca, filtro de origem, envio vinculado a um recurso, download e exclusão dos próprios arquivos. |

Não foram adicionados círculos de voz/vídeo, anúncios de upgrade ou pessoas fictícias. A solicitação das imagens foi aplicada à organização da lista de canais e ao acesso a Arquivos.

## Dados e permissões

- O frontend segue usando o cliente existente, que encaminha as chamadas ao backend de mesma origem com a sessão em cookie HttpOnly.
- Finanças mantém eg_economy_snapshot, eg_economy_history e as ações financeiras existentes. Valores continuam inteiros em centavos; moedas diferentes permanecem separadas. As duas pontas de uma transferência interna se anulam no saldo consolidado.
- A visão geral pede apenas o snapshot e a primeira página de lançamentos. Outros módulos permanecem sob demanda.
- O consolidado do grupo continua usando a análise e os escopos existentes, sem substituir acesso estratégico por acesso operacional.
- Arquivos usa o bucket privado eg-files e os caminhos existentes channel/workspace/recurso/autor/arquivo ou record/workspace/recurso/autor/arquivo. Não cria pastas públicas nem concede novas permissões.
- O índice restringe recursos aos canais e registros devolvidos para a empresa atual. Storage RLS continua sendo a autorização efetiva em cada leitura e gravação.
- O envio compartilha a mesma validação usada nos anexos existentes: formatos permitidos e limite do app de 4 MB. Download privado passa pelo backend autenticado. Exclusão exige confirmação e continua sujeita à autorização do Storage.
- A listagem usa até quatro tarefas paralelas, cem consultas, cem itens por pasta e quinhentos arquivos. Se atingir um limite, apresenta aviso de listagem parcial e orienta abrir o recurso original.
- Componentes são remontados por empresa e leituras de Arquivos descartam respostas após desmontagem. A troca de empresa dentro de Finanças mantém /economy e fecha o menu mobile.

Referência técnica consultada: [Supabase Storage — list](https://supabase.com/docs/reference/javascript/storage-from-list). A separação entre pastas virtuais e arquivos considera o campo id, conforme o contrato documentado. As políticas existentes foram lidas nas migrações locais; isso não é auditoria do banco hospedado.

## Arquivos alterados neste incremento

- src/collaboration/ConversationDirectory.tsx — novo diretório e criação de canal.
- src/collaboration/WorkspaceNavigation.tsx — destinos Conversas, Finanças e Arquivos.
- src/collaboration/Collaboration.tsx — integração na navegação, contexto e componentes reais.
- src/collaboration/workspace-product.css — diretórios e responsividade.
- src/features/productivity/CompanyFiles.tsx — área de Arquivos da empresa.
- src/features/productivity/attachmentStorage.ts — upload compartilhado e índice limitado.
- src/features/productivity/Attachments.tsx — reutilização da validação/envio.
- src/features/economy/Economy.tsx — visão geral aprovada, contexto, lançamentos e confirmação.
- src/features/economy/economy.css — composição financeira e adaptação mobile.
- scripts/company-surfaces-check.mjs — novo teste integrado das três áreas.
- scripts/collaboration-ui-check.mjs — rotas de teste, navegação e APIs controladas.
- scripts/platform-browser-check.mjs — testes de histórico na visão geral e conferência antes da reautenticação.
- Este relatório.

As demais mudanças que já estavam no checkout foram preservadas.

## Testes automatizados desta etapa

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Conversas e Arquivos; Finanças dentro do app; duas empresas | PASS no tema Evergreen em 390/835/1440px; PASS no Atlas em 320/390/835/1440px | output/company-surfaces-results.json contém a última execução Atlas |
| Canal privado criado, aberto e usado para enviar mensagem | PASS | Componentes reais com respostas HTTP em memória |
| Busca de canais e abas por teclado | PASS | Direções e foco das abas verificados |
| Arquivos: listar, bloquear formato inválido, enviar, baixar conteúdo, abrir canal de origem e excluir | PASS | Conteúdo do download comparado com o enviado ao serviço duplo |
| Arquivos: acesso negado, nova tentativa e troca de empresa | PASS | Falhas HTTP 403 injetadas; nomes e anexos da empresa anterior não permanecem na nova |
| Finanças: resumo e histórico da empresa atual, valor exato e confirmação antes de gravar | PASS | Nenhuma ação financeira antes da confirmação; payload de 125,40 convertido em 12540 centavos |
| Finanças: mudança de empresa e revogação de acesso | PASS | /economy preservado; saldo anterior removido na resposta de acesso restrito |
| Finanças: seis módulos, filtros, reautenticação e repetição com mesmo ID | PASS em 320/390/478/1440px | output/platform/finance-results.json |
| Regressão de Hoje, tarefas, gravação com erro, foco e mensagens entre empresas | PASS em 390/1440px | output/workspace-workflow-evergreen-results.json |
| Atlas: menções, toque, teclado, cores forçadas e perfil | PASS em 390/1440px | output/collaboration-ui-focused-results.json |
| Build final | PASS | npm run build: TypeScript + Vite + geração/verificação local do pacote OTA |
| Publicação e APK instalado | NÃO EXECUTADOS | O pacote gerado não foi distribuído |

Os avisos anteriores de tamanho do chunk 3D e imports mistos do Capacitor permanecem. Não foram tratados como erro de build ou prova de desempenho em aparelho físico.

### Reprodução em PowerShell

```powershell
$env:COLLAB_SURFACES='1'
$env:COLLAB_ATLAS='1'
$env:COLLAB_WIDTHS='320,390,835,1440'
node scripts/collaboration-ui-check.mjs
Remove-Item Env:COLLAB_SURFACES
Remove-Item Env:COLLAB_ATLAS
$env:COLLAB_WORKFLOW='1'
$env:COLLAB_WIDTHS='390,1440'
node scripts/collaboration-ui-check.mjs
Remove-Item Env:COLLAB_WORKFLOW
$env:COLLAB_ATLAS='1'
node scripts/collaboration-ui-check.mjs
Remove-Item Env:COLLAB_ATLAS
Remove-Item Env:COLLAB_WIDTHS
$env:EG_PLATFORM_FOCUS='finance'
$env:EG_PLATFORM_THEME='atlas'
node scripts/platform-browser-check.mjs
Remove-Item Env:EG_PLATFORM_FOCUS
Remove-Item Env:EG_PLATFORM_THEME
npm run build
```

## Conferência na sessão real do usuário

Foi possível operar a aba existente em localhost com a sessão já autenticada, sem extrair credenciais.

- Orkto: diretório mostrou o canal real # geral.
- Orkto: Arquivos concluiu a consulta sem erro e mostrou zero arquivos disponíveis nessa resposta.
- Orkto e ThinkerChess: Finanças abriu e concluiu a consulta sem erro. O retorno não trouxe empresas/contas financeiras acessíveis; a tela mostrou o estado vazio e a ação de cadastro, sem inventar saldo.
- Trocar Orkto por ThinkerChess manteve /economy e atualizou o nome da empresa.
- Ao terminar, a aba ficou em Finanças da Orkto.

Essa conferência foi de navegação e leitura. Não foram criados canais, enviados arquivos ou registrados lançamentos na conta real. As escritas e os cenários de acesso negado foram testados exclusivamente nos serviços duplos.

**Ainda não verificado:** gravação e download com dados reais do Storage, operação financeira hospedada após reautenticação, comunicação com duas contas reais, isolamento RLS adversarial e Android físico. Lista vazia, inspeção de migrações e testes HTTP controlados não comprovam esses fluxos.

## Capturas

As capturas abaixo usam componentes reais e dados sintéticos, identificados por Fixture/QA. Não representam o patrimônio do usuário.

- [Finanças integrada — desktop](../output/playwright/finance-integrated-1440.png)
- [Finanças integrada — celular](../output/playwright/finance-integrated-390.png)
- [Diretório de conversas](../output/playwright/conversations-directory-1440.png)
- [Conversas no celular](../output/playwright/conversations-directory-390.png)
- [Arquivos da empresa](../output/playwright/company-files-390.png)

Os outputs são artefatos gerados e podem estar ignorados pelo Git.
