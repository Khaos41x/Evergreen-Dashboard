# Evergreen — otimização, escritório e e-mails, 04/11/2026

## Alterações

- Acesso: altura limitada com rolagem própria no login/cadastro; erros explícitos de envio SMTP e orientação para contas já cadastradas.
- E-mails: os três modelos hospedados de cadastro, Magic Link/OTP e recuperação foram substituídos pelos HTML locais em português com `{{ .Token }}` em destaque e alternativa de link com fragmento. A prévia e o estado salvo foram conferidos no painel. O SMTP Gmail voltou a aceitar pedidos após o titular atualizar a senha de aplicativo. Uma solicitação OTP para a conta de QA autorizada retornou 200; o código não foi lido e nenhuma sessão foi criada. A chegada da nova mensagem e sua pasta de destino continuam sem confirmação. Modelos não garantem escapar de spam; o destinatário pode marcar o remetente conhecido como Não é spam.
- Biblioteca: mantidas as três mesas executivas, presença proveniente dos dados e cofre no canto superior esquerdo. Mais detalhes arquitetônicos e monitores ligados conforme presença. Geometria econômica reduzida de 845 instâncias anteriores para 569 (cerca de 33%); detalhada com 873. Sombras estáticas reaproveitadas durante movimento de câmera, atualizadas com conteúdo/cofre.
- Carregamento: a cena só monta depois da verificação de WebGL. O teste sem GPU confirma que o módulo 3D não é requisitado. Diretório 2D acessível preservado.
- Perfis: consultas e assinatura de imagens pausadas em segundo plano, retomadas ao voltar; atualizações concorrentes consolidadas, resultados antigos descartados e imagens expiradas removidas para iniciais. Projeção continua vinculada à empresa e ao público autorizado.
- Integrações: descoberta valida a resposta, limita leitura a 2 MiB, distingue credencial recusada e limpa recursos ao mudar conta/aplicação/ambiente. Credencial salva não significa dados sincronizados.

## Validação

- Build TypeScript/Vite e geração local assinada: passaram.
- test:auth:p0: 7 grupos; test:identity: 16 grupos; test:email-template: 18 asserções locais.
- test:auth:scroll: 40 cenários com React real e transporte local, 320/390/567/1440 px, web e CSS nativo. Evidência output/auth-scroll.
- test:profiles:refresh: 6 cenários com React/Chromium e transporte local. Evidência output/performance/avatar-refresh.json.
- test:world: passou em 320/390/768/1440 px, software WebGL, fallback sem requisição do pacote 3D, recuperação, suspensão em segundo plano, teclado/toque e persistência local. Uma primeira execução expirou na inicialização; a repetição final passou. Evidência output/world/world-results.json.
- Biblioteca: teste a 390/1238/1440 px e fallback sem GPU passou, incluindo reaproveitamento de sombras. Evidências output/library/browser-results.json e geometry-optimization.json.
- test:holding:providers: 6 grupos; test:holding:connection-ui: 390/1440 px, transporte local, invalidação incluindo Asaas sandbox/produção. Evidência output/integration-flow/results.json.

## Limites e configuração pendente

Não houve deploy da aplicação nem geração de novo APK nesta rodada. As mudanças hospedadas foram somente os três modelos de e-mail já solicitados. Não houve migração nem alteração de usuários/permissões. Não há teste em aparelho físico nesta rodada.

Produção tem INTEGRATIONS_ENCRYPTION_KEY, mas a presença de INTEGRATIONS_STORAGE_SERVICE_KEY ainda não foi confirmada. Localhost estava sem ambas. Credenciais externas não foram fornecidas nem conectadas. A ativação exige variáveis privadas e depois credenciais de leitura dos serviços; a mesma chave de cifra deve ser preservada nos ambientes que compartilham banco. Consulte INTEGRATIONS-READINESS-20261104.md. Testes locais não são homologação de contas autenticadas reais.
