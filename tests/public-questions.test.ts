import {it,expect} from 'vitest';
import {createGame,applyAction,observe,viewGame,answerQuestion} from '../src/engine/game';
import {enumerateCandidates,publicQuestionPressure,chooseAction} from '../src/ai/inference';
import {actInRoom,createRoomState,joinRoomState,projectRoom} from '../functions/src/domain';
it('shared questions stay on the correct target board, without exposing hidden numbers',()=>{
 const s=createGame(4242),before=observe(s,1),c=enumerateCandidates(before);
 const next=applyAction(s,0,{type:'question',kind:'sumMultiple',parameter:4,a:0,b:1}),o=observe(next,1);
 expect(o.opponentQuestions).toEqual(next.players[0].questions);expect(o.questions).toEqual([]);expect(enumerateCandidates(o)).toEqual(c);
 expect(o.opponent.filter(t=>!t.revealed).every(t=>t.value===null)).toBe(true);
 expect(viewGame(next,0).history).toEqual(viewGame(next,1).history);
 o.opponentQuestions[0].answer=!o.opponentQuestions[0].answer;expect(observe(next,1).opponentQuestions).not.toEqual(o.opponentQuestions);
});
it('AI hears public questions but pressure uses only the public silhouette of its own hand',()=>{
 const o=observe(createGame(4242),1);expect(publicQuestionPressure(o)).toBe(0);
 o.opponentQuestions=[{kind:'sumMultiple',parameter:4,a:0,b:1,turn:1,answer:answerQuestion({kind:'sumMultiple',parameter:4},o.own[0].value,o.own[1].value)}];
 const before=structuredClone(o),pressure=publicQuestionPressure(o);expect(pressure).toBeGreaterThan(0);expect(pressure).toBeLessThanOrEqual(1);expect(o).toEqual(before);
 const changed=structuredClone(o);changed.own.forEach(t=>{if(!t.revealed)t.value=999;});expect(publicQuestionPressure(changed)).toBe(pressure);
 const s=createGame(4242);s.players[0].questions=o.opponentQuestions;s.active=1;expect(()=>applyAction(s,1,chooseAction(observe(s,1),'hard',()=>.1))).not.toThrow();
});
it('online version 2 rooms are rejected, shared questions survive reconnect projection',()=>{
 let r=joinRoomState(createRoomState('ABCDEFGH','a','A',0),'b','B',1,42,0);
 r=actInRoom(r,'a',{type:'question',kind:'coprime',a:0,b:1},r.version,'question',2);
 const restored=JSON.parse(JSON.stringify(r));expect(projectRoom(restored,'b',3).game!.opponentQuestions).toEqual(r.game!.players[0].questions);
 expect(projectRoom(restored,'a',3).game!.history).toEqual(projectRoom(restored,'b',3).game!.history);
 restored.game.rules.version=2;expect(()=>projectRoom(restored,'a',3)).toThrow('이전 규칙');expect(()=>actInRoom(restored,'b',{type:'question',kind:'near',a:0,b:1},restored.version,'old',3)).toThrow('이전 규칙');
});
