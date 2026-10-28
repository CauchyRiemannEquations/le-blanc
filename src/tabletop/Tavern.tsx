import {TextureLoader,SRGBColorSpace} from 'three';
import {useLoader} from '@react-three/fiber';
/** A static illustrated cutout inside the fixed 3D camera; no secret-state reactions. */
function KarlPortrait(){
 const portrait=useLoader(TextureLoader,'/materials/karl-portrait.webp');portrait.colorSpace=SRGBColorSpace;
 const aspect=portrait.image.width/portrait.image.height;
 return <mesh name="seated-opponent-portrait" position={[0,1.15,-4.45]}>
  <planeGeometry args={[3.2*aspect,3.2]}/>
  <meshBasicMaterial map={portrait} transparent alphaTest={.03} toneMapped={false} color="#b8aa99"/>
 </mesh>;
}
/** Static scenery. No game state, question or card values enter this model. */
export default function Tavern({opponent}:{opponent:boolean}) {
 const back=useLoader(TextureLoader,'/materials/card-back-vintage.webp');back.colorSpace=SRGBColorSpace;

 return <group name="tavern-scenery">
  <mesh position={[0,2,-6.5]} receiveShadow><boxGeometry args={[16,7,.25]}/><meshStandardMaterial color="#18110d" roughness={1}/></mesh>
  {[-5,-3,3,5].map(x=><mesh key={x} position={[x,2,-6.2]}><boxGeometry args={[.24,7,.3]}/><meshStandardMaterial color="#302016" roughness={1}/></mesh>)}
  <mesh position={[0,.7,-5.3]}><boxGeometry args={[2.5,3,.25]}/><meshStandardMaterial color="#3b271a" roughness={.85}/></mesh>
  {opponent?<KarlPortrait/>:null}
  <group name="decorative-card-stack" position={[3.4,.04,.45]} rotation={[0,-.13,0]}>
   {Array.from({length:7},(_,i)=><mesh key={i} position={[i%2*.015,i*.025,0]} castShadow><boxGeometry args={[.88,.022,1.38]}/><meshStandardMaterial color={i===6?'#382b25':'#b6a78b'} roughness={.8}/></mesh>)}
   <mesh position={[0,.17,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.85,1.35]}/><meshStandardMaterial map={back} roughness={.7}/></mesh>
  </group>
  <group position={[-3.75,0,-.35]} name="table-candle">
   <mesh position={[0,.055,0]}><cylinderGeometry args={[.23,.29,.1,24]}/><meshStandardMaterial color="#7d5d33" metalness={.55} roughness={.5}/></mesh>
   <mesh position={[0,.36,0]}><cylinderGeometry args={[.105,.115,.55,20]}/><meshStandardMaterial color="#cabb94" roughness={1}/></mesh>
   <mesh position={[0,.72,0]} scale={[.045,.12,.045]}><sphereGeometry args={[1,12,10]}/><meshBasicMaterial color="#ffd38d"/></mesh>
   <pointLight position={[0,1,0]} color="#ffbf77" intensity={9} distance={8} decay={2}/>
  </group>
 </group>;
}
