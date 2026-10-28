import { useEffect,useRef,useState } from 'react';
import { Timer } from 'lucide-react';
import {playSfx} from '../audio';
import {DeadlineWarning} from '../gameSfx';
export default function TurnClock({deadline,offset=0,notify=false,soundKey=''}:{deadline:number|null;offset?:number;notify?:boolean;soundKey?:string}) {
 const [now,setNow]=useState(Date.now),warning=useRef(new DeadlineWarning());
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),200);return()=>clearInterval(id);},[]);
 useEffect(()=>{const suspend=()=>{warning.current.sample(soundKey,0,false,false);};document.addEventListener('visibilitychange',suspend);return()=>document.removeEventListener('visibilitychange',suspend);},[soundKey]);
 useEffect(()=>{if(warning.current.sample(deadline===null?null:soundKey,deadline===null?0:deadline-now-offset,notify,!document.hidden))playSfx('time_warning',{state:'low',id:`${soundKey}-low`});},[deadline,offset,now,notify,soundKey]);
 const seconds=deadline===null?60:Math.max(0,Math.min(60,Math.ceil((deadline-now-offset)/1000)));
 return <span className={`turn-clock ${seconds<=10?'urgent':''}`} role="timer" aria-label={`남은 시간 ${seconds}초`}><Timer size={15}/><b>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</b></span>;
}
