import type { Action, AIObservation, GameState, GameView, GapConnection, Outcome, PlayerId, QuestionKind, QuestionSpec, RevelationEvent, Rules } from './types';
import { answerQuestion,questionKey,validQuestion } from './questions';
export { answerQuestion,gcd } from './questions';
export const DEFAULT_RULES:Rules = {version:3,gapPolicy:'continue-once',min:1,max:20,handSize:5,initialReveal:[2],questions:null};
export function questionsRemaining(limit:number|null,used:number):number|null {return limit===null?null:Math.max(0,limit-used);}
export const other = (id:PlayerId):PlayerId => id === 0 ? 1 : 0;
export function seededRandom(seed:number) { return () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function createGame(seed = Date.now(), rules:Partial<Rules> = {}, names:[string,string]=['나','Carl'], first:PlayerId=0):GameState {
  const config = {...DEFAULT_RULES,...rules};
  if(config.version!==3||!['continue-once','legacy'].includes(config.gapPolicy)||!Number.isInteger(config.min)||!Number.isInteger(config.max)||config.min<1||config.max-config.min+1 < config.handSize*2 || config.handSize<2 || (config.questions!==null&&(!Number.isInteger(config.questions)||config.questions<0)) || config.initialReveal.some(i=>i<0||i>=config.handSize) || config.initialReveal.length>=config.handSize)throw new Error('게임 설정이 올바르지 않습니다.');
  const random=seededRandom(seed), deck=Array.from({length:config.max-config.min+1},(_,i)=>i+config.min);
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  const makePlayer=(i:PlayerId):GameState['players'][number]=>({name:names[i],tiles:deck.slice(i*config.handSize,(i+1)*config.handSize).sort((a,b)=>a-b).map((value,index)=>({value,revealed:config.initialReveal.includes(index)})),connections:[],questions:[],failed:[]});
  const players:GameState['players']=[makePlayer(0),makePlayer(1)];
  return {gapUsed:false,rules:config,players,active:first,phase:'action',turn:1,sequence:0,penaltySeed:seed^0xA5F1523D,history:[],result:null,maxChain:0};
}
export function connectedDelta(edges:GapConnection[],start:number,end:number):number|null {
  const queue:[number,number][]=[[start,0]], seen=new Set([start]);
  for(let n=0;n<queue.length;n++){const [at,value]=queue[n];if(at===end)return value;for(const e of edges){let next=-1,delta=0;if(e.a===at){next=e.b;delta=e.delta;}else if(e.b===at){next=e.a;delta=-e.delta;}if(next>=0&&!seen.has(next)){seen.add(next);queue.push([next,value+delta]);}}} return null;
}
export function canTargetPair(view:AIObservation,a:number,b:number,kind:'gap'|QuestionKind|QuestionSpec):boolean {
  if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||a<0||b<0||a>=view.opponent.length||b>=view.opponent.length)return false;
  if(view.opponent[a].revealed&&view.opponent[b].revealed)return false;
  if(kind==='gap')return !(view.rules.gapPolicy==='continue-once'&&view.gapUsed)&&connectedDelta(view.connections,a,b)===null;
  return !view.questions.some(q=>questionKey(q)===questionKey(kind) && ((q.a===a&&q.b===b)||(q.a===b&&q.b===a)));
}
/** This is the only boundary used by the AI. No state references escape. */
export function observe(state:GameState,id:PlayerId):AIObservation {
  const self=state.players[id], opponent=state.players[other(id)];
  return structuredClone({gapUsed:state.gapUsed,rules:state.rules,player:id,own:self.tiles,ownConnections:self.connections,opponent:opponent.tiles.map(t=>({value:t.revealed?t.value:null,revealed:t.revealed})),connections:opponent.connections,questions:self.questions,opponentQuestions:opponent.questions,failed:self.failed,ownQuestionsLeft:questionsRemaining(state.rules.questions,self.questions.length),phase:state.phase,turn:state.turn,active:state.active});
}
export function viewGame(state:GameState,id:PlayerId):GameView {
  return {...observe(state,id),names:[state.players[0].name,state.players[1].name],opponentQuestionsLeft:questionsRemaining(state.rules.questions,state.players[other(id)].questions.length),result:state.result?{...state.result}:null,history:structuredClone(state.history)};
}
function reveal(state:GameState,id:PlayerId,index:number,reason:RevelationEvent['reason'],events:RevelationEvent[],from?:number) {
  const tile=state.players[id].tiles[index];if(tile.revealed)return;tile.revealed=true;events.push({player:id,index,value:tile.value,reason,from});
}
/** Only public seeds and confirmed edges can unlock a tile. */
function propagate(state:GameState,id:PlayerId,events:RevelationEvent[]) {
  const p=state.players[id], queue=p.tiles.flatMap((t,i)=>t.revealed?[i]:[]), visited=new Set(queue);
  for(let head=0;head<queue.length;head++){const at=queue[head];for(const e of p.connections){const next=e.a===at?e.b:e.b===at?e.a:-1;if(next<0||visited.has(next))continue;const derived=p.tiles[at].value+(e.a===at?e.delta:-e.delta);if(derived!==p.tiles[next].value)throw new Error('간격 그래프 불변식 위반');visited.add(next);reveal(state,id,next,'chain',events,at);queue.push(next);}}
}
function endTurn(s:GameState) { s.active=other(s.active);s.phase='action';s.turn++;s.gapUsed=false; }
function checkWinner(s:GameState,events:RevelationEvent[]) {
  s.maxChain=Math.max(s.maxChain,events.length);
  const loser=s.players.findIndex(p=>p.tiles.every(t=>t.revealed));
  if(loser!==-1){s.phase='over';s.result={winner:other(loser as PlayerId),turns:s.turn,maxChain:s.maxChain,finalChain:events.length};return true;}return false;
}
export function applyAction(state:GameState,actor:PlayerId,action:Action):GameState {
  const fail=(message:string):never=>{throw new Error(message);};
  if(state.phase==='over'||state.active!==actor)fail('지금은 행동할 수 없습니다.');
  if(state.phase==='penalty'&&action.type!=='penalty')fail('오답 페널티를 먼저 진행하세요.');
  if(state.phase!=='penalty'&&action.type==='penalty')fail('공개할 차례가 아닙니다.');
  const s=structuredClone(state), self=s.players[actor], target=s.players[other(actor)], view=observe(s,actor);
  const event:Outcome={id:++s.sequence,actor,type:action.type,reveals:[],text:''};
  const validIndex=(i:number)=>Number.isInteger(i)&&i>=0&&i<s.rules.handSize;
  if(action.type==='pass') {if(s.phase!=='continue')fail('공격 성공 후에만 멈출 수 있습니다.');event.text='공격을 멈췄습니다.';endTurn(s);}
  else if(action.type==='penalty') {
    // The engine draws uniformly from hidden tiles. Neither a player nor the AI
    // can choose an index; the private seed makes fixed-seed replays reproducible.
    const hidden=self.tiles.flatMap((t,i)=>t.revealed?[]:[i]);
    if(!hidden.length)fail('공개할 타일이 없습니다.');
    const index=hidden[Math.floor(seededRandom(s.penaltySeed+s.sequence*0x9E3779B9)()*hidden.length)];
    reveal(s,actor,index,'penalty',event.reveals);propagate(s,actor,event.reveals);
    event.text=`무작위로 ${index+1}번 타일이 공개됐습니다.`;
    if(!checkWinner(s,event.reveals))endTurn(s);
  }
  else if(action.type==='question') {
    if(s.phase!=='action')fail('연속 공격 중에는 질문할 수 없습니다.');
    if(!validQuestion(action,s.rules)||view.ownQuestionsLeft===0)fail('이 질문을 사용할 수 없습니다.');
    if(!canTargetPair(view,action.a,action.b,action))fail('이미 알려졌거나 사용한 질문입니다.');
    const [a,b]=[action.a,action.b].sort((x,y)=>x-y), answer=answerQuestion(action,target.tiles[a].value,target.tiles[b].value);
    const spec={kind:action.kind,...(action.parameter!==undefined?{parameter:action.parameter}:{}),...(action.negate!==undefined?{negate:action.negate}:{})};
    self.questions.push({...spec,a,b,answer,turn:s.turn});Object.assign(event,{a,b,question:action.kind,parameter:action.parameter,negate:action.negate,answer,text:'질문했습니다.'});endTurn(s);
  } else {
    if(!validIndex(action.a)||!Number.isInteger(action.value))fail('대상과 값을 확인하세요.');
    if(action.type==='number') {
      if(target.tiles[action.a].revealed||action.value<s.rules.min||action.value>s.rules.max)fail('비공개 타일과 유효한 숫자를 선택하세요.');
      if(self.failed.some(f=>f.kind==='number'&&f.a===action.a&&f.value===action.value))fail('이미 틀린 추측입니다.');
      event.success=target.tiles[action.a].value===action.value;Object.assign(event,{a:action.a,value:action.value});
      if(event.success){reveal(s,other(actor),action.a,'number',event.reveals);propagate(s,other(actor),event.reveals);event.text=`${action.a+1}번 타일, ${action.value}. 해독 성공.`;}
      else {self.failed.push({kind:'number',a:action.a,value:action.value});event.text=`${action.a+1}번 타일은 ${action.value}이 아닙니다.`;}
    } else {
      if(!validIndex(action.b)||!canTargetPair(view,action.a,action.b,'gap')||action.value<1||action.value>s.rules.max-s.rules.min)fail('이미 확정된 관계이거나 유효하지 않은 간격입니다.');
      const [a,b]=[action.a,action.b].sort((x,y)=>x-y);
      if(self.failed.some(f=>f.kind==='gap'&&f.a===a&&f.b===b&&f.value===action.value))fail('이미 틀린 간격입니다.');
      s.gapUsed=true;event.success=target.tiles[b].value-target.tiles[a].value===action.value;Object.assign(event,{a,b,value:action.value});
      if(event.success){target.connections.push({a,b,delta:action.value});propagate(s,other(actor),event.reveals);event.text=`${a+1}번과 ${b+1}번, 간격 +${action.value}. 연결 성공.`;}
      else {self.failed.push({kind:'gap',a,b,value:action.value});event.text=`${a+1}번과 ${b+1}번의 간격은 ${action.value}이 아닙니다.`;}
    }
    if(!event.success)s.phase='penalty';
    else if(!checkWinner(s,event.reveals)){if(event.reveals.length||s.rules.gapPolicy==='continue-once'&&action.type==='gap')s.phase='continue';else endTurn(s);}
  }
  s.history.push(event);return s;
}

/** Invoked by the clock authority, never accepted as a player-submitted action. */
export function expireTurn(state:GameState):GameState {
  if(state.phase==='over')return state;
  // A failed attack still owes its random reveal; timeout cannot avoid it.
  if(state.phase==='penalty')return applyAction(state,state.active,{type:'penalty'});
  const s=structuredClone(state);
  s.history.push({id:++s.sequence,actor:s.active,type:'timeout',reveals:[],text:'제한시간이 끝나 차례를 넘겼습니다.'});
  endTurn(s);return s;
}
