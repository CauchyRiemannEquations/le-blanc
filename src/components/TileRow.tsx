import {CARD_FACE,needsOrientationMark} from '../cardFace';
import { motion } from 'motion/react';
import { Eye } from 'lucide-react';
import type { GapConnection, RevelationEvent, VisibleTile } from '../engine/types';
export function Sigil({small=false}:{small?:boolean}) {return <span className={`sigil ${small?'small':''}`} aria-hidden="true"><img src="/materials/card-back-vintage.webp" alt=""/></span>;}
interface Props {tiles:VisibleTile[];own?:boolean;selected?:number[];onSelect?:(index:number)=>void;enabled?:(index:number)=>boolean;connections?:GapConnection[];reveals?:RevelationEvent[];label?:string;compact?:boolean;reduced?:boolean}
export default function TileRow({tiles,own=false,selected=[],onSelect,enabled=()=>true,connections=[],reveals=[],label,compact=false,reduced=false}:Props) {
 return <div className={`tile-stage ${own?'own-stage':''} ${compact?'compact':''}`}>
  <div className="tile-row" role="group" aria-label={label}>
   {tiles.map((t,i)=>{const revealIndex=reveals.findIndex(e=>e.index===i);return <div className="tile-slot" key={i}>
    <span className="tile-index">{String(i+1).padStart(2,'0')}</span>
    <motion.button data-sfx="none" className={`tile ${t.value===null?'secret':'face'} ${selected.includes(i)?'selected':''} ${own&&t.revealed?'exposed':''}`} aria-label={`${i+1}번 타일, ${t.value===null?'비공개':t.value}${own?(t.revealed?', 상대에게 공개됨':t.value===null?', 가려짐':', 나만 볼 수 있음'):''}`} aria-pressed={onSelect?selected.includes(i):undefined} disabled={!onSelect||!enabled(i)} onClick={()=>onSelect?.(i)} whileTap={onSelect?{scale:.94}:undefined}>
      <motion.span key={`${t.value}-${revealIndex}`} className="tile-inner" initial={revealIndex>=0&&!reduced?{rotateY:180}:false} animate={{rotateY:0}} transition={{duration:.48,delay:revealIndex>=0?revealIndex*.34:0}}>
       <span className="tile-front">{t.value===null?<Sigil/>:<><span className="tile-corner">{t.value}</span><svg className="tile-number card-face-number" viewBox={`0 0 ${CARD_FACE.width} ${CARD_FACE.height}`} preserveAspectRatio="none" aria-hidden="true"><text x={CARD_FACE.x} y={CARD_FACE.baseline} textAnchor="middle" style={{fontFamily:CARD_FACE.family,fontWeight:CARD_FACE.weight,fontSize:CARD_FACE.size,fill:CARD_FACE.ink}}>{t.value}</text>{needsOrientationMark(t.value)?<rect {...CARD_FACE.marker} fill={CARD_FACE.ink}/>:null}</svg><span className="tile-flourish">◆</span></>}</span>
       <span className="tile-back"><Sigil/></span>
      </motion.span>
      {own&&t.revealed?<Eye className="exposed-eye" size={11}/>:null}
    </motion.button>
    {selected.includes(i)?<span className="selected-dot"/>:null}
   </div>;})}
  </div>
  {connections.length>0?<svg className="connections" viewBox={`0 0 ${tiles.length*100} ${45+connections.length*15}`} aria-label="확정된 간격 연결" role="img">
   {connections.map((edge,i)=>{const a=50+edge.a*100,b=50+edge.b*100,y=18+i*15,path=`M${a} 2 V${y-5} Q${a} ${y} ${a+5} ${y} H${b-5} Q${b} ${y} ${b} ${y-5} V2`,hop=reveals.findIndex(r=>(r.from===edge.a&&r.index===edge.b)||(r.from===edge.b&&r.index===edge.a));return <g key={`${edge.a}-${edge.b}`}><title>{edge.a+1}번에서 {edge.b+1}번까지 +{edge.delta}</title><motion.path initial={reduced?false:{pathLength:0}} animate={{pathLength:1}} transition={{duration:.55}} d={path}/>{hop>=0?<motion.path className="chain-pulse" initial={reduced?false:{pathLength:0}} animate={{pathLength:1}} transition={{duration:reduced?0:.3,delay:reduced?0:Math.max(0,hop-1)*.34}} d={reveals[hop].from===edge.a?path:`M${b} 2 V${y-5} Q${b} ${y} ${b-5} ${y} H${a+5} Q${a} ${y} ${a} ${y-5} V2`}/>:null}<rect x={(a+b)/2-16} y={y-9} width="32" height="18" rx="7"/><text x={(a+b)/2} y={y+5}>+{edge.delta}</text></g>;})}
  </svg>:<div className="connection-space"/>}
 </div>;
}
