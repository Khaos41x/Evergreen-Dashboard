# E-mail de acesso e integrações

## Código de e-mail

O acesso por código e a confirmação de operações sensíveis usam Supabase Auth (`signInWithOtp` e `verifyOtp`). O modelo local de **Magic Link** agora exibe `{{ .Token }}` como código de uso único: `supabase/config.toml` aponta para `supabase/templates/magic_link.html`. A [documentação de modelos de e-mail](https://supabase.com/docs/guides/auth/auth-email-templates) define `.Token` como OTP; o [guia de entrada sem senha](https://supabase.com/docs/guides/auth/auth-email-passwordless) confirma que a variável deve estar no modelo Magic Link para enviar um código em vez de apenas um link.

Para o projeto hospedado, aplicar o mesmo modelo em Supabase → Authentication → Email Templates → Magic Link, com o assunto `Seu código de acesso Evergreen` e o corpo contendo `{{ .Token }}`. A configuração do repositório não altera o template que já está no painel.

O fluxo de convite de empresa é separado: o e-mail próprio do Evergreen contém um link assinado pelo convite, sem código numérico. Confirmação de novo cadastro também segue o link de confirmação do Supabase. O template configurado aqui cobre entrada por código e reautenticação solicitada pelo aplicativo.

No botão **Aceitar meu assento**, o app exige reautenticação recente antes de gravar a aceitação. Essa etapa solicita um OTP pelo Supabase Auth e valida o código recebido com `verifyOtp`; o convite da empresa que pode ter chegado antes continua sendo um link assinado e não contém esse código. Portanto, para aceitar o assento, abra o app, solicite a confirmação quando ela aparecer e use o código do e-mail de autenticação mais recente.

Se o projeto hospedado usar o provedor de e-mail padrão do Supabase no plano Free, a edição dos modelos pode não estar disponível em projetos criados a partir de 3 de junho de 2026, conforme o [aviso oficial de mudanças no Free Tier](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier). Nesse caso, configure SMTP próprio no Supabase Auth e então aplique o modelo. O repositório não envia e-mail de teste nem altera o painel.

Validação local:

```powershell
npm run test:email-template
```

## Conectores da empresa

O Evergreen já tem os fluxos de descoberta, conexão, sincronização e desligamento para Cloudflare, Vercel, Supabase e Asaas. O formulário só é liberado quando a API confirma a proteção e a persistência do lado do servidor. A interface agora mostra quais variáveis faltam sem revelar seus valores:

- `INTEGRATIONS_ENCRYPTION_KEY`: 32 bytes aleatórios em Base64, para cifrar os tokens registrados.
- `INTEGRATIONS_STORAGE_SERVICE_KEY`: chave administrativa do Supabase Evergreen, usada somente no servidor para gravar resultados de integração.
- `CRON_SECRET`: opcional; habilita o agendamento quando frequência e limites forem configurados na hospedagem. A atualização manual não depende dela.

Cadastre as duas primeiras como variáveis privadas do projeto Vercel e publique um novo deployment para habilitar os conectores. Nunca use prefixo `VITE_`, não envie chaves pelo chat e só então informe tokens de leitura dos provedores pelo formulário dentro da empresa correta. As chaves de provedor não devem ser incluídas no frontend.

Validação dos conectores com respostas locais determinísticas:

```powershell
npm run test:holding:providers
```

Esse teste verifica cifra, limites de período, URLs fixas, normalização e reconciliação usando respostas de fixture. Ele não acessa nenhuma conta Cloudflare, Vercel, Supabase ou Asaas.

## Limite de validação nesta entrega

Em 31/10/2026 foram feitas apenas consultas de leitura às configurações hospedadas:

- O projeto Supabase Evergreen está ativo. O histórico remoto termina em `20261031145209` (`evergreen_founders_library`); as migrações locais `20261031183025`, `20261031191056` e `20261031223000` ainda não foram aplicadas.
- A lista de variáveis do projeto Vercel `evergreen-holding` mostra `INTEGRATIONS_ENCRYPTION_KEY` em Production, mas não mostra `INTEGRATIONS_STORAGE_SERVICE_KEY`. Os valores não foram descriptografados nem lidos.

Nenhuma configuração foi aplicada ao Supabase ou à Vercel hospedados. Portanto, a entrega deixa preparado o modelo OTP e esclarece a configuração do servidor, mas não confirma envio de código por e-mail, conexão com contas reais de provedores ou sincronização hospedada. O modelo OTP ainda precisa ser configurado no Supabase Auth; o provedor de e-mail também precisa permitir a edição do template. Para liberar os conectores, o responsável deve cadastrar `INTEGRATIONS_STORAGE_SERVICE_KEY` como segredo de servidor e conferir que `INTEGRATIONS_ENCRYPTION_KEY` contém 32 bytes aleatórios codificados em Base64. Depois, é necessário publicar um novo deployment e cadastrar credenciais de leitura de cada provedor no formulário da empresa correspondente.


## Publicação 1.2 — 31/10/2026

A versão web/PWA 1.2 e o APK 1.2.0 (versionCode 4) foram publicados. As migrações pendentes foram aplicadas ao projeto Evergreen, incluindo o ajuste de nível legado para exibição no perfil. Os estados anteriores deste documento são históricos; evidências atuais, hashes, regras e limites estão em [RELEASE-1.2.md](RELEASE-1.2.md). Instalação em aparelho e operações autenticadas hospedadas ainda não foram homologadas nesta rodada.
