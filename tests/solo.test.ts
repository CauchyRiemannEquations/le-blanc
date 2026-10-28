import {describe,it,expect} from 'vitest';
import {STAGES} from '../src/solo/stages';
import {LEGACY_STAGES} from '../src/solo/legacyStages';
import {matches} from '../src/solo/conditions';
import {apply,initial,observation,propagate,stars} from '../src/solo/engine';
import {candidates,recommend,hint} from '../src/solo/inference';
import {completed,emptySave,newRun,parseSave,replay} from '../src/solo/storage';
import {verifyStage} from '../src/solo/verification';
import type {SoloAction} from '../src/solo/types';
const [intro,relations,anchor,choice,branches]=STAGES;
const play=(s:typeof anchor,actions=s.walkthrough.actions)=>actions.reduce((state,a)=>apply(s,state,a),initial(s));

describe('two tutorials and three distinct handmade solo games',()=>{
 for(const [i,stage] of STAGES.entries()){
  it(`${stage.id}: rules, explanation facts, every branch clears within target`,()=>{
   expect(stage.answer).toHaveLength(stage.count);
   expect(stage.answer.every((n,i)=>Number.isInteger(n)&&n>=stage.min&&n<=stage.max&&!stage.excluded.includes(n)&&(!i||n>stage.answer[i-1]))).toBe(true);
   for(const q of stage.questions)expect(typeof matches(stage.answer,q.condition)).toBe('boolean');
   const report=verifyStage(stage);expect(report.initialCandidates).toBe([1,2,1,4,4][i]);
   expect(report.paths.every(p=>p.stars===3)).toBe(true);
   console.log(`${stage.id}: ${report.initialCandidates} candidates / ${report.paths.length} cleared branches / target ${stage.parQuestions}`);
  });
  it(`${stage.id}: reference inputs are justified BEFORE submission; save restores clear`,()=>{
   let state=initial(stage);const run=newRun(stage);
   for(const a of stage.walkthrough.actions){
    const possible=candidates(observation(stage,state));expect(possible.length).toBeGreaterThan(0);
    if(a.type==='gap')expect(possible.every(b=>b[a.b]-b[a.a]===a.value)).toBe(true);
    if(a.type==='guess')expect(possible.every(b=>b[a.tile]===a.value)).toBe(true);
    state=apply(stage,state,a);run.actions.push(a);
    expect(candidates(observation(stage,state))).toContainEqual(stage.answer);
   }
   expect(state.cleared).toBe(true);expect(stars(stage,state)).toBe(3);expect(replay(run)).toEqual(state);
   const saved=completed({...emptySave(),active:run},stage,state);expect(parseSave(JSON.stringify(saved))).toEqual(saved);expect(completed(saved,stage,state).records).toHaveLength(1);
  });
 }
 it('A: combining clues fixes anchors before the gaps; initial links do not give the solution away',()=>{
  expect(initial(anchor).opened).toEqual([null,null,null,null,null]);expect(initial(anchor).connections).toEqual([]);
  const partial={...anchor,clues:anchor.clues.slice(0,4)};
  const boards=candidates(observation(partial,initial(partial)));
  expect(boards.length).toBeGreaterThan(1);expect(boards.every(b=>b[0]===3&&b[2]===10&&b[4]===17)).toBe(true);
  expect(candidates(observation(anchor,initial(anchor)))).toEqual([anchor.answer]);
 });
 it('B: already-known questions and discriminating questions have different value',()=>{
  const boards=candidates(observation(choice,initial(choice)));
  for(const id of ['left-repeat','end-three'])expect(new Set(boards.map(b=>matches(b,choice.questions.find(q=>q.id===id)!.condition))).size).toBe(1);
  for(const id of ['first-five','bridge-like-end'])expect(new Set(boards.map(b=>matches(b,choice.questions.find(q=>q.id===id)!.condition))).size).toBe(2);
  // A number can be certain even while four entire arrays remain possible.
  const s=apply(choice,initial(choice),{type:'guess',tile:1,value:7});expect(s.guesses).toBe(0);expect(candidates(observation(choice,s))).toHaveLength(4);
 });
 it('C: both root answers possible; different locations matter, no fixed second question solves both',()=>{
  const all=candidates(observation(branches,initial(branches))),root=branches.questions.find(q=>q.id==='outer-two')!;
  const yes=all.filter(b=>matches(b,root.condition)),no=all.filter(b=>!matches(b,root.condition));expect(yes).toHaveLength(2);expect(no).toHaveLength(2);
  const varies=(bs:number[][],id:string)=>new Set(bs.map(b=>matches(b,branches.questions.find(q=>q.id===id)!.condition))).size;
  expect(varies(yes,'left-eight')).toBe(2);expect(varies(no,'left-eight')).toBe(1);
  expect(varies(no,'right-three')).toBe(2);expect(varies(yes,'right-three')).toBe(1);
  for(const q of branches.questions)expect(varies(yes,q.id)===1||varies(no,q.id)===1).toBe(true);
  for(const [bs,id] of [[yes,'left-eight'],[no,'right-three']] as const){const virtual={...branches,answer:bs[0]};const state=apply(virtual,initial(virtual),{type:'question',id:'outer-two'});const p=observation(virtual,state);expect(recommend(p)?.id).toBe(id);expect(hint(p,3)).toContain(id==='left-eight'?'왼쪽 안 간격':'오른쪽 안 간격');}
 });
 it('different secret answers cannot affect initial inference, recommendations, hints or links',()=>{
  const variants=candidates(observation(branches,initial(branches))).map(answer=>({...branches,answer}));
  const p=observation(variants[0],initial(variants[0]));
  for(const s of variants){const other=observation(s,initial(s));expect(other).toEqual(p);expect(candidates(other)).toEqual(candidates(p));expect(recommend(other)).toEqual(recommend(p));for(const n of [1,2,3])expect(hint(other,n)).toEqual(hint(p,n));}
  expect(p.stage).not.toHaveProperty('answer');expect(p.stage).not.toHaveProperty('strategy');expect(p.stage).not.toHaveProperty('walkthrough');expect(p.stage).not.toHaveProperty('proof');
 });
 it('memos never become evidence; failed gaps/numbers are negative facts with no up/down hint',()=>{
  let s=initial(choice);const before=observation(choice,s);s=apply(choice,s,{type:'memo',tile:0,value:18});expect(observation(choice,s)).toEqual(before);
  s=apply(choice,s,{type:'gap',a:0,b:1,value:5});expect(s.failedGaps).toEqual([{a:0,b:1,value:5}]);expect(s.events.at(-1)?.text).toBe('1–2번 간격은 5이 아닙니다.');
  expect(candidates(observation(choice,s))).toHaveLength(2);expect(s.connections).toHaveLength(1);
  s=apply(choice,s,{type:'guess',tile:3,value:14});expect(s.failed).toEqual([{tile:3,value:14}]);expect(candidates(observation(choice,s))).toEqual([choice.answer]);expect(s.cleared).toBe(false);
  expect(()=>apply(choice,s,{type:'gap',a:0,b:1,value:5})).toThrow('이미');
 });
 it('false question narrows candidates, exact gap entry avoids re-questioning, duplicates are free',()=>{
  let s=initial(relations);s=apply(relations,s,{type:'question',id:'left-two'});expect(s.answers).toEqual([{id:'left-two',answer:false}]);expect(s.connections).toEqual([]);
  expect(apply(relations,s,{type:'question',id:'left-two'})).toBe(s);
  s=apply(relations,s,{type:'gap',a:0,b:1,value:3});expect(s.opened).toEqual([2,5,null]);expect(s.questionsUsed).toBe(1);
  s=apply(relations,s,{type:'gap',a:1,b:2,value:3});expect(s.cleared).toBe(true);expect(stars(relations,s)).toBe(3);
 });
 it('nonadjacent exact facts are evidence but not adjacency links; no solver auto-open',()=>{
  const s=apply(relations,initial(relations),{type:'question',id:'outer-six'});
  expect(candidates(observation(relations,s))).toHaveLength(1);expect(s.connections).toEqual([]);expect(s.opened).toEqual([null,5,null]);
  expect(()=>apply(anchor,initial(anchor),{type:'gap',a:0,b:2,value:7})).toThrow();
 });
 it('only registered links propagate in both directions; disconnected groups stay shut',()=>{
  let s=initial(anchor);s=apply(anchor,s,{type:'gap',a:0,b:1,value:4});s=apply(anchor,s,{type:'gap',a:3,b:4,value:3});expect(s.opened.every(v=>v===null)).toBe(true);
  s=apply(anchor,s,{type:'guess',tile:1,value:7});expect(s.opened).toEqual([3,7,null,null,null]);expect(s.events.at(-1)?.reveals.map(r=>r.index)).toEqual([1,0]);
  s.connections.push({a:0,b:2,delta:7},{a:1,b:2,delta:3});expect(propagate(s).map(r=>r.index)).toEqual([2]);expect(propagate(s)).toEqual([]);
 });
 it('par is not a limit; wrong answers/hints/lucky gap and number entries affect rating',()=>{
  const s=play(anchor,[{type:'question',id:'half-seven'},...anchor.walkthrough.actions]);expect(s.cleared).toBe(true);expect(s.questionsUsed).toBeGreaterThan(anchor.parQuestions);expect(stars(anchor,s)).toBe(2);
  const lucky=apply(branches,initial(branches),{type:'guess',tile:2,value:11});expect(lucky.guesses).toBe(1);expect(candidates(observation(branches,lucky))).toHaveLength(1);
  const luckyGap=apply(choice,initial(choice),{type:'gap',a:0,b:1,value:4});expect(luckyGap.guesses).toBe(1);expect(luckyGap.opened.every(v=>v===null)).toBe(true);
  const mistakes:SoloAction[]=[{type:'guess',tile:0,value:18},{type:'gap',a:0,b:1,value:1}];
  const cleared=play(anchor,[...mistakes,...anchor.walkthrough.actions]);expect(stars(anchor,cleared)).toBe(2);
  const hinted=play(anchor,[{type:'hint'},...anchor.walkthrough.actions]);expect(stars(anchor,hinted)).toBe(1);
 });
 it('alternate correct paths clear normally; additional questions do not block play',()=>{
  const alternate:SoloAction[]=[{type:'question',id:'left-eight'},{type:'question',id:'outer-two'},{type:'question',id:'right-three'},...branches.walkthrough.actions.filter(a=>a.type!=='question')];
  const s=play(branches,alternate);expect(s.cleared).toBe(true);expect(s.questionsUsed).toBe(3);expect(stars(branches,s)).toBe(2);
  const numbersOnly=play(anchor,anchor.answer.map((value,tile)=>({type:'guess',tile,value})));expect(numbersOnly.cleared).toBe(true);expect(stars(anchor,numbersOnly)).toBe(3);
 });
 it('hints advance with visible progress and do not repeat an already decoded anchor',()=>{
  let s=initial(anchor);s=apply(anchor,s,{type:'guess',tile:0,value:3});expect(hint(observation(anchor,s),3)).toContain('첫 간격');
  let c=apply(branches,initial(branches),{type:'question',id:'outer-two'});
  expect(hint(observation(branches,c),3)).toContain('오른쪽 안 간격');
  c=apply(branches,c,{type:'question',id:'right-three'});expect(hint(observation(branches,c),3)).not.toContain('다음 질문');
 });
 it('gaps, wrong attempts, hints, notes, answers and guesses survive refresh',()=>{
  const run=newRun(choice);run.actions=[{type:'memo',tile:0,value:18},{type:'guess',tile:0,value:18},{type:'gap',a:0,b:1,value:1},{type:'hint'},{type:'gap',a:0,b:1,value:4},{type:'question',id:'bridge-like-end'}];
  const state=replay(run);expect(state.guesses).toBe(1);expect(state.hintsUsed).toBe(1);expect(state.failedGaps).toHaveLength(1);expect(state.failed).toHaveLength(1);
  expect(replay(parseSave(JSON.stringify({...emptySave(),active:run})).active!)).toEqual(state);
 });
 it('legacy records and active run are archived without being interpreted as new clears',()=>{
  const old=LEGACY_STAGES[2],active={id:'legacy-run',stageId:old.id,stageVersion:1,rulesVersion:1,startedAt:1,actions:[{type:'question',id:'left-three'}]};
  const record={runId:'legacy-record',stageId:old.id,stageVersion:1,stars:3,questions:1,mistakes:0,hints:0,guesses:0,finishedAt:1};
  const migrated=parseSave(JSON.stringify({schema:1,active,records:[record]}));expect(migrated.active).toBeNull();expect(migrated.records).toEqual([record]);expect(migrated.archivedRuns).toEqual([active]);
  expect(STAGES.some(s=>s.id===record.stageId)).toBe(false);
  const next={...migrated,active:newRun(intro)};expect(parseSave(JSON.stringify(next))).toEqual(next);
 });
 it('corrupt or version-mismatched progress cannot crash or erase valid records',()=>{
  for(const raw of ['bad','null','{}','{"schema":2,"records":[],"active":{"id":"x"}}'])expect(()=>parseSave(raw)).not.toThrow();
  const run=newRun(intro);run.stageVersion=999;expect(parseSave(JSON.stringify({...emptySave(),active:run})).active).toBeNull();
  run.stageVersion=1;run.actions=[{type:'gap',a:0,b:2,value:3}];expect(parseSave(JSON.stringify({...emptySave(),active:run})).active).toBeNull();
 });
});
