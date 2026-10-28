import {useGameAudio} from '../music';
import MenuNavigation from '../components/MenuNavigation';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import TileRow from '../components/TileRow';
import MenuTable from '../tabletop/MenuTable';
import Tabletop from '../tabletop/Tabletop';
import Overlay from '../components/Overlay';
import {STAGES,getStage} from './stages';
import {describe,targets} from './conditions';
import {apply,stars} from './engine';
import {completed,loadSave,newRun,replay,SOLO_KEY,legacyTitle} from './storage';
import type {SoloAction,SoloSave,Stage} from './types';
import {ClueLetter,HintLetter} from './SoloLetters';
import './solo.css';

export default function SoloGame({onBack,onSettings,reduced,music}:{onBack:()=>void;onSettings:()=>void;reduced:boolean;music:boolean}){
 const [save,setSave]=useState(loadSave),[screen,setScreen]=useState<'list'|'play'|'result'>('list'),[tool,setTool]=useState<'number'|'question'|'gap'|null>(null),[panel,setPanel]=useState<'record'|'help'|'hint'|'archive'|null>(null),[tile,setTile]=useState(0),[value,setValue]=useState<number|null>(null),[memo,setMemo]=useState(false),[question,setQuestion]=useState<string|null>(null),[selected,setSelected]=useState<number[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[replace,setReplace]=useState<Stage|null>(null);
 const [storageError,setStorageError]=useState('');
 const lock=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),systemReduced=useReducedMotion();
 const reduce=reduced||!!systemReduced,run=save.active,stage=run?getStage(run.stageId)!:null,state=useMemo(()=>run?replay(run):null,[run]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function persist(next:SoloSave){try{localStorage.setItem(SOLO_KEY,JSON.stringify(next));}catch{setStorageError('기기에 저장하지 못했습니다. 저장 공간을 확인해주세요.');}setSave(next);}
 function resetTools(){setTool(null);setPanel(null);setQuestion(null);setSelected([]);setValue(null);setMessage('');}
 function start(s:Stage){persist({...save,active:newRun(s)});resetTools();setScreen('play');setReplace(null);}
 function choose(s:Stage){if(run?.stageId===s.id){resetTools();setScreen(state?.cleared?'result':'play');}else if(state&&!state.cleared)setReplace(s);else start(s);}
 function act(action:SoloAction){if(!stage||!state||!run||lock.current)return;try{
  const next=apply(stage,state,action);if(next===state){const answer=state.answers.find(a=>a.id===(action as {id?:string}).id);setMessage(`확인한 답: ${answer?.answer?'예':'아니오'} · 질문 횟수는 그대로입니다.`);setTool(null);setSelected([]);return;}
  persist(completed({...save,active:{...run,actions:[...run.actions,action]}},stage,next));
  if(action.type==='memo')return;
  const event=next.events.at(-1)!;setMessage(action.type==='hint'?'':event.text);setTool(null);setSelected([]);
  if(action.type==='hint')setPanel('hint');
  if(event.reveals.length&&!reduce){lock.current=true;setBusy(true);timer.current=setTimeout(()=>{lock.current=false;setBusy(false);},event.reveals.length*340+500);}
 }catch(e){setMessage(e instanceof Error?e.message:'다시 시도해주세요.');}}
 const index=stage?STAGES.indexOf(stage):0,q=stage?.questions.find(q=>q.id===question),latest=state?.events.at(-1),needed=q?targets(q.condition):[];
 const legacyRecords=save.records.filter(r=>!getStage(r.stageId));
 const pair=[...selected].sort((a,b)=>a-b),gapReady=pair.length===2&&pair[1]===pair[0]+1;
 const knownGap=gapReady?state?.connections.find(e=>e.a===pair[0]&&e.b===pair[1]):null;
 function select(i:number){
  if(tool==='question'&&q){setSelected(a=>a.includes(i)?a.filter(v=>v!==i):[...a,i]);}
  else if(tool==='gap'){setSelected(a=>a.includes(i)?a.filter(v=>v!==i):a.length<2?[...a,i]:[i]);setValue(null);setMessage('');}
  else {setTile(i);setTool('number');setMemo(false);setValue(null);setMessage('');}
 }
 function openTool(next:'question'|'gap'){setTool(next);setQuestion(null);setSelected([]);setValue(null);setMessage('');}
 useGameAudio(screen==='list'?'menu':screen==='result'?'victory':'solo',music);
 const best=(id:string)=>Math.max(0,...save.records.filter(r=>r.stageId===id).map(r=>r.stars));
 return <main className={`solo-screen solo-${screen}`}>
  {storageError?<p role="alert">{storageError}</p>:null}
  {screen!=='list'?<header className="solo-header"><button disabled={busy} onClick={()=>{resetTools();setScreen('list');}} aria-label="스테이지 목록">←</button><span className="brand-small">LE BLANC</span><button onClick={()=>setPanel('help')} aria-label="솔로 도움말">?</button></header>:null}
  {screen==='list'?<><MenuTable reduced={reduce}/><div className="menu-wordmark" aria-hidden="true">LE<br/>BLANC</div><section className="solo-library"><h1>솔로 모드</h1>{run&&!state?.cleared?<button className="primary solo-resume" onClick={()=>{resetTools();setScreen('play');}}>이어하기 · {stage?.title} →</button>:null}<ol className="solo-stage-list">{STAGES.map((s,i)=><li key={s.id}><button data-testid={`stage-${s.id}`} onClick={()=>choose(s)}><span className="solo-stage-no">0{i+1}</span><span><strong>{s.title}</strong><small>{s.section==='tutorial'?'튜토리얼':s.subtitle}</small></span><span aria-label={`${best(s.id)}성`} className="solo-stars">{best(s.id)?'★'.repeat(best(s.id)):'—'}</span><span>↗</span></button></li>)}</ol><MenuNavigation onBack={onBack} onSettings={onSettings}/>{legacyRecords.length||save.archivedRuns.length?<button className="solo-archive text-button" onClick={()=>setPanel('archive')}>이전 기록</button>:null}</section></>:null}
  {screen==='play'&&stage&&state?<>
   <section className="solo-heading"><span className="solo-kicker">{stage.section==='tutorial'?'튜토리얼':'암호'} 0{index+1} / 0{STAGES.length}</span><h1>{stage.title}</h1><p>질문 {state.questionsUsed} / 목표 {stage.parQuestions}</p></section>
   <Tabletop layout="play" data={{central:state.opened.map((value,slot)=>({id:`solo-${slot}`,slot,value,revealed:value!==null})),hand:stage.excluded.map((value,slot)=>({id:`clue-${slot}`,slot,value,revealed:true})),connections:state.connections,reference:true}} selected={tool==='question'||tool==='gap'?selected:tool==='number'?[tile]:[]} enabled={i=>!busy&&!state.cleared&&(tool==='gap'?selected.length!==1||selected.includes(i)||Math.abs(selected[0]-i)===1:tool==='question'?!!q:state.opened[i]===null)} onSelect={select} reduced={reduce} label="암호 타일" eventId={`${run?.id}-${state.events.length}`} revealIds={(latest?.reveals??[]).map(r=>`solo-${r.index}`)}/>
   <ClueLetter stage={stage}/>
   <div className="solo-feedback" role="status">{message|| (state.cleared?'암호를 모두 풀었습니다.':tool==='question'&&q?`질문의 대상 ${needed.map(i=>i+1).join('·')}번 타일을 선택하세요.`:tool==='number'?`${tile+1}번 타일 · ${memo?'후보를 메모합니다.':'확정할 숫자를 고르세요.'}`:tool==='gap'?'이웃한 두 타일을 선택해 간격을 연결하세요.':stage.section==='tutorial'?(index===0?'제외 숫자를 보고 타일을 해독하세요. 연결된 타일은 함께 열립니다.':'질문의 답으로 알아낸 간격은 직접 연결할 수 있습니다.'):'타일을 선택해 해독하거나 간격을 연결하세요.')}</div>
   <section className="solo-workspace">
    {tool?<div className="solo-tool"><div className="solo-tool-head"><strong>{tool==='number'?`${tile+1}번 타일`:tool==='gap'?'간격 연결':'관계 질문'}</strong><button onClick={()=>{setTool(null);setSelected([]);setQuestion(null);setMessage('');}}>취소 ×</button></div>
     {tool==='gap'?<>
      <p className="solo-gap-caption">{knownGap?`${pair[0]+1}–${pair[1]+1}번 · 간격 ${knownGap.delta} 연결됨`:gapReady?`${pair[0]+1}–${pair[1]+1}번의 정확한 간격`:selected.length?`${selected[0]+1}번 옆의 타일을 선택하세요`:'이웃한 두 타일을 선택하세요'}</p>
      {gapReady&&!knownGap?<><div className="solo-keypad" role="group" aria-label="간격 입력">{Array.from({length:stage.max-stage.min},(_,i)=>i+1).map(n=><button key={n} aria-label={`간격 ${n}`} aria-pressed={value===n} disabled={state.failedGaps.some(f=>f.a===pair[0]&&f.b===pair[1]&&f.value===n)} onClick={()=>setValue(n)}>{n}</button>)}</div><button className="primary full" disabled={value===null||busy} onClick={()=>value!==null&&act({type:'gap',a:pair[0],b:pair[1],value})}>{value===null?'간격을 선택하세요':`간격 ${value} · 연결하기`}</button></>:null}
     </>:tool==='number'?<><div className="solo-tabs"><button aria-pressed={!memo} onClick={()=>{setMemo(false);setValue(null);}}>숫자 해독</button><button aria-pressed={memo} onClick={()=>{setMemo(true);setValue(null);}}>후보 메모</button></div><div className="solo-keypad">{Array.from({length:stage.max-stage.min+1},(_,i)=>i+stage.min).map(n=>{const excluded=stage.excluded.includes(n)||state.opened.includes(n)||state.failed.some(f=>f.tile===tile&&f.value===n);return <button key={n} disabled={excluded} aria-label={`${memo?'후보':'숫자'} ${n}`} aria-pressed={memo?state.memos[tile].includes(n):value===n} onClick={()=>memo?act({type:'memo',tile,value:n}):setValue(n)}>{n}{memo&&state.memos[tile].includes(n)?<small>✓</small>:null}</button>;})}</div>{memo?<p className="solo-note">메모는 단서나 정답 판정에 영향을 주지 않습니다.</p>:<button className="primary full" disabled={value===null||busy} onClick={()=>value!==null&&act({type:'guess',tile,value})}>{value===null?'숫자를 선택하세요':`${value} · 해독하기`}</button>}</>:<>{!q?<div className="solo-question-list">{stage.questions.map(q=><button key={q.id} data-testid={`question-${q.id}`} onClick={()=>{setQuestion(q.id);setSelected([]);setMessage('');}}>{describe(q.condition)}?<small>{state.answers.some(a=>a.id===q.id)?'답 다시 보기 · 무료':'대상 선택 →'}</small></button>)}{!stage.questions.length?<p>이 판은 공개된 단서만으로 풀 수 있습니다.</p>:null}</div>:<div className="solo-question-confirm"><p>{describe(q.condition)}?</p><p>대상: {needed.map(i=>`${i+1}번`).join(' · ')}</p><button className="primary full" disabled={selected.length!==needed.length||!needed.every(i=>selected.includes(i))} onClick={()=>act({type:'question',id:q.id})}>질문 실행</button><button className="text-button" onClick={()=>{setQuestion(null);setSelected([]);}}>다른 질문</button></div>}</>}
    </div>:state.cleared?<button className="primary" disabled={busy} onClick={()=>setScreen('result')}>결과 보기 →</button>:<nav className="solo-tools" aria-label="추리 도구"><button disabled={busy} onClick={()=>openTool('gap')}>간격 연결</button><button disabled={busy} onClick={()=>openTool('question')}>질문하기</button><button disabled={busy} onClick={()=>setPanel('record')}>기록</button><button disabled={busy} onClick={()=>setPanel('hint')}>힌트</button></nav>}
   </section>
  </>:null}
  {screen==='result'&&stage&&state?<section className="solo-result"><span className="solo-kicker">암호 0{index+1} · 해독 완료</span><h1>{stage.title}</h1><div className="solo-result-stars" aria-label={`${stars(stage,state)}성`}>{'★'.repeat(stars(stage,state))}{'☆'.repeat(3-stars(stage,state))}</div><TileRow tiles={state.opened.map(value=>({value,revealed:true}))} connections={state.connections} reduced={reduce}/><p>질문 {state.questionsUsed} / 목표 {stage.parQuestions}<br/>오답 {state.failed.length+state.failedGaps.length} · 힌트 {state.hintsUsed} · 추측 입력 {state.guesses}</p><details className="solo-solution"><summary>풀이 보기</summary><p>{stage.walkthrough.explanation}</p></details><p className="solo-note">3성: 목표 이내 · 오답, 힌트, 추측 입력 없음<br/>2성: 힌트 없이 완료 · 1성: 힌트 사용</p>{index<STAGES.length-1?<button className="primary full" onClick={()=>start(STAGES[index+1])}>다음 암호 →</button>:<button className="primary full" onClick={()=>setScreen('list')}>스테이지 목록으로</button>}<button className="text-button" onClick={()=>start(stage)}>다시 풀기</button></section>:null}
  {panel?<Overlay surface={panel==='hint'?'solo-letter-overlay':''} title={panel==='record'?'추리 기록':panel==='help'?'솔로 도움말':panel==='archive'?'이전 솔로 기록':'힌트'} reduced={reduce} onClose={()=>setPanel(null)}>{panel==='archive'?<div className="solo-log"><h2>이전 여섯 판</h2><p>이전 기록은 보관되며 새 다섯 판의 성취와 구분됩니다.</p>{legacyRecords.map(r=><p key={r.runId}>{legacyTitle(r.stageId)} · {'★'.repeat(r.stars)}<br/>질문 {r.questions} · 오답 {r.mistakes} · 힌트 {r.hints}</p>)}{save.archivedRuns.map(r=><p key={r.id}>{legacyTitle(r.stageId)} · 이전 진행 기록 보관 ({r.actions.length}회 행동)</p>)}</div>:panel==='help'?<div className="help-content"><h2>단서를 읽고, 숫자를 이으세요.</h2><p>숫자는 왼쪽부터 오름차순이며 중복되지 않습니다. 제외 숫자는 들어가지 않습니다.</p><p>타일을 눌러 숫자를 해독하거나 후보를 메모하세요. 알아낸 간격은 ‘간격 연결’에서 이웃한 두 타일을 고르고 입력합니다. 질문으로 재확인할 필요는 없습니다. 질문은 대상을 선택한 다음 실행합니다. 취소하거나 같은 답을 다시 읽으면 횟수가 늘지 않습니다.</p><p>정확히 확인한 간격만 선으로 연결됩니다. 숫자 하나를 열면 그 선으로 이어진 타일도 열립니다.</p><p>질문 목표를 넘거나 틀려도 계속 풀 수 있습니다. 확정되지 않은 숫자나 간격을 맞히면 추측 입력으로 기록합니다.</p><p>3성: 목표 이내, 오답·힌트·추측 입력 없음.<br/>2성: 힌트 없이 완료. 1성: 힌트 사용.</p></div>:panel==='record'?<div className="solo-log"><h2>확인한 것들</h2>{state?.events.length?state.events.map(e=><p key={e.id}>{e.text}</p>):<p>아직 질문하거나 해독한 기록이 없습니다.</p>}</div>:<HintLetter title={stage?.title??''} hints={state?.events.filter(e=>e.kind==='hint')??[]} disabled={!state||state.cleared||busy} onHint={()=>act({type:'hint'})}/>}</Overlay>:null}
  {replace?<Overlay title="새 암호 시작" reduced={reduce} onClose={()=>setReplace(null)}><h2>진행 중인 암호를 바꿀까요?</h2><p>현재 판의 진행은 새 판으로 교체됩니다. 완료한 기록은 유지됩니다.</p><button className="primary full" onClick={()=>start(replace)}>새 판 시작</button></Overlay>:null}
 </main>;
}
