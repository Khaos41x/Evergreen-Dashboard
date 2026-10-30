> Atualização 30/10: esta versão utiliza a nova logo, português e cadastro comum sem convite; ver PT-BR-REGISTRATION.md. As descrições de convite e marca do registro anterior abaixo são históricas onde indicado.

# Validação Evergreen Vision / Economy / Identity / Founders

Data: 2026-10-30. Resultados locais; nenhuma alteração de produção.

## Resultado automatizado

| Verificação | Resultado | Alcance |
| --- | --- | --- |
| npm run build | PASS | TypeScript e bundle de produção Vite |
| npm run test:security | PASS — 17 grupos | Núcleo, produtividade e política interna em PGlite |
| npm run test:platform:security | PASS — 19 grupos | Replay de migrações, sessão, RLS, centavos exatos, transferências, grants, documentos, quórum e revogação |
| npm run test:identity | PASS — 13 grupos | SDK oficial com provedor HTTP local: PKCE, cookies, callback, CSRF, proxy, limites, OTP, passkeys e revogação |
| npm run test:platform:ui | PASS — 390/478/1440px | Cadastro comum, primeiro espaço, recuperação de senha, nome/cargo, recuperação de OTP, WebAuthn virtual, seis abas Economy, nove abas Founders e navegação do cofre |
| npm run test:world:model | PASS | Modelo e escopo do ambiente visual |
| npm run test:world | PASS — 320/390/768/1440px | Work/Vision, tarefas compartilhadas, persistência, raycast/touch, câmera e fallback sem WebGL |
| npm run test:collaboration-ui | PASS — 320/375/390/430/768/1440px | Chat, tarefas, configurações, teclado e mutações compartilhadas por fixture |
| npm run test:local:regression | PASS | CRUD pessoal, checklist, projetos, foco, persistência, seis larguras e preservação/backup de dados corrompidos |

A suíte da plataforma confirma reautenticação financeira seguida de repetição da mesma requisição UUID, isolamento de documentos pelo filtro de empresa, foco/rolagem dos editores e retorno ao acionador, ausência de tokens de autenticação em localStorage e ausência do motor 3D na autenticação. O cofre foi exercitado com WebGL por software, mouse/toque, rótulo visível, animação antes da navegação e preservação do contexto. Há alternativa por teclado sem WebGL.

JSONs em output/platform, output/world, output/playwright e output/local-preservation-results.json. As capturas da plataforma são evidência de fixtures locais, em desktop e emulação móvel. Dados sintéticos ficam nos scripts de teste; não há seed demonstrativo no produto.

## Revisão visual delimitada

Revisão independente encerrou os cinco ajustes solicitados: rótulo móvel do cofre, foco dos editores, marca/ícone da Vision, alvo mínimo de 44px no seletor de qualidade e filtro de documentos por empresa. Resultado: 5 resolvidos, nenhum parcial ou pendente. Isso aceita as correções de interface locais; não certifica segurança de produção.

O detector Impeccable não executou por indisponibilidade do binário 0.1.5. Não há resultado PASS inferido para esse detector. DESIGN.md e .impeccable/design.json foram preservados.

## Marca original

O novo PNG fornecido foi incorporado sem editar os bytes em public/evergreen-holdings-logo.png,1536×1024 RGBA. SHA256:F6AA0849F3F3F69F95A59F58BDF03D1EF48DF499079D5CA42510BF6A52DB106F. A imagem anterior permanece apenas como ativo histórico.

## Limitações e ativação

Google OAuth real, SMTP/recuperação real, passkeys hospedadas/AMR real/biometria física, Redis compartilhado, SSE no runtime Vercel e aparelhos físicos: NOT_VERIFIED. Os testes de passkeys usam o autenticador virtual do navegador e transporte oficial contra fixture; não comprovam assinatura validada pelo Supabase hospedado.

As quatro migrações 20261029 foram preparadas e testadas localmente, mas não aplicadas remotamente. Produtividade e restrição interna de 20261027 também permanecem pendentes conforme a última verificação anterior; uma consulta somente de leitura nesta etapa confirmou que só as oito tabelas do núcleo existem e que as funções dos módulos novos estão ausentes. A migração inicial já aplicada não deve ser reaplicada. Provisionamento hospedado do primeiro responsável e novo deploy: não executados.

A URL evergreen-holding.vercel.app corresponde à entrega anterior. Resultados reais anteriores do núcleo não validam estes novos módulos. Nenhum e-mail real foi enviado nesta etapa. Aprovação explícita e validação em staging devem anteceder alterações de produção; o roteiro está em SECURITY-CONTROLS.md.

Passkeys nativas Supabase são experimentais e permanecem desabilitadas até configuração e prova reais. Novos uploads têm limite de 4MiB. Founders carrega snapshot autorizado integral e ainda exige medição de escala; o chunk 3D lazy mantém aviso de tamanho (~947KB minificado/~251KB gzip).

## Encerramento da extensão em português — 30/10/2026

Cadastro comum sem convite, primeiro espaço, senha/recuperação e erros nativos WebAuthn em português passaram nas três larguras. A revisão atual apontou um item (erro nativo em inglês), corrigido e pontuado como resolvido; disposition: ship limitada a essa correção. O parecer anterior de cinco ajustes pertence à fase Visão/Finanças e permanece histórico.

Sala de foco e Como usar foram exercitados com ações reais da interface nos seis tamanhos da suíte de colaboração. Nome, cargo, credenciais e dados de fixture foram mantidos separados das provas hospedadas. O registro visual complementar está em PT-BR-DESIGN-EXTENSION.md.
