import {useState} from 'react';
import {playSfx} from '../audio';
import {ArrowLeft,MessageCircle,Minus,Plus} from 'lucide-react';
import {questionLabel,validQuestion} from '../engine/questions';
import {canTargetPair} from '../engine/game';
import type {Action,GameView,QuestionSpec} from '../engine/types';
import Overlay from './Overlay';
import DuelTable from '../tabletop/DuelTable';
interface Props {view:GameView;onClose:()=>void;onAction:(a:Action)=>void;reduced:boolean}
type Choice='distance'|'sumMultiple'|'coprime';
export default function QuestionSheet({view,onClose,onAction,reduced}:Props){
 const [kind,setKind]=useState<Choice|null>(null),[parameter,setParameter]=useState(3),[selected,setSelected]=useState<number[]>([]);
 const question:QuestionSpec|null=kind?{kind,...(kind==='coprime'?{}:{parameter})}:null;
 const min=kind==='sumMultiple'?2:1,max=kind==='sumMultiple'?Math.min(10,view.rules.max):view.rules.max-view.rules.min-1;
 const valid=question!==null&&validQuestion(question,view.rules);
 const pairOk=valid&&selected.length===2&&canTargetPair(view,selected[0],selected[1],question!);
 function choose(next:Choice){setKind(next);setParameter(Math.min(3,next==='sumMultiple'?Math.min(10,view.rules.max):view.rules.max-view.rules.min-1));setSelected([]);}
 function select(index:number){const next=selected.includes(index)?selected.filter(i=>i!==index):selected.length<2?[...selected,index]:[selected[1],index];setSelected(next);playSfx(next.length===2&&question&&!canTargetPair(view,next[0],next[1],question)?'ui_invalid':selected.includes(index)?'card_deselect':'card_select');}
 return <Overlay surface={kind?'question-target':'question-options'} title="질문하기" onClose={onClose} wide reduced={reduced} board={<DuelTable layout="tool" view={view} selected={selected} onSelect={kind?select:undefined} label="공격 또는 질문 대상" reduced={reduced}/>}>
  {!question?<><h2>어떤 관계를 물어볼까요?</h2><div className="question-options-list">{([{kind:'distance',label:'간격',description:'두 숫자의 차이가 N 이하인가?'},{kind:'sumMultiple',label:'합의 배수',description:'두 숫자의 합이 N의 배수인가?'},{kind:'coprime',label:'서로소',description:'두 숫자의 공약수가 1뿐인가?'}] as const).map(option=><button key={option.kind} aria-label={option.label} onClick={()=>choose(option.kind)}><strong>{option.label}</strong><small>{option.description}</small></button>)}</div><p className="question-rule-note">질문과 답은 서로 공개됩니다. 확정하면 차례가 끝납니다.</p></>:<>
   <button data-sfx="ui_back" className="text-button back-inline" onClick={()=>{setKind(null);setSelected([]);}}><ArrowLeft size={14}/>질문 바꾸기</button>
   <h2 className="sheet-title">{questionLabel(question)}</h2>
   <div className="question-confirmation" role="status">{selected.length===2?`${[...selected].sort((a,b)=>a-b).map(i=>i+1).join('번 · ')}번 선택됨`:`상대 카드 2장을 고르세요 · ${selected.length} / 2`}</div>
   {kind!=='coprime'?<div className="question-parameter" role="group" aria-label={kind==='distance'?'간격 기준 조절':'합의 배수 조절'}><span>{kind==='distance'?'간격 기준':'합의 배수'}</span><button aria-label="기준 숫자 줄이기" disabled={parameter<=min} onClick={()=>setParameter(n=>n-1)}><Minus size={18}/></button><output aria-label="기준 숫자">{parameter}</output><button aria-label="기준 숫자 늘리기" disabled={parameter>=max} onClick={()=>setParameter(n=>n+1)}><Plus size={18}/></button></div>:null}
   {selected.length===2&&!pairOk?<p className="inline-error" role="alert">이미 물어본 질문이거나 두 카드가 모두 공개됐습니다. 숫자 또는 대상을 바꿔주세요.</p>:null}
   <button data-sfx="none" className="primary full" disabled={!pairOk} onClick={()=>{if(pairOk&&question)onAction({type:'question',...question,a:selected[0],b:selected[1]});}}><MessageCircle size={17}/>질문 확정</button>
  </>}
 </Overlay>;
}
