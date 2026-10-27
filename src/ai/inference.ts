import { answerQuestion, canTargetPair, connectedDelta } from '../engine/game';
import type { Action, AIObservation, Difficulty } from '../engine/types';
import { questionOptions } from '../engine/questions';
export function enumerateCandidates(o:AIObservation,useQuestions=true):number[][] {
  const own=new Set(o.own.map(t=>t.value)), pool=Array.from({length:o.rules.max-o.rules.min+1},(_,i)=>o.rules.min+i).filter(n=>!own.has(n)), result:number[][]=[];
  const search=(hand:number[],start:number)=>{
    const index=hand.length;
    if(index===o.rules.handSize){if(useQuestions&&o.questions.some(q=>answerQuestion(q,hand[q.a],hand[q.b])!==q.answer))return;result.push([...hand]);return;}
    for(let p=start;p<=pool.length-(o.rules.handSize-index);p++){
      const n=pool[p];if(o.opponent[index].value!==null&&o.opponent[index].value!==n)continue;
      if(o.failed.some(f=>f.kind==='number'&&f.a===index&&f.value===n))continue;
      hand.push(n);
      const invalid=o.connections.some(e=>e.b===index&&n-hand[e.a]!==e.delta) || o.failed.some(f=>f.kind==='gap'&&f.b===index&&n-hand[f.a]===f.value) || (useQuestions&&o.questions.some(q=>q.b===index&&answerQuestion(q,hand[q.a],n)!==q.answer));
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
export function rankQuestions(o:AIObservation,candidates:number[][],expanded=true):RatedQuestion[] {
  const result:RatedQuestion[]=[];
  const options=expanded?questionOptions(o.rules):questionOptions(o.rules).slice(0,3);
  for(const spec of options)for(let a=0;a<o.rules.handSize;a++)for(let b=a+1;b<o.rules.handSize;b++)if(canTargetPair(o,a,b,spec)){
    const p=candidates.filter(c=>answerQuestion(spec,c[a],c[b])).length/candidates.length;
    const information=p>0&&p<1?-p*Math.log2(p)-(1-p)*Math.log2(1-p):0;
    if(information>0)result.push({action:{type:'question',...spec,a,b},information});
  }return result.sort((a,b)=>b.information-a.information);
}
/** Pure strategy. The full GameState type is deliberately absent from this module. */
export function chooseAction(o:AIObservation,difficulty:Difficulty='medium',random:()=>number=Math.random):Action {
  if(o.phase==='over'||o.active!==o.player)throw new Error('AI가 행동할 차례가 아닙니다.');
  if(o.phase==='penalty')return {type:'penalty'};
  const candidates=enumerateCandidates(o,difficulty!=='easy');
  if(!candidates.length)throw new Error('합법적인 후보가 없습니다.');
  const ranked=rankAttacks(o,candidates);
  if(difficulty!=='easy')return planAction(o,candidates,ranked,difficulty,random);
  const possible=ranked.filter(x=>x.probability>=.12);
  const attack=(possible.length?possible:ranked)[Math.floor(random()*Math.min(8,possible.length||ranked.length))];
  if(!attack)throw new Error('가능한 공격이 없습니다.');
  if(o.phase==='continue'&&attack.probability<.33)return {type:'pass'};
  if(o.phase==='action'&&o.ownQuestionsLeft>0){
    const questions=rankQuestions(o,candidates,false);
    const question=questions[Math.floor(random()*questions.length)];
    if(question&&question.information>.25&&attack.probability<.37&&random()<.55)return question.action;
  }
  return attack.action;
}

interface NumberOpportunity { utility:number; probability:number; reveals:number }
// Style utility, not a claim of an optimal minimax win rate. Links must also pass
// probability/anchor gates, a tempo cost, and the current hand's exposure risk.
const CONNECTION_POLICY={minimumGapProbability:.4,minimumAnchorProbability:.5,chainOptionWeight:3,questionLinkInformationWeight:.4};
function exposureCost(o:AIObservation):number {
  const hidden=o.own.flatMap((t,i)=>t.revealed?[]:[i]);
  // Each hidden TILE is equally likely, so larger connected components are also
  // more likely to be drawn. Price that expected loss instead of a chosen tile.
  return hidden.reduce((cost,i)=>{const size=hidden.filter(j=>connectedDelta(o.ownConnections,i,j)!==null).length;return cost+size+(size===hidden.length?2.4:hidden.length<=2?.5:0);},0)/hidden.length;
}
function nextNumberOpportunity(o:AIObservation,candidates:number[][],risk:number):NumberOpportunity {
  let best:NumberOpportunity={utility:0,probability:0,reveals:0};
  const remaining=o.opponent.filter(t=>!t.revealed).length;
  for(let i=0;i<o.opponent.length;i++)if(!o.opponent[i].revealed){
    const values=new Map<number,number>();for(const row of candidates)values.set(row[i],(values.get(row[i])??0)+1);
    const p=Math.max(...values.values())/candidates.length,reveals=componentSize(o,i);
    const utility=p*(reveals+(reveals===remaining?2:0))-(1-p)*risk;
    if(utility>best.utility)best={utility,probability:p,reveals};
  }return best;
}
/** A hypothetical SUCCESS belief, built from the guessed value/edge, never the true hand. */
function successObservation(o:AIObservation,action:Action):AIObservation {
  const next=structuredClone(o);
  if(action.type==='number')next.opponent[action.a]={value:action.value,revealed:true};
  if(action.type==='gap')next.connections.push({a:action.a,b:action.b,delta:action.value});
  for(let i=0;i<next.opponent.length;i++)if(next.opponent[i].revealed){
    for(let j=0;j<next.opponent.length;j++)if(!next.opponent[j].revealed){const delta=connectedDelta(next.connections,i,j);if(delta!==null)next.opponent[j]={value:next.opponent[i].value!+delta,revealed:true};}
  }return next;
}
export interface PlannedAttack extends RatedAttack { followupProbability:number; followupReveals:number; setup:boolean; anchorProbability:number; extraChainReveals:number }
/** Two-action belief lookahead: price the setup turn, then a conditional anchor attack. */
export function planAttacks(o:AIObservation,candidates:number[][],ranked=rankAttacks(o,candidates)):PlannedAttack[] {
  const risk=exposureCost(o),remaining=o.opponent.filter(t=>!t.revealed).length;
  // Keep the modal values per target/pair. Include ties so no value is picked by its actual truth.
  const maxima=new Map<string,number>();
  const key=(a:Action)=>a.type==='number'?`n${a.a}`:a.type==='gap'?`g${a.a}:${a.b}`:'';
  for(const entry of ranked)maxima.set(key(entry.action),Math.max(maxima.get(key(entry.action))??0,entry.probability));
  return ranked.filter(e=>e.probability==maxima.get(key(e.action))&&!(e.action.type==='gap'&&(o.opponent[e.action.a].revealed||o.opponent[e.action.b].revealed))).map(entry=>{
    const a=entry.action;
    const supported=candidates.filter(row=>a.type==='number'?row[a.a]===a.value:a.type==='gap'?row[a.b]-row[a.a]===a.value:false);
    const projected=successObservation(o,a),revealed=remaining-projected.opponent.filter(t=>!t.revealed).length;
    const followup=nextNumberOpportunity(projected,supported,risk),setup=a.type==='gap'&&revealed===0;
    let anchorProbability=0,extraChainReveals=0;
    if(setup&&a.type==='gap'){
      const anchors=new Map<number,number>();for(const row of supported)anchors.set(row[a.a],(anchors.get(row[a.a])??0)+1);
      anchorProbability=Math.max(...anchors.values())/supported.length;
      extraChainReveals=Math.min(componentSize(o,a.a),componentSize(o,a.b));
    }
    const winBonus=revealed===remaining?3:0;
    const futureDiscount=setup?.78:.72;
    const information=-Math.log2(entry.probability);
    // A durable link is an option to reveal extra tiles from ANY later anchor,
    // including the opponent's penalty. Price that option only when both the
    // relation and a conditional anchor are plausible, never as a flat gap bonus.
    const chainOption=setup&&entry.probability>=CONNECTION_POLICY.minimumGapProbability&&anchorProbability>=CONNECTION_POLICY.minimumAnchorProbability?entry.probability*anchorProbability*extraChainReveals*CONNECTION_POLICY.chainOptionWeight:0;
    const score=entry.probability*(revealed+winBonus+futureDiscount*followup.utility+.12*information)-(1-entry.probability)*risk-(setup?.12:0)+chainOption;
    return {...entry,score,payoff:revealed,followupProbability:followup.probability,followupReveals:followup.reveals,setup,anchorProbability,extraChainReveals};
  }).sort((a,b)=>b.score-a.score||b.probability-a.probability);
}
function planAction(o:AIObservation,candidates:number[][],ranked:RatedAttack[],difficulty:'medium'|'hard',random:()=>number):Action {
  const attacks=planAttacks(o,candidates,ranked);
  if(!attacks.length)throw new Error('가능한 공격이 없습니다.');
  // Certain revelations should never be delayed just to manufacture a connection.
  const certain=attacks.filter(a=>a.probability===1&&a.payoff>0);
  const choices=certain.length?certain:attacks;
  const close=choices.filter(a=>a.score>=choices[0].score-(difficulty==='medium'?.07:0));
  const best=close[difficulty==='medium'?Math.floor(random()*close.length):0];
  if(o.phase==='continue'){
    const threshold=difficulty==='medium'?.55:o.own.filter(t=>!t.revealed).length===1?.86:.63;
    return best.score>0&&best.probability>=threshold?best.action:{type:'pass'};
  }
  if(!certain.length&&o.ownQuestionsLeft>0){
    // Value both answers by the attacks they enable, rather than spending all question
    // tokens until an arbitrary attack-probability threshold is met.
    const questions=rankQuestions(o,candidates).slice(0,difficulty==='hard'?12:5).map(q=>{
      const yes:number[][]=[],no:number[][]=[];
      for(const row of candidates)(answerQuestion(q.action,row[q.action.a],row[q.action.b])?yes:no).push(row);
      const future=(yes.length*Math.max(0,planAttacks(o,yes)[0]?.score??0)+no.length*Math.max(0,planAttacks(o,no)[0]?.score??0))/candidates.length;
      const {a,b}=q.action;
      const gapEntropy=(rows:number[][])=>{const counts=new Map<number,number>();for(const row of rows){const d=row[b]-row[a];counts.set(d,(counts.get(d)??0)+1);}return [...counts.values()].reduce((h,n)=>{const p=n/rows.length;return h-p*Math.log2(p);},0);};
      const linkInformation=canTargetPair(o,a,b,'gap')&&!o.opponent[a].revealed&&!o.opponent[b].revealed?gapEntropy(candidates)-(yes.length*gapEntropy(yes)+no.length*gapEntropy(no))/candidates.length:0;
      return {...q,score:.78*future+.12*q.information+CONNECTION_POLICY.questionLinkInformationWeight*linkInformation-.12};
    }).sort((a,b)=>b.score-a.score);
    if(questions[0]&&questions[0].score>best.score)return questions[0].action;
  }
  return best.action;
}
