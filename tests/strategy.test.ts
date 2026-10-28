import { describe,expect,it } from 'vitest';
import { applyAction,createGame,observe,seededRandom,viewGame } from '../src/engine/game';
import { chooseAction,enumerateCandidates,planAttacks } from '../src/ai/inference';
import { chooseAction as original } from './fixtures/ai-v1';
import type { AIObservation,Difficulty } from '../src/engine/types';
function linkPosition():AIObservation{return {
 gapUsed:false,rules:{version:3,gapPolicy:'continue-once',min:1,max:20,handSize:5,initialReveal:[2],questions:4},player:1,
 own:[4,8,11,12,18].map((value,i)=>({value,revealed:i===2||i===3})),ownConnections:[],
 opponent:[null,null,9,null,null].map(value=>({value,revealed:value!==null})),connections:[],
 opponentQuestions:[],questions:[{kind:'near',a:0,b:1,answer:true,turn:2},{kind:'near',a:3,b:4,answer:true,turn:4},{kind:'near',a:1,b:2,answer:false,turn:6},{kind:'sum3',a:0,b:1,answer:false,turn:8}],failed:[],ownQuestionsLeft:0,phase:'action',turn:10,active:1,
};}
describe('연결을 계획하는 AI',()=>{
 it('두 비공개 타일의 연결과 조건부 출발 숫자를 평가한다',()=>{const o=linkPosition(),c=enumerateCandidates(o),a=chooseAction(o,'hard',seededRandom(2));expect(a).toEqual({type:'gap',a:0,b:1,value:2});const plan=planAttacks(o,c).find(p=>JSON.stringify(p.action)===JSON.stringify(a))!;expect(plan.setup).toBe(true);expect(plan.payoff).toBe(0);expect(plan.anchorProbability).toBeGreaterThanOrEqual(.5);expect(plan.extraChainReveals).toBe(1);});
 it('성공한 연결은 출발 숫자 공격으로 이어져 연쇄 공개된다',()=>{const o=linkPosition();o.connections=[{a:0,b:1,delta:2}];const c=enumerateCandidates(o),action=chooseAction(o,'hard');expect(action.type).toBe('number');if(action.type!=='number')throw new Error('Expected anchor');expect([0,1]).toContain(action.a);const truth=c.find(row=>row[action.a]===action.value)!;const s=createGame(2);s.active=1;s.players[1].tiles=o.own;s.players[1].questions=o.questions;s.players[0].tiles=truth.map((value,i)=>({value,revealed:i===2}));s.players[0].connections=o.connections;const result=applyAction(s,1,action);expect(result.history.at(-1)!.reveals).toHaveLength(2);});
 it('확실하게 공개할 숫자가 있으면 연결을 억지로 만들지 않는다',()=>{const o=linkPosition();o.connections=[{a:0,b:1,delta:3}];const c=enumerateCandidates(o);expect(c.length).toBeGreaterThan(0);const certain=planAttacks(o,c).filter(a=>a.probability===1&&a.payoff>0);expect(certain.length).toBeGreaterThan(0);expect(chooseAction(o,'hard').type).toBe('number');});
 it('초급의 기존 동작을 유지한다',()=>{for(let seed=1;seed<=40;seed++){const o=observe(createGame(seed),0);expect(chooseAction(o,'easy',seededRandom(seed))).toEqual(original(o,'easy',seededRandom(seed)));}});
 it('공개된 숫자에 연결하는 동등한 공격으로 간격 횟수를 부풀리지 않는다',()=>{const o=linkPosition();for(const p of planAttacks(o,enumerateCandidates(o)))if(p.action.type==='gap'){expect(o.opponent[p.action.a].revealed).toBe(false);expect(o.opponent[p.action.b].revealed).toBe(false);}});
 it('질문 답이 후보 집합을 줄이고 상대에게도 공유된다',()=>{let s=createGame(4242);s.active=1;const before=enumerateCandidates(observe(s,1));const action=chooseAction(observe(s,1),'medium');expect(action.type).toBe('question');s=applyAction(s,1,action);const after=enumerateCandidates(observe(s,1));expect(after.length).toBeLessThan(before.length);expect(s.players[1].questions).toHaveLength(1);const human=viewGame(s,0);expect(human.opponentQuestionsLeft).toBeNull();expect(human.history.at(-1)?.answer).toBeTypeOf("boolean");expect(human.history.at(-1)?.question).toBe(action.type==="question"?action.kind:undefined);});
 it('관찰 객체를 변경하지 않으며 난이도 모두 합법적인 행동을 선택한다',()=>{for(const difficulty of ['easy','medium','hard'] as Difficulty[]){const s=createGame(9),o=observe(s,0),copy=structuredClone(o);expect(()=>applyAction(s,0,chooseAction(o,difficulty,seededRandom(5)))).not.toThrow();expect(o).toEqual(copy);}});
});
