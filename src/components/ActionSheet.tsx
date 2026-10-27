import { useState } from 'react';
import { ArrowLeft, ArrowRight, Link2, Hash, ScanLine, GitCompareArrows, Sigma, Shapes } from 'lucide-react';
import { canTargetPair } from '../engine/game';
import { QUESTION_LABELS } from '../engine/types';
import type { Action, GameView, QuestionKind } from '../engine/types';
import Overlay from './Overlay';
import TileRow from './TileRow';
export default function ActionSheet({mode,view,onClose,onAction,reduced}:{mode:'question'|'attack';view:GameView;onClose:()=>void;onAction:(a:Action)=>void;reduced:boolean}) {
 const [kind,setKind]=useState<'number'|'gap'|QuestionKind|null>(null),[selected,setSelected]=useState<number[]>([]),[value,setValue]=useState<number|null>(null);
 const isQuestion=kind!==null&&kind!=='number'&&kind!=='gap',count=kind==='number'?1:2;
 const select=(index:number)=>{setValue(null);setSelected(prev=>prev.includes(index)?prev.filter(i=>i!==index):prev.length<count?[...prev,index]:[...prev.slice(1),index]);};
 const pairOk=selected.length===2&&kind!==null&&kind!=='number'&&canTargetPair(view,selected[0],selected[1],kind);
 const valid=kind==='number'?selected.length===1&&value!==null:pairOk&&(isQuestion||value!==null);
 function submit(){if(!valid||!kind)return;if(kind==='number')onAction({type:'number',a:selected[0],value:value!});else if(kind==='gap')onAction({type:'gap',a:selected[0],b:selected[1],value:value!});else onAction({type:'question',kind,a:selected[0],b:selected[1]});}
 function disabledNumber(n:number){if(kind==='number'){const i=selected[0];return view.own.some(t=>t.value===n)||view.opponent.some(t=>t.revealed&&t.value===n)||view.failed.some(f=>f.kind==='number'&&f.a===i&&f.value===n)||view.opponent.some((t,j)=>t.value!==null&&(j<i?t.value>=n:j>i?t.value<=n:false));}const [a,b]=[...selected].sort((x,y)=>x-y);return n<b-a||view.failed.some(f=>f.kind==='gap'&&f.a===a&&f.b===b&&f.value===n);}
 return <Overlay title={mode==='question'?'ASK A QUESTION':'MAKE YOUR MOVE'} onClose={onClose} wide reduced={reduced}>
  {!kind?<><h2>{mode==='question'?'관계에 질문을 던지세요.':'어떤 비밀을 풀까요?'}</h2><p className="muted">{mode==='question'?`답은 나에게만 공개됩니다. · 질문권 ${view.ownQuestionsLeft}회`:'정확한 숫자, 혹은 두 숫자 사이의 간격.'}</p>
  <div className="choice-list">{mode==='attack'?<><button onClick={()=>setKind('number')}><Hash/><span><strong>숫자 공격</strong><small>하나의 숫자를 정확하게 지목</small></span><ArrowRight/></button><button onClick={()=>setKind('gap')}><Link2/><span><strong>간격 공격</strong><small>두 타일을 연결해 연쇄 해독 준비</small></span><ArrowRight/></button></>:([['near',GitCompareArrows,'가까운 사이','차이가 3 이하인가?'],['sum3',Sigma,'3의 법칙','합은 3의 배수인가?'],['coprime',Shapes,'서로소','공약수가 1뿐인가?']] as const).map(([k,Icon,name,description])=><button key={k} onClick={()=>setKind(k)}><Icon/><span><strong>{name}</strong><small>{description}</small></span><ArrowRight/></button>)}</div><p className="sheet-foot">{mode==='question'?'질문 후 턴이 종료됩니다.':'틀리면 내 비공개 타일 하나를 공개합니다.'}</p></>:<>
   <button className="text-button back-inline" onClick={()=>{setKind(null);setSelected([]);setValue(null);}}><ArrowLeft size={14}/>{isQuestion?'질문 바꾸기':'공격 바꾸기'}</button>
   <h2 className="sheet-title">{isQuestion?QUESTION_LABELS[kind as QuestionKind]:kind==='number'?'숨겨진 숫자를 지목하세요.':'두 타일의 간격을 지목하세요.'}</h2>
   <p className="step-label"><span>01</span> {count===1?'상대 타일 하나 선택':'상대 타일 두 개 선택'} <b>{selected.length} / {count}</b></p>
   <TileRow tiles={view.opponent} selected={selected} onSelect={select} enabled={i=>kind!=='number'||!view.opponent[i].revealed} compact label="공격 또는 질문 대상" reduced={reduced}/>
   {selected.length===2&&!pairOk?<p className="inline-error" role="status">이미 알려졌거나 사용한 관계입니다. 다른 타일을 선택하세요.</p>:null}
   {!isQuestion&&selected.length===count&&(kind==='number'||pairOk)?<><p className="step-label"><span>02</span>{kind==='number'?'숫자 선택':'간격 선택'}<b>{value===null?'—':kind==='gap'?`+${value}`:value}</b></p><div className="number-grid" role="group" aria-label={kind==='number'?'숫자 선택':'간격 선택'}>{Array.from({length:kind==='number'?view.rules.max-view.rules.min+1:view.rules.max-view.rules.min},(_,i)=>i+(kind==='number'?view.rules.min:1)).map(n=><button key={n} className={value===n?'chosen':''} onClick={()=>setValue(n)} disabled={disabledNumber(n)} aria-pressed={value===n}>{n}</button>)}</div></>:null}
   <button className="primary full" disabled={!valid} onClick={submit}><ScanLine size={17}/>{isQuestion?'질문 확정':value===null?'값을 선택하세요':kind==='number'?`${selected[0]+1}번은 ${value} · 공격`:`${[...selected].sort((a,b)=>a-b).map(i=>i+1).join(' ↔ ')}번 간격 +${value} · 공격`}</button>
   <p className="sheet-foot">{isQuestion?'숫자는 공개되지 않습니다. 질문 후 턴이 끝납니다.':'확정한 공격은 되돌릴 수 없습니다.'}</p>
  </>}
 </Overlay>;
}
