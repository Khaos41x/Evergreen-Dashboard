> Atualização real: migrações aplicadas, proprietário configurado e versão publicada após aprovação explícita. Ver [ACTIVATION-HOLDING-20261030.md](ACTIVATION-HOLDING-20261030.md). O estado abaixo registra a entrega local anterior à ativação; integrações de produtos continuam dependentes das credenciais.

# Evergreen Holding — implementação local e ativação

Esta entrega amplia o aplicativo existente: holding → empresa/espaço de trabalho → aplicações. Não cria empresas de exemplo. Cargo profissional permanece separado de autorização. As decisões financeiras e as integrações exigem sessão válida e confirmação recente de identidade.

## Estado verificado

Implementação local, build TypeScript/Vite, replay SQL PGlite com sessões de teste, testes dos conectores com respostas determinísticas e navegador Edge com fixtures locais. Isso **não** constitui validação das APIs das contas reais ou do Supabase hospedado.

A migração `supabase/migrations/20261030155415_holding_operating_system.sql` **não foi aplicada no projeto real**. A nova versão **não foi publicada na Vercel**. Nenhuma credencial dos serviços foi cadastrada, webhook externo criado ou agendamento ativado nesta entrega. A ativação anterior de 30/10, documentada em ACTIVATION-20261030.md, pertence à versão anterior.

## Uso

1. Em Configurações, mantenha o perfil, a empresa e o grupo existentes. Os vínculos e os acessos estratégicos continuam em Fundadores. Informar “Fundador” no cadastro não concede privilégios.
2. Use “Contexto da Evergreen” para escolher uma empresa ou “Todas as empresas” de um grupo autorizado. Conversas e tarefas operacionais continuam nos espaços de trabalho; dados estratégicos respeitam as capacidades e os escopos já atribuídos.
3. Abra a Central de Informações → Empresas para editar descrição, logo HTTPS, responsável e aplicações. A aplicação representa um produto/site; um livro financeiro representa contas e registros da empresa.
4. Em Configurações → Integrações da empresa, escolha a aplicação, serviço, recurso e credencial de leitura. Os recursos são consultados na API oficial antes de gravar a conexão. Reconectar o mesmo recurso conserva o identificador e gira a credencial.
5. Sincronize o período escolhido. A Central de Informações mostra fonte, datas UTC, última sincronização, séries, detalhamentos disponíveis e limitações. Recursos repetidos não duplicam indicadores aditivos no consolidado. Visitantes e fotografias de contas nunca são somados como pessoas únicas da holding.
6. Em Finanças, cadastre os livros e contas e use os módulos existentes. A análise acrescenta períodos de calendário, comparação, gráfico acessível, zoom, categorias, CSV e metas automáticas. Aportes e transferências não integram faturamento. Reembolsos referenciam a receita original, têm limite e são idempotentes. Comprovantes opcionais ficam em bucket privado por livro financeiro.
7. Na Visão, o cofre permanece no canto. O escritório tem circulação central e estações persistidas por usuário. A busca leva à sala do assento encontrado. O diretório 2D oferece a alternativa sem WebGL. A presença da holding não é afirmada como ao vivo quando não foi verificada.

## Definições dos indicadores

- Cloudflare: requisições HTTP, bytes, ameaças e países conforme a fonte. IPs distintos por dia não são visitantes únicos. Retenção e campos dependem de escopo/plano.
- Vercel: Web Analytics oficial, páginas vistas, visitantes por dia/projeto e detalhamentos disponíveis. Eventos de conversão dependem da instrumentação real; o aplicativo não inventa conversões.
- Supabase: somente agregações estáticas de leitura sobre Auth pela Management API. Total de contas é fotografia atual; cadastros usam a data de criação; contas cujo último login caiu no período não são contagem de eventos nem usuários ativos do produto. O endpoint de consulta somente leitura é experimental e pode não estar disponível ao perfil autorizado.
- Livro financeiro: valores exatos em centavos, moedas separadas, receitas menos reembolsos para receita líquida e menos despesas registradas para resultado operacional estimado. Caixa informado é posição do livro até a data final; não representa conciliação bancária. Orçamentos continuam estimativas explícitas.
- Metas: receita, limite de despesas, caixa e indicadores confirmados do Asaas. Limites medem consumo do teto. Escopo parcial impede afirmar conclusão global. Metas Asaas não ficam verificadas com fonte desativada, varredura incompleta ou conciliação com mais de 25 horas.

## Asaas

O gateway efetivamente informado pelo usuário é **Asaas**. Stripe e Mercado Pago não foram conectados ou tratados como fontes existentes.

Escolha Sandbox ou Produção explicitamente e vincule a carteira da conta ao livro BRL autorizado. A chave da API fica cifrada no servidor. Após conectar, a interface mostra uma única vez a URL do webhook e um token de autenticação aleatório. Cadastre ambos no painel do Asaas, no mesmo ambiente, com os eventos de cobrança necessários. Não cole chaves em chats, arquivos versionados ou frontend.

O endpoint `/api/webhooks/asaas/{id}` confere `asaas-access-token` em tempo constante e consulta novamente a cobrança pela API oficial. Asaas usa esse token compartilhado; não se afirma uma assinatura HMAC inexistente. Valores enviados no corpo do webhook não são usados como fonte monetária. Falhas retornam erro para permitir repetição do provedor.

As observações são identificadas por conexão e cobrança; eventos também têm identificação única. Conciliação e webhook gravam a mesma linha canônica, preservando a observação mais recente. Os dados retidos excluem cliente, documento, cartão e endereço. Reembolsos contam apenas quando `refunds.status = DONE`. A leitura monetária preserva a representação decimal antes da conversão a centavos.

`CONFIRMED` é confirmado e ainda não disponível; `RECEIVED` é recebido. Pendências são mostradas por vencimento. Receitas confirmadas usam a data de confirmação. Recebimentos não são saldo bancário. Valores de Sandbox nunca entram na receita de produção. Split, chargeback, taxas devolvidas e saldos finais exigem conferência específica; nenhum repasse é inferido.

A visão Asaas permanece **separada do livro manual**, evitando somar a mesma venda registrada nas duas fontes. Metas de vendas/receita Asaas avançam automaticamente pelas cobranças observadas. Não existe lançamento automático dessa mesma cobrança nas contas manuais, criação de cobrança, transferência de dinheiro ou execução de reembolso por esta integração.

“Conciliar cobranças” lê páginas de até 20 itens e permite continuar até concluir a varredura. O agendamento opcional usa `GET /api/integrations/reconcile`, autenticado por `Authorization: Bearer CRON_SECRET`, e percorre até cinco conexões por execução, com cursor persistido e prioridade por tentativa. Ele não é agendado automaticamente: configurar frequência e limites após autorização e validação do plano. Um ciclo antigo não torna uma varredura atual parcial completa.

## Configuração no servidor

Além das variáveis de autenticação já documentadas:

| Variável | Finalidade |
| --- | --- |
| `INTEGRATIONS_ENCRYPTION_KEY` | 32 bytes aleatórios em Base64, para AES-256-GCM. Guardar somente no servidor/gerenciador de segredos. Sua perda exige reconectar as fontes. |
| `INTEGRATIONS_STORAGE_SERVICE_KEY` | Chave administrativa do **projeto Evergreen**, usada exclusivamente nos RPCs de persistência de métricas/observações. Não é a chave dos projetos de produtos vinculados. |
| `CRON_SECRET` | Pelo menos 32 caracteres aleatórios para o agendamento opcional. |

Não colocar essas variáveis sob prefixo `VITE_`. O frontend usa cookies da sessão no BFF; credenciais de provedores não são gravadas em localStorage. A chave administrativa não entra em pacotes de entrega. Tokens dos produtos devem ter os menores escopos de leitura disponíveis, sem permissão para cobrar ou reembolsar.

## Controles e testes

RLS em todas as tabelas públicas novas. Escrita direta dos dados críticos é revogada. RPCs verificam sessão real e autorização por empresa, holding e livro. Cargo no perfil não autoriza ações. Acesso estratégico não implica acesso financeiro. Credenciais cifradas usam AES-GCM com identificador de integração, empresa e provedor como contexto autenticado; não aparecem nos snapshots. Persistência oficial de métricas e pagamentos exige `service_role` no servidor.

As chamadas externas têm destinos fixos HTTPS, redirecionamentos proibidos e limites de tempo/resposta. O backend aplica proteção de origem e limitação de frequência; produção exige o limitador distribuído já existente. O webhook tem autenticação própria. CSV protege contra fórmulas. Comprovantes têm escopo financeiro e não podem ser sobrescritos; anexos vinculados permanecem protegidos contra remoção comum.

Executar a partir do repositório:

```text
npm run build
npm run test:platform:security
npm run test:holding:providers
npm run test:holding:model
npm run test:holding:ui
npm run test:holding:receipts
npm run test:identity
npm run test:platform:ui
npm run test:collaboration-ui
npm run test:world:model
npm run test:world
```

Resultados em `output/holding`, `output/platform` e `output/world`. Todos os fixtures são locais e explicitamente sintéticos. Cerimônias virtuais WebAuthn não comprovam disponibilidade do fornecedor no projeto hospedado. O bundle 3D é carregado sob demanda e continua maior que o alerta padrão do Vite; não integra a tela de autenticação.

## Ativação após aprovação

1. Revisar o diff e a migração única, mantendo a versão anterior e backup do projeto. Confirmar o projeto dedicado Evergreen `dlxsakabwtpdimolsmgd`.
2. Aplicar somente a migração desta entrega; não reaplicar releases anteriores ou a migração legada de cadastro por convite.
3. Configurar os segredos no servidor, sem expô-los ao frontend. Preservar as flags e configurações de autenticação existentes.
4. Publicar a versão aprovada, testar sessão e isolamento com contas autorizadas, e conectar cada serviço pelo painel.
5. Validar Asaas primeiro em Sandbox, incluindo duplicatas, ordem dos eventos, paginação, confirmação/recebimento e reembolso. Só então conectar Produção e agendar conciliação com frequência aprovada.
6. Reversão inicial: restaurar a versão anterior do código. A migração é aditiva; não remover tabelas com dados nem registros financeiros para voltar de versão.

Autorização de uma versão anterior não foi usada para ativar esta nova versão. A restrição do usuário foi: “não execute mudanças em produção sem aprovação”.

## Documentação oficial consultada

- [Cloudflare — autenticação e escopos](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/)
- [Cloudflare — conjuntos de dados](https://developers.cloudflare.com/analytics/graphql-api/features/data-sets/)
- [Vercel Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api)
- [Supabase — consulta somente leitura](https://supabase.com/docs/reference/api/v1-read-only-query)
- [Asaas — autenticação e ambientes](https://docs.asaas.com/docs/authentication-2)
- [Asaas — recebimento de webhooks](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint)
- [Asaas — estados de pagamento](https://docs.asaas.com/docs/payment-events)
- [Asaas — reembolsos concluídos](https://docs.asaas.com/docs/refunds)
- [Asaas — listagem e reconciliação](https://docs.asaas.com/reference/list-payments)
