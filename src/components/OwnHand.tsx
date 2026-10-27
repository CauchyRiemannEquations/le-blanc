import { useEffect,useState } from 'react';
import { Eye,EyeOff,LockKeyhole } from 'lucide-react';
import type { GapConnection,RevelationEvent,Tile } from '../engine/types';
import TileRow from './TileRow';
interface Props { tiles:Tile[];name:string;connections:GapConnection[];reveals:RevelationEvent[];selectingPenalty:boolean;selected:number|null;onSelect:(index:number)=>void;questions:number;questionsLeft:number;reduced:boolean }
export default function OwnHand({tiles,name,connections,reveals,selectingPenalty,selected,onSelect,questions,questionsLeft,reduced}:Props) {
 const [peek,setPeek]=useState(false),visible=peek||selectingPenalty;
 useEffect(()=>{const hide=()=>{if(document.hidden)setPeek(false);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 // Hidden private values never enter the rendered TileRow or its accessible labels.
 const displayed=tiles.map(t=>({revealed:t.revealed,value:visible||t.revealed?t.value:null}));
 return <section className="own-area"><div className="hand-meta hand-meta-toggle"><span>{name}<LockKeyhole size={11}/></span><button className="hand-toggle" aria-expanded={visible} aria-controls="own-hand-tiles" disabled={selectingPenalty} onClick={()=>setPeek(p=>!p)}>{visible?<EyeOff size={14}/>:<Eye size={14}/>}<span>{selectingPenalty?'공개할 타일 선택 중':visible?'내 패 숨기기':'내 패 보기'}</span></button></div>
  <div id="own-hand-tiles"><TileRow tiles={displayed} own connections={connections} selected={selected===null?[]:[selected]} onSelect={selectingPenalty?onSelect:undefined} enabled={i=>!tiles[i].revealed} reveals={reveals} reduced={reduced} label="나의 손패"/></div>
  <div className="hand-footer"><span>{selectingPenalty?'공개할 비공개 타일을 골라주세요':visible?'내 숫자 확인 중 · 눈 표시는 상대에게 공개됨':'공개된 숫자만 표시'}</span><span className="question-pips" aria-label={`남은 질문권 ${questionsLeft}회`}>{Array.from({length:questions},(_,i)=><i key={i} className={i<questionsLeft?'available':''}/>)}</span></div>
 </section>;
}
