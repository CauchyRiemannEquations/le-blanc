import {useEffect,useRef} from 'react';
import {RotateCw,Smartphone} from 'lucide-react';
import '../orientation.css';

export default function OrientationGate({onStart,playing=false}:{onStart:()=>void;playing?:boolean}){
 const root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  root.current?.focus();
  const key=(event:KeyboardEvent)=>{
   // Existing game dialogs must not react behind the orientation gate.
   if(event.key==='Tab'){event.preventDefault();event.stopImmediatePropagation();button.current?.focus();}
   if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();}
  };
  document.addEventListener('keydown',key,true);
  return()=>{document.removeEventListener('keydown',key,true);if(previous?.isConnected&&!previous.closest('[inert]'))previous.focus();};
 },[]);
 return <div ref={root} className="orientation-gate" role="dialog" aria-modal="true" aria-labelledby="orientation-title" aria-describedby="orientation-copy orientation-progress" tabIndex={-1}>
  <div className="orientation-card"><span className="orientation-symbol" aria-hidden="true"><Smartphone size={46} strokeWidth={1.2}/><RotateCw size={24}/></span>
   <span className="eyebrow">LE BLANC</span><h1 id="orientation-title">기기를 가로로 돌려주세요.</h1>
   <p id="orientation-copy">르블랑은 가로 화면에서 플레이합니다.<br/>자동으로 바뀌지 않으면 기기의 화면 회전 잠금을 해제하고 직접 돌려주세요.</p>
   <button ref={button} className="primary" onClick={onStart}>{playing?'가로 화면으로 돌아가기':'시작하기'}<RotateCw size={17}/></button>
   <p id="orientation-progress" className="orientation-note">{playing?'진행 중인 대전의 제한 시간은 계속 흐릅니다.':'지원되는 브라우저에서는 전체 화면으로 전환합니다.'}</p>
  </div>
 </div>;
}
