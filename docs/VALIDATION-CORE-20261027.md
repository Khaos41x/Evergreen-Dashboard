# Validação atual — 2026-10-27

**Núcleo multiusuário validado no Supabase real. MVP completo ainda não declarado.**

Projeto: `dlxsakabwtpdimolsmgd`, organização Evergreen da nova conta. URL: https://dlxsakabwtpdimolsmgd.supabase.co. Branch local: `codex/evergreen-functional-core`. Aplicação: http://localhost:5173. Sem push ou deploy do frontend.

## Serviço real

Banco inicialmente sem tabelas nos schemas da aplicação. Migração `20261026171401_collaboration_core.sql` aplicada transacionalmente pelo SQL Editor do painel em 2026-10-27. SHA256: `14BFA1A675D9AB800AD16C5D270DD8A3E39ED28071A0794B88CDED46A939F896`. Conferência posterior confirmou 8 tabelas com RLS ativo; canais, participação, membros, mensagens e registros na publicação `supabase_realtime`.

Atenção operacional: execução via SQL Editor não registrou histórico da CLI. Não reaplicar a migração nem executar db push/reset sem antes reconciliar o histórico no projeto correto.

Auth configurado: Site URL `http://localhost:5173`; redirect permitido `http://localhost:5173/**`. `.env.local` usa apenas Project URL e publishable key; arquivo ignorado pelo Git. A integração MCP ainda não tem acesso à nova conta; as configurações foram aplicadas pelo painel autenticado.

Três contas descartáveis foram criadas com a API oficial Auth Admin após autorização explícita, com e-mails em example.com e confirmação automática. São contas no serviço real, mas isso não valida entrega de e-mail ou confirmação por caixa real. Nenhum e-mail de teste foi enviado. A cópia temporária da chave administrativa foi removida; a chave nunca foi incluída no frontend nem nas entregas. Fixtures prefixadas E2E permanecem no banco, sem apagar dados existentes.

### E2E: PASS, 9 verificações

1. Login A/B em contextos de navegador independentes.
2. Criar workspace e aceitar convite vinculado ao e-mail confirmado.
3. Mensagens A→B e B→A com Realtime conectado e entrega antes do intervalo de polling (limite do teste: 8 s).
4. Sessões, seleção de workspace/canal e histórico após recarga.
5. Conta externa não lê workspace nem canal privado.
6. Tarefa atribuída a B; A altera status/progresso e B recebe a atualização.
7. Viewport mobile 390 px envia mensagem sem overflow horizontal.
8. Edição e exclusão lógica propagam em tempo real.
9. Logout pela interface; tela protegida continua inacessível após recarga.

Evidências: `output/e2e-real-results.json`, `output/e2e-mobile.png`, `output/e2e-desktop.png`. O diagnóstico independente do transporte também recebeu `INSERT` com duas sessões reais e confirmou leitura pelo destinatário.

### Segurança via Data API real: PASS, 7 grupos

- Acesso anônimo a mensagens negado.
- Conta externa não lê workspace nem cria registros nele.
- Membro comum não lê, escreve ou se adiciona ao canal privado.
- Escalada direta para owner negada.
- Outro autor não consegue editar mensagem.
- ID de perfil continua imutável.
- Edição de registro fora do workspace negada.

Evidência: `output/real-security-results.json`. Clientes dessas verificações usaram apenas chave pública e sessões das contas descartáveis, sem credencial administrativa.

## Correções reveladas pelos testes reais

- Perfil: trocar upsert por UPDATE exclusivo de display_name, mantendo ID imutável.
- Sincronização: descartar respostas pertencentes a outro workspace e esperar o escopo correto antes de escolher valores padrão.
- Criação de workspace/canal: preservar a seleção solicitada até a lista confirmada incorporá-la.
- Recarga: persistir IDs de workspace/canal por conta autenticada, sem misturar dados entre usuários.
- Editor: nomes acessíveis explícitos nos selects.

## Outras verificações

Build conectado: PASS (TypeScript + Vite). SQL/RLS embarcado: PASS, 8 grupos. Regressão local: PASS (tarefas, status, checklist, projetos, objetivos, foco e persistência). Tela de entrada e modo local: PASS em 320/375/390/430/768/1440 px. UI colaborativa com REST simulado é uma suíte separada, claramente marcada como fixture; não substitui os resultados reais acima. npm audit anterior: zero vulnerabilidades. Preservação/exportação de dados locais inválidos já testada. `git diff --check`: PASS.

A revisão visual independente anterior aprovou as correções materiais de foco, contraste e retorno ao editor no escopo local. Detector Impeccable indisponível por engine/cache; não há alegação de auditoria formal.

## Pendências reais

- Cadastro público com caixa de e-mail real, confirmação e entrega de SMTP.
- Recuperação completa por e-mail/PKCE com caixa real.
- Celular físico, teclado virtual e rede LAN; viewport emulado não comprova esses comportamentos.
- Quedas/reconexões prolongadas, histórico extenso e carga de produção.
- Advisors hospedados e auditoria formal de segurança.
- Paridade completa dos campos avançados locais no editor remoto.
- DMs, threads, reações, presença, notificações, anexos, voz/vídeo e PWA continuam posteriores.

MVP completo permanece não declarado por essas pendências. O núcleo de colaboração descrito acima foi comprovado contra serviço real, sem simulação de backend.
