// Frozen production AI from commit 636d9881275d96661351eb1bf040568e2e40de2f. Comparison only.
import { answerQuestion, canTargetPair, connectedDelta } from '../../src/engine/game';
import type { Action as CurrentAction, AIObservation, Difficulty, QuestionKind } from '../../src/engine/types';
// Preserve the original strategy's chosen index for historical comparisons; the
// current engine ignores it under the random-penalty rule.
type Action=Exclude<CurrentAction,{type:'penalty'}>|{type:'penalty';a:number};

export function enumerateCandidates(o:AIObservation,useQuestions=true):number[][] {
  const own=new Set(o.own.map(t=>t.value)), pool=Array.from({length:o.rules.max-o.rules.min+1},(_,i)=>o.rules.min+i).filter(n=>!own.has(n)), result:number[][]=[];
  const search=(hand:number[],start:number)=>{
    const index=hand.length;
    if(index===o.rules.handSize){if(useQuestions&&o.questions.some(q=>answerQuestion(q.kind,hand[q.a],hand[q.b])!==q.answer))return;result.push([...hand]);return;}
    for(let p=start;p<=pool.length-(o.rules.handSize-index);p++){
      const n=pool[p];if(o.opponent[index].value!==null&&o.opponent[index].value!==n)continue;
      if(o.failed.some(f=>f.kind==='number'&&f.a===index&&f.value===n))continue;
      hand.push(n);
      const invalid=o.connections.some(e=>e.b===index&&n-hand[e.a]!==e.delta) || o.failed.some(f=>f.kind==='gap'&&f.b===index&&n-hand[f.a]===f.value) || (useQuestions&&o.questions.some(q=>q.b===index&&answerQuestion(q.kind,hand[q.a],n)!==q.answer));
      if(!invalid)search(hand,p+1);hand.pop();
    }
  };search([],0);return result;
}
export interface RatedAttack { action:Action; probability:number; payoff:number; score:number }
export interface RatedQuestion { action:Extract<Action,{type:'question'}>; information:number }
function componentSize(o:AIObservation,index:number) {return o.opponent.reduce((n,t,i)=>n+(!t.revealed&&connectedDelta(o.connections,index,i)!==null?1:0),0);}
export function rankAttacks(o:AIObservation,candidates:number[][]):RatedAttack[] {
  const result:RatedAttack[]=[];
  function count(a:number,b?:number){const frequencies=new Map<number,number>();for(const c of candidates){const value=b===undefined?c[a]:c[b]-c[a];frequencies.set(value,(frequencies.get(value)??0)+1);}return frequencies;}
  for(let a=0;a<o.rules.handSize;a++){
    if(!o.opponent[a].revealed)for(const [value,n] of count(a)){const p=n/candidates.length,payoff=componentSize(o,a);result.push({action:{type:'number',a,value},probability:p,payoff,score:p*(1+payoff*.7)-(1-p)*1.3});}
    for(let b=a+1;b<o.rules.handSize;b++)if(canTargetPair(o,a,b,'gap'))for(const [value,n] of count(a,b)){
      if(o.failed.some(f=>f.kind==='gap'&&f.a===a&&f.b===b&&f.value===value))continue;
      const p=n/candidates.length,anchored=o.opponent[a].revealed||o.opponent[b].revealed;
      const payoff=anchored?componentSize(o,o.opponent[a].revealed?b:a):(componentSize(o,a)+componentSize(o,b))*.3;
      result.push({action:{type:'gap',a,b,value},probability:p,payoff,score:p*(.55+payoff*.7)-(1-p)*1.3});
    }
  } return result.sort((a,b)=>b.score-a.score||b.probability-a.probability);
}
export function rankQuestions(o:AIObservation,candidates:number[][]):RatedQuestion[] {
  const result:RatedQuestion[]=[];
  for(const kind of ['near','sum3','coprime'] as QuestionKind[])for(let a=0;a<o.rules.handSize;a++)for(let b=a+1;b<o.rules.handSize;b++)if(canTargetPair(o,a,b,kind)){
    const p=candidates.filter(c=>answerQuestion(kind,c[a],c[b])).length/candidates.length;
    const information=p>0&&p<1?-p*Math.log2(p)-(1-p)*Math.log2(1-p):0;
    if(information>0)result.push({action:{type:'question',kind,a,b},information});
  }return result.sort((a,b)=>b.information-a.information);
}
/** Pure strategy. The full GameState type is deliberately absent from this module. */
export function chooseAction(o:AIObservation,difficulty:Difficulty='medium',random:()=>number=Math.random):Action {
  if(o.phase==='over'||o.active!==o.player)throw new Error('AI가 행동할 차례가 아닙니다.');
  if(o.phase==='penalty'){
    const choices=o.own.flatMap((t,i)=>t.revealed?[]:[{index:i,cost:o.own.filter((tile,j)=>!tile.revealed&&connectedDelta(o.ownConnections,i,j)!==null).length}]).sort((a,b)=>a.cost-b.cost);
    return {type:'penalty',a:choices[difficulty==='easy'?Math.floor(random()*choices.length):0].index};
  }
  const candidates=enumerateCandidates(o,difficulty!=='easy');
  if(!candidates.length)throw new Error('합법적인 후보가 없습니다.');
  const ranked=rankAttacks(o,candidates);
  let attack=ranked[0];
  if(difficulty==='easy'){
    const possible=ranked.filter(x=>x.probability>=.12);attack=(possible.length?possible:ranked)[Math.floor(random()*Math.min(8,possible.length||ranked.length))];
  } else if(difficulty==='medium') {
    const possible=ranked.filter(x=>x.score>=ranked[0].score-.08);attack=possible[Math.floor(random()*possible.length)];
  }
  if(!attack)throw new Error('가능한 공격이 없습니다.');
  const hidden=o.own.filter(t=>!t.revealed).length;
  const threshold=difficulty==='easy'?.33:difficulty==='medium'?.58:(hidden===1?.87:.69);
  if(o.phase==='continue'&&attack.probability<threshold)return {type:'pass'};
  if(o.phase==='action'&&o.ownQuestionsLeft!==0){
    const questions=rankQuestions(o,candidates);
    const question=difficulty==='easy'?questions[Math.floor(random()*questions.length)]:questions[0];
    const askThreshold=difficulty==='easy'?.37:difficulty==='medium'?.62:.78;
    if(question && question.information>.25 && attack.probability<askThreshold && (difficulty!=='easy'||random()<.55))return question.action;
  }
  return attack.action;
}

