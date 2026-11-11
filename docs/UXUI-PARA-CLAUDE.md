# Evergreen Holdings — descrição de UX/UI para revisão no Claude

Quero que você avalie a experiência e a interface do Evergreen Holdings. A descrição abaixo representa o aplicativo existente e as telas observadas em 11/11/2026. O produto é usado no navegador e tem uma versão móvel baseada na mesma aplicação.

**Produto e uso**

O Evergreen reúne empresas e pessoas em um ambiente de trabalho. Uma pessoa pode participar de várias empresas, com cargos e permissões próprios em cada contexto. As áreas principais são comunicação, tarefas, projetos, documentos, foco, finanças e governança.

Há um grupo Evergreen e empresas associadas, como Orkto e ThinkerChess. A interface precisa ajudar a pessoa a entender em qual empresa está trabalhando e qual é o alcance de cada ação. Cargo exibido, participação societária e permissão operacional são conceitos independentes. A empresa selecionada orienta os dados dos módulos.

**Direção visual observada**

O tema ativo nas capturas se chama Atlas. Usa fundo preto, superfícies em cinza muito escuro, texto principal próximo do branco e texto secundário cinza. O destaque de seleção é azul muito claro. Bordas finas e discretas separam áreas. Os cantos são moderadamente arredondados.

A família principal do tema Atlas é Geist Variable, com alternativas de sistema. Os títulos têm peso e tamanho superiores ao corpo. A seção profissional de empresas e atuação tem tratamento tipográfico próprio, com Libre Caslon Display. Ícones são de contorno, da biblioteca Lucide. A marca interna usa o símbolo branco da árvore Evergreen. Empresas e pessoas podem aparecer por imagem ou iniciais.

O aplicativo também tem outros temas. As capturas anteriores mostraram cores verdes fixas na tela de níveis dos Fundadores. A correção local substitui essas cores pelos tokens do tema Atlas.

**Estrutura de navegação**

No desktop, o ambiente de trabalho tem três regiões.

- Um trilho vertical estreito à esquerda reúne a marca Evergreen, o diretório de organizações, atalhos das empresas, adição de espaço e acessos pessoais ou de fundadores quando autorizados.
- Uma barra lateral contextual reúne a empresa, busca, canais, conversas e módulos de trabalho.
- O painel principal exibe cabeçalho e conteúdo da área atual.

O cabeçalho mostra a empresa ou o grupo ativo. Há alternância entre Trabalho e Visão. Trabalho é o conjunto de ferramentas operacionais. Visão é a representação espacial opcional do ambiente. O cabeçalho também reúne busca, Finanças, Fundadores quando autorizado, notificações, ajustes e perfil.

Em larguras intermediárias, a barra contextual vira um menu lateral que pode ser aberto. No código atual, os pontos de mudança principais ficam próximos de 1000 e 600 CSS px. Em telas pequenas, o trilho é ocultado e aparece navegação inferior. Os fluxos precisam continuar utilizáveis com o teclado virtual e em janelas de pouca altura.

**Diretório de organizações e início**

A rota /hub é a entrada do ambiente de trabalho. O diretório apresenta organizações e empresas acessíveis, com ações para entrar e abrir os recursos autorizados. Dentro de uma empresa, o início reúne tarefas do dia, prioridade, foco, objetivos e atividade.

A navegação deve preservar a orientação da pessoa ao alternar empresa, voltar do diretório ou sair de uma tela de governança. Um problema reportado foi aparecer uma grande área preta ao rolar no Hub.

**Comunicação e trabalho**

A área de comunicação tem diretório de canais e mensagens diretas, busca, indicação de canal privado e criação de conversa. Uma conversa reúne histórico, compositor de mensagem e ações contextuais. Há integrações com tarefas e ocorrências.

Tarefas e projetos têm listas e formas alternativas de organização, com responsáveis, estado, prioridade, prazos e detalhes. Foco tem temporizador, pausas e registro da sessão. Objetivos e histórico de trabalho completam a área operacional. Arquivos pertencem ao contexto da empresa e usam controles de consulta, envio e download.

Essas superfícies exigem estados claros de carregamento, ausência de dados, erro e resultado de uma ação.

**Tela de Finanças**

A rota /economy fica dentro do ambiente da empresa. Nas capturas, o topo mostra Finanças, uma descrição curta e Atualizar. Depois há um resumo com empresa ativa, período e tratamento de moedas.

As abas são Visão Geral, Empresas, Cofres, Movimentações, Relatórios e Planejamento. Abaixo aparecem o seletor de período e moeda, a indicação de acesso por empresa e ações como Preparar transferência e Compromissos e aprovações.

A visão geral usa painéis para saldo consolidado e receitas e despesas. A página também tem movimentos recentes e conteúdo adicional abaixo da primeira tela. Quando faltam contas ou movimentos, apresenta orientação de início e explica a ausência de registros. Transferências têm revisão antes da confirmação.

Há um problema de rolagem reportado em uma janela de aproximadamente 734×715 CSS px. O usuário também pediu uma folga abaixo do último conteúdo. Os pontos a avaliar são a região que recebe a rolagem, o espaço ocupado pelos controles superiores e o acesso aos dados na parte inferior.

**Tela de Fundadores**

A rota /founders é uma tela própria de governança, com retorno à Visão. Há seleção de grupo, empresa, período e filtros aplicáveis. As áreas incluem visão geral, empresas, finanças autorizadas, pessoas, projetos, inteligência, decisões, comunicação e governança.

Em Governança aparecem ações de vínculo empresarial, concessão de acesso, definição de escopo e registros de auditoria. A seção de níveis explica Chairman, APEX, NÍVELO e Liderança e equipe. Chairman representa fundadores originais, APEX identifica fundadores de empresas e NÍVELO identifica CEOs no vocabulário do produto.

A tela distingue pessoas confirmadas de indicações ou convites pendentes. Vínculos e capacidades dependem da validação do servidor.

Nas capturas anteriores, os níveis apareciam sobre fundo verde, destoando do tema Atlas. O usuário também marcou um elemento claro na área de Governança. A correção preparada usa as superfícies escuras do tema e limita a rolagem à página. Os testes locais incluem a rolagem e as cores dos níveis. A origem exata do elemento claro marcado na captura publicada ainda depende da inspeção daquela sessão.

**Critérios para sua revisão**

Avalie a hierarquia, a densidade, a previsibilidade da navegação, a legibilidade e a consistência entre módulos. Verifique o uso de espaço no desktop, no celular e em janelas de pouca altura.

Considere como tarefas representativas trocar de empresa, localizar uma conversa, enviar uma mensagem, criar uma tarefa, encontrar um arquivo, consultar movimentos e abrir uma decisão.

Use os princípios de Apple HIG, Slack Design, Linear, Atlassian e Carbon como referências de comportamento. Considere WCAG 2.2 AA para acessibilidade. A pesquisa associada está em docs/CRITERIOS-UX-REFERENCIAS-20261110.md.

Preserve a identidade reconhecível do Evergreen, a árvore fornecida e a organização profissional de empresas e atuação. Proponha prioridades com a ordem de impacto na conclusão das tarefas. Identifique quais observações vêm diretamente das capturas e quais são hipóteses que precisam de teste. Para cada sugestão, descreva o problema, a mudança proposta e uma maneira concreta de validar o resultado.

**Estado da verificação desta revisão**

A compilação TypeScript e o build Vite passaram. A suíte de componentes React com respostas HTTP de teste passou em 390, 734 e 1440 px. O teste de 734 px usa altura de 715 px. Foram verificados rolagem com roda, folga inferior de 64 px em Finanças, limite do documento, tema neutro nos níveis e retorno de Fundadores para o Hub. A inspeção autenticada da sessão publicada está pendente porque o controle local do navegador está desativado.