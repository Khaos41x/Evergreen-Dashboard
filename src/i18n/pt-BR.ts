const labels:Record<string,string>={
 backlog:'Em espera',todo:'A fazer','in-progress':'Em andamento',done:'Concluído',
 low:'Baixa',normal:'Normal',high:'Alta',urgent:'Urgente',
 owner:'Responsável',admin:'Administrador',member:'Membro',editor:'Editor',viewer:'Leitor',
 group_owner:'Responsável do grupo',founder:'Fundador',group_executive:'Executivo do grupo',
 online:'Disponível',offline:'Desconectado',away:'Ausente',focusing:'Em foco',running:'Em foco',paused:'Pausado',idle:'Disponível',completed:'Concluído',
 timer:'Temporizador',stopwatch:'Cronômetro',distracted:'Disperso',deep:'Profundo',
 task:'Tarefa',tasks:'Tarefas',issue:'Ocorrência',project:'Projeto',objective:'Objetivo',goal:'Meta',goals:'Metas',person:'Pessoa',overview:'Visão geral',companies:'Empresas',economy:'Finanças',finance:'Financeiro',people:'Pessoas',projects:'Projetos',intelligence:'Inteligência',decisions:'Decisões',communication:'Comunicação',documents:'Documentos',governance:'Governança',activity:'Atividade',focus:'Foco',work:'Trabalho',
 problem:'Problema',suggestion:'Sugestão',question:'Dúvida',open:'Aberto',resolved:'Resolvido',
 pending:'Pendente',accepted:'Aceita',rejected:'Rejeitada',expired:'Expirada',approved:'Aprovada',closed:'Encerrada',cancelled:'Cancelada',draft:'Rascunho',
 numeric:'Numérica',manual:'Manual',milestones:'Marcos',
 income:'Receita',expense:'Despesa',transfer:'Transferência',reversal:'Estorno',checking:'Conta corrente',reserve:'Reserva',
 assigned:'Tarefa atribuída',handoff:'Transferência de trabalho',mention:'Menção',message_mention:'Menção em mensagem',thread:'Resposta em conversa',dm:'Mensagem direta',comment:'Comentário',invite:'Acesso compartilhado',deadline:'Prazo próximo',
 task_created:'Tarefa criada',task_completed:'Tarefa concluída',issue_created:'Ocorrência criada',issue_completed:'Ocorrência resolvida',issue_resolved:'Ocorrência resolvida',project_created:'Projeto criado',project_completed:'Projeto concluído',objective_created:'Objetivo criado',objective_completed:'Objetivo concluído',objective_progress:'Objetivo avançou',focus_completed:'Sessão de foco concluída',goal_completed:'Meta concluída',handoff_completed:'Trabalho transferido',
 create:'Criação',grant:'Acesso concedido',revoke:'Acesso revogado',link:'Empresa vinculada',scope:'Escopo atualizado',self_scope:'Escopo próprio atualizado',decision:'Proposta criada',vote:'Voto registrado',close:'Decisão encerrada',document:'Documento anexado',unlink:'Vínculo removido',
 emerald:'Esmeralda',gray:'Cinza',blue:'Azul',amber:'Âmbar',folder:'Pasta',target:'Alvo',code:'Código',book:'Livro'
}
export function codeLabel(value:string|undefined|null){return value?labels[value]??'Registro':'Não informado'}
export function numberLabel(value:number,maximumFractionDigits=1){return value.toLocaleString('pt-BR',{maximumFractionDigits})}
export function shortDate(value:string|number|Date){return new Date(value).toLocaleDateString('pt-BR',{day:'numeric',month:'short'})}
