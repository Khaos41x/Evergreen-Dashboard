# Evergreen World R1 — entrega e validação

2026-10-28 · branch local codex/evergreen-world-r1.

## Resultado e escopo

Fase A: diagnóstico técnico em WORLD-R1-AUDIT.md. Fase B: primeira sala isométrica funcional, usando os dados e ações existentes. Fase E aplicada ao recorte R1: testes, responsividade e recuperação de falhas. Fases C/D avançadas não são declaradas concluídas. Não houve novo deploy, push ou alteração do Supabase hospedado. A URL Vercel permanece com a versão anterior.

O seletor Work/World aparece no topo do modo pessoal e do colaborativo. World oferece estações/monitores clicáveis, salas derivadas de projetos reais, detalhes de tarefas/projetos/atividade, conclusão de tarefas pelo mesmo store/repository, abertura dos editores Work, Focus existente, busca/diretório, paginação e acesso aos canais autorizados. Progresso é explicitamente calculado sobre tarefas concluídas, sem inventar métricas ou pessoas conectadas.

Câmera ortográfica com pan/zoom, recentralização, seleção suave e reduced-motion. No celular há toque, diretório, alvos44px e qualidade econômica. Qualidade detalhada habilita sombras e DPR limitado. Cena renderiza sob demanda e suspende em background. Se WebGL2/contexto falhar, o diretório2D permanece funcional. Se o chunk do painel não carregar, o Work continua acessível. Erros de gravação preservam dados e não viram sucesso fictício.

## Dependências e migrações

Adicionadas versões exatas: three0.186.1, @react-three/fiber9.8.2 e @types/three0.186.0 (desenvolvimento). OrbitControls vem da distribuição Three; Drei não foi adicionado. Nenhuma biblioteca de física, pós-processamento ou serviço de chamadas. Nenhum raster/modelo/HDR/font remoto novo.

**Nenhuma migração criada para R1.** São projeções dos modelos existentes. Migrações anteriores de produtividade e acesso interno continuam pendentes remotamente. Nenhuma chave administrativa foi usada ou entregue neste trabalho; arquivos de ambiente reais não entram no pacote.

## Testes executados

| Comando | Resultado | Evidência e limite |
| --- | --- | --- |
| npm run build | PASS | TypeScript + Vite; aviso de chunk3D grande mantido |
| npm run test:world:model | PASS | Escopo, arquivados, presença desconhecida, permissões de ação, progresso derivado, layout e identidade local |
| npm run test:world | PASS | Persistência local e navegação Work/World em320/390/768/1440; raycast real em WebGL software, toque, teclado, pan/zoom, erro de mutação, paginação, troca de escopo, falhas de chunk/contexto, recuperação, reduced-motion e visibilidade |
| npm run test:collaboration-ui | PASS | Seis larguras; em390, alteração World→Work pelo repository com REST simulado; chat/formulários preservados |
| npm run test:local -- http://localhost:5173 | PASS | Tarefas, checklist, objetivos/projetos, Focus timer/stopwatch, pausa, conclusão, busca e persistência |
| npm run test:mobile -- http://localhost:5173 | PASS | Entrada e produtividade local em320/375/390/430/768/1440 |
| npm run test:security | PASS,17 grupos | SQL/RLS em PGlite com schemas Auth/Storage/Realtime de fixture; não serviço hospedado |
| git diff --check | PASS | Sem erro de whitespace |

npm install reportou zero vulnerabilidades no conjunto instalado. Isso não é auditoria formal de segurança.

Os testes não usam dados/senhas do navegador pessoal. As equipes e projetos das capturas são fixtures declaradas, geradas somente por scripts em output/world. O produto não contém seed de colegas ou métricas demonstrativas. Capturas do shell integrado mostram o modo pessoal, sem sincronização, e não um usuário autenticado da holding.

## Desktop versus mobile

Desktop: diorama amplo com inspector lateral rolável; ao selecionar, detalhes aparecem no topo do inspector. Mobile: cena e painel empilhados, detalhes acima do diretório após seleção, labels de cena restritos ao item selecionado para evitar colisões. Todos os nomes continuam acessíveis no diretório. Sete controles de câmera quebram de linha quando necessário em320. Câmera/paginação/fechar medidos em44×44px; Work/World também verificado≥44px. Sem overflow nas larguras exercitadas.

## Medições de performance

Sala de teste:12 estações e6 projetos visíveis, com paginação para os demais.

| Perfil medido | Draw calls reportadas | Triângulos reportados | DPR |
| --- | ---: | ---: | ---: |
| Econômico | 7 | 5.544 | 1 |
| Detalhado | 13 | 10.140 | 1,5 |

Zero frames extras no intervalo ocioso de350ms observado; câmera com animação normal estabilizou e o evento de visibilidade suspendeu o render. O cenário sem WebGL e a perda de contexto foram induzidos pelo teste para verificar a recuperação; não equivalem a falha de driver em hardware real. As métricas são contadores reais de WebGLRenderer.info por passe, não um perfil total de GPU.

O motor é lazy (~250KB gzip, abaixo da meta350KB); não foi solicitado antes de abrir World no teste. O chunk minificado tem~942KB e gera aviso Vite>500KB, explicitamente mantido. Não há meta de FPS/bateria/memória declarada cumprida em celular físico: o teste usa SwiftShader. Validação em Android/iPhone e redes reais permanece necessária.

## Revisão e documentação

Revisão independente considerou a sala coerente com a direção e apontou um P2 de alvos de toque. O verdict pass posterior foi ship **exclusivamente nesse achado**, pontuado resolvido pelas medidas/capturas; não é nova auditoria integral ou conformidade formal. O documenter registrou a extensão OPERATE em WORLD-R1-DESIGN-NOTES.md, preservando DESIGN.md e .impeccable/design.json. O detector automático falhou por motor0.1.5 ausente/cache sem permissão; nenhum resultado automático é alegado.

Falhas materiais encontradas e corrigidas durante os testes: busca do header interceptava o seletor no mobile; uma solicitação antiga reabria Focus ao retornar do World; downloads de chunks precisavam de recuperação sem inutilizar o Work. Resultados finais PASS não substituem a validação remota abaixo.

## Pendências e problemas conhecidos

- Novos fluxos no Supabase hospedado: NOT_VERIFIED. Conta inicial, redirects e migrações anteriores seguem dependentes de acesso administrativo.
- Sincronização simultânea World/Work entre usuários reais ainda precisa de execução contra o serviço; o teste conectado desta entrega usa respostas REST simuladas.
- Não existe vínculo persistente sala→canal; o painel diz Conversas do workspace, sem fingir conversa de projeto.
- Layout espacial determinístico em memória. Editor de salas personalizadas, avatar3D e decoração persistente pertencem à fase posterior.
- Voz, reuniões e compartilhamento de tela não implementados. Dependências de token/backend/SFU e autorização estão documentadas em WORLD-R1-ARCHITECTURE.md; não há chamada simulada.
- Acessibilidade verificada por semântica/teclado/medidas, sem auditoria formal ou ensaio com leitor de tela físico.
- Aviso de depreciação Three.Clock é emitido pela dependência R3F; não provocou pageerror nos fluxos normais de teste.

## Executar localmente

1. npm ci
2. npm run dev
3. Abrir http://localhost:5173.
4. Usar Abrir produtividade local para dados pessoais, ou uma conta autorizada para dados compartilhados.
5. Selecionar World no topo. Criar tarefas/projetos no Work para vê-los no ambiente. Selecionar Diretório2D se necessário.

Não precisa criar conta nem credencial falsa para usar o modo pessoal. Os dados pessoais permanecem separados do workspace compartilhado.

## Próximos passos

Validar primeiro responsável/migrações e fluxo de dois usuários no Supabase. Medir dispositivos físicos e redes representativas. Somente após aceite do R1, avançar para personalização persistente, avatares e comunicação por projeto. Publicação da nova versão depende de autorização específica, conforme o briefing.

## Commits locais

- f83ac0a: preservação do núcleo anterior e diagnóstico/fundação R1.
- dacc577: sala isométrica, fonte única, integração Work e fallback2D.
- Commit final de estabilização/documentação: consultar git log da branch; sem push.

## Arquivos alterados
A lista completa acompanha a entrega em evergreen-world-r1-arquivos.txt. Principais grupos: src/features/world (modelo/adapters, entrada/limites de erro, painel, renderer e CSS), App/AppShell/TasksPage/Collaboration/FocusHome (integração), package.json/package-lock.json (dependências), scripts/world-check.mjs e world-model-check.mjs e extensão do teste de colaboração, além dos documentos WORLD-R1 e README/PRODUCT. Nenhuma migration anterior foi modificada nesta fase.
