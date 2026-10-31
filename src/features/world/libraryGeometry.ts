import {libraryStations} from './model'
import type {WorldMember,WorldSelection} from './model'
export type OfficeItem={at:[number,number,number];size:[number,number,number];color:string;pick?:Exclude<WorldSelection,null>;turn?:number}
export function libraryGeometry(members:WorldMember[],selection:WorldSelection){
 const wood:OfficeItem[]=[],metal:OfficeItem[]=[],screen:OfficeItem[]=[],plants:OfficeItem[]=[],planters:OfficeItem[]=[],architecture:OfficeItem[]=[],floor:OfficeItem[]=[]
 const add=(list:OfficeItem[],at:OfficeItem['at'],size:OfficeItem['size'],color:string,pick?:OfficeItem['pick'])=>list.push({at,size,color,pick})
 add(architecture,[0,-.45,0],[26.5,.65,20.5],'#14271f');add(architecture,[0,-.1,0],[26,.18,20],'#343c31')
 for(let x=-12.6;x<13;x+=.75)add(floor,[x,.01,0],[.72,.04,19.8],Math.round(x*4)%3?'#4a3b2c':'#51412f')
 add(architecture,[0,1.8,-10],[26,3.7,.25],'#263a30');add(architecture,[-13,1.8,0],[.25,3.7,20],'#22372c')
 add(metal,[0,3.69,-9.9],[26,.055,.12],'#a58d5a');add(metal,[-12.9,3.69,0],[.12,.055,20],'#a58d5a')
 // Two walls of physically modelled shelves/books. Decorative books are never org documents.
 const covers=['#334b3d','#7a6950','#394c53','#78564a','#ada17d','#1c3228','#5e654d']
 for(let bay=0;bay<7;bay++){
  const x=-10.5+bay*3.35
  add(wood,[x,1.78,-9.4],[3.15,3.4,.3],'#302c22')
  for(const dx of [-1.52,1.52])add(wood,[x+dx,1.8,-9.03],[.11,3.5,.8],'#59462e')
  for(let level=0;level<4;level++){const y=.25+level*.82;add(wood,[x,y,-9.03],[3.15,.09,.85],'#705734');for(let j=0;j<12;j++){const h=.4+((j+bay*3+level)%4)*.07;add(wood,[x-1.31+j*.235,y+.05+h/2,-8.91],[.14+(j%2)*.04,h,.4],covers[(j+bay+level)%covers.length]);if(j%3===0)add(metal,[x-1.31+j*.235,y+h*.7,-8.697],[.15,.018,.009],'#bfa875')}}
 }
 for(let bay=0;bay<4;bay++){
  const z=-5+bay*3.4;add(wood,[-12.45,1.8,z],[.6,3.45,3.15],'#3b3123')
  for(let level=0;level<4;level++){const y=.25+level*.82;add(wood,[-12.1,y,z],[.95,.09,3.15],'#705734');for(let j=0;j<10;j++){const h=.43+(j%3)*.07;add(wood,[-12.03,y+.05+h/2,z-1.26+j*.27],[.45,h,.18],covers[(bay+level+j)%covers.length])}}
 }
 // Exactly three equal executive stations, regardless of whether seats are filled.
 libraryStations.forEach(([x,,z],index)=>{
  const member=members.find(m=>m.seat===index),pick=member?{kind:'member' as const,id:member.id}:undefined,active=selection?.id===member?.id&&!!member
  add(wood,[x,.075,z+.7],[5.25,.07,4.7],'#253c32');add(metal,[x,.12,z+2.95],[5.25,.025,.04],active?'#7ed7ae':'#9a8557')
  add(wood,[x,1.05,z],[4.1,.2,2.05],'#6b4c2e');add(wood,[x,1.17,z],[3.95,.035,1.9],'#785b39');add(wood,[x,1.2,z+.1],[2.35,.035,1.03],'#193b2e')
  for(const dx of [-1.43,1.43]){add(wood,[x+dx,.5,z],[.86,.95,1.7],'#403326');for(let y=.28;y<.9;y+=.29){add(wood,[x+dx,y,z+.86],[.78,.23,.05],'#5c442b');add(metal,[x+dx,y+.02,z+.9],[.26,.035,.04],'#c4ab77')}}
  add(metal,[x,1.78,z-.52],[1.65,1.05,.11],'#192b25');add(screen,[x,1.8,z-.45],[1.45,.85,.03],'#284b3d');add(metal,[x,1.27,z-.5],[.7,.07,.4],'#a9a084');add(metal,[x,1.45,z-.54],[.07,.45,.08],'#9d9f8a')
  add(metal,[x,1.25,z+.47],[1.15,.04,.35],'#202e27');add(wood,[x+1.42,1.32,z+.35],[.48,.19,.65],'#8c785b');add(wood,[x+1.42,1.43,z+.35],[.44,.04,.6],'#d4c9a6')
  // Warm reading lamp, with a real stem and shade.
  add(metal,[x-1.55,1.25,z-.35],[.45,.06,.45],'#b3a17b');add(metal,[x-1.55,1.65,z-.35],[.04,.8,.04],'#b3a17b');add(wood,[x-1.55,2.04,z-.35],[.78,.27,.45],'#335842');add(screen,[x-1.55,1.91,z-.35],[.62,.025,.34],'#f3dfae')
  add(metal,[x,.38,z+1.8],[.09,.65,.09],'#a6a38b');add(metal,[x,.12,z+1.8],[1.1,.07,1],'#3b4539');add(wood,[x,.7,z+1.8],[1.15,.25,1.05],'#183d2c');add(wood,[x,1.34,z+2.23],[1.22,1.48,.18],'#214a35');for(const dx of [-.64,.64])add(wood,[x+dx,1.03,z+1.8],[.12,.13,.85],'#715739')
  const status=member?.vacant?'#7f8b81':member?.presence==='online'?'#5fd5a2':member?.presence==='away'?'#e1b56f':'#6f7f76'
  add(screen,[x+1.75,1.25,z-.7],[.13,.12,.13],status,pick)
  // Transparent proxy is unnecessary: visible table and chair geometry carries the selection.
  if(pick){for(const list of [wood,metal,screen])for(const item of list)if(!item.pick&&Math.abs(item.at[0]-x)<2.2&&Math.abs(item.at[2]-z)<3.2&&item.at[1]>.15)item.pick=pick}
 })
 add(wood,[0,.1,7.9],[5,.1,2],'#19362a');add(wood,[-2.2,.55,7.9],[1.3,.95,1.5],'#214a35');add(wood,[2.2,.55,7.9],[1.3,.95,1.5],'#214a35');add(wood,[0,.52,7.9],[1.8,.13,1.15],'#705438')
 for(const [x,z]of [[11.8,-8.5],[-11,8.5],[11.8,8.5]]){add(planters,[x,.45,z],[.5,.85,.5],'#9c9174');add(metal,[x,1.35,z],[.07,1.9,.07],'#625b40');add(plants,[x,2.3,z],[.85,1,.7],'#406c47');add(plants,[x+.3,1.94,z+.1],[.65,.7,.65],'#567f52')}
 return{wood,metal,screen,plants,planters,architecture,floor}
}
