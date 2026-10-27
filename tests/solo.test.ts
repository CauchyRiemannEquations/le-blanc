import {describe,it,expect} from 'vitest';
import {STAGES} from '../src/solo/stages';
import {matches} from '../src/solo/conditions';
import {apply,initial,observation,propagate,stars} from '../src/solo/engine';
import {candidates,recommend,hint} from '../src/solo/inference';
import {completed,emptySave,newRun,parseSave,replay} from '../src/solo/storage';
import type {Strategy} from '../src/solo/types';

describe('six handmade solo puzzles',()=>{
 for(const stage of STAGES){
  it(`${stage.id}: legal answer and universal decision-tree proof within par`,()=>{
   const boards=candidates(observation(stage,initial(stage)));
   expect(boards).toContainEqual(stage.answer);expect(new Set(stage.answer).size).toBe(stage.count);
   expect(stage.answer.every((n,i)=>n>=stage.min&&n<=stage.max&&!stage.excluded.includes(n)&&(!i||n>stage.answer[i-1]))).toBe(true);
   expect(stage.clues.every(c=>matches(stage.answer,c))).toBe(true);
   let leaves=0,maxDepth=0;
   function prove(tree:Strategy,remaining:number[][],depth:number,used:string[]){
    if(!remaining.length)return;
    expect(depth).toBeLessThanOrEqual(stage.parQuestions);
    if('done' in tree){expect(remaining.length).toBe(1);leaves++;maxDepth=Math.max(maxDepth,depth);return;}
    const q=stage.questions.find(q=>q.id===tree.question)!;expect(q).toBeDefined();expect(used).not.toContain(q.id);
    prove(tree.yes,remaining.filter(b=>matches(b,q.condition)),depth+1,[...used,q.id]);
    prove(tree.no,remaining.filter(b=>!matches(b,q.condition)),depth+1,[...used,q.id]);
   }
   prove(stage.strategy,boards,0,[]);expect(leaves).toBe(boards.length);
   console.log(`${stage.id}: ${boards.length} initial candidates, ${leaves} verified leaves, depth ${maxDepth}/${stage.parQuestions}`);
  });
  it(`${stage.id}: representative play clears without guessing, survives replay`,()=>{
   let state=initial(stage);const run=newRun(stage);
   for(const id of stage.walkthrough.questions){const a={type:'question' as const,id};state=apply(stage,state,a);run.actions.push(a);}
   for(const input of stage.walkthrough.inputs){const a={type:'guess' as const,...input};state=apply(stage,state,a);run.actions.push(a);}
   expect(state.cleared).toBe(true);expect(stars(stage,state)).toBe(3);expect(replay(run)).toEqual(state);
   const saved=completed({...emptySave(),active:run},stage,state);expect(parseSave(JSON.stringify(saved))).toEqual(saved);expect(completed(saved,stage,state).records).toHaveLength(1);
  });
 }
 it('wrong guesses, hints, notes and lucky discoveries persist and affect rating',()=>{
  const stage=STAGES[4],run=newRun(stage);run.actions=[{type:'memo',tile:2,value:8},{type:'guess',tile:2,value:8},{type:'hint'},{type:'guess',tile:2,value:9}];
  const state=replay(run);expect(state.failed).toEqual([{tile:2,value:8}]);expect(state.hintsUsed).toBe(1);expect(state.memos[2]).toEqual([8]);
  expect(replay(parseSave(JSON.stringify({...emptySave(),active:run})).active!)).toEqual(state);
  let guessed=apply(stage,initial(stage),{type:'guess',tile:2,value:9});expect(guessed.guesses).toBe(1);
  guessed=apply(stage,guessed,{type:'guess',tile:0,value:2});guessed=apply(stage,guessed,{type:'guess',tile:3,value:11});expect(stars(stage,guessed)).toBe(2);
  expect(stars(stage,{...guessed,hintsUsed:1})).toBe(1);
 });
 it('memo is never evidence; public inference is identical for different secret boards',()=>{
  const stage=STAGES[4],a=initial(stage),b=apply(stage,a,{type:'memo',tile:2,value:8});
  expect(observation(stage,a)).toEqual(observation(stage,b));
  const other={...stage,answer:[2,5,8,12]};const p=observation(stage,a),p2=observation(other,initial(other));
  expect(p).toEqual(p2);expect(JSON.stringify(p)).not.toContain('walkthrough');expect(p.stage).not.toHaveProperty('answer');
  expect(candidates(p)).toEqual(candidates(p2));expect(recommend(p)).toEqual(recommend(p2));expect(hint(p,2)).toEqual(hint(p2,2));expect(a.connections).toEqual(initial(other).connections);
 });
 it('questions are unlimited beyond par; repeats free; false answers narrow without adding edges',()=>{
  const stage=STAGES[4];let s=initial(stage);const before=candidates(observation(stage,s)).length;
  s=apply(stage,s,{type:'question',id:'middle-equal'});expect(s.answers[0].answer).toBe(false);expect(s.connections).toHaveLength(1);expect(candidates(observation(stage,s)).length).toBeLessThan(before);
  expect(apply(stage,s,{type:'question',id:'middle-equal'})).toBe(s);
  for(const id of ['last-equal','middle-larger','last-two'])s=apply(stage,s,{type:'question',id});expect(s.questionsUsed).toBe(4);expect(s.questionsUsed).toBeGreaterThan(stage.parQuestions);
 });
 it('exact edges alone reveal nothing, reverse BFS follows only connected components',()=>{
  let s=initial(STAGES[3]);expect(s.opened).toEqual([null,null,null,null]);s=apply(STAGES[3],s,{type:'guess',tile:1,value:4});expect(s.opened).toEqual([2,4,null,null]);
  const cycle={...initial(STAGES[5]),opened:[null,null,11,null,null],connections:[{a:0,b:1,delta:3},{a:1,b:2,delta:3},{a:0,b:2,delta:6}]};
  expect(propagate(cycle).map(r=>r.index).sort()).toEqual([0,1]);expect(cycle.opened).toEqual([5,8,11,null,null]);expect(propagate(cycle)).toEqual([]);
 });
 it('corrupt and mismatched saves cannot crash the game',()=>{
  for(const raw of ['bad','null','{}','{"schema":1,"records":[],"active":{"id":"x"}}'])expect(()=>parseSave(raw)).not.toThrow();
  const run=newRun(STAGES[0]);run.stageVersion=999;expect(parseSave(JSON.stringify({...emptySave(),active:run})).active).toBeNull();
 });
});
