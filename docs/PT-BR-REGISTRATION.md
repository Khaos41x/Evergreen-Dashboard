> **Estado atual30/10 após autorização:** banco atualizado no Supabase dedicado: produtividade e pacote atômico Identity/Finanças/Fundadores/cadastro comum aplicados. Restrição histórica de convites não aplicada e retirada das migrações ativas. Registros preservados,38tabelas comRLS. Logo transparente maior centralizada e sem título promocional na autenticação. Detalhes e limites em [ACTIVATION-20261030](ACTIVATION-20261030.md). Os estados pendentes descritos abaixo pertencem às etapas anteriores; publicação e E2E de provedores continuam pendentes.

# Evergreen — português, marca e cadastro comum

30/10/2026. Extensão do produto existente; não houve recriação do aplicativo.

## Pedido aplicado

O pedido direto de português prevalece sobre a frase “usar inglês” do documento anexado. A nova imagem substitui a apresentação anterior. O cadastro deixa de exigir convite; o ingresso em dados de outras equipes continua autorizado por associação explícita.

Nomes visíveis: Início, Tarefas, Objetivos, Projetos, Ocorrências, Mensagens, Trabalho, Sala de foco, Como usar, Notificações, Visão, Finanças e Fundadores. As rotas /vision, /economy e /founders não mudaram.

Textos, rótulos acessíveis, datas, prioridades, situações, eventos e papéis foram traduzidos. IDs, códigos, valores de formulários, enums de banco e chaves do armazenamento foram preservados. Conteúdo digitado pelas pessoas não é traduzido automaticamente.

## Fluxos

Cadastro usa auth.signUp oficial com nome, e-mail, senha e cargo opcional. A confirmação de e-mail conduz ao primeiro espaço ou à entrada numa equipe existente. Uma conta sem membros não recebe dados da holding. Senha mínima da interface: oito caracteres; a política adicional configurada no provedor continua valendo.

Recuperação usa resetPasswordForEmail com PKCE e callback no servidor. Trocar a senha exige sessão validada e autenticação recente ou AMR de recuperação recente emitido pelo provedor. Query string e estado visual não autorizam a troca. Outras sessões são revogadas após a atualização. Recuperação isolada não autoriza transações financeiras.

A nova migração 20261029225324_normal_registration.sql remove o trigger histórico de convite no cadastro, permite criar espaço próprio após confirmação, mantém isolamento e permite aceitar acesso à equipe sem exigir cargo preenchido. Nenhuma associação é derivada de role ou metadados enviados no cadastro.

## Elementos de colaboração

Canais, conversas diretas, respostas, menções, reações e integração com tarefas reutilizam a comunicação existente. Lista, quadro e filtros reutilizam o gerenciador de tarefas. A Sala de foco apresenta os membros autorizados, foto/iniciais, cargo/papel, presença e sessão. O contador é calculado localmente por horários, descontando pausas; não envia contagens a cada segundo.

A ajuda abre os diálogos reais de tarefa e foco, mensagens, histórico e configurações. Lembretes de prazo são persistentes e deduplicados por tarefa, data e destinatário; são gerados no refresh do espaço para tarefas atribuídas que vencem em até três dias. Isso não é envio de e-mail ou agendamento em segundo plano. Comentários relevantes notificam o responsável sem duplicar uma menção já emitida.

## Marca

Origem: imagem do usuário, C:/Users/sobooa7iqytvqheo/Downloads/Logotipo Evergreen Holdings.png.
Destino: public/evergreen-holdings-logo.png.
Dimensões: 1536 × 1024, RGBA.
SHA256: F6AA0849F3F3F69F95A59F58BDF03D1EF48DF499079D5CA42510BF6A52DB106F.
Bytes preservados; apresentação proporcional sobre fundo claro. O ativo anterior continua no histórico/repositório, mas não é o utilizado pelo componente ou favicon.

## Verificação e limites

Build e testes locais: núcleo17 grupos, plataforma SQL19, identidade HTTP13, interfaces390/478/1440px, colaboração e modo pessoal em320/375/390/430/768/1440px, World/modelo e preservação/backup. Dados de fixture, PGlite, provedor HTTP local, WebAuthn virtual e emulação móvel não equivalem a Supabase/SMTP/Google/Redis hospedados ou aparelhos físicos.

Consulta de leitura ao projeto dedicado confirmou oito tabelas do núcleo, sem Identity/Finanças/Fundadores/novo cadastro e sem histórico de migrações gerenciado. A migração inicial foi aplicada anteriormente por SQL Editor; não reaplicá-la. Há responsável confirmado genérico, mas a conta indicada para o responsável real ainda não está confirmada. Nenhum dado, conta ou configuração remota foi alterado.

Aplicação de migrações, configuração real e publicação permanecem pendentes de aprovação. Ver SECURITY-CONTROLS.md e PLATFORM-VALIDATION.md. Os documentos anteriores sobre convite obrigatório são históricos e foram substituídos por esta decisão de produto.
