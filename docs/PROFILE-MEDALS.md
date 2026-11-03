# Bandeira e medalhas por empresa

Implementação local de 31/10/2026. A capa usa uma bandeira brasileira vetorial monocromática no lugar da árvore de fundo. A árvore oficial continua junto ao nome da organização.

| Medalha | Requisito registrado |
| --- | --- |
| Chairman · Fundador original | Designação existente do grupo; mostra o nome desse grupo. |
| Primeiro fundador | Vínculo de fundador e designação explícita da administração, uma pessoa por empresa. |
| APEX · Fundador da empresa | Vínculo de fundador e nível A0/APEX concedido nessa empresa. |
| Primeiro sócio | Vínculo de sócio e designação explícita, uma pessoa por empresa. Se o nível A0 estiver concedido, recebe o prefixo APEX. |

Uma pessoa pode acumular distinções e exercer funções diferentes em empresas diferentes. Os selos exibem o nome da empresa e respeitam a projeção autorizada do perfil. As medalhas não concedem permissões, participação societária nem acesso financeiro. Não são inferidas do nome, e-mail ou ordem de criação da conta.

## Operação

Cadastrar uma empresa: **Suas organizações → Criar organização** (fluxo existente). Esse cadastro prepara um contexto independente; não atesta automaticamente que o criador foi fundador ou primeiro sócio.

Registrar os requisitos: um administrador abre o perfil de um membro no contexto da empresa e usa **Vínculo nesta empresa**. A administração de níveis continua em Membros/Governança. Só os vínculos autorizados podem ser consultados; a concessão em uma empresa não altera outras.

A nova migração `20261031233000_company_profile_medals.sql` acrescenta a distinção de primeiro fundador, serializa designações por empresa, mantém compatibilidade das funções anteriores e expõe `eg_profile_relationship_medals` e a projeção ampliada de `eg_profile_honors`.

## Evidência

- Build web aprovado.
- Replay local PGlite: 34 grupos de verificações, incluindo distinções em empresas diferentes, troca de titular, rejeição de vínculos incompatíveis, bloqueio de não administradores e ausência de elevação de nível.
- Playwright com fixtures REST: perfil e mensagens em 320, 390, 567, 790 e 1440 px, primeiro fundador e APEX visíveis, primeiro sócio no caso de 790 px; sem overflow horizontal ou erros de página.
- Capturas: `output/playwright/profile-567.png`, `output/playwright/profile-320.png`, `output/playwright/profile-1440.png`.

Os testes locais usam fixtures de identidade; não são uma validação de Supabase hospedado. A migração ainda precisa ser aplicada ao projeto hospedado e a aplicação publicada antes de usar as novas distinções em produção. Nenhuma alteração de produção foi executada nesta rodada.

As regras de acesso seguem os controles existentes de membros e perfil, com [RLS e permissões do Postgres](https://supabase.com/docs/guides/database/postgres/row-level-security).


## Publicação 1.2 — 31/10/2026

A versão web/PWA 1.2 e o APK 1.2.0 (versionCode 4) foram publicados. As migrações pendentes foram aplicadas ao projeto Evergreen, incluindo o ajuste de nível legado para exibição no perfil. Os estados anteriores deste documento são históricos; evidências atuais, hashes, regras e limites estão em [RELEASE-1.2.md](RELEASE-1.2.md). Instalação em aparelho e operações autenticadas hospedadas ainda não foram homologadas nesta rodada.
