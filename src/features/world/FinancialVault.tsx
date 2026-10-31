import {useEffect,useRef} from 'react'
import {useFrame,useThree,type ThreeEvent} from '@react-three/fiber'
import type {Group} from 'three'
export function FinancialVault({at,scale=1,opening,reduced,onOpen,onOpened,onHover}:{at:[number,number,number];scale?:number;opening:boolean;reduced:boolean;onOpen:()=>void;onOpened:()=>void;onHover:(value:boolean)=>void}){
 const door=useRef<Group>(null),clock=useRef(0),done=useRef(false),{invalidate,gl}=useThree()
 useEffect(()=>{clock.current=0;done.current=false;if(opening)invalidate()},[opening,invalidate])
 useFrame((_state,dt)=>{if(!opening||done.current)return;clock.current+=Math.min(dt,.1);const t=reduced?1:Math.min(1,clock.current/.75),ease=1-Math.pow(1-t,3);if(door.current)door.current.rotation.y=-ease*1.72;if(t<1)invalidate();else{done.current=true;onOpened()}})
 const click=(e:ThreeEvent<MouseEvent>)=>{if(e.delta<5){e.stopPropagation();onOpen()}}
 return <group position={at} scale={scale} onClick={click} onPointerOver={e=>{e.stopPropagation();onHover(true);gl.domElement.style.cursor='pointer'}} onPointerOut={()=>{onHover(false);gl.domElement.style.cursor='grab'}} name="Cofre Evergreen Finanças">
  <pointLight position={[0,3,3]} color="#bbd6c5" intensity={8} distance={7} decay={2}/>
  <mesh position={[0,.1,0]} receiveShadow><boxGeometry args={[2.3,.2,2.1]}/><meshStandardMaterial color="#26342f" metalness={.65} roughness={.33}/></mesh>
  <mesh position={[0,.24,0]}><boxGeometry args={[1.9,.07,1.65]}/><meshStandardMaterial color="#45544b" metalness={.85} roughness={.25}/></mesh>
  <mesh position={[0,1.3,-.68]} castShadow><boxGeometry args={[1.85,2,.22]}/><meshStandardMaterial color="#17231f" metalness={.9} roughness={.28}/></mesh>
  {[-1,1].map(s=><mesh key={s} position={[s*.82,1.3,0]} castShadow><boxGeometry args={[.2,2,1.55]}/><meshStandardMaterial color="#24332e" metalness={.88} roughness={.25}/></mesh>)}
  {[.37,2.24].map(y=><mesh key={y} position={[0,y,0]} castShadow><boxGeometry args={[1.65,.17,1.55]}/><meshStandardMaterial color="#24332e" metalness={.88} roughness={.25}/></mesh>)}
  <mesh position={[0,1.28,-.55]}><boxGeometry args={[1.42,1.65,.025]}/><meshStandardMaterial color="#080f0c" roughness={.55}/></mesh>
  <mesh position={[0,1.3,-.48]}><boxGeometry args={[1.3,.04,.06]}/><meshStandardMaterial color="#6cc7aa" emissive="#2b9f76" emissiveIntensity={.3}/></mesh>
  <group ref={door} position={[-.8,1.3,.83]}>
   <mesh position={[.8,0,0]} castShadow><boxGeometry args={[1.65,1.86,.2]}/><meshStandardMaterial color="#30413a" metalness={.9} roughness={.25}/></mesh>
   <mesh position={[.8,0,.11]}><boxGeometry args={[1.45,1.65,.035]}/><meshStandardMaterial color="#1c2b25" metalness={.94} roughness={.32}/></mesh>
   <group position={[.94,0,.22]}>
    <mesh><torusGeometry args={[.33,.035,8,32]}/><meshStandardMaterial color="#93a99b" metalness={.95} roughness={.2}/></mesh>
    <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.09,.09,.14,16]}/><meshStandardMaterial color="#adbaaf" metalness={1} roughness={.23}/></mesh>
    {[0,Math.PI/3,Math.PI*2/3].map(r=><mesh key={r} rotation={[0,0,r]}><boxGeometry args={[.6,.035,.03]}/><meshStandardMaterial color="#839b8c" metalness={1} roughness={.2}/></mesh>)}
   </group>
   <mesh position={[.3,.53,.15]}><boxGeometry args={[.1,.065,.025]}/><meshStandardMaterial color="#00d6a0" emissive="#00ac79" emissiveIntensity={.5}/></mesh>
   {[-.6,.6].map(y=><mesh key={y} position={[0,y,0]}><cylinderGeometry args={[.07,.07,.35,12]}/><meshStandardMaterial color="#6c8476" metalness={.9} roughness={.24}/></mesh>)}
   <mesh position={[.82,-.62,.15]}><boxGeometry args={[.5,.025,.025]}/><meshStandardMaterial color="#93a99b" metalness={.9} roughness={.2}/></mesh>
  </group>
 </group>
}
