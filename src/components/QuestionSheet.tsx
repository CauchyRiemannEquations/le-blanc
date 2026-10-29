import {questionVoiceId,targetVoiceId} from '../voice/catalog';
import {useEffect,useRef,useState} from 'react';
import {playSfx,preloadVoice} from '../audio';
import {ArrowLeft,MessageCircle,Minus,Plus} from 'lucide-react';
import {QUESTION_CHOICES,defaultQuestion,questionLabel,questionParameterRange,validQuestion} from '../engine/questions';
import type {MenuQuestionKind} from '../engine/questions';
import {canTargetPair} from '../engine/game';
import type {Action,GameView,QuestionSpec} from '../engine/types';
import Overlay from './Overlay';
import DuelTable from '../tabletop/DuelTable';
interface Props {view:GameView;onClose:()=>void;onAction:(a:Action)=>void;reduced:boolean}
export default function QuestionSheet({view,onClose,onAction,reduced}:Props){
 const [kind,setKind]=useState<MenuQuestionKind|null>(null),[parameter,setParameter]=useState(3),[selected,setSelected]=useState<number[]>([]);
 const submitted=useRef(false);
 const question:QuestionSpec|null=kind?{kind,...(kind==='coprime'?{}:{parameter})}:null;
 const range=kind?questionParameterRange(kind,view.rules):null;
 const choice=QUESTION_CHOICES.find(option=>option.kind===kind);
 const valid=question!==null&&validQuestion(question,view.rules);
 const pairOk=valid&&selected.length===2&&canTargetPair(view,selected[0],selected[1],question!);
 useEffect(()=>{if(!pairOk||!question)return;const timer=setTimeout(()=>{const voices=view.voices??['jongdae','jongdae'];preloadVoice([targetVoiceId(selected[0],selected[1]),questionVoiceId(question)],voices[view.player]);preloadVoice(['INF_04','INF_05'],voices[1-view.player]);},100);return()=>clearTimeout(timer);},[pairOk,kind,parameter,selected[0],selected[1],view.player,view.voices?.[0],view.voices?.[1]]);
 function choose(next:MenuQuestionKind){setKind(next);setParameter(defaultQuestion(next,view.rules).parameter??3);setSelected([]);}
 function select(index:number){const next=selected.includes(index)?selected.filter(i=>i!==index):selected.length<2?[...selected,index]:[selected[1],index];setSelected(next);playSfx(next.length===2&&question&&!canTargetPair(view,next[0],next[1],question)?'ui_invalid':selected.includes(index)?'card_deselect':'card_select');}
 return <Overlay surface={kind?'question-target':'question-options'} title="질문하기" onClose={onClose} wide reduced={reduced} board={<DuelTable layout="tool" view={view} selected={selected} onSelect={kind?select:undefined} label="공격 또는 질문 대상" reduced={reduced}/>}>
  {!question?<><h2>어떤 관계를 물어볼까요?</h2><div className="question-options-list">{QUESTION_CHOICES.map(option=><button key={option.kind} aria-label={option.label} onClick={()=>choose(option.kind)}><strong>{option.label}</strong><small>{option.description}</small></button>)}</div><p className="question-rule-note">질문과 답은 서로 공개됩니다. 확정하면 차례가 끝납니다.</p></>:<>
   <button data-sfx="ui_back" className="text-button back-inline" onClick={()=>{setKind(null);setSelected([]);}}><ArrowLeft size={14}/>질문 바꾸기</button>
   <h2 className="sheet-title">{questionLabel(question)}</h2>
   <div className="question-confirmation" role="status">{selected.length===2?`${[...selected].sort((a,b)=>a-b).map(i=>i+1).join('번 · ')}번 선택됨`:`상대 카드 2장을 고르세요 · ${selected.length} / 2`}</div>
   {range?<div className="question-parameter" role="group" aria-label={`${choice?.label} 기준 조절`}><span>{choice?.label}<small>{range.min}~{range.max}</small></span><button aria-label="기준 숫자 줄이기" disabled={parameter<=range.min} onClick={()=>setParameter(n=>Math.max(range.min,n-1))}><Minus size={18}/></button><output aria-label="기준 숫자">{parameter}</output><button aria-label="기준 숫자 늘리기" disabled={parameter>=range.max} onClick={()=>setParameter(n=>Math.min(range.max,n+1))}><Plus size={18}/></button></div>:null}
   {selected.length===2&&!pairOk?<p className="inline-error" role="alert">이미 물어본 질문이거나 두 카드가 모두 공개됐습니다. 숫자 또는 대상을 바꿔주세요.</p>:null}
   <button data-sfx="none" className="primary full" disabled={!pairOk} onClick={()=>{if(pairOk&&question&&!submitted.current){submitted.current=true;onAction({type:'question',...question,a:selected[0],b:selected[1]});}}}><MessageCircle size={17}/>질문 확정</button>
  </>}
 </Overlay>;
}
