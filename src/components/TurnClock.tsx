import { useEffect,useState } from 'react';
import { Timer } from 'lucide-react';
export default function TurnClock({deadline,offset=0}:{deadline:number|null;offset?:number}) {
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),200);return()=>clearInterval(id);},[]);
 const seconds=deadline===null?60:Math.max(0,Math.min(60,Math.ceil((deadline-now-offset)/1000)));
 return <span className={`turn-clock ${seconds<=10?'urgent':''}`} role="timer" aria-label={`남은 시간 ${seconds}초`}><Timer size={15}/><b>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</b></span>;
}
