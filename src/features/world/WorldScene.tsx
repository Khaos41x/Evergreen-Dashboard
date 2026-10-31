import {libraryGeometry} from './libraryGeometry'
import {libraryVault} from './model'
import {ExecutiveTerminal} from './ExecutiveTerminal'
import { FinancialVault } from './FinancialVault'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { BoxGeometry, Color, CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D, OrthographicCamera, SphereGeometry, Vector3, MOUSE, TOUCH, type BufferGeometry } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { CameraCommand } from './WorldPane'
import { completion, type WorldMember, type WorldProject, type WorldSelection, type WorldTask, type layoutWorld } from './model'

interface Item { at: [number, number, number]; size: [number, number, number]; color: string; pick?: Exclude<WorldSelection, null>; turn?: number }
interface Props {
  library?:boolean;
  onOpenFounders?:()=>void;
  vaultOpening?:boolean;onOpenVault?:()=>void;onVaultOpened?:()=>void;onVaultHover?:(value:boolean)=>void
  members: WorldMember[]; projects: WorldProject[]; tasks: WorldTask[]; selection: WorldSelection
  onSelect: (selection: WorldSelection) => void; layout: ReturnType<typeof layoutWorld>; low: boolean; reduced: boolean; visible: boolean
  command: CameraCommand; labels: RefObject<Record<string, HTMLDivElement | null>>; metrics: RefObject<HTMLDivElement | null>
  onFailure: () => void; onSlow: () => void
}
function propsLibraryVault(layout:{width:number;depth:number},library?:boolean):[number,number,number]{return library?libraryVault:[layout.width/2-2.1,0,layout.depth/2-2.2]}
function Batch({ items, geometry, material, onSelect, shadow = true }: { items: Item[]; geometry: BufferGeometry; material: MeshStandardMaterial; onSelect: Props['onSelect']; shadow?: boolean }) {
  const ref = useRef<InstancedMesh>(null), { invalidate, gl } = useThree()
  useLayoutEffect(() => {
    if (!ref.current) return
    const matrix = new Object3D(), color = new Color()
    items.forEach((item, i) => { matrix.position.set(...item.at); matrix.scale.set(...item.size); matrix.rotation.set(0, item.turn ?? 0, 0); matrix.updateMatrix(); ref.current!.setMatrixAt(i, matrix.matrix); ref.current!.setColorAt(i, color.set(item.color)) })
    ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere(); invalidate()
  }, [items, invalidate])
  const clicked = (e: ThreeEvent<MouseEvent>) => { const item = items[e.instanceId ?? -1]; if (item?.pick && e.delta < 5) { e.stopPropagation(); onSelect(item.pick) } }
  if (!items.length) return null
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={shadow} receiveShadow={shadow} onClick={clicked} onPointerOver={e => { if (items[e.instanceId ?? -1]?.pick) { e.stopPropagation(); gl.domElement.style.cursor = 'pointer' } }} onPointerOut={() => { gl.domElement.style.cursor = 'grab' }} />
}
function CameraRig({ layout, selection, members, projects, command, labels, metrics, reduced, visible, onSlow,library }: Props) {
  const { camera, gl, size, invalidate } = useThree(), controls = useRef<OrbitControls | null>(null)
  const desired = useRef(new Vector3()), targetZoom = useRef(24), animating = useRef(false), resetting = useRef(false), frames = useRef(0), slow = useRef(0), samples = useRef(0)
  const baseZoom = Math.min(size.width / (layout.width * 1.27), size.height / (layout.depth * .74 + layout.width * .35)) * .88
  const anchors = useMemo(() => [{key:'vault',point:new Vector3(...propsLibraryVault(layout,library)).add(new Vector3(0,library?4.1:2.7,0))},...members.map((m, i) => ({ key: 'member:' + m.id, point: new Vector3(layout.stations[i][0], 1.52, layout.stations[i][2] - .32) })), ...projects.map((p, i) => ({ key: 'project:' + p.id, point: new Vector3(layout.rooms[i][0], .6, layout.rooms[i][2]) }))], [members, projects, layout,library])
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement)
    controls.current = orbit; orbit.enableDamping = !reduced; orbit.dampingFactor = .12; orbit.enablePan = true
    orbit.screenSpacePanning = true; orbit.minZoom = baseZoom * .45; orbit.maxZoom = baseZoom * 3
    orbit.minPolarAngle = Math.PI / 5; orbit.maxPolarAngle = Math.PI / 2.5; orbit.maxTargetRadius = Math.max(layout.width, layout.depth)
    orbit.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }; orbit.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }
    const changed = () => { if (visible) invalidate() }, started = () => { animating.current = false; resetting.current = false }
    orbit.addEventListener('change', changed); orbit.addEventListener('start', started)
    return () => { orbit.removeEventListener('change', changed); orbit.removeEventListener('start', started); orbit.dispose(); controls.current = null }
  }, [camera, gl, reduced, baseZoom, layout.width, layout.depth, invalidate, visible])
  useLayoutEffect(() => {
    const ortho = camera as OrthographicCamera
    camera.position.set(24, 22, 24); camera.lookAt(0, 0, 0); ortho.zoom = baseZoom; ortho.updateProjectionMatrix()
    controls.current?.target.set(0, 0, 0); desired.current.set(0, 0, 0); targetZoom.current = baseZoom; animating.current = false; invalidate()
  }, [baseZoom, camera, invalidate])
  useEffect(() => {
    const index = selection?.kind === 'member' ? members.findIndex(m => m.id === selection.id) : projects.findIndex(p => p.id === selection?.id)
    const point = selection?.kind === 'member' ? layout.stations[index] : layout.rooms[index]
    desired.current.set(...(point ?? [0, 0, 0])); targetZoom.current = point ? baseZoom * 1.35 : baseZoom; animating.current = true; resetting.current = !point; if (visible) invalidate()
  }, [selection?.id, selection?.kind, members, projects, layout, baseZoom, invalidate, visible])
  useEffect(() => {
    if (!command.id) return
    const ortho = camera as OrthographicCamera, orbit = controls.current
    if (!orbit) return
    if (command.type === 'reset') { desired.current.set(0, 0, 0); targetZoom.current = baseZoom; resetting.current = true }
    else if (command.type === 'in' || command.type === 'out') { desired.current.copy(orbit.target); targetZoom.current = Math.max(baseZoom * .45, Math.min(baseZoom * 3, ortho.zoom * (command.type === 'in' ? 1.25 : .8))); resetting.current = false }
    else { desired.current.copy(orbit.target); const dx = command.type === 'left' ? -2 : command.type === 'right' ? 2 : 0, dz = command.type === 'up' ? -2 : command.type === 'down' ? 2 : 0; desired.current.add(new Vector3(dx, 0, dz)); targetZoom.current = ortho.zoom; resetting.current = false }
    animating.current = true; if (visible) invalidate()
  }, [command.id, command.type, baseZoom, camera, invalidate, visible])
  const scratch = useMemo(() => new Vector3(), []), deltaVector = useMemo(() => new Vector3(), [])
  useFrame((_, dt) => {
    const orbit = controls.current, ortho = camera as OrthographicCamera
    if (!orbit || !visible) return
    frames.current++
    if (animating.current) {
      const blend = reduced ? 1 : 1 - Math.exp(-Math.min(dt, .1) * 9)
      deltaVector.copy(desired.current).sub(orbit.target).multiplyScalar(blend); orbit.target.add(deltaVector); camera.position.add(deltaVector)
      if (resetting.current) camera.position.lerp(scratch.set(24, 22, 24), blend)
      ortho.zoom += (targetZoom.current - ortho.zoom) * blend; ortho.updateProjectionMatrix(); camera.lookAt(orbit.target)
      animating.current = !reduced && (orbit.target.distanceTo(desired.current) > .006 || Math.abs(ortho.zoom - targetZoom.current) > .01 || resetting.current && camera.position.distanceTo(scratch.set(24, 22, 24)) > .02)
      if (animating.current) invalidate()
    }
    if (orbit.update() && !reduced) invalidate()
    anchors.forEach(({ key, point }) => {
      const node = labels.current[key]; if (!node) return
      scratch.copy(point).project(camera); const x = (scratch.x + 1) * size.width / 2, y = (-scratch.y + 1) * size.height / 2
      const seat=members.find(m=>'member:'+m.id===key)?.seat
      const compactLabel=library&&size.width<540&&seat!==undefined
      const labelX=compactLabel?(seat===0?70:seat===1?size.width-70:size.width*.55):x
      const labelY=compactLabel?y+(seat===2?26:12):y-20
      node.style.transform = `translate(${labelX}px,${labelY}px) translate(-50%,${compactLabel?'0':'-100%'})`; node.style.visibility = scratch.z > -1 && scratch.z < 1 && x > 0 && x < size.width && y > 0 && y < size.height ? 'visible' : 'hidden'
      if(key==='vault'){scratch.set(...propsLibraryVault(layout,library)).add(new Vector3(0,library?2:1.3,library?1.35:.85)).project(camera);node.dataset.pickX=String((scratch.x+1)*size.width/2);node.dataset.pickY=String((-scratch.y+1)*size.height/2)}
      node.dataset.screenX = String(x); node.dataset.screenY = String(y)
    })
    if (metrics.current) { metrics.current.dataset.frames = String(frames.current); metrics.current.dataset.drawCalls = String(gl.info.render.calls); metrics.current.dataset.triangles = String(gl.info.render.triangles); metrics.current.dataset.dpr = String(gl.getPixelRatio()); metrics.current.dataset.cameraZoom = String(ortho.zoom);metrics.current.dataset.targetX=String(orbit.target.x);metrics.current.dataset.targetZ=String(orbit.target.z) }
    if (dt > .045 && dt < .25) slow.current++; if (dt < .25) samples.current++
    if (samples.current >= 30) { if (slow.current > 15) onSlow(); samples.current = 0; slow.current = 0 }
  })
  return null
}
function Office(props: Props) {
  const { members, projects, tasks, selection, onSelect, layout, low, onFailure } = props
  const { gl, invalidate } = useThree()
  const failure = useRef(onFailure); failure.current = onFailure
  const resources = useMemo(() => ({ box: new BoxGeometry(1, 1, 1), sphere: new SphereGeometry(1, 8, 6), cylinder: new CylinderGeometry(1, 1, 1, 12), matte: new MeshStandardMaterial({ color: 'white', roughness: .76, metalness: .12 }), metal: new MeshStandardMaterial({ color: 'white', roughness: .4, metalness: .5 }), luminous: new MeshStandardMaterial({ color: 'white', emissive: '#b4d9c2', emissiveIntensity: .3, roughness: .5, metalness: .08 }) }), [])
  useEffect(() => {
    const lost = (e: Event) => { e.preventDefault(); failure.current() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => { gl.domElement.removeEventListener('webglcontextlost', lost); gl.domElement.style.cursor = ''; Object.values(resources).forEach(r => r.dispose()) }
  }, [gl, resources])
  useEffect(() => { gl.shadowMap.enabled = !low; gl.shadowMap.needsUpdate = true; invalidate() }, [gl, low, invalidate])
  // Render once per requested frame, then sample actual renderer counters.
  useFrame(state => {
    state.gl.render(state.scene, state.camera)
    if(props.metrics.current){props.metrics.current.dataset.drawCalls=String(state.gl.info.render.calls);props.metrics.current.dataset.triangles=String(state.gl.info.render.triangles);props.metrics.current.dataset.dpr=String(state.gl.getPixelRatio())}
  },1)
  const batches = useMemo(() => {
    if(props.library)return libraryGeometry(members,selection)
    const wood: Item[] = [], metal: Item[] = [], screen: Item[] = [], plants: Item[] = [], planters: Item[] = [], architecture: Item[] = [], floor: Item[] = []
    const add = (list: Item[], at: Item['at'], size: Item['size'], color: string, pick?: Item['pick']) => list.push({ at, size, color, pick })
    add(architecture, [0, -.46, 0], [layout.width + .5, .65, layout.depth + .5], '#1d3227')
    add(architecture, [0, -.08, 0], [layout.width, .18, layout.depth], '#38463a')
    for (let x = -layout.width / 2 + 1; x < layout.width / 2; x += 2) for (let z = -layout.depth / 2 + 1; z < layout.depth / 2; z += 2) add(floor, [x, .025, z], [1.98, .018, 1.98], (Math.round(x + z) % 3) ? '#344538' : '#394b3c')
    add(architecture, [0, .73, -layout.depth / 2], [layout.width, 1.6, .2], '#283d30')
    add(architecture, [-layout.width / 2, .73, 0], [.2, 1.6, layout.depth], '#263c2e')
    add(metal, [0, 1.55, -layout.depth / 2], [layout.width, .045, .23], '#beab79')
    add(metal, [-layout.width / 2, 1.55, 0], [.23, .045, layout.depth], '#beab79')
    // Inlaid aisle: real floor geometry, not a full-screen decorative grid.
    add(wood, [0, .05, 0], [.8, .025, layout.depth - .5], '#53614d')
    members.forEach((m, i) => {
      const [x, , z] = layout.stations[i], pick = { kind: 'member' as const, id: m.id }, active = selection?.kind === 'member' && selection.id === m.id
      const statusColor = m.presence === 'focusing' ? '#e5bb68' : m.presence === 'online' ? '#43d2a2' : '#7c9690'
      add(wood, [x, .82, z], [2.25, .13, 1.45], active ? '#91ae89' : '#687662', pick)
      for (const dx of [-.91, .91]) for (const dz of [-.52, .52]) add(metal, [x + dx, .4, z + dz], [.065, .8, .065], '#212f29', pick)
      add(metal, [x, 1.42, z - .38], [1.5, .89, .13], '#192821', pick)
      add(screen, [x, 1.43, z - .306], [1.32, .7, .025], active ? '#1b5240' : '#1e3c31', pick)
      add(metal, [x, 1, z - .39], [.065, .3, .08], '#9da79a', pick); add(metal, [x, .91, z - .35], [.48, .025, .25], '#6c7d6e', pick)
      add(metal, [x - .1, .91, z + .3], [.82, .035, .26], '#23342c', pick); add(metal, [x + .58, .91, z + .3], [.14, .04, .2], '#8c9d87', pick)
      add(wood, [x, .52, z + 1.05], [.82, .13, .76], '#2b4937', pick); add(wood, [x, .87, z + 1.36], [.86, .7, .12], '#365c44', pick)
      add(metal, [x, .25, z + 1.05], [.08, .5, .08], '#9ba68e', pick); add(metal, [x, .08, z + 1.05], [.7, .05, .65], '#26382b', pick)
      add(screen, [x - .43, 1.64, z - .286], [.32, .045, .012], statusColor, pick)
      add(screen, [x - .15, 1.48, z - .286], [.88, .035, .012], '#6a8a76', pick)
      add(screen, [x - .24, 1.36, z - .286], [.7, .028, .012], '#4e6c5b', pick)
      const assigned = tasks.filter(t => t.assigneeId === m.id), progress = completion(assigned)
      if (progress) add(screen, [x - .52 + progress / 200, 1.22, z - .284], [progress / 100, .055, .015], '#5dd6a2', pick)
      add(screen, [x + .87, .94, z - .34], [.09, .11, .09], statusColor, pick)
      if (active) { add(screen, [x, .1, z + .84], [2.45, .03, .05], '#64dfa7'); add(screen, [x - 1.2, .1, z], [.04, .03, 1.7], '#64dfa7') }
    })
    projects.forEach((p, i) => {
      const [x, , z] = layout.rooms[i], pick = { kind: 'project' as const, id: p.id }, selected = selection?.kind === 'project' && selection.id === p.id
      add(wood, [x, .09, z], [3.25, .08, 2.7], selected ? '#426f67' : '#38514a', pick)
      add(metal, [x, .55, z - 1.25], [3.18, .95, .1], '#2a4b45', pick)
      add(metal, [x - 1.52, .55, z], [.1, .95, 2.5], '#355a4f', pick)
      add(screen, [x, 1.05, z - 1.25], [3.2, .045, .12], selected ? '#80cbd1' : '#567e78', pick)
      add(wood, [x, .57, z], [1.8, .12, 1.05], '#8b8c6e', pick)
      add(metal, [x, .3, z], [.8, .6, .45], '#334b3b', pick)
      add(metal, [x, .85, z - .4], [1.14, .61, .12], '#243b32', pick)
      add(screen, [x, .86, z - .325], [1, .48, .02], '#326362', pick)
      const progress = completion(tasks.filter(t => t.projectId === p.id))
      if (progress) add(screen, [x - .4 + progress / 250, .8, z - .309], [progress / 125, .045, .01], '#92d5c7', pick)
    })
    for (const [x, z] of [[-layout.width / 2 + .65, -layout.depth / 2 + .7], [layout.width / 2 - .8, -layout.depth / 2 + .8], [-layout.width / 2 + .8, layout.depth / 2 - .8]]) {
      add(planters, [x, .33, z], [.33, .65, .33], '#8c8970'); add(metal, [x, 1, z], [.055, 1.3, .055], '#675f3c')
      add(plants, [x, 1.65, z], [.58, .76, .52], '#467f52'); add(plants, [x + .26, 1.35, z + .13], [.44, .47, .4], '#55915c'); add(plants, [x - .24, 1.5, z - .1], [.4, .52, .41], '#376d46')
    }
    // Lounge and access ramp are architecture, never fake employee stations.
    add(wood, [0, .45, layout.depth / 2 - .8], [2.3, .75, .8], '#b0a58a'); add(metal, [0, .13, layout.depth / 2 + .4], [3.1, .2, 1.1], '#364d3c')
    return { wood, metal, screen, plants, planters, architecture, floor }
  }, [members, projects, tasks, selection, layout,props.library])
  return <group dispose={null}>
    <ambientLight intensity={.65} /><hemisphereLight args={['#c7d8ca', '#2f4431', 2.2]} />
    <directionalLight position={[6, 15, 9]} intensity={3.2} color="#ffe7bf" castShadow={!low} shadow-mapSize={[1024, 1024]} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-normalBias={.035} shadow-bias={-.0001} />
    <directionalLight position={[-9, 6, -6]} intensity={1.5} color="#8cc7ba" />
    <Batch items={batches.architecture} geometry={resources.box} material={resources.matte} onSelect={onSelect} />
    <Batch items={batches.floor} geometry={resources.box} material={resources.matte} onSelect={onSelect} />
    <Batch items={batches.wood} geometry={resources.box} material={resources.matte} onSelect={onSelect} />
    <Batch items={batches.metal} geometry={resources.box} material={resources.metal} onSelect={onSelect} />
    <Batch items={batches.screen} geometry={resources.box} material={resources.luminous} onSelect={onSelect} shadow={false} />
    <Batch items={batches.planters} geometry={resources.cylinder} material={resources.matte} onSelect={onSelect} />
    <Batch items={batches.plants} geometry={resources.sphere} material={resources.matte} onSelect={onSelect} />
    {props.onOpenVault&&<FinancialVault at={propsLibraryVault(layout,props.library)} scale={props.library?1.65:1} opening={!!props.vaultOpening} reduced={props.reduced} onOpen={props.onOpenVault} onOpened={props.onVaultOpened||(()=>{})} onHover={props.onVaultHover||(()=>{})}/>}
    {!props.library&&props.onOpenFounders&&<ExecutiveTerminal at={[layout.width/2-1.6,0,-layout.depth/2+1.8]} onOpen={props.onOpenFounders}/>}
    <CameraRig {...props} />
  </group>
}
export default function WorldScene(props: Props) {
  return <Canvas orthographic camera={{ position: [24, 22, 24], near: .1, far: 200, zoom: 25 }} dpr={props.low ? 1 : [1, 1.5]} shadows={!props.low} frameloop={props.visible ? 'demand' : 'never'} gl={{ antialias: !props.low, alpha: false, powerPreference: 'low-power' }} onCreated={({ gl }) => { gl.setClearColor('#0b1510'); gl.toneMappingExposure = 1.15 }} fallback={<p>WebGL não está disponível. Selecione Diretório 2D.</p>} onPointerMissed={() => props.onSelect(null)} aria-label="Sala isométrica do Evergreen. Use o diretório ao lado para navegar por teclado."><Office {...props} /></Canvas>
}
