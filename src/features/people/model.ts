import {backendOrigin} from '../../mobile/transport'
export type CompanyInvitation={id:string;workspace_id:string;email:string;token:string;expires_at:string;status:string;delivery_status:string;proposed_level:string;proposed_position:string}
export type ReceivedInvitation={id:string;workspace_id:string;company:string;inviter:string;status:string;level:string;position:string;expires_at:string}
export const invitationStatus:Record<string,string>={pending:'Criado · entrega pendente',sent:'Enviado ao serviço de e-mail',accepted:'Aceito',declined:'Recusado',expired:'Expirado',cancelled:'Cancelado',delivery_failed:'Falha no envio'}
export const operationalLevels:Record<string,string>={A0:'APEX',A1:'Principal',A2:'Executivo',A3:'Diretor',A4:'Gestor',A5:'Membro',A6:'Convidado'}
export function invitationLink(token:string){return backendOrigin+'/?invite='+encodeURIComponent(token)}
