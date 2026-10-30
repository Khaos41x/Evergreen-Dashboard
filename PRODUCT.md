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
