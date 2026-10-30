import {useEffect,useRef} from 'react'
import './HeroTree.css'
// A depth-bearing point cloud rendered by projection. No PNG or texture is fetched.
// Geometry X/Y matches the reference; Z is a reconstruction, not recovered original depth.
export function HeroTree(){
 const canvas=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{
  const element=canvas.current,context=element?.getContext('2d',{alpha:true});if(!element||!context)return
  const target=element.closest('.reference-hero');const abort=new AbortController();let geometry:Int16Array|null=null,live=true,frame=0,yaw=0,pitch=0,visible=true
  function render(){if(!element||!context||!geometry||!visible)return;const rect=element.getBoundingClientRect();if(!rect.width||!rect.height)return;const dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;element.width=Math.round(w*dpr);element.height=Math.round(h*dpr);context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,w,h);const size=Math.min(Math.max(h*1.35,400),780),cx=w-size*.47,cy=h*.48,co=Math.cos(yaw),si=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch)
   // A few tonal passes avoid thousands of fillStyle changes while preserving branches.
   for(let tone=0;tone<5;tone++){context.fillStyle=['#7c9588','#94ad9f','#afc5b9','#d0ddd5','#edf3ef'][tone];context.globalAlpha=[.24,.32,.43,.55,.68][tone];for(let i=0;i<geometry.length;i+=4){const light=(geometry[i+3]&65535)/65535;if(Math.min(4,Math.floor(light*5))!==tone)continue;const x=geometry[i]/32767,y=geometry[i+1]/32767,z=geometry[i+2]/32767,rx=x*co+z*si,rz=-x*si+z*co,ry=y*cp-rz*sp,depth=y*sp+rz*cp,scale=1/(1-depth*.16);context.fillRect(cx+rx*size*.5*scale,cy-ry*size*.5*scale,.72+light*.5,.72+light*.5)}}context.globalAlpha=1;element.dataset.points=String(geometry.length/4);element.dataset.depth='reconstructed';element.dataset.renderer='xyz-projection'
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(render)}
  const motion=matchMedia('(prefers-reduced-motion: reduce)')
  const pointer=(input:Event)=>{const event=input as PointerEvent;if(motion.matches)return;const rect=element.getBoundingClientRect();yaw=((event.clientX-rect.left)/rect.width-.5)*.10;pitch=((event.clientY-rect.top)/rect.height-.5)*.06;schedule()}
  const leave=()=>{yaw=0;pitch=0;schedule()}
  const resize=new ResizeObserver(schedule);resize.observe(element)
  const intersection=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible)schedule()});intersection.observe(element)
  target?.addEventListener('pointermove',pointer);target?.addEventListener('pointerleave',leave)
  void fetch('/evergreen-tree.geometry.bin',{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Geometry unavailable');return r.arrayBuffer()}).then(buffer=>{if(!live)return;if(buffer.byteLength%8)throw new Error('Invalid tree geometry');geometry=new Int16Array(buffer);schedule()}).catch(()=>{if(live)element.dataset.renderer='unavailable'})
  return()=>{live=false;abort.abort();cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();target?.removeEventListener('pointermove',pointer);target?.removeEventListener('pointerleave',leave)}
 },[])
 return <canvas className="hero-tree-geometry" ref={canvas} aria-hidden="true" data-testid="hero-tree-geometry"/>
}
