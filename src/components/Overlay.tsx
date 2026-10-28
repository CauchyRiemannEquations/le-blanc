import { useEffect,useRef } from 'react';
import type { ReactNode } from 'react';
import { motion,useIsPresent } from 'motion/react';
import { X } from 'lucide-react';
import { playSfx } from '../audio';
export default function Overlay({children,title,onClose,wide=false,presentation,reduced=false,board,surface='',closeAtBottom=false}:{children:ReactNode;title:string;onClose?:()=>void;wide?:boolean;presentation?:'result';reduced?:boolean;board?:ReactNode;surface?:string;closeAtBottom?:boolean}) {
 const present=useIsPresent();
 const ref=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{if(!present)return;const previous=document.activeElement as HTMLElement|null;const el=ref.current;const timer=window.setTimeout(()=>{if(el&&!el.contains(document.activeElement))el.querySelector<HTMLElement>('.overlay button:not(:disabled),.overlay [tabindex="0"]')?.focus();},50);
  function key(e:KeyboardEvent){if(e.key==='Escape'&&closeRef.current){playSfx('ui_back');closeRef.current();}if(e.key==='Tab'&&el){const nodes=Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]')).filter(node=>node.getClientRects().length>0);if(!nodes.length){e.preventDefault();return;}const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||!el.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!el.contains(document.activeElement))){e.preventDefault();first.focus();}}}
  document.addEventListener('keydown',key);return()=>{clearTimeout(timer);document.removeEventListener('keydown',key);previous?.focus();};
 },[present]);
 return <motion.div ref={ref} role={present?'dialog':undefined} aria-modal={present?true:undefined} aria-hidden={!present?true:undefined} inert={!present?true:undefined} aria-label={title} className={`overlay-backdrop ${board?'action-backdrop table-action':''} ${surface} ${presentation==='result'?'result-backdrop':''}`} initial={reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:.2}} onClick={present&&!board&&onClose?()=>{playSfx('ui_back');onClose();}:undefined}>
  {board?<div className="action-targets" onClick={e=>e.stopPropagation()}>{board}</div>:null}
  <motion.div className={`overlay ${wide?'wide':''}`} initial={reduced?false:{y:24,opacity:0}} animate={{y:0,opacity:1}} exit={{y:24,opacity:0}} transition={{duration:reduced?0:.2}} onClick={e=>e.stopPropagation()}>
   <div className="overlay-head"><span className="eyebrow">{title}</span>{onClose&&!closeAtBottom?<button data-sfx="ui_back" className="icon-button" onClick={onClose} aria-label="닫기"><X size={19}/></button>:null}</div>{children}{onClose&&closeAtBottom?<button data-sfx="ui_back" className="secondary action-cancel" onClick={onClose} aria-label="공격 취소"><X size={17}/>취소</button>:null}
  </motion.div>
 </motion.div>;
}
