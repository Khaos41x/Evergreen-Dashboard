import {libraryStations} from './model'
import type {WorldMember,WorldSelection} from './model'
export type OfficeItem={at:[number,number,number];size:[number,number,number];color:string;pick?:Exclude<WorldSelection,null>;turn?:number}
export function libraryGeometry(members:WorldMember[],selection:WorldSelection,low=false){
 const wood:OfficeItem[]=[],metal:OfficeItem[]=[],screen:OfficeItem[]=[],plants:OfficeItem[]=[],planters:OfficeItem[]=[],architecture:OfficeItem[]=[],floor:OfficeItem[]=[]
 const add=(list:OfficeItem[],at:OfficeItem['at'],size:OfficeItem['size'],color:string,pick?:OfficeItem['pick'])=>list.push({at,size,color,pick})
 add(architecture,[0,-.45,0],[26.5,.65,20.5],'#203a30');add(architecture,[0,-.1,0],[26,.18,20],'#e1e4df')
 for(let x=-12.6;x<13;x+=.75)add(floor,[x,.01,0],[.72,.04,19.8],Math.round(x*4)%3?'#d8d1be':'#e0d8c5')
 add(architecture,[0,1.8,-10],[26,3.7,.25],'#e7eae4');add(architecture,[-13,1.8,0],[.25,3.7,20],'#d2dbd2')
 add(metal,[0,3.69,-9.9],[26,.055,.12],'#bcc6bb');add(metal,[-12.9,3.69,0],[.12,.055,20],'#bcc6bb')
 // Two walls of physically modelled shelves/books. Decorative books are never org documents.
 // Reduced mode keeps the architecture, three desks and live identity markers; only book density changes.
 const rearBooks=low?6:12,sideBooks=low?5:10
 const covers=['#334b3d','#7a6950','#394c53','#78564a','#ada17d','#1c3228','#5e654d']
 for(let bay=0;bay<7;bay++){
  const x=-10.5+bay*3.35
  add(wood,[x,1.78,-9.4],[3.15,3.4,.3],'#a9b6a9')
  for(const dx of [-1.52,1.52])add(wood,[x+dx,1.8,-9.03],[.11,3.5,.8],'#f1f0e7')
  for(let level=0;level<4;level++){const y=.25+level*.82;add(wood,[x,y,-9.03],[3.15,.09,.85],'#eeeade');for(let j=0;j<rearBooks;j++){const h=.4+((j+bay*3+level)%4)*.07;add(wood,[x-1.31+j*(2.82/rearBooks),y+.05+h/2,-8.91],[low?.3:.14+(j%2)*.04,h,.4],covers[(j+bay+level)%covers.length]);if(j%3===0)add(metal,[x-1.31+j*(2.82/rearBooks),y+h*.7,-8.697],[.15,.018,.009],'#bfa875')}}
 }
 for(let bay=0;bay<4;bay++){
  const z=-5+bay*3.4;add(wood,[-12.45,1.8,z],[.6,3.45,3.15],'#b3bdb1')
  for(let level=0;level<4;level++){const y=.25+level*.82;add(wood,[-12.1,y,z],[.95,.09,3.15],'#eeeade');for(let j=0;j<sideBooks;j++){const h=.43+(j%3)*.07;add(wood,[-12.03,y+.05+h/2,z-1.26+j*(2.7/sideBooks)],[.45,h,low?.36:.18],covers[(bay+level+j)%covers.length])}}
 }
 // Architectural cornice, plinth and shelf reading strips remain instanced, without extra lights.
 add(wood,[0,.15,-9.45],[25.7,.28,.95],'#c4cfc3');add(wood,[-12.45,.15,0],[.95,.28,19.4],'#c4cfc3')
 add(wood,[0,3.56,-9.43],[25.7,.18,1.04],'#eeeade');add(wood,[-12.42,3.56,0],[1.04,.18,19.4],'#eeeade')
 add(screen,[0,3.42,-8.98],[25.45,.025,.035],'#e7d8ae');add(screen,[-11.98,3.42,0],[.035,.025,19.1],'#e7d8ae')
 // A perimeter inlay separates the pale oak floor from the library walls.
 for (const x of [-12.6, 12.6]) add(architecture,[x,.046,0],[.055,.018,19.7],'#829b8b')
 for (const z of [-9.8, 9.8]) add(architecture,[0,.046,z],[25.2,.018,.055],'#829b8b')
 // Exactly three equal executive stations, regardless of whether seats are filled.
 libraryStations.forEach(([x,,z],index)=>{
  const member=members.find(m=>m.seat===index),pick=member?{kind:'member' as const,id:member.id}:undefined,active=selection?.id===member?.id&&!!member
  add(wood,[x,.075,z+.7],[5.25,.07,4.7],'#45685a');
  for(const dx of [-2.5,2.5])add(metal,[x+dx,.12,z+.7],[.025,.012,4.46],'#759084')
  for(const dz of [-1.52,2.92])add(metal,[x,.12,z+dz],[5,.012,.025],'#759084')
  add(metal,[x,.12,z+2.95],[5.25,.025,.04],active?'#7ed7ae':'#9fb2a5')
  add(wood,[x,1.05,z],[4.1,.2,2.05],'#dbddd3');add(wood,[x,1.17,z],[3.95,.035,1.9],'#f5f2e9');add(wood,[x,1.2,z+.1],[2.35,.035,1.03],'#193b2e')
  for(const dx of [-1.43,1.43]){add(wood,[x+dx,.5,z],[.86,.95,1.7],'#bfc9bf');for(let y=.28;y<.9;y+=.29){add(wood,[x+dx,y,z+.86],[.78,.23,.05],'#ecece4');add(metal,[x+dx,y+.02,z+.9],[.26,.035,.04],'#a39776')}}
  add(metal,[x,1.78,z-.52],[1.65,1.05,.11],'#192b25');add(screen,[x,1.8,z-.45],[1.45,.85,.03],member&&!member.vacant&&member.presence==='online'?'#244d3b':'#172d24');add(metal,[x,1.27,z-.5],[.7,.07,.4],'#a9a084');add(metal,[x,1.45,z-.54],[.07,.45,.08],'#9d9f8a')
  add(metal,[x,1.25,z+.47],[1.15,.04,.35],'#202e27');add(wood,[x+1.42,1.32,z+.35],[.48,.19,.65],'#779286');add(wood,[x+1.42,1.43,z+.35],[.44,.04,.6],'#ede9d9')
  // Warm reading lamp, with a real stem and shade.
  add(metal,[x-1.55,1.25,z-.35],[.45,.06,.45],'#b3a17b');add(metal,[x-1.55,1.65,z-.35],[.04,.8,.04],'#b3a17b');add(wood,[x-1.55,2.04,z-.35],[.78,.27,.45],'#335842');add(screen,[x-1.55,1.91,z-.35],[.62,.025,.34],'#f3dfae')
  add(metal,[x,.38,z+1.8],[.09,.65,.09],'#a6a38b');add(metal,[x,.12,z+1.8],[1.1,.07,1],'#3b4539');add(wood,[x,.7,z+1.8],[1.15,.25,1.05],'#183d2c');add(wood,[x,1.34,z+2.23],[1.22,1.48,.18],'#214a35');for(const dx of [-.64,.64])add(wood,[x+dx,1.03,z+1.8],[.12,.13,.85],'#6f8d7b')
  const status=member?.vacant?'#7f8b81':member?.presence==='online'?'#5fd5a2':member?.presence==='away'?'#e1b56f':'#6f7f76'
  // A simple status bar is tied only to actual presence, never synthetic work data.
  if(member&&!member.vacant){add(screen,[x-.38,2.05,z-.43],[.42,.025,.012],status);add(metal,[x,1.88,z-.43],[1.14,.018,.012],'#466752')}
  // Brass front rail and a closed document folio add executive detail without implying org documents.
  add(metal,[x,1.08,z+1.04],[3.9,.035,.03],'#b7a889');add(wood,[x+.8,1.26,z+.48],[.52,.06,.7],'#2d4436')
  add(screen,[x+1.75,1.25,z-.7],[.13,.12,.13],status,pick)
  // Transparent proxy is unnecessary: visible table and chair geometry carries the selection.
  if(pick){for(const list of [wood,metal,screen])for(const item of list)if(!item.pick&&Math.abs(item.at[0]-x)<2.2&&Math.abs(item.at[2]-z)<3.2&&item.at[1]>.15)item.pick=pick}
 })
 add(wood,[0,.1,7.9],[5,.1,2],'#68857a');add(wood,[-2.2,.55,7.9],[1.3,.95,1.5],'#214a35');add(wood,[2.2,.55,7.9],[1.3,.95,1.5],'#214a35');add(wood,[0,.52,7.9],[1.8,.13,1.15],'#e1ded0')
 for(const [x,z]of [[11.8,-8.5],[-11,8.5],[11.8,8.5]]){add(planters,[x,.45,z],[.5,.85,.5],'#e1e4d9');add(metal,[x,1.35,z],[.07,1.9,.07],'#625b40');add(plants,[x,2.3,z],[.85,1,.7],'#406c47');add(plants,[x+.3,1.94,z+.1],[.65,.7,.65],'#567f52')}
 return{wood,metal,screen,plants,planters,architecture,floor}
}
