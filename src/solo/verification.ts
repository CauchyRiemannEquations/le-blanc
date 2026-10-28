/** Development-only proof runner. Not imported by the game UI. */
import {initial,apply,observation,stars} from './engine';
import {candidates} from './inference';
import {matches} from './conditions';
import type {Stage,Strategy,SoloAction,PublicState} from './types';
const check=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
export function verifyStage(stage:Stage){
 const start=observation(stage,initial(stage)),boards=candidates(start);
 check(boards.some(b=>b.join()===stage.answer.join()),`${stage.id}: answer contradicts initial evidence`);
 for(const proof of stage.proof){
  const subset={...stage,clues:proof.clues.map(i=>stage.clues[i])};
  const p=observation(subset,initial(subset));p.answers=proof.answers??[];
  const possible=candidates(p);
  check(possible.length&&possible.every(b=>proof.conclusions.every(c=>matches(b,c))),`${stage.id}: invalid explanation: ${proof.reason}`);
 }
 const paths:{board:number[];answers:PublicState['answers'];actions:SoloAction[];stars:number}[]=[];
 function branch(tree:Strategy,p:PublicState,actions:SoloAction[]){
  const remaining=candidates(p);if(!remaining.length)return;
  check(actions.length<=stage.parQuestions,`${stage.id}: exceeds question target`);
  if('done' in tree){
   check(remaining.length===1,`${stage.id}: unresolved leaf`);
   // Only after the PUBLIC evidence determines one board do we derive inputs.
   const board=remaining[0],variant={...stage,answer:board};
   let state=initial(variant);const played=[...actions];
   for(const action of played)state=apply(variant,state,action);
   for(let a=0;a<stage.count-1&&!state.cleared;a++){
    if(state.connections.some(e=>e.a===a&&e.b===a+1))continue;
    const value=board[a+1]-board[a];
    check(candidates(observation(variant,state)).every(b=>b[a+1]-b[a]===value),'unjustified gap');
    const action:SoloAction={type:'gap',a,b:a+1,value};state=apply(variant,state,action);played.push(action);
   }
   if(!state.cleared){
    const tile=state.opened.findIndex(v=>v===null),value=board[tile];
    check(candidates(observation(variant,state)).every(b=>b[tile]===value),'unjustified number');
    const action:SoloAction={type:'guess',tile,value};state=apply(variant,state,action);played.push(action);
   }
   check(state.cleared&&stars(variant,state)===3,`${stage.id}: path failed to clear without guesses`);
   paths.push({board,answers:p.answers,actions:played,stars:stars(variant,state)});return;
  }
  const q=stage.questions.find(q=>q.id===tree.question);
  check(q&&!p.answers.some(a=>a.id===q.id),`${stage.id}: invalid/repeated strategy question`);
  for(const answer of [true,false])branch(answer?tree.yes:tree.no,{...p,answers:[...p.answers,{id:q!.id,answer}]},[...actions,{type:'question',id:q!.id}]);
 }
 branch(stage.strategy,start,[]);
 check(paths.length===boards.length,`${stage.id}: some candidates not covered`);
 return {id:stage.id,initialCandidates:boards.length,target:stage.parQuestions,paths};
}
