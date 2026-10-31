# Evergreen — direção atual do produto

Atualização: 30/10/2026. Este registro prevalece sobre descrições históricas de cadastro exclusivamente por convite e interface em inglês.

O Evergreen é o espaço de produtividade e colaboração de um pequeno grupo e das empresas da holding. Não é um SaaS para venda. A interface deve ser clara, rápida, em português do Brasil, preservando o visual escuro/esmeralda existente.

## Conta e dados

Cadastro comum por nome, e-mail e senha no Supabase Auth, sem convite. Cargo é opcional e nunca concede permissões. Confirmar o e-mail antes de criar um espaço. Uma conta nova começa sem acesso às empresas existentes: pode criar seu próprio espaço isolado ou aceitar acesso compartilhado por uma equipe. Convites são uma possibilidade de associação, não um requisito de cadastro.

O nome, cargo e foto vêm do perfil real. Sessões usam o backend de mesma origem e cookies HttpOnly; não há senhas ou tokens de autenticação guardados pelo frontend. Supabase é a fonte dos dados compartilhados. O modo pessoal local é opcional, explicitamente sem sincronização ou acesso corporativo.

## Operação

- Tarefas: lista principal, quadro alternativo, prioridades, responsáveis, prazos, checklist, comentários, anexos, sugestões e transferência com contexto.
- Comunicação: canais, mensagens diretas privadas, respostas em conversas, menções, reações, busca e integração com tarefas/ocorrências.
- Foco: temporizador ou cronômetro, pausas, resultado da sessão e histórico. Sala de foco compartilha presença e sessões, sem áudio ou vídeo.
- Objetivos: áreas, metas e pesos calculados com critérios reais; sem progresso inventado a partir de horas.
- Trabalho: histórico e mapa de atividades reais. Busca e atalhos executam ações; “Como usar” orienta os primeiros passos.
- Visão: projeção 3D opcional dos mesmos dados, com diretório 2D e um único cofre para Finanças.
- Finanças: sistema 2D em /economy, com livro exato e consolidado sem duplicar transferências internas.
- Fundadores: centro estratégico em /founders com capacidades explícitas por empresa, decisões, comunicação e documentos privados. O papel não concede acesso financeiro automático.

Os nomes visíveis podem ser portugueses; rotas, IDs, estados de banco e dados digitados pelas pessoas permanecem compatíveis. As referências a Slack, Discord, Linear, Todoist e GitHub descrevem padrões úteis, sem clonar produtos nem gerar equipe, atividade ou presença fictícia.

## Identidade visual e entrega

Usar a nova imagem fornecida Logotipo Evergreen Holdings.png, preservada em public/evergreen-holdings-logo.png. A marca tem fundo transparente; filtro CSS claro permite leitura sobre a superfície escura. Na autenticação, a logo maior fica centralizada acima do formulário, sem título promocional. Nenhuma recoloração ou edição dos bytes.

DESIGN.md e .impeccable/design.json permanecem como sistema incumbente. As extensões são documentadas separadamente. Dados de teste ficam apenas nos scripts de validação.

A ativação do banco foi autorizada e concluída no projeto dedicado: produtividade e pacote de identidade/Finanças/Fundadores/cadastro comum,38tabelas comRLS. A restrição de convite obrigatório foi retirada da sequência ativa. Não houve novo deploy nem E2E com provedores ou dispositivos reais; veja docs/ACTIVATION-20261030.md.

## Diretrizes aprovadas para navegação e perfis — 30/10/2026

O usuário pediu explicitamente a árvore isolada fornecida em public/evergreen-symbol.png, branca por CSS, nas superfícies internas. Autenticação preserva a marca completa. Navegação de empresas e mensagens segue padrões de Slack/Discord nas cores Evergreen; canais e mensagens diretas têm prioridade. Títulos usam Libre Caslon Display servida localmente, próxima à marca serifada; corpo e controles permanecem sans-serif. Esta mudança autoriza atualizar os tokens e a documentação visual nesses pontos, preservando as demais funções.

Perfis têm foto, apresentação, cargo e vínculos por empresa. Davy Peixoto fundou a Orkto e é sócio da ThinkerChess; Miguel Mármore é seu fundador. A definição OS V2 substitui a regra anterior de fundadores ilimitados: existem exatamente três assentos permanentes Chairman/E0, de igual autoridade-base, com designação confirmada e aceite pessoal. Davy, Miguel Mármore e Gabriel são as referências informadas; nomes não ativam assentos. Grupo usa níveis E0–E6; empresas usam A0–A6. APEX identifica A0. Cargo profissional, nível técnico, participação e escopos são independentes. Atribuições são verificadas no servidor, sem inferir acesso financeiro ou capacidades de títulos/metadados. Miguel e Gabriel aguardam convite/aceite e confirmação de suas contas; nomes não criam identidades. Migração, preparação empresarial e publicação desta etapa foram aprovadas explicitamente pelo usuário em 30/10/2026; migração e preparação já aplicadas no projeto dedicado.


## Arquitetura vigente — Evergreen OS V2

Platform é a infraestrutura de identidade; Evergreen Group é uma organização interna própria; empresas novas são independentes por padrão. Vínculos e salas entre empresas exigem aprovações bilaterais. O grupo tem workspace geral separado da comunicação reservada dos fundadores. Após três aceites pessoais e ativação, decisões ordinárias usam dois dos três votos por padrão, e mudanças de assento ou regras estruturais exigem unanimidade. Alterações críticas de acesso ao grupo seguem deliberação sem conflito. Nomes de níveis são personalizáveis sem alterar códigos.

O pacote OS V2 `57c94c4` foi aplicado e publicado com aprovação explícita em 31/10/2026. Evidência remota e limites: docs/ACTIVATION-OS-V2-20261031.md; relatório local original: docs/EVERGREEN-OS-V2-REPORT-20261030.md. O conselho ainda aguarda três aceites pessoais e ativação. A árvore do início usa geometria XYZ derivada da referência 2D, com profundidade reconstruída; não é o modelo 3D original. O reconhecimento de fechamento do resumo de foco é apenas uma preferência visual de sessão, sem armazenar autenticação no navegador.

## Biblioteca dos fundadores — pedido de 31/10/2026

O escritório compartilhado da Visão passa a ser uma biblioteca exclusiva dos titulares dos três assentos, com três mesas executivas fixas, presença real e um cofre maior no canto superior esquerdo. Contas pendentes permanecem vagas; nomes não atribuem assentos. O acesso é verificado no servidor e não concede acesso financeiro automático. O diretório 2D e o modo pessoal existente são preservados. Este incremento está implementado e validado localmente, com ativação em produção ainda pendente: docs/FOUNDERS-LIBRARY-20261031.md.
