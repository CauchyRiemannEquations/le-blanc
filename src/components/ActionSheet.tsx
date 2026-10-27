import { useState } from 'react';
import { ArrowLeft,ArrowRight,Link2,Hash,ScanLine } from 'lucide-react';
import { canTargetPair } from '../engine/game';
import type { Action,GameView } from '../engine/types';
import Overlay from './Overlay';
import TileRow from './TileRow';
import QuestionSheet from './QuestionSheet';
interface Props { mode:'question'|'attack';view:GameView;onClose:()=>void;onAction:(a:Action)=>void;reduced:boolean }
export default function ActionSheet(props:Props) {return props.mode==='question'?<QuestionSheet {...props}/>:<AttackSheet {...props}/>;}
function AttackSheet({view,onClose,onAction,reduced}:Props) {
 const [kind,setKind]=useState<'number'|'gap'|null>(null),[selected,setSelected]=useState<number[]>([]),[value,setValue]=useState<number|null>(null);
 const count=kind==='number'?1:2;
 const select=(index:number)=>{setValue(null);setSelected(prev=>prev.includes(index)?prev.filter(i=>i!==index):prev.length<count?[...prev,index]:[...prev.slice(1),index]);};
 const pairOk=selected.length===2&&canTargetPair(view,selected[0],selected[1],'gap');
 const valid=(kind==='number'?selected.length===1:pairOk)&&value!==null;
 function submit(){if(!valid||!kind)return;if(kind==='number')onAction({type:'number',a:selected[0],value:value!});else onAction({type:'gap',a:selected[0],b:selected[1],value:value!});}
 function disabledNumber(n:number){if(kind==='number'){const i=selected[0];return view.own.some(t=>t.value===n)||view.opponent.some(t=>t.revealed&&t.value===n)||view.failed.some(f=>f.kind==='number'&&f.a===i&&f.value===n)||view.opponent.some((t,j)=>t.value!==null&&(j<i?t.value>=n:j>i?t.value<=n:false));}const [a,b]=[...selected].sort((x,y)=>x-y);return n<b-a||view.failed.some(f=>f.kind==='gap'&&f.a===a&&f.b===b&&f.value===n);}
 return <Overlay title={kind?`${kind==='gap'?'간격 공격':'숫자 공격'}${selected.length?' · '+[...selected].sort((a,b)=>a-b).map(i=>`${i+1}번`).join(' ↔ '):''}`:'공격하기'} onClose={onClose} wide reduced={reduced} board={<TileRow tiles={view.opponent} selected={selected} onSelect={kind?select:undefined} enabled={i=>kind!=='number'||!view.opponent[i].revealed} connections={view.connections} label="공격 또는 질문 대상" reduced={reduced}/>}>
  {!kind?<><h2>무엇을 맞힐까요?</h2><div className="choice-list"><button onClick={()=>setKind('number')}><Hash/><span><strong>숫자 공격</strong><small>타일 하나의 숫자 맞히기</small></span><ArrowRight/></button><button onClick={()=>setKind('gap')}><Link2/><span><strong>간격 공격</strong><small>두 숫자의 차이를 맞혀 연결하기</small></span><ArrowRight/></button></div><p className="sheet-foot">틀리면 내 비공개 타일 한 장이 무작위로 공개됩니다.</p></>:<>
   <button className="text-button back-inline" onClick={()=>{setKind(null);setSelected([]);setValue(null);}}><ArrowLeft size={14}/>공격 바꾸기</button>
   <h2 className="sheet-title">{kind==='number'?'숫자를 맞혀보세요.':'두 숫자의 차이는?'}</h2>
   <p className="step-label"><span>01</span>{count===1?'상대 타일 하나 선택':'상대 타일 두 개 선택'}<b>{selected.length} / {count}</b></p>

   {selected.length===2&&!pairOk?<p className="inline-error" role="status">이미 알려진 관계입니다. 다른 타일을 선택하세요.</p>:null}
   {selected.length===count&&(kind==='number'||pairOk)?<><p className="step-label"><span>02</span>{kind==='number'?'숫자 선택':'간격 선택'}<b>{value===null?'—':kind==='gap'?`+${value}`:value}</b></p><div className="number-grid" role="group" aria-label={kind==='number'?'숫자 선택':'간격 선택'}>{Array.from({length:kind==='number'?view.rules.max-view.rules.min+1:view.rules.max-view.rules.min},(_,i)=>i+(kind==='number'?view.rules.min:1)).map(n=><button key={n} className={value===n?'chosen':''} onClick={()=>setValue(n)} disabled={disabledNumber(n)} aria-pressed={value===n}>{n}</button>)}</div><p className="number-hint">{kind==='gap'?'1–19':'1–20'} 중 선택 · 좌우로 넘기기</p></>:null}
   <button className="primary full" disabled={!valid} onClick={submit}><ScanLine size={17}/>{value===null?'값을 선택하세요':kind==='number'?`${selected[0]+1}번은 ${value} · 공격`:`${[...selected].sort((a,b)=>a-b).map(i=>i+1).join(' ↔ ')}번 간격 +${value} · 공격`}</button>
   <button className="secondary full cancel-action" onClick={onClose}>취소</button><p className="sheet-foot">틀리면 내 비공개 타일 한 장이 무작위로 공개됩니다.</p>
  </>}
 </Overlay>;
}
