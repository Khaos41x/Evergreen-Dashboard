# World R1 — arquitetura e operação

## Limite desta entrega

Fase A registrada e primeira sala da Fase B implementada localmente. Work preservado. Sem deploy, push, migração remota, chamadas de voz ou novas credenciais. A produção Vercel continua na versão anterior. O primeiro responsável e as migrações anteriores do Supabase seguem pendentes conforme DEPLOYMENT.md; World não resolve nem mascara esses bloqueios.

## Fonte única e ações

WorldData é um modelo de leitura derivado, não uma base paralela. localWorldData recebe o store pessoal e marca a identidade como Você · local. cloudWorldData filtra o workspace ativo e usa somente members/records/channels/activity autorizados já carregados. Presença sem sinal atual é Presença não verificada; sessão de Focus isolada não inventa conexão. Arquivados e linhas de outro workspace são excluídos. Progresso exibido = tarefas done / tarefas selecionadas, rotulado como tarefas concluídas, não confundido com progresso ponderado de Objective.

A ação de concluir usa completeTask do store local ou productivityRepository.saveRecord + refresh no modo conectado. O repository conserva controle por version e RLS no backend; o modelo World não amplia privilégios. Abrir tarefa/projeto usa os editores Work existentes; Focus utiliza o fluxo existente. Nenhuma mutação direta do renderer ou escrita colaborativa em localStorage. Preferências/seleção da cena ficam somente em memória. Trocar workspace desmonta World e invalida a seleção anterior; respostas de dados continuam protegidas pelos hooks originais.

Não existe associação normalizada canal→projeto no schema atual. O painel mostra os canais autorizados do workspace e declara essa limitação; não fabrica conversas por sala. Salas são projeções dos projetos reais; participantes derivam das atribuições de suas tarefas. A criação de um projeto ocorre no Work; não existe sala fictícia criada como exemplo na aplicação.

## Módulos

- model.ts: contratos, seleção, progresso e distribuição determinística.
- adapters.ts: snapshot local/compartilhado, sem dependência de Three ou acesso extra ao banco.
- WorldModeSwitch.tsx: alternância acessível, mantendo a página Work anterior.
- WorldPane.tsx: diretório, detalhes, ações, erro/pending, qualidade, paginação e fallback.
- WorldBoundary.tsx: erro de import/render com retorno ao diretório 2D.
- WorldScene.tsx: Canvas R3F, instancing, modelos paramétricos, câmera ortográfica, OrbitControls, projeção de labels e instrumentação de renderer.
- world.css: extensão das superfícies/tipografia Evergreen; responsividade estrutural.

AppShell e Collaboration carregam o seletor leve. WorldPane e WorldScene são imports lazy independentes: o motor Three não é solicitado no Work. TasksPage aceita abertura por ID e filtro de projeto para os caminhos World→Work. FocusHome consome a solicitação de abertura, evitando reabrir um diálogo antigo ao voltar do World.

## Renderização e interação

Three.js + React Three Fiber, sem Drei, HDR, fonte remota, modelo baixado, textura nova ou pós-processamento. OrbitControls nativo da distribuição Three cobre pan/zoom/gesto de pinça, economizando uma dependência ampla. Geometrias box/sphere/cylinder e três materiais compartilhados são descartados no unmount; instancedMesh agrupa arquitetura, piso, mesas, metais, telas, vasos e vegetação. Modelos do escritório são geometria funcional, não uma imagem de demonstração.

Até 12 estações e 6 projetos por página espacial; todas as pessoas/projetos permanecem alcançáveis na paginação e na busca. DPR limitado a1 em modo econômico e1.5 no detalhado; o automático considera viewport, hardwareConcurrency e amostras de frames de interação. Sombras opcionais de uma luz direcional, sem animação ambiental contínua. Câmera interpola seleção/recentralização, respeita reduced-motion, e o render para quando estabiliza. Em document.hidden o frameloop vira never. Voltar ao Work desmonta o canvas. Perda de contexto e falha de import/render dão acesso ao diretório, com tentativa explícita de recuperação.

Os labels da cena são projeções HTML, não conteúdo desenhado que precise de fonte externa. No mobile, somente o label selecionado fica visível para evitar colisões; o diretório mostra todos os nomes. Toda seleção/ação também pode ser feita por controles HTML nativos, teclado e leitores de tela. O painel selecionado sobe à primeira posição do inspector; no desktop o inspector rola dentro da altura da cena, no mobile ele segue o fluxo abaixo da sala.

## Performance: metas e interpretação

Metas R1: zero import3D antes de abrir World; até180 chamadas reportadas pelo renderer e100k triângulos na sala12/6; DPR≤1.5; nenhum frame extra durante intervalo ocioso; sem overflow em320/390/768/1440. O chunk do motor pesa aproximadamente942KB minificado /250KB gzip, lazy. O Vite emite aviso de chunk>500KB: não é ocultado nem tratado como falha. A meta de transferência do motor é≤350KB gzip. A opção2D evita depender dele para trabalhar.

Os counters vêm de WebGLRenderer.info depois de renderizar, não são métricas operacionais inventadas. São contadores do renderer por passe, não um perfil completo de todas as submissões da GPU ou do uso de memória. O navegador de testes usa SwiftShader e não representa uma GPU física. Não há promessa de FPS, consumo de bateria ou memória em celular real sem medições nesses dispositivos.

## Voz e reuniões — arquitetura futura, não implementada

O ponto de integração futuro é um serviço backend join(workspaceId,channelId) que verifica membership e privacidade do canal, emite endpoint/token temporário de uma SFU/WebRTC e registra entrada/saída administrativa. Tokens de provedor não pertencem ao frontend. Compartilhamento de tela deve partir de uma ação explícita e permissão do navegador. Controles de silenciar/remover precisam de autorização de servidor. Sem provedor, token server, permissões, limites de custo e teste real, nenhuma chamada é apresentada como disponível. Avatar persistente, decoração/editoração de salas e vínculo formal sala→canal pertencem à fase posterior.

## Executar e validar

npm ci
npm run dev

Abra http://localhost:5173, entre no modo local ou em uma sessão autorizada e selecione World no topo. Dados locais existentes são preservados; não há equipe de demonstração embutida. Crie tarefas/projetos no Work para vê-los no World. Use Diretório2D se o dispositivo não disponibilizar WebGL2.

npm run build
npm run test:world:model
npm run test:world
npm run test:collaboration-ui
npm run test:local -- http://localhost:5173
npm run test:mobile -- http://localhost:5173

Testes automatizados geram fixtures somente em output/world e contextos descartáveis. Não removem dados do navegador pessoal nem executam chamadas em produção. O script de modelo usa o suporte de remoção de tipos do Node22 com flag experimental; não adiciona um segundo transpiler.

WorldEntry.tsx contém também a falha de import do próprio WorldPane. WorldBoundary aceita fallback leve com Voltar ao Work. A recuperação de import de cena usa Recarregar3D (reload da página, conservando dados persistidos) para evitar reutilizar uma promise lazy rejeitada. Testes cobrem as duas falhas de download separadamente.
