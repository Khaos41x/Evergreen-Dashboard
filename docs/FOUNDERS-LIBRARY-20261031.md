# Biblioteca dos fundadores — incremento local de 31/10/2026

Pedido: escritório reservado aos fundadores, biblioteca com três mesas executivas, identificação e presença de cada titular, cofre maior no canto superior esquerdo. A cena mantém a identidade Evergreen e o financeiro independente em `/economy`.

## Implementação

A entrada compartilhada de `/vision` usa `HoldingOffice` e o RPC `eg_founder_library`. As três posições vêm dos assentos permanentes do conselho, nunca da quantidade de pessoas online. As mesas têm a mesma modelagem de madeira, couro verde, detalhes metálicos, monitor e iluminação de leitura; estantes, livros e piso são geometria tridimensional. Livros decorativos não representam documentos corporativos.

O cofre tem escala 1,65 em relação ao anterior, fica no setor superior esquerdo da câmera inicial e mantém raycast, abertura curta e navegação para Finanças com o contexto atual. A cena não consulta saldos nem concede permissão financeira. O diretório 2D oferece seleção e acesso ao cofre por teclado; a falta de WebGL não bloqueia essas ações. A cena pessoal offline existente permanece disponível em seu contexto separado.

Cada mesa mostra nome e estado fornecidos pelo servidor. Contas ainda não designadas aparecem como assentos aguardando titular, sem inventar nomes, avatares ou atividade. A biblioteca não agrega tarefas de empresas no painel das mesas.

## Controle de acesso e presença

- Apenas titulares dos três assentos, associados ao grupo, acessam os RPCs. Antes da ativação inicial, o titular designado pode entrar; depois da ativação exige-se também o aceite do assento. Cargo textual, APEX/CEO, acesso financeiro ou papel legado `founder` isoladamente não liberam a biblioteca.
- O RPC legado `eg_holding_office` recebe a mesma restrição, evitando uma segunda entrada sem o controle novo. `eg_os_context` informa `library_access`; o cliente usa essa indicação para iniciar o heartbeat, mas o servidor sempre valida novamente.
- `eg_founder_presence` tem RLS e nenhuma permissão direta para anônimos/autenticados. Leitura e escrita passam pelos RPCs restritos. O heartbeat só altera a própria presença e usa horário do banco e `session_id` da sessão autenticada.
- Atualizações a cada 30 segundos. Aba oculta ou cinco minutos sem interação indicam ausência. Após 90 segundos sem heartbeat, ou se a sessão do provedor for revogada/expirar, a leitura retorna offline. A interface não transforma erro de rede em estado online.
- A consulta do foco compartilhado exige associação do observador ao workspace de origem. Acesso à biblioteca não concede acesso automático a outra empresa, suas tarefas, arquivos ou finanças.
- Em falha ou negativa de acesso, os dados são descartados e o Canvas não é apresentado. Uma conta sem assento recebe explicação e retorno ao Trabalho.

No momento, o servidor guarda o último heartbeat por pessoa/grupo. Com múltiplos dispositivos, a sessão do último heartbeat determina o estado até a próxima atualização válida. O estado não é garantia de que alguém esteja olhando a tela.

## Validação e publicação

- `npm run build`: passou; o chunk 3D continua carregado sob demanda e gera aviso de tamanho do Vite.
- `npm run test:platform:security`: 44 grupos de verificações locais, incluindo replay das migrações, exatamente três mesas, assentos vagos, papéis sem acesso, heartbeat online/ausente/expirado, sessão revogada e bloqueio de acesso direto à presença.
- `npm run test:library:ui`: passou em 390, 1238×715 e 1440 px com WebGL por software real e respostas HTTP sintéticas. Confere nomes/estados, cofre superior esquerdo, raycast e abertura, diretório, bloqueio sem Canvas, ausência de overflow/erros JavaScript; também fallback sem WebGL e movimento reduzido.
- Regressão integrada de colaboração: passou em 390 e 1440 px, cobrindo conversas, tarefas, perfis/configurações, equipe/projetos e ida à biblioteca sem alterar tarefas da empresa.

As capturas em `output/library/` têm nomes claramente sintéticos de QA, incluindo nomes completos para verificar a quebra das etiquetas. Não demonstram a presença de Miguel em produção. Nenhum teste local substitui duas contas reais no Supabase/Vercel. O revisor independente pontuou como resolvidas as duas correções de nomes completos e visibilidade do cofre no celular, com veredito `ship` nesse escopo: `FOUNDERS-LIBRARY-DESIGN-REVIEW-20261031.md`. O detector Impeccable foi tentado uma vez, mas o engine 0.1.5 não está instalado e o cache não pôde ser criado; não há resultado automático de detector a declarar.

Esta migração nova e a versão da biblioteca **ainda não foram aplicadas/publicadas**. A aprovação anterior foi para o pacote OS V2 `57c94c4`. A ativação daquela versão está em `ACTIVATION-OS-V2-20261031.md`; a biblioteca requer aprovação concreta antes de alterar produção.
