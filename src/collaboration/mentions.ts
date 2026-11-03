import type {Member} from './models'

export type DraftMention={start:number;end:number;userId:string;label:string}
const token=/@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi
export const mentionLabel=(member:Pick<Member,'display_name'>)=>'@'+(member.display_name.replace(/\s+/g,' ').trim()||'Pessoa')

// IDs remain canonical on the server. The editor displays names and remembers
// the selected identity by range, including when two members share a name.
export function decodeMentions(text:string,members:Member[]){
 const mentions:DraftMention[]=[];let body='',cursor=0
 for(const match of text.matchAll(token)){
  body+=text.slice(cursor,match.index)
  const member=members.find(m=>m.user_id.toLowerCase()===match[1].toLowerCase())
  const label=member?mentionLabel(member):'@Pessoa indisponível',start=body.length
  body+=label
  if(member)mentions.push({start,end:body.length,userId:member.user_id,label})
  cursor=match.index+match[0].length
 }
 return {body:body+text.slice(cursor),mentions}
}

export function rebaseMentions(previous:string,next:string,mentions:DraftMention[]){
 if(previous===next)return mentions
 let start=0;while(start<previous.length&&start<next.length&&previous[start]===next[start])start++
 let oldEnd=previous.length,newEnd=next.length
 while(oldEnd>start&&newEnd>start&&previous[oldEnd-1]===next[newEnd-1]){oldEnd--;newEnd--}
 const delta=newEnd-oldEnd
 return mentions.flatMap(mention=>{
  if(oldEnd<=mention.start)return [{...mention,start:mention.start+delta,end:mention.end+delta}]
  if(start>=mention.end)return [mention]
  return [] // Editing a name removes its identity binding instead of guessing.
 })
}

export function encodeMentions(body:string,mentions:DraftMention[],members:Member[]){
 let result=body,boundary=body.length
 for(const mention of [...mentions].sort((a,b)=>b.start-a.start)){
  if(mention.start<0||mention.end>boundary||mention.start>=mention.end||body.slice(mention.start,mention.end)!==mention.label||!members.some(m=>m.user_id===mention.userId))continue
  result=result.slice(0,mention.start)+'@'+mention.userId+result.slice(mention.end)
  boundary=mention.start
 }
 return result
}
