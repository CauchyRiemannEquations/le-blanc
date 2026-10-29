import {describe,it,expect} from 'vitest';
import {answerQuestion,defaultQuestion,normalizeQuestion,questionKey,questionLabel,questionOptions,questionParameterRange,validQuestion} from '../src/engine/questions';
import {applyAction,canTargetPair,createGame,DEFAULT_RULES,observe,viewGame} from '../src/engine/game';
import {enumerateCandidates,rankQuestions,publicQuestionPressure} from '../src/ai/inference';
import {actInRoom,createRoomState,joinRoomState,projectRoom} from '../functions/src/domain';
import type {Action,QuestionSpec} from '../src/engine/types';

const newQuestions:QuestionSpec[]=[{kind:'sumAtMost',parameter:20},{kind:'containsMultiple',parameter:3}];
const setup=()=>joinRoomState(createRoomState('ABCDEFGH','alice','Alice',0),'bob','Bob',1000,42,0);
describe('확정된 질문 5종',()=>{
 it.each([
  ['sumAtMost',3,9,12,true],['sumAtMost',3,9,11,false],
  ['containsMultiple',6,10,3,true],['containsMultiple',6,12,3,true],
  ['containsMultiple',4,5,3,false],['sumMultiple',6,10,3,false],
  ['sumMultiple',4,5,3,true],['sumMultiple',3,8,3,false],
  ['containsMultiple',3,8,3,true],['sumMultiple',6,9,3,true],['containsMultiple',6,9,3,true],
 ] as const)('%s (%i, %i), N=%i → %s',(kind,a,b,parameter,answer)=>{
  const q={kind,parameter};expect(answerQuestion(q,a,b)).toBe(answer);expect(answerQuestion(q,b,a)).toBe(answer);
  expect(answerQuestion({...q,negate:true},a,b)).toBe(!answer);
 });
 it('모든 서로 다른 카드 쌍에서 정의 그대로 판정한다',()=>{
  for(let a=1;a<=20;a++)for(let b=a+1;b<=20;b++){
   for(let n=3;n<=38;n++)expect(answerQuestion({kind:'sumAtMost',parameter:n},a,b)).toBe(a+b<=n);
   for(let n=2;n<=10;n++)expect(answerQuestion({kind:'containsMultiple',parameter:n},a,b)).toBe(a%n===0||b%n===0);
  }
 });
 it('범위·기본값·메뉴 순서 및 일반화된 카드 범위를 공유한다',()=>{
  expect(questionOptions(DEFAULT_RULES,false)).toEqual([
   {kind:'distance',parameter:3},{kind:'sumAtMost',parameter:20},{kind:'sumMultiple',parameter:3},{kind:'containsMultiple',parameter:3},{kind:'coprime'},
  ]);
  expect(questionParameterRange('distance',DEFAULT_RULES)).toEqual({min:1,max:18});
  expect(questionParameterRange('sumAtMost',DEFAULT_RULES)).toEqual({min:3,max:38});
  expect(questionParameterRange('containsMultiple',DEFAULT_RULES)).toEqual(questionParameterRange('sumMultiple',DEFAULT_RULES));
  expect(questionParameterRange('coprime',DEFAULT_RULES)).toBeNull();
  for(const [min,max] of [[1,10],[12,30]]){
   const rules={...DEFAULT_RULES,min,max};
   expect(questionParameterRange('sumAtMost',rules)).toEqual({min:2*min+1,max:2*max-2});
   expect(validQuestion(defaultQuestion('sumAtMost',rules),rules)).toBe(true);
   expect(questionOptions(rules).every(q=>validQuestion(q,rules))).toBe(true);
  }
  const options=questionOptions(DEFAULT_RULES);
  expect(options).toHaveLength(73);expect(new Set(options.map(questionKey)).size).toBe(options.length);
 });
 it.each(newQuestions)('$kind 기준과 대상 검증, 원본 상태 보존',q=>{
  const state=createGame(42),before=structuredClone(state),range=questionParameterRange(q.kind,state.rules)!;
  for(const parameter of [undefined,NaN,Infinity,3.5,'3',null,range.min-1,range.max+1]){
   const invalid={...q,parameter} as QuestionSpec;
   expect(validQuestion(invalid,state.rules)).toBe(false);
   expect(()=>applyAction(state,0,{type:'question',...invalid,a:0,b:1})).toThrow();
  }
  for(const parameter of [range.min,range.max])expect(()=>applyAction(state,0,{type:'question',...q,parameter,a:0,b:1})).not.toThrow();
  for(const [a,b] of [[0,0],[-1,1],[0,5],[.5,1],[0,NaN]])expect(()=>applyAction(state,0,{type:'question',...q,a,b})).toThrow();
  expect(state).toEqual(before);
  state.players[1].tiles[0].revealed=true;state.players[1].tiles[1].revealed=true;
  expect(()=>applyAction(state,0,{type:'question',...q,a:0,b:1})).toThrow();
 });
 it.each(newQuestions)('$kind 역순/반대 문장은 중복, 다른 종류/N은 별개',q=>{
  let s=applyAction(createGame(42),0,{type:'question',...q,a:1,b:0});
  expect(s.active).toBe(1);expect(s.turn).toBe(2);expect(s.sequence).toBe(1);expect(s.phase).toBe('action');
  expect(s.players[0].questions[0]).toMatchObject({a:0,b:1});
  s=applyAction(s,1,{type:'question',kind:'coprime',a:0,b:1});
  expect(canTargetPair(observe(s,0),0,1,q)).toBe(false);
  for(const negate of [false,true])expect(()=>applyAction(s,0,{type:'question',...q,negate,a:0,b:1})).toThrow();
  expect(()=>applyAction(s,0,{type:'question',...q,parameter:q.parameter!+1,a:0,b:1})).not.toThrow();
  for(const kind of ['sumAtMost','sumMultiple','containsMultiple'] as const)if(kind!==q.kind){
   const parameter=Math.min(q.parameter!,10);expect(()=>applyAction(s,0,{type:'question',kind,parameter,a:0,b:1})).not.toThrow();
  }
 });
 it('동일한 카드·N의 합의 크기/합의 배수/배수 포함은 서로 다른 기록이다',()=>{
  let s=createGame(42);
  for(const kind of ['sumAtMost','sumMultiple','containsMultiple'] as const){s.active=0;s=applyAction(s,0,{type:'question',kind,parameter:3,a:0,b:1});}
  expect(new Set(s.players[0].questions.map(questionKey)).size).toBe(3);
 });
 it.each(newQuestions)('$kind 기록의 예/아니오를 정확히 후보에 적용한다',q=>{
  const o=observe(createGame(42,{initialReveal:[]}),0),before=enumerateCandidates(o);
  for(const answer of [true,false]){
   const after=enumerateCandidates({...o,questions:[{...q,a:0,b:4,turn:1,answer}]});
   expect(after.length).toBeGreaterThan(0);expect(after.length).toBeLessThan(before.length);
   expect(after).toEqual(before.filter(hand=>answerQuestion(q,hand[0],hand[4])===answer));
  }
  const s=createGame(42),next=applyAction(s,0,{type:'question',...q,a:0,b:4});
  expect(enumerateCandidates(observe(next,0))).toContainEqual(next.players[1].tiles.map(t=>t.value));
  expect(enumerateCandidates(observe(next,1))).toEqual(enumerateCandidates(observe(s,1)));
  expect(viewGame(next,0).history).toEqual(viewGame(next,1).history);
  const publicView=observe(next,1),changed=structuredClone(publicView);
  changed.own.forEach(t=>{if(!t.revealed)t.value=999;});
  expect(publicQuestionPressure(publicView)).toBe(publicQuestionPressure(changed));
 });
 it('모든 난이도의 질문 후보에 새 두 종류가 포함된다',()=>{
  const o=observe(createGame(42,{initialReveal:[]}),0),candidates=enumerateCandidates(o);
  for(const expanded of [false,true]){
   const options=rankQuestions(o,candidates,expanded);
   for(const {kind} of newQuestions)expect(options.some(q=>q.action.kind===kind&&q.information>0)).toBe(true);
   for(const {action,information} of options){
    const p=candidates.filter(row=>answerQuestion(action,row[action.a],row[action.b])).length/candidates.length;
    expect(information).toBeCloseTo(-p*Math.log2(p)-(1-p)*Math.log2(1-p),12);
   }
  }
 });
 it('기존 별칭·배수 관계·배율은 저장 복원 후에도 원래 뜻을 유지한다',()=>{
  expect(normalizeQuestion('near')).toMatchObject({kind:'distance',parameter:3});
  expect(normalizeQuestion('sum3')).toMatchObject({kind:'sumMultiple',parameter:3});
  expect(questionKey('multiple')).not.toBe(questionKey({kind:'containsMultiple',parameter:3}));
  expect(answerQuestion('multiple',4,8)).toBe(true);expect(answerQuestion({kind:'containsMultiple',parameter:3},4,8)).toBe(false);
  expect(answerQuestion('multiple',3,8)).toBe(false);expect(answerQuestion({kind:'containsMultiple',parameter:3},3,8)).toBe(true);
  for(const q of [{kind:'near'},{kind:'sum3'},{kind:'multiple'},{kind:'ratio',parameter:2}] as QuestionSpec[]){
   const s=JSON.parse(JSON.stringify(applyAction(createGame(42),0,{type:'question',...q,a:0,b:1})));
   expect(enumerateCandidates(observe(s,0))).toContainEqual(s.players[1].tiles.map((t:{value:number})=>t.value));
   expect(()=>questionLabel(s.players[0].questions[0])).not.toThrow();
  }
 });
});

describe('서버 권한 질문과 재접속',()=>{
 it.each(newQuestions)('$kind 서버가 답 계산, 한 번만 턴 전환, 양쪽 복원',q=>{
  const room=setup(),truth=room.game!.players[1].tiles,answer=answerQuestion(q,truth[0].value,truth[1].value);
  const forged={type:'question',...q,a:1,b:0,answer:!answer} as Action;
  const next=actInRoom(room,'alice',forged,room.version,'q',2000);
  expect(next.game!.history[0]).toMatchObject({question:q.kind,parameter:q.parameter,a:0,b:1,answer});
  expect(next.game!.turn).toBe(2);expect(next.game!.active).toBe(1);expect(next.game!.history).toHaveLength(1);
  expect(actInRoom(next,'alice',forged,room.version,'q',2001)).toBe(next);
  expect(()=>actInRoom(next,'alice',forged,next.version,'again',2001)).toThrow();
  const saved=JSON.parse(JSON.stringify(next)),a=projectRoom(saved,'alice',2002).game!,b=projectRoom(saved,'bob',2002).game!;
  expect(a.history).toEqual(b.history);expect(a.questions).toEqual(b.opponentQuestions);
  expect(a.active).toBe(b.active);expect(a.turn).toBe(b.turn);expect(b.active).toBe(1);
  expect(a.opponent.filter(t=>!t.revealed).every(t=>t.value===null)).toBe(true);
 });
 it.each(newQuestions)('$kind 서버는 잘못된 N·대상·차례·버전을 거부한다',q=>{
  const room=setup(),before=structuredClone(room);
  const range=questionParameterRange(q.kind,room.game!.rules)!;
  for(const parameter of [undefined,null,'3',3.2,range.min-1,range.max+1])expect(()=>actInRoom(room,'alice',{type:'question',...q,parameter,a:0,b:1} as Action,room.version,'bad',2000)).toThrow();
  for(const [a,b] of [[0,0],[0,5],[-1,1],[.5,1]])expect(()=>actInRoom(room,'alice',{type:'question',...q,a,b},room.version,'bad',2000)).toThrow();
  const action:Action={type:'question',...q,a:0,b:1};
  expect(()=>actInRoom(room,'bob',action,room.version,'wrong-turn',2000)).toThrow();
  expect(()=>actInRoom(room,'alice',action,room.version-1,'stale',2000)).toThrow();
  expect(room).toEqual(before);
 });
});
