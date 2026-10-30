# Navegação, perfis e níveis — 30/10/2026

Estado: implementação validada localmente, migração e preparação empresarial aplicadas no Supabase Evergreen e versão publicada na Vercel após autorização explícita em 30/10/2026. Verificações públicas reais concluídas; verificação autenticada de produção ainda não executada. Veja `ACTIVATION-WORKSPACE-PROFILES-20261030.md`.

## Experiência

- Árvore enviada pelo usuário em `public/evergreen-symbol.png`, original RGBA 1254×1254, sem redesenho. Branco por CSS; transparência preservada.
- Barra de empresas, navegação contextual, canais, favoritos pessoais e mensagens diretas. Um seletor de empresas; nenhum workspace privado de Fundadores é apresentado como empresa.
- Desktop: barra de 64px e navegação de 240px. Tablet até 1000px: barra e menu acessível. Celular até 600px: menu e navegação inferior.
- Mensagens com separadores de data, autor que abre perfil, busca, respostas, anexos, reações e edição/exclusão existentes. Ações adicionais agrupadas. Código e emojis inserem texto no composer; não há ferramentas de formatação falsas.
- Perfil profissional com foto, apresentação, cargo e vínculos visíveis por empresa. Foto é gerida na configuração já existente, em bucket privado, com URL assinada.
- Modo pessoal preservado em Configurações, explicado como armazenamento apenas no navegador, sem sincronização; backup/importação existentes preservados.
- Títulos serifados em Libre Caslon Display, servida localmente com licença SIL OFL incluída; corpo e controles em sans-serif.

## Hierarquia e permissões

| Nível | Significado | Quem confirma |
| --- | --- | --- |
| Chairman | Fundador original da Evergreen | Responsável pela holding, com autenticação recente |
| APEX | Fundador de uma empresa | Administrador daquela empresa |
| NÍVELO | CEO de uma empresa | Administrador daquela empresa |
| Liderança / equipe | Demais atuações profissionais | Administrador daquela empresa |

Sócio é um vínculo específico, separado de fundador e CEO. Um perfil pode ter diferentes vínculos em empresas distintas. Os níveis descrevem responsabilidade; acesso a dados, finanças, empresas e governança depende das capacidades e escopos explícitos já existentes no servidor. O título de perfil e metadados de cadastro não concedem privilégios.

Em **Fundadores → Governança → Níveis da Evergreen**, o responsável pode indicar nomes. A indicação não cria conta, não é um convite de acesso e não concede permissões. Depois do convite para uma empresa, aceite com e-mail confirmado e concessão do papel de fundador, o responsável pode confirmar a conta como Chairman. A confirmação exige reautenticação recente e gera auditoria. Não há correspondência automática por nome.

Para Miguel: convide-o para a ThinkerChess; após o aceite, abra seu perfil em Membros e defina o vínculo **Fundador**, exibido como APEX. Em Fundadores → Governança, conceda o acesso estratégico e os escopos desejados; depois confirme sua conta como fundador original/Chairman, escolhendo a indicação Miguel Mármore. Gabriel segue o mesmo aceite e confirmação, na empresa escolhida pelo responsável. Nenhuma dessas identidades é vinculada apenas pelo texto do nome.

## Banco e segurança

Migração: `supabase/migrations/20261030200108_professional_profiles.sql`.

Novas tabelas `eg_professional_roles`, `eg_original_founders` e `eg_founder_nominees` têm RLS e privilégios mínimos. Clientes não escrevem diretamente. RPCs verificam sessão ativa, empresa, administração ou proprietário da holding, conforme a operação. Funções privilegiadas têm `search_path` vazio, nomes de relações qualificados e execução revogada de PUBLIC/anon. Nenhum campo privado de nome real, e-mail ou preferências entra na projeção do perfil profissional.

O perfil de outra pessoa só é retornado quando ela e o visitante participam da empresa informada. A lista de vínculos inclui apenas empresas em que o visitante é membro. Nomes pendentes são visíveis somente ao responsável pela holding.

Base consultada: [RLS e grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [funções e privilégios](https://supabase.com/docs/guides/database/functions). A implementação mantém as verificações de sessão e permissões do projeto.

## Preparação dos dados reais

`supabase/bootstrap-company-identities.sql` é uma operação administrativa separada, para o projeto Evergreen `dlxsakabwtpdimolsmgd`. Identifica a conta confirmada de `peixotodavy831@gmail.com` e a holding que ela administra; não usa IDs de pessoas inventados.

- Preserva a Orkto vinculada e marca Davy como seu fundador.
- Cria ThinkerChess e seu canal geral somente se ainda não existir; um homônimo fora da holding interrompe a operação para revisão.
- Davy fica como sócio da ThinkerChess no perfil e como responsável administrativo pelo workspace criado. Responsável de acesso não significa fundador da empresa.
- Confirma Davy como fundador original da Evergreen; indica Miguel Mármore e Gabriel como pendentes de conta confirmada e atribuição explícita.
- Não cria usuário Auth, não envia mensagens nem convites por e-mail, não define senha, não atribui acesso a Miguel/Gabriel por nome.

## Proxy e limite de verificação

A consulta do SDK usa `target`, separada do parâmetro de rota `apiRoute` da Vercel. Isso elimina a colisão possível entre o antigo query `path` e a captura de rota `:path*`. A compatibilidade com chamadas antigas foi preservada. A lista de destinos Supabase permitidos, validação de origem, sessão e reautenticação continuam ativas.

O erro de produção da captura não foi reproduzido com a sessão pessoal do usuário. Logs recentes não retornaram entradas de erro; isso não prova ausência de falhas. A correção foi testada com destino válido acompanhado de um parâmetro de rota conflitante em fixture local. Validação autenticada após a publicação permanece necessária.

## Validação

- `npm run build`: TypeScript e bundle de produção.
- `npm run test:platform:security`: replay PGlite de todas as migrações; isolamento de perfis; recusa de alteração de níveis por membros; sessão expirada; prova recente; bootstrap empresarial repetido sem duplicar empresas nem contas.
- `npm run test:identity`: proxy com cookies e destino conflitante; recusa de destino externo e operações sensíveis sem prova recente.
- `npm run test:collaboration-ui`: 320, 375, 390, 430, 768, 790 e 1440px; chat, edição/exclusão, perfis, tarefas, retorno de foco, navegação e overflow.
- `npm run test:platform:ui`: autenticação, financeiro, Fundadores, níveis e cofre em desktop/celular, usando fixtures explícitas.
- `npm run test:organization:ui`: criação de empresa, convites e projetos com falhas/reautenticação locais.

Esses testes não equivalem a validação autenticada no Supabase hospedado. O usuário aprovou explicitamente migração, dados e publicação nesta etapa. A validação autenticada hospedada permanece separada da validação local.

A revisão independente terminou com disposition ship: os quatro ajustes de navegação, avatars, árvore interna e permissão de criar canal foram resolvidos. A verificação de foto usou upload e URL assinada em fixture local, com medida real de 28×28px no rail. O detector não executou: o motor oficial 0.1.5 não pôde ser baixado; a revisão visual foi manual e independente.
