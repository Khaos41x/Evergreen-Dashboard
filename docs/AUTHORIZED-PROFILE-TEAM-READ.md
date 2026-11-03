# Validação autorizada de perfil e equipe

Após aprovação específica do usuário, foi executada uma transação SQL `READ ONLY` no projeto Evergreen, usando temporariamente o contexto da conta peixotodavy831@gmail.com. O identificador de sessão ficou restrito à transação e não foi retornado, gravado ou transformado em login/cookie. A transação terminou em `ROLLBACK`.

As funções `eg_company_people` e `eg_professional_profile` retornaram dados reais nas duas empresas:

| Empresa | Perfil | Vínculo | Nível | Equipe | Administração |
| --- | --- | --- | --- | --- | --- |
| Orkto | Davy Peixoto | Fundador | A0 | 1 pessoa | Disponível |
| ThinkerChess | Davy Peixoto | Sócio | A0 | 1 pessoa | Disponível |

Nenhum dado, vínculo ou permissão foi alterado. Esta evidência atualiza a pendência de leitura das consultas no contexto do proprietário mencionada no relatório da versão 1.2. Continua sem comprovar login pelo navegador, instalação/execução em aparelho, gravações em produção ou fluxo com dois usuários reais.

Resultado estruturado: `output/releases/1.2.0/authorized-profile-team-read.json`.
