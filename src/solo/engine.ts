import {describe,matches,publicStage} from './conditions';
import {candidates,hint} from './inference';
import type {PublicState,Reveal,SoloAction,SoloState,Stage,LegacyStage} from './types';

export function observation(stage:Stage|LegacyStage,state:SoloState):PublicState{return structuredClone({stage:publicStage(stage),opened:state.opened,answers:state.answers,failed:state.failed,failedGaps:state.failedGaps,connections:state.connections});}
export function propagate(state:SoloState):Reveal[]{
 const reveals:Reveal[]=[],queue=state.opened.flatMap((v,i)=>v===null?[]:[i]);
 while(queue.length){const from=queue.shift()!;for(const e of state.connections){const to=e.a===from?e.b:e.b===from?e.a:-1;if(to<0||state.opened[to]!==null)continue;const value=state.opened[from]!+(e.a===from?e.delta:-e.delta);state.opened[to]=value;reveals.push({index:to,value,from});queue.push(to);}}
 state.cleared=state.opened.every(v=>v!==null);return reveals;
}
export function initial(stage:Stage|LegacyStage):SoloState{
 const state:SoloState={opened:Array(stage.count).fill(null),connections:stage.clues.flatMap(c=>c.kind==='gap'&&(stage.rulesVersion===1||c.pair[1]===c.pair[0]+1)?[{a:c.pair[0],b:c.pair[1],delta:c.value}]:[]),answers:[],failed:[],failedGaps:[],memos:Array.from({length:stage.count},()=>[]),questionsUsed:0,hintsUsed:0,guesses:0,events:[],cleared:false};
 stage.initialOpen.forEach(t=>state.opened[t.tile]=t.value);propagate(state);return state;
}
export function apply(stage:Stage|LegacyStage,old:SoloState,action:SoloAction):SoloState{
 if(old.cleared)throw Error('이미 해독한 판입니다.');
 const s=structuredClone(old),event={id:s.events.length,kind:action.type,text:'',reveals:[] as Reveal[],success:true,guessed:false};
 if(action.type==='question'){
  const q=stage.questions.find(q=>q.id===action.id);if(!q)throw Error('없는 질문입니다.');
  if(s.answers.some(a=>a.id===q.id))return old;
  const answer=matches(stage.answer,q.condition);s.answers.push({id:q.id,answer});s.questionsUsed++;
  event.text=`${describe(q.condition)}? → ${answer?'예':'아니오'}`;
  if(answer&&q.condition.kind==='gap'&&(stage.rulesVersion===1||q.condition.pair[1]===q.condition.pair[0]+1)){const {pair,value}=q.condition;if(!s.connections.some(e=>e.a===pair[0]&&e.b===pair[1]))s.connections.push({a:pair[0],b:pair[1],delta:value});event.reveals=propagate(s);}
 }else if(action.type==='gap'){
  const {a,b,value}=action;
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b!==a+1||b>=stage.count||!Number.isInteger(value)||value<1||value>stage.max-stage.min)throw Error('이웃한 두 타일과 간격을 확인하세요.');
  if(s.connections.some(e=>e.a===a&&e.b===b))throw Error('이미 연결한 간격입니다.');
  if(s.failedGaps.some(f=>f.a===a&&f.b===b&&f.value===value))throw Error('이미 확인한 오답입니다.');
  if(stage.answer[b]-stage.answer[a]===value){
   const boards=candidates(observation(stage,old));event.guessed=!boards.length||!boards.every(board=>board[b]-board[a]===value);
   if(event.guessed)s.guesses++;
   s.connections.push({a,b,delta:value});event.reveals=propagate(s);
   event.text=`${a+1}–${b+1}번 · 간격 ${value} 연결${event.guessed?' (추측 연결)':''}${event.reveals.length?` — ${event.reveals.length}장 해독`:''}`;
  }else{s.failedGaps.push({a,b,value});event.success=false;event.text=`${a+1}–${b+1}번 간격은 ${value}이 아닙니다.`;}
 }else if(action.type==='hint'){s.hintsUsed++;event.text=hint(observation(stage,old),s.hintsUsed);}
 else {
  const {tile,value}=action;if(!Number.isInteger(tile)||tile<0||tile>=stage.count||!Number.isInteger(value)||value<stage.min||value>stage.max||s.opened[tile]!==null)throw Error('입력할 타일과 숫자를 확인하세요.');
  if(action.type==='memo'){s.memos[tile]=s.memos[tile].includes(value)?s.memos[tile].filter(n=>n!==value):[...s.memos[tile],value].sort((a,b)=>a-b);return s;}
  if(s.failed.some(f=>f.tile===tile&&f.value===value))throw Error('이미 확인한 오답입니다.');
  if(stage.answer[tile]===value){const boards=candidates(observation(stage,old));event.guessed=!boards.length||!boards.every(b=>b[tile]===value);if(event.guessed)s.guesses++;s.opened[tile]=value;event.reveals=[{index:tile,value},...propagate(s)];event.text=`${tile+1}번 · ${value} 해독${event.reveals.length>1?` — 연결 ${event.reveals.length}장`:''}${event.guessed?' (추측 해독)':''}`;}
  else {s.failed.push({tile,value});event.success=false;event.text=`${tile+1}번은 ${value}이 아닙니다.`;}
 }
 s.events.push(event);return s;
}
export function stars(stage:Stage|LegacyStage,s:SoloState){return !s.cleared?0:s.hintsUsed?1:s.questionsUsed<=stage.parQuestions&&!s.failed.length&&!s.failedGaps.length&&!s.guesses?3:2;}
