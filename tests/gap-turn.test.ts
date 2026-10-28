import {it,expect} from 'vitest';
import {applyAction,createGame,expireTurn,observe,viewGame} from '../src/engine/game';
import {chooseAction,rankAttacks,enumerateCandidates} from '../src/ai/inference';
import {actInRoom,createRoomState,joinRoomState,projectRoom} from '../functions/src/domain';
import {duelScene,nearCardPose} from '../src/tabletop/model';
const board=()=>createGame(42);
it('zero-reveal link continues; number or pass allowed, question and second gap blocked',()=>{
 let s=board();const h=s.players[1].tiles;const action={type:'gap' as const,a:0,b:1,value:h[1].value-h[0].value};
 s=applyAction(s,0,action);expect(s.history.at(-1)!.reveals).toHaveLength(0);expect(s.phase).toBe('continue');expect(s.gapUsed).toBe(true);
 expect(()=>applyAction(s,0,{type:'gap',a:3,b:4,value:2})).toThrow();expect(()=>applyAction(s,0,{type:'question',kind:'near',a:3,b:4})).toThrow();
 expect(applyAction(s,0,{type:'number',a:0,value:h[0].value}).history.at(-1)!.reveals).toHaveLength(2);
 const next=applyAction(s,0,{type:'pass'});expect(next.gapUsed).toBe(false);expect(next.active).toBe(1);
});
it('number success preserves unused gap; invalid request consumes nothing; timeout preserves penalty',()=>{
 let s=board();expect(()=>applyAction(s,0,{type:'gap',a:0,b:0,value:1})).toThrow();expect(s.gapUsed).toBe(false);
 s=applyAction(s,0,{type:'number',a:4,value:s.players[1].tiles[4].value});expect(s.gapUsed).toBe(false);
 s=applyAction(s,0,{type:'gap',a:0,b:1,value:19});expect(s.gapUsed).toBe(true);expect(s.phase).toBe('penalty');
 const next=expireTurn(s);expect(next.history.at(-1)!.type).toBe('penalty');expect(next.gapUsed).toBe(false);expect(next.active).toBe(1);
});
it('legacy comparison remains opt-in; normal games and observation use rule v3',()=>{
 const s=createGame(42,{gapPolicy:'legacy'}),h=s.players[1].tiles;
 expect(applyAction(s,0,{type:'gap',a:0,b:1,value:h[1].value-h[0].value}).active).toBe(1);
 expect(board().rules.version).toBe(3);expect(observe(board(),0).gapUsed).toBe(false);
});
it('online link usage and deadline survive projection/reconnect; duplicate and stale requests rejected',()=>{
 const r=joinRoomState(createRoomState('ABCDEFGH','a','A',0),'b','B',1000,42,0),h=r.game!.players[1].tiles,a={type:'gap' as const,a:0,b:1,value:h[1].value-h[0].value};
 const n=actInRoom(r,'a',a,r.version,'link',2000);expect(n.deadline).toBe(r.deadline);expect(projectRoom(JSON.parse(JSON.stringify(n)),'a',4000).game!.gapUsed).toBe(true);
 expect(actInRoom(n,'a',a,r.version,'link',3000)).toBe(n);expect(()=>actInRoom(n,'a',{type:'gap',a:3,b:4,value:1},n.version,'again',3000)).toThrow();expect(()=>actInRoom(n,'a',{type:'pass'},r.version,'old',3000)).toThrow();
 const old=structuredClone(n);delete (old.game as unknown as {gapUsed?:boolean}).gapUsed;expect(()=>projectRoom(old,'a',5000)).toThrow(/이전 규칙/);
});
it('AI honours consumed gap and stays within number/pass options',()=>{
 const s=board();s.phase='continue';s.gapUsed=true;s.players[1].connections=[{a:0,b:1,delta:s.players[1].tiles[1].value-s.players[1].tiles[0].value}];const o=observe(s,0);
 expect(rankAttacks(o,enumerateCandidates(o)).every(a=>a.action.type==='number')).toBe(true);
 for(const level of ['easy','medium','hard'] as const)expect(['number','pass']).toContain(chooseAction(o,level).type);
});
it('renderer boundary masks opponent secrets and masked hand including textures source and slot labels',()=>{
 const s=board(),v=viewGame(s,0),closed=duelScene(v,false),open=duelScene(v,true);
 expect(closed.central.map(c=>c.value)).toEqual([null,null,s.players[1].tiles[2].value,null,null]);
 expect(closed.hand.filter(c=>!c.revealed).every(c=>c.value===null)).toBe(true);expect(open.hand.map(c=>c.value)).toEqual(v.own.map(c=>c.value));
 const altered=structuredClone(v);altered.opponent[0].value=999;expect(duelScene(altered,false)).toEqual(closed);
 expect(open.hand.map(c=>c.id)).toEqual(closed.hand.map(c=>c.id));
});

it('gap chain and penalty chain end the game immediately before any continuation or new turn',()=>{
 let s=board();s.players[1].tiles=[2,4,8,12,16].map((value,i)=>({value,revealed:i>=2}));s.players[1].connections=[{a:0,b:1,delta:2}];
 s=applyAction(s,0,{type:'gap',a:1,b:2,value:4});expect(s.phase).toBe('over');expect(s.result?.winner).toBe(0);expect(s.history.at(-1)?.reveals.map(r=>r.value)).toEqual([4,2]);expect(()=>applyAction(s,0,{type:'pass'})).toThrow();
 let p=board();p.players[0].tiles=[1,3,7,11,18].map((value,i)=>({value,revealed:i>=2}));p.players[0].connections=[{a:0,b:1,delta:2}];p=applyAction(p,0,{type:'gap',a:0,b:1,value:19});p=expireTurn(p);expect(p.phase).toBe('over');expect(p.result?.winner).toBe(1);expect(p.history.at(-1)?.reveals).toHaveLength(2);expect(expireTurn(p)).toBe(p);
});

it('tabletop slots never depend on revealed cards; inspection only tilts private cards',()=>{
 const game=board(),before=structuredClone(game),view=viewGame(game,0);
 for(let slot=0;slot<5;slot++){
  const down=nearCardPose(slot,5,false,false),inspect=nearCardPose(slot,5,true,false),up=nearCardPose(slot,5,false,true);
  expect(down.position).toEqual(up.position);expect(inspect.position[0]).toBe(down.position[0]);expect(inspect.position[2]).toBe(down.position[2]);expect(inspect.position[1]).toBeGreaterThan(down.position[1]);
  expect(nearCardPose(slot,5,true,true)).toEqual(up);expect(nearCardPose(slot,5,true,true,true)).toEqual(nearCardPose(slot,5,false,true,true));
 }
 duelScene(view,true);duelScene(view,false);expect(game).toEqual(before);
});

it('near duel faces point at the opponent; private inspection and solo references face the viewer',()=>{
 for(let slot=0;slot<5;slot++){
  expect(nearCardPose(slot,5,false,false).rotation[2]).toBe(Math.PI);
  expect(nearCardPose(slot,5,false,true).rotation[2]).toBe(Math.PI);
  expect(nearCardPose(slot,5,true,false).rotation[2]).toBe(0);
  expect(nearCardPose(slot,5,false,true,true).rotation[2]).toBe(0);
 }
});
