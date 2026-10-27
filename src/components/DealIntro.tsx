import { useEffect,useLayoutEffect,useRef,useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Sigil } from './TileRow';
import { playTone } from '../audio';
interface Props { names:[string,string]; handSize:number; poolSize:number; reduced:boolean; sound:boolean; onDone:()=>void }
interface Position { left:number;top:number;width:number;height:number;dx:number;dy:number }
/** Presentation only: no hand values or complete game state enter the dealing screen. */
export default function DealIntro({names,handSize,poolSize,reduced,sound,onDone}:Props) {
 const board=useRef<HTMLDivElement>(null),pool=useRef<HTMLDivElement>(null),slots=useRef<(HTMLDivElement|null)[]>([]),finished=useRef(false),arrived=useRef(new Set<number>()),doneRef=useRef(onDone);
 doneRef.current=onDone;
 const [positions,setPositions]=useState<Position[]>([]),[settled,setSettled]=useState(reduced?handSize*2:0),total=handSize*2;
 function finish(){if(!finished.current){finished.current=true;doneRef.current();}}
 useLayoutEffect(()=>{
  function measure(){const rect=board.current?.getBoundingClientRect(),deck=pool.current?.getBoundingClientRect();if(!rect||!deck)return;
   const next=slots.current.map(slot=>{const r=slot!.getBoundingClientRect();return {left:r.left-rect.left,top:r.top-rect.top,width:r.width,height:r.height,dx:deck.left+deck.width/2-r.left-r.width/2,dy:deck.top+deck.height/2-r.top-r.height/2};});setPositions(next);
  }
  measure();const observer=new ResizeObserver(measure);if(board.current)observer.observe(board.current);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{if(settled<total)return;const timer=window.setTimeout(finish,reduced?350:550);return()=>clearTimeout(timer);},[settled,total,reduced]);
 return <main className="deal-screen screen" data-testid="dealing-screen"><header className="menu-header"><span className="brand-small">LE BLANC</span><button className="text-button" onClick={finish}>건너뛰기<ArrowRight size={14}/></button></header>
  <div className="deal-table" ref={board}>
   {[0,1].map(row=><section key={row} className={`deal-hand deal-hand-${row}`} aria-label={`${names[row]}에게 ${handSize}장 배분`}><span className="eyebrow">{names[row]}</span><div className="deal-slots">{Array.from({length:handSize},(_,i)=><div key={i} className="deal-slot" ref={el=>{slots.current[i*2+row]=el;}}><span>{String(i+1).padStart(2,'0')}</span></div>)}</div></section>)}
   <div className="deal-pool"><span className="eyebrow">NUMBER POOL</span><div ref={pool} className="pool-stack" aria-hidden="true"><i/><i/><div className="deal-card"><Sigil/></div></div><span className="pool-count">{poolSize-settled}<small> / {poolSize}</small></span></div>
   {positions.map((p,i)=><motion.div key={i} className="deal-card dealt-card" data-testid="dealt-card" aria-label={`비공개 타일 ${i+1}`} style={{left:p.left,top:p.top,width:p.width,height:p.height}} initial={reduced?false:{x:p.dx,y:p.dy,rotate:i%2?8:-8,scale:.86,opacity:0}} animate={{x:0,y:0,rotate:0,scale:1,opacity:1}} transition={{duration:reduced?0:.42,delay:reduced?0:.15+i*.16,ease:[.22,.68,.22,1]}} onAnimationComplete={()=>{if(!reduced&&!finished.current&&!arrived.current.has(i)){arrived.current.add(i);setSettled(arrived.current.size);playTone('select',sound);}}}><Sigil/></motion.div>)}
  </div><footer className="deal-caption"><span className="eyebrow">THE SECRETS ARE DEALT</span><h2>{settled===total?'각자 다섯 장. 추리를 시작합니다.':'카드풀에서 한 장씩, 비밀을 나눕니다.'}</h2><p>숫자는 손패를 펼칠 때 오름차순으로 정렬됩니다.</p><span className="deal-progress" role="progressbar" aria-label="타일 배분" aria-valuemin={0} aria-valuemax={total} aria-valuenow={settled}><i style={{width:`${settled/total*100}%`}}/></span></footer>
 </main>;
}
