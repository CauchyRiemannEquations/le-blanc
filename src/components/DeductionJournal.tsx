import {useState} from 'react';
import type {GameView,Outcome,PlayerId,QuestionResult} from '../engine/types';
import Overlay from './Overlay';
import SharedQuestion from './SharedQuestion';

type Tab='clues'|'opponent'|'moves';
export default function DeductionJournal({view,onClose,reduced}:{view:GameView;onClose:()=>void;reduced:boolean}){
 const [tab,setTab]=useState<Tab>('clues');
 const questions=tab==='opponent'?view.opponentQuestions:view.questions;
 const actor:PlayerId=tab==='opponent'?(view.player===0?1:0):view.player;
 const tabs=[{id:'clues',label:'나의 단서',count:view.questions.length},{id:'opponent',label:'상대의 질문',count:view.opponentQuestions.length},{id:'moves',label:'대전 기록',count:view.history.length}] as const;
 function questionEvent(q:QuestionResult,index:number):Outcome{return {...q,id:index,actor,type:'question',question:q.kind,reveals:[],text:''};}
 return <Overlay surface="deduction-journal" title="추리 노트" onClose={onClose} reduced={reduced} wide>
  <header className="journal-heading"><span aria-hidden="true">LE BLANC</span><h2>추리 노트</h2></header>
  <div className="journal-tabs" role="group" aria-label="기록 보기">{tabs.map(item=><button key={item.id} aria-label={item.label} aria-pressed={tab===item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}>{item.label}<span aria-hidden="true">{item.count}</span></button>)}</div>
  <p className="journal-context">{tab==='clues'?'내가 상대 카드에 물은 질문과 확인한 단서입니다.':tab==='opponent'?'상대가 내 카드에 물은 질문입니다. 상대도 이 답을 알고 있습니다.':'양쪽의 질문과 공격을 최신순으로 모았습니다.'}</p>
  <div className="journal-entries" role="region" aria-label={tabs.find(item=>item.id===tab)!.label} tabIndex={0}>
   {tab==='moves'?view.history.length===0?<p className="empty-note">아직 대전 기록이 없습니다.</p>:view.history.slice().reverse().map(event=><article className="log-entry" key={event.id}><span className="record-turn">기록 {String(event.id).padStart(2,'0')}</span>{event.type==='question'?<SharedQuestion event={event} names={view.names} compact/>:<><span className="record-actor">{view.names[event.actor]}</span><p className="record-text">{event.text}</p>{event.reveals.length>1?<span className="record-chain">CHAIN ×{event.reveals.length}</span>:null}</>}</article>):<>
    {questions.length===0?<p className="empty-note">{tab==='opponent'?'상대가 아직 질문하지 않았습니다.':'아직 질문한 내용이 없습니다.'}</p>:questions.slice().reverse().map((q,i)=><article className="clue-entry" key={`${q.turn}-${i}`}><span className="record-turn">차례 {String(q.turn).padStart(2,'0')}</span><SharedQuestion event={questionEvent(q,i)} names={view.names} compact/></article>)}
    {tab==='clues'&&view.failed.length>0?<section className="excluded-guesses"><h3>제외된 추측</h3>{view.failed.map((f,i)=><p className="failed-note" key={i}>{f.kind==='number'?`${f.a+1}번 ≠ ${f.value}`:`${f.a+1} ↔ ${f.b!+1}번 간격 ≠ ${f.value}`}</p>)}</section>:null}
   </>}
  </div>
 </Overlay>;
}
