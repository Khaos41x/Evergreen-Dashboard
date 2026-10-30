# Validação local da extensão Holding — 30/10/2026

**Implementação local verificada. Migração hospedada NOT_APPLIED. Provedores reais NOT_VERIFIED. Nova publicação Vercel NOT_DEPLOYED.**

| Verificação | Evidência e limite |
| --- | --- |
| Build | TypeScript e Vite passaram. Bundle 3D sob demanda mantém alerta de tamanho; não é carregado na autenticação. |
| Banco | 24 grupos de checks em PGlite com fixtures de Auth/Storage. Replay da nova migração, RLS, isolamento, papéis, reautenticação, precisão, reembolsos, metas, Asaas e comprovantes. Não substitui teste no Supabase real. |
| Identidade | 13 grupos locais com SDK oficial e servidor de respostas controladas; sessões/cookies, PKCE, recuperação e limitação. Passkeys reais continuam dependentes da disponibilidade/configuração do fornecedor. |
| Conectores | 5 grupos determinísticos: cifragem/contexto, destinos e datas, semântica dos três serviços, autenticação/valores Asaas e conciliação. Nenhuma API real de produto consultada. |
| Holding | Edge 390/790/1440px, fixtures de API: contexto, aplicação, conexão Asaas, segredo fora do armazenamento local, filtros, CSV e busca de estação persistida. Sem erros JS ou overflow. |
| Comprovantes | Edge 390/1440px: upload privado com caminho por livro/usuário, valor exato e erro da RPC após upload seguido de reenvio. Um upload, duas RPCs com mesmo identificador e arquivo. Storage hospedado não verificado. |
| Plataforma anterior | Fluxos de cadastro, recuperação, OTP, seis abas financeiras, Fundadores e cofre passaram em 390/478/1440px com fixtures. |
| Colaboração | 320/375/390/430/768/1440px: mensagens, tarefas, ajuda, sala de foco e navegação. Sem erros JS nas fixtures. |
| Escritório | Modelos puros passaram. Edge/software WebGL em 390/1440px validou raycast, teclado/toque, câmera, paginação, escopo, recuperação e renderização suspensa no repouso; demais larguras preservaram fluxos. Diretório funciona sem WebGL. |
| Revisão independente | Correções materiais de datas, escopo parcial, capacidades, busca, CSV, reautenticação e Asaas conferidas. Revisão final do retry de comprovante declarou FIX resolvido, sustentada pela nova fixture. Aceitação limitada ao escopo local revisado. |

Capturas da holding usam um harness de componentes com identificação QA. As capturas `office-*` mostram o diretório 2D; as evidências do renderer ficam em `output/world`. Valores de teste não são registros financeiros reais. O histórico de erros de sandbox e capturas de falha de desenvolvimento não integra o pacote final de evidências aprovadas.

`DESIGN.md`, `.impeccable/design.json`, estilos globais e arquivos originais da marca foram preservados. Não houve criação automática das empresas citadas como exemplo. Não foram enviados convites, e-mails de teste ou cobranças; nenhum pagamento ou reembolso externo foi executado.

O guia de ativação, definições e controles está em [HOLDING-OPERATING-SYSTEM.md](HOLDING-OPERATING-SYSTEM.md). A ativação anterior documentada em ACTIVATION-20261030.md não foi tratada como aprovação para esta nova migração/publicação.
