import {CARD_FACE,needsOrientationMark} from '../cardFace';
import {useEffect,useMemo,useRef} from 'react';
import type {RefObject} from 'react';
import {playSfx} from '../audio';
import {DealMotionEvents,animationSoundCurrent,isNewPublicReveal,publicRevealCues} from './sfxEvents';
import {useFrame,useThree,useLoader} from '@react-three/fiber';
import * as THREE from 'three';
import type {SceneCard,SceneData} from './model';
import {centralX,nearCardPose} from './model';
import Tavern from './Tavern';

export interface Hit {x:number;y:number;width:number;height:number}
export interface HitLayout {central:Hit[];near:Hit[]}
export interface SceneProps {data:SceneData;peek:boolean;selected:number[];reduced:boolean;eventId:string;eventSfx:boolean;finalResult:boolean;soundScope:string;onPublicSound:(eventId:string)=>void;revealIds:string[];onSelect?:(i:number)=>void;onLayout:(hits:HitLayout)=>void;placement:'play'|'tool'|'menu';dealing:boolean;onReady:()=>void}
function faceTexture(value:number|null,paper:HTMLImageElement){
 if(value===null)return null;
 const f=CARD_FACE,canvas=document.createElement('canvas');canvas.width=f.width;canvas.height=f.height;const c=canvas.getContext('2d')!;
 c.drawImage(paper,0,0,f.width,f.height);
 c.textAlign='center';c.fillStyle=f.ink;c.font=`${f.weight} ${f.size}px ${f.family}`;c.fillText(String(value),f.x,f.baseline);
 if(needsOrientationMark(value))c.fillRect(f.marker.x,f.marker.y,f.marker.width,f.marker.height);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

function Card({card,position,rotation,selected,reduced,delay=0,scale=1,onClick,dealing=false,dealOrder=0,eventId,eventSfx,finalResult,soundScope,revealOrder,visibilityEpoch,onPublicSound}:{dealing?:boolean;dealOrder?:number;scale?:number;card:SceneCard;position:[number,number,number];rotation:[number,number,number];selected:boolean;reduced:boolean;delay?:number;onClick?:()=>void;eventId:string;eventSfx:boolean;finalResult:boolean;soundScope:string;revealOrder:number;visibilityEpoch:RefObject<number>;onPublicSound:(eventId:string)=>void}){
 const group=useRef<THREE.Group>(null),flip=useRef<THREE.Group>(null),invalidate=useThree(s=>s.invalidate);
 const angle=card.value===null?Math.PI:0,initialAngle=useRef(angle),previous=useRef({value:card.value,revealed:card.revealed}),started=useRef(0),initialPosition=useRef<[number,number,number]>(dealing?[3.4,.24,.45]:position),initialRotation=useRef(rotation);
 const dealStart=useRef<number|null>(null),wasDealing=useRef(dealing),dealMotion=useRef(new DealMotionEvents()),dealCycle=useRef(dealing?1:0),dealEpoch=useRef(visibilityEpoch.current);
 const pendingReveal=useRef<{id:string;order:number;epoch:number}|null>(null);
 const soundAllowed=(epoch:number)=>animationSoundCurrent(document.hidden,epoch,visibilityEpoch.current);
 const placed=()=>{if(dealMotion.current.land()&&!reduced&&soundAllowed(dealEpoch.current))playSfx('card_place',{id:`${soundScope}:deal-${dealCycle.current}:${card.id}:place`});};
 useEffect(()=>{if(!wasDealing.current&&dealing){dealStart.current=null;dealMotion.current.reset();dealCycle.current++;dealEpoch.current=visibilityEpoch.current;}if(wasDealing.current&&!dealing&&group.current){group.current.position.set(...position);group.current.rotation.set(...rotation);group.current.visible=true;placed();}wasDealing.current=dealing;},[dealing]);
 const [back,paper]=useLoader(THREE.TextureLoader,['/materials/card-back-vintage.webp','/materials/card-front-vintage.webp']);back.colorSpace=THREE.SRGBColorSpace;back.anisotropy=4;
 const texture=useMemo(()=>faceTexture(card.value,paper.image as HTMLImageElement),[card.value,paper]);
 useEffect(()=>()=>texture?.dispose(),[texture]);
 useEffect(()=>{
  pendingReveal.current=null;
  if(previous.current.value!==card.value||previous.current.revealed!==card.revealed){
   if(!document.hidden&&isNewPublicReveal(previous.current.revealed,card.revealed,revealOrder,eventSfx))pendingReveal.current={id:eventId,order:revealOrder,epoch:visibilityEpoch.current};
   // A private inspection has no chain delay; only a newly public card follows the engine event order.
   started.current=performance.now()+(!previous.current.revealed&&card.revealed?delay*320:0);
   previous.current={value:card.value,revealed:card.revealed};invalidate();
  }
 },[card.value,card.revealed,delay,eventId,eventSfx,revealOrder,invalidate]);
 useEffect(()=>{invalidate();},[...position,...rotation,selected,reduced,dealing,invalidate]);
 useFrame((_,dt)=>{
  if(!group.current||!flip.current)return;
  if(dealing&&!reduced){dealStart.current??=performance.now();const elapsed=performance.now()-dealStart.current-dealOrder*170;group.current.visible=elapsed>=0;if(elapsed<0){invalidate();return;}if(dealMotion.current.start()&&soundAllowed(dealEpoch.current))playSfx('card_deal',{id:`${soundScope}:deal-${dealCycle.current}:${card.id}:start`});}else group.current.visible=true;
  if(!reduced&&performance.now()<started.current){invalidate();return;}
  const reveal=pendingReveal.current;
  if(reveal){pendingReveal.current=null;if(soundAllowed(reveal.epoch)){const cues=publicRevealCues(reveal.order,reduced,finalResult);if(cues.length)onPublicSound(reveal.id);for(const cue of cues)playSfx(cue.event,{state:cue.state,id:`${soundScope}:outcome-${reveal.id}:${card.id}:${cue.event}`});}}
  let moving=false;const speed=reduced?1:1-Math.exp(-dt*12);
  flip.current.rotation.y=THREE.MathUtils.lerp(flip.current.rotation.y,angle,speed);
  if(Math.abs(flip.current.rotation.y-angle)<.001)flip.current.rotation.y=angle;else moving=true;
  // Lift during a flip to keep the thick card above the tabletop, then settle in its original slot.
  const lift=reduced?0:Math.sin(flip.current.rotation.y)*.58+(dealing?.1:0);
  for(const [i,k] of (['x','y','z'] as const).entries()){
   const floor=.035+scale*(.69*Math.abs(Math.cos(group.current.rotation.x))*Math.abs(Math.cos(flip.current.rotation.y))+.44*Math.abs(Math.sin(flip.current.rotation.y)));
   const target=k==='y'?Math.max(position[i]+lift,floor):position[i],r=rotation[i];group.current.position[k]=THREE.MathUtils.lerp(group.current.position[k],target,speed);group.current.rotation[k]=THREE.MathUtils.lerp(group.current.rotation[k],r,speed);
   if(Math.abs(group.current.position[k]-target)<.001)group.current.position[k]=target;else moving=true;
   if(Math.abs(group.current.rotation[k]-r)<.001)group.current.rotation[k]=r;else moving=true;
  }
  group.current.position.y=Math.max(group.current.position.y,.035+scale*(.69*Math.abs(Math.cos(group.current.rotation.x))*Math.abs(Math.cos(flip.current.rotation.y))+.44*Math.abs(Math.sin(flip.current.rotation.y))));
  // Non-sensitive diagnostics use only slot identity, public state and the actual rendered transform.
  group.current.userData={slot:card.slot,revealed:card.revealed,faceUp:card.value!==null};
  if(dealing&&!moving)placed();
  if(moving)invalidate();
 });
 return <group name={card.id} ref={group} scale={scale} position={initialPosition.current} rotation={initialRotation.current}><group ref={flip} rotation={[0,initialAngle.current,0]} onPointerDown={onClick?e=>{e.stopPropagation();onClick();}:undefined}>
  <mesh castShadow receiveShadow><boxGeometry args={[.88,1.38,.055]}/><meshStandardMaterial color={selected?'#d4af63':'#b2a48b'} roughness={.65}/></mesh>
  <mesh position={[0,0,.029]}><planeGeometry args={[.85,1.35]}/><meshStandardMaterial map={texture??back} roughness={.7}/></mesh>
  <mesh position={[0,0,-.029]} rotation={[0,Math.PI,0]}><planeGeometry args={[.85,1.35]}/><meshStandardMaterial map={back} roughness={.8}/></mesh>
  {selected?<mesh position={[0,0,0]}><planeGeometry args={[.98,1.48]}/><meshBasicMaterial color="#c8a469" side={THREE.DoubleSide}/></mesh>:null}
 </group></group>;
}
function Link({a,b,delta,index,count,animate,reduced,spread=1}:{spread?:number;a:number;b:number;delta:number;index:number;count:number;animate:boolean;reduced:boolean}){
 const geometry=useRef<THREE.TubeGeometry>(null),started=useRef<number|null>(null),invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{if(animate&&!reduced)invalidate();},[animate,reduced,invalidate]);
 useFrame(()=>{if(!animate||reduced||!geometry.current)return;started.current??=performance.now();const progress=Math.min(1,(performance.now()-started.current)/360),count=geometry.current.index?.count??0;geometry.current.setDrawRange(0,Math.floor(count*progress/3)*3);if(progress<1)invalidate();});
 const points=useMemo(()=>[new THREE.Vector3(centralX(a,count)*spread,.09,-.5),new THREE.Vector3(centralX(a,count)*spread,.09,-.15+index*.19),new THREE.Vector3(centralX(b,count)*spread,.09,-.15+index*.19),new THREE.Vector3(centralX(b,count)*spread,.09,-.5)],[a,b,count,index,spread]);
 const curve=useMemo(()=>new THREE.CatmullRomCurve3(points,false,'catmullrom',.08),[points]);
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d')!;ctx.fillStyle='#352830';ctx.fillRect(0,0,128,64);ctx.fillStyle='#f4d899';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText(`+${delta}`,64,46);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;},[delta]);useEffect(()=>()=>texture?.dispose(),[texture]);
 return <group><mesh><tubeGeometry ref={geometry} args={[curve,32,.016,6,false]}/><meshStandardMaterial color="#cfb373" emissive="#6a4513" emissiveIntensity={.3}/></mesh><mesh position={[(centralX(a,count)+centralX(b,count))*spread/2,.22,-.15+index*.19]} rotation={[-.7,0,0]}><planeGeometry args={[.72,.36]}/><meshBasicMaterial map={texture}/></mesh></group>;
}
export default function Scene(p:SceneProps){
 const {camera,size,invalidate,gl,scene}=useThree();const spread=size.height<300?1.4:1.15;
 const visibilityEpoch=useRef(0);
 const initialLinks=useRef(new Set(p.data.connections.map(e=>`${e.a}-${e.b}`)));
 const maps=useLoader(THREE.TextureLoader,['/materials/walnut-dark.webp']);
 const textures=useMemo(()=>maps.map(m=>{const t=m.clone();t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);return t;}),[maps]);
 useEffect(()=>()=>textures.forEach(t=>t.dispose()),[textures]);
 useEffect(()=>{
  const cam=camera as THREE.PerspectiveCamera;
  const availableWidth=size.width,availableHeight=size.height;
  const aspect=availableWidth/availableHeight,d=Math.max(7.7,7.3/(2*Math.tan(THREE.MathUtils.degToRad(40)/2)*aspect));
  cam.clearViewOffset();cam.aspect=aspect;
  cam.position.set(0,d*.65,d*.76);cam.lookAt(0,.15,0);cam.updateProjectionMatrix();cam.updateMatrixWorld();
  const project=(position:[number,number,number],width=.88,height=1.38):Hit=>{const v=new THREE.Vector3(...position).project(cam);const scale=availableHeight/(2*Math.tan(THREE.MathUtils.degToRad(40)/2)*cam.position.distanceTo(new THREE.Vector3(...position)));return {x:(v.x+1)*size.width/2,y:(1-v.y)*size.height/2,width:Math.max(34,width*scale),height:Math.max(44,height*scale*.72)};};
  const near=p.data.hand;
  p.onLayout({central:p.data.central.map(c=>{
   // Project the actual flat card corners, not a guessed vertical rectangle.
   const x=centralX(c.slot,p.data.central.length)*spread,y=p.selected.includes(c.slot)?.2:.07;
   const corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([dx,dz])=>new THREE.Vector3(x+dx*.44*spread,y,-1.5+dz*.69*spread).project(cam));
   const xs=corners.map(v=>(v.x+1)*size.width/2),ys=corners.map(v=>(1-v.y)*size.height/2);
   const left=Math.min(...xs)-3,right=Math.max(...xs)+3,top=Math.min(...ys)-4,bottom=Math.max(...ys)+4;
   return {x:(left+right)/2,y:(top+bottom)/2,width:Math.max(34,right-left),height:Math.max(44,bottom-top)};
  }),near:near.map(c=>project(nearCardPose(c.slot,near.length,p.peek,c.revealed).position))});invalidate();
 },[camera,size.width,size.height,p.data.central.length,p.selected,p.data.hand,p.peek,p.placement,p.onLayout,invalidate,spread]);
 useEffect(()=>{p.onReady();},[p.onReady]);
 useEffect(()=>{const hide=()=>{if(document.hidden)visibilityEpoch.current++;else invalidate();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[invalidate]);
 useEffect(()=>{gl.domElement.dataset.renderer='three-webgl';},[gl]);
 useFrame(()=>{
  gl.domElement.dataset.frames=String(Number(gl.domElement.dataset.frames??0)+1);
  gl.domElement.dataset.slots=JSON.stringify([...p.data.central,...p.data.hand].flatMap(c=>{const node=scene.getObjectByName(c.id);return node?[{id:c.id,x:node.position.x,z:node.position.z,revealed:c.revealed}]:[];}));
 });
 const near=p.data.hand;
 return <>
  <color attach="background" args={['#100c09']}/><ambientLight intensity={.65}/><hemisphereLight args={['#ffe5bc','#241811',1.05]}/><directionalLight position={[-3,7,4]} color="#ffe0b1" intensity={2.4} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-.002}/>
  <Tavern/>
  <mesh receiveShadow position={[0,-.23,.15]}><boxGeometry args={[11,.4,8]}/><meshStandardMaterial map={textures[0]} color="#d1b394" roughness={.85}/></mesh>
  {[-3.4,-1.7,0,1.7,3.4].map(x=><mesh key={x} position={[x,-.025,.15]}><boxGeometry args={[.012,.008,7.95]}/><meshStandardMaterial color="#25180f" roughness={1}/></mesh>)}
  {p.data.central.map(c=><Card key={c.id} card={c} eventId={p.eventId} eventSfx={p.eventSfx} finalResult={p.finalResult} soundScope={p.soundScope} revealOrder={p.revealIds.indexOf(c.id)} visibilityEpoch={visibilityEpoch} onPublicSound={p.onPublicSound} dealing={p.dealing} dealOrder={c.slot*2} scale={spread} position={[centralX(c.slot,p.data.central.length)*spread,p.selected.includes(c.slot)?.2:.07,-1.5]} rotation={[-Math.PI/2,0,0]} selected={p.selected.includes(c.slot)} reduced={p.reduced} delay={Math.max(0,p.revealIds.indexOf(c.id))} onClick={()=>p.onSelect?.(c.slot)}/>)}
  {p.data.connections.map((e,i)=><Link key={`${e.a}-${e.b}`} {...e} index={i} spread={spread} count={p.data.central.length} animate={!initialLinks.current.has(`${e.a}-${e.b}`)} reduced={p.reduced}/>)}
  {near.map(c=>{const pose=nearCardPose(c.slot,near.length,p.peek,c.revealed);return <Card key={c.id} card={c} eventId={p.eventId} eventSfx={p.eventSfx} finalResult={p.finalResult} soundScope={p.soundScope} revealOrder={p.revealIds.indexOf(c.id)} visibilityEpoch={visibilityEpoch} onPublicSound={p.onPublicSound} dealing={p.dealing} dealOrder={c.slot*2+1} position={pose.position} rotation={pose.rotation} selected={false} reduced={p.reduced} delay={Math.max(0,p.revealIds.indexOf(c.id))}/>;})}
 </>;
}
