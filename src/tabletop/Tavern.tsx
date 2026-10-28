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
/** Camera-facing prop: generated wax/brass detail, grounded in the same 3D table. */
function Candle(){
 const candle=useLoader(TextureLoader,'/materials/candle-brass-v1.webp');candle.colorSpace=SRGBColorSpace;
 const height=1.02,aspect=candle.image.width/candle.image.height;
 return <group position={[-3.15,0,.15]} name="table-candle">
  {[1,.84,.68,.5].map((radius,i)=><mesh key={radius} position={[-.05,-.018+i*.001,-.1]} rotation={[-Math.PI/2,0,0]} scale={[.36,.21,1]}>
   <circleGeometry args={[radius,40]}/><meshBasicMaterial color="#120b05" transparent opacity={.045} depthWrite={false}/>
  </mesh>)}
  <sprite name="wax-and-brass-cutout" position={[0,-.015,0]} scale={[height*aspect,height,1]} center={[.5,0]}>
   <spriteMaterial map={candle} transparent alphaTest={.02} depthWrite={false} toneMapped={false} color="#e0c8a7"/>
  </sprite>
  <pointLight position={[0,1,0]} color="#ffbf77" intensity={9} distance={8} decay={2}/>
 </group>;
}
/** Static scenery. No game state, question or card values enter this model. */
export default function Tavern() {
 const back=useLoader(TextureLoader,'/materials/card-back-vintage.webp');back.colorSpace=SRGBColorSpace;

 return <group name="tavern-scenery">
  <mesh position={[0,2,-6.5]} receiveShadow><boxGeometry args={[16,7,.25]}/><meshStandardMaterial color="#18110d" roughness={1}/></mesh>
  {[-5,-3,3,5].map(x=><mesh key={x} position={[x,2,-6.2]}><boxGeometry args={[.24,7,.3]}/><meshStandardMaterial color="#302016" roughness={1}/></mesh>)}
  <mesh position={[0,.7,-5.3]}><boxGeometry args={[2.5,3,.25]}/><meshStandardMaterial color="#3b271a" roughness={.85}/></mesh>
  <KarlPortrait/>
  <group name="decorative-card-stack" position={[3.4,.04,.45]} rotation={[0,-.13,0]}>
   {Array.from({length:7},(_,i)=><mesh key={i} position={[i%2*.015,i*.025,0]} castShadow><boxGeometry args={[.88,.022,1.38]}/><meshStandardMaterial color={i===6?'#382b25':'#b6a78b'} roughness={.8}/></mesh>)}
   <mesh position={[0,.17,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.85,1.35]}/><meshStandardMaterial map={back} roughness={.7}/></mesh>
  </group>
  <Candle/>
 </group>;
}
