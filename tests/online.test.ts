import { describe,it,expect } from 'vitest';
import { actInRoom,createRoomState,joinRoomState,projectRoom,expireRoomState,closeGame } from '../functions/src/domain';
import { TURN_MS } from '../src/online/types';
const setup=()=>joinRoomState(createRoomState('ABCDEFGH','alice','Alice',0),'bob','Bob',1000,42,0);
describe('서버 권한 온라인 대전',()=>{
 it('참가자만 입장하고 두 명 이후에는 닫힌다',()=>{const r=setup();expect(joinRoomState(r,'alice','Alice',1001,0,0)).toBe(r);expect(()=>joinRoomState(r,'outsider','X',1001,0,0)).toThrow();expect(()=>projectRoom(r,'outsider',1001)).toThrow();});
 it('개인 뷰는 자신의 패만 포함한다',()=>{const r=setup(),v=projectRoom(r,'alice',1001);expect(v.game!.own.every(t=>t.value!==null)).toBe(true);expect(v.game!.opponent.map(t=>t.value)).toEqual([null,null,r.game!.players[1].tiles[2].value,null,null]);expect(v).not.toHaveProperty('members');expect(v).not.toHaveProperty('seed');expect(v.finalBoards).toBeNull();});
 it('질문 대상과 내용과 답은 양쪽에게 동일하게 전달된다',()=>{const r=setup(),n=actInRoom(r,'alice',{type:'question',kind:'near',a:0,b:1},r.version,'q',2000);expect(projectRoom(n,'alice',2000).game!.history[0].answer).toBeTypeOf('boolean');const e=projectRoom(n,'bob',2000).game!.history[0];expect(e).toEqual(projectRoom(n,"alice",2000).game!.history[0]);expect(e.question).toBe("near");expect(e.answer).toBeTypeOf("boolean");expect(e.a).toBe(0);});
 it('정답 연속 공격은 시계를 초기화하지 않는다',()=>{const r=setup(),n=actInRoom(r,'alice',{type:'number',a:0,value:r.game!.players[1].tiles[0].value},r.version,'n',2000);expect(n.deadline).toBe(r.deadline);expect(n.game!.phase).toBe('continue');const p=actInRoom(n,'alice',{type:'pass'},n.version,'p',3000);expect(p.deadline).toBe(3000+TURN_MS);});
 it('오답 페널티는 서버에서 즉시 무작위로 공개한다',()=>{const r=setup(),value=r.game!.players[1].tiles[0].value===20?19:20,n=actInRoom(r,'alice',{type:'number',a:0,value},r.version,'bad',2000);expect(n.game!.active).toBe(1);expect(n.game!.players[0].tiles.filter(t=>t.revealed)).toHaveLength(2);expect(n.game!.phase).not.toBe('penalty');});
 it('경계 시각부터 공격을 받지 않고 차례를 넘긴다',()=>{const r=setup();expect(expireRoomState(r,r.deadline!-1)).toBe(r);const n=actInRoom(r,'alice',{type:'number',a:0,value:r.game!.players[1].tiles[0].value},r.version,'late',r.deadline!);expect(n.game!.active).toBe(1);expect(n.game!.players[1].tiles[0].revealed).toBe(false);expect(n.game!.history.at(-1)!.type).toBe('timeout');});
 it('중복 요청은 한 번만 적용하고 오래된 버전을 거절한다',()=>{const r=setup(),a={type:'number' as const,a:0,value:r.game!.players[1].tiles[0].value},n=actInRoom(r,'alice',a,r.version,'same',2000);expect(actInRoom(n,'alice',a,r.version,'same',2001)).toBe(n);expect(()=>actInRoom(n,'alice',{type:'pass'},r.version,'new',2001)).toThrow();});
 it('타인, 다른 차례, 임의 페널티를 거절한다',()=>{const r=setup();expect(()=>actInRoom(r,'outsider',{type:'pass'},r.version,'x',2000)).toThrow();expect(()=>actInRoom(r,'bob',{type:'number',a:0,value:1},r.version,'x',2000)).toThrow();expect(()=>actInRoom(r,'alice',{type:'penalty'},r.version,'x',2000)).toThrow();});
 it('아무도 접속하지 않은 경기도 3회 연속 시간초과로 끝난다',()=>{let r=setup();for(let i=0;i<5;i++)r=expireRoomState(r,r.deadline!);expect(r.status).toBe('finished');expect(r.game!.result!.winner).toBe(1);expect(r.deadline).toBeNull();expect(expireRoomState(r,999999)).toBe(r);});
 it('행동하면 연속 시간초과 횟수가 초기화된다',()=>{let r=setup();r=expireRoomState(r,r.deadline!);r=expireRoomState(r,r.deadline!);r=actInRoom(r,'alice',{type:'question',kind:'near',a:0,b:1},r.version,'q',r.deadline!-1);expect(r.missed[0]).toBe(0);});
 it('나가기 이후에만 최종 전체 패를 볼 수 있다',()=>{const r=closeGame(setup(),0,'나갔습니다.');expect(r.game!.result!.winner).toBe(1);expect(projectRoom(r,'bob',2000).finalBoards).toHaveLength(2);expect(()=>actInRoom(r,'bob',{type:'pass'},r.version,'x',2000)).toThrow();});
 it('30분 지난 대기방 입장을 거절한다',()=>{expect(()=>joinRoomState(createRoomState('ABCDEFGH','a','A',0),'b','B',1800001,1,0)).toThrow();});
});

it('friend reveal choice is authoritative, persists on reconnect, and old rooms default to the middle card',()=>{
 for(const initial of [false,true]){
  const waiting=createRoomState('ABCDEFGH','alice','Alice',0,initial);
  expect(projectRoom(waiting,'alice',1).initialReveal).toBe(initial);
  const room=joinRoomState(waiting,'bob','Bob',1000,42,0);
  expect(room.game!.players.map(p=>p.tiles.map(t=>t.revealed))).toEqual(Array(2).fill(initial?[false,false,true,false,false]:Array(5).fill(false)));
  const saved=JSON.parse(JSON.stringify(room));
  for(const uid of ['alice','bob'])expect(projectRoom(saved,uid,2000).initialReveal).toBe(initial);
 }
 const old=createRoomState('ABCDEFGH','alice','Alice',0);delete old.initialReveal;
 expect(joinRoomState(old,'bob','Bob',1000,42,0).game!.rules.initialReveal).toEqual([2]);
 expect(()=>createRoomState('ABCDEFGH','alice','Alice',0,'false')).toThrow();
});
