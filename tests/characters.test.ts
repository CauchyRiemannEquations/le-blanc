import {describe,it,expect} from 'vitest';
import {CHARACTERS,randomAppearance} from '../src/engine/characters';
import {createGame,viewGame,observe,applyAction} from '../src/engine/game';
import {duelScene} from '../src/tabletop/model';
import {actInRoom,createRoomState,joinRoomState,projectRoom} from '../functions/src/domain';

describe('public character appearances',()=>{
 it('draws Carl and Sofya evenly, independently of AI difficulty',()=>{
  const draws=Array.from({length:1000},(_,i)=>randomAppearance(()=>i/1000));
  expect(draws.filter(x=>x==='female')).toHaveLength(500);
  expect(CHARACTERS[randomAppearance(()=>0)].name).toBe('Carl');
  expect(CHARACTERS[randomAppearance(()=>.5)].name).toBe('Sofya');
 });
 it('renders the opponent at either seat and keeps cosmetics outside AI information',()=>{
  const g=createGame(42,{},['Alice','Bob'],0,['female','male']);
  expect(duelScene(viewGame(g,0),false).appearance).toBe('male');
  expect(duelScene(viewGame(g,1),false).appearance).toBe('female');
  expect(observe(g,1)).toEqual(observe(createGame(42,{},['Alice','Bob']),1));
  expect(applyAction(g,0,{type:'question',kind:'coprime',a:0,b:1}).appearances).toEqual(['female','male']);
  const view=viewGame(g,0);view.appearances![0]='male';expect(g.appearances![0]).toBe('female');
 });
 it('persists each player choice, their original names, and both projections after a turn and reconnect',()=>{
  const waiting=createRoomState('ABCDEFGH','alice','Alice',0,true,'female');
  expect(projectRoom(waiting,'alice',1).appearances).toEqual(['female']);
  const r=joinRoomState(waiting,'bob','Bob',1000,42,0,'male');
  const n=actInRoom(r,'alice',{type:'question',kind:'sumAtMost',parameter:20,a:0,b:1},r.version,'q',2000);
  const saved=JSON.parse(JSON.stringify(n));
  for(const uid of ['alice','bob']){
   const v=projectRoom(saved,uid,2001);
   expect(v.names).toEqual(['Alice','Bob']);
   expect(v.appearances).toEqual(['female','male']);
   expect(v.game!.appearances).toEqual(['female','male']);
  }
  expect(joinRoomState(saved,'alice','Changed',2002,99,0,'male')).toBe(saved);
 });
 it('rejects invalid appearance values on the authoritative create/join paths',()=>{
  for(const invalid of [null,'Sofya','other',3,{},['female']]){
   expect(()=>createRoomState('ABCDEFGH','alice','Alice',0,true,invalid)).toThrow('외형');
   expect(()=>joinRoomState(createRoomState('ABCDEFGH','alice','Alice',0),'bob','Bob',1000,42,0,invalid)).toThrow('외형');
  }
 });
 it('reads old rooms and game saves without the new optional fields',()=>{
  const old=createRoomState('ABCDEFGH','alice','Alice',0);delete old.appearances;
  const r=joinRoomState(old,'bob','Bob',1000,42,0,'female');
  expect(r.game!.appearances).toEqual(['male','female']);
  delete r.appearances;delete r.game!.appearances;
  expect(projectRoom(r,'alice',2000).game!.appearances).toEqual(['male','male']);
 });
});
