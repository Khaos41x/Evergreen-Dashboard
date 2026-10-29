import type { Member } from '../../collaboration/models'
// Parse only known text tokens; never inject HTML or execute a supplied URL.
export function RichText({text,members=[],onRecord}:{text:string;members?:Member[];onRecord?:(id:string)=>void}){
 const pieces=text.split(/(@[0-9a-f]{8}-[0-9a-f-]{27,}|(?:TASK|ISSUE)-[0-9a-f]{8}-[0-9a-f-]{27,}|https?:\/\/[^\s<>]+|`[^`]+`)/gi)
 return <>{pieces.map((piece,i)=>{
  if(/^@[0-9a-f-]+$/i.test(piece)){const member=members.find(m=>m.user_id===piece.slice(1));return <strong key={i} className="domain-mention">@{member?.display_name??piece.slice(1)}</strong>}
  if(/^(TASK|ISSUE)-/i.test(piece)&&onRecord)return <button className="domain-inline-link" key={i} onClick={()=>onRecord(piece.slice(piece.indexOf('-')+1))}>{piece}</button>
  if(/^https?:\/\//i.test(piece))return <a key={i} href={piece} rel="noopener noreferrer" target="_blank">{piece}</a>
  if(piece.startsWith('`')&&piece.endsWith('`'))return <code key={i}>{piece.slice(1,-1)}</code>
  return piece
 })}</>
}
