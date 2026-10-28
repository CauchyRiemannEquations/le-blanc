import {describe,expect,it} from 'vitest';
import {batchOutcomeCue,DeadlineWarning,ObservedOutcomes,outcomeCue} from '../src/gameSfx';
import type {Outcome} from '../src/engine/types';
const event=(id:number,type:Outcome['type'],extra:Partial<Outcome>={}):Outcome=>({id,type,actor:0,reveals:[],text:'',...extra});
describe('public outcome SFX',()=>{
 it('uses neutral semantic yes/no states, not success/failure sounds',()=>{
  expect(outcomeCue(event(1,'question',{answer:true}))).toEqual({event:'question_answer',state:'yes'});
  expect(outcomeCue(event(2,'question',{answer:false}))).toEqual({event:'question_answer',state:'no'});
 });
 it('separates correct guesses, wrong guesses, links and penalties',()=>{
  expect(outcomeCue(event(1,'number',{success:true,value:2}))).toEqual({event:'number_correct'});
  expect(outcomeCue(event(1,'number',{success:true,value:19}))).toEqual({event:'number_correct'});
  expect(outcomeCue(event(2,'number',{success:false}))).toEqual({event:'number_wrong'});
  expect(outcomeCue(event(3,'gap',{success:true}))).toEqual({event:'interval_link'});
  expect(outcomeCue(event(4,'gap',{success:false}))).toEqual({event:'number_wrong'});
  expect(outcomeCue(event(5,'penalty',{reveals:[{player:0,index:0,value:3,reason:'penalty'}]}))).toEqual({event:'penalty_reveal'});
 });
 it('leaves final results to victory/defeat and chain staging to the renderer',()=>{
  const chain=event(1,'number',{success:true,reveals:[{player:1,index:0,value:2,reason:'number'},{player:1,index:1,value:5,reason:'chain'}]});
  expect(outcomeCue(chain)).toBeNull();
  expect(outcomeCue(chain,false,true)).toEqual({event:'number_correct'});
  expect(outcomeCue({...chain,type:'gap'})).toBeNull();
  expect(outcomeCue({...chain,type:'gap'},false,true)).toEqual({event:'interval_link'});
  expect(outcomeCue({...chain,type:'penalty'})).toBeNull();
  expect(outcomeCue({...chain,type:'penalty'},false,true)).toEqual({event:'penalty_reveal'});
  expect(outcomeCue(chain,true)).toBeNull();
  expect(outcomeCue(event(2,'pass'))).toBeNull();
 });
 it('does not stack wrong and automatic penalty sounds from one server response',()=>{
  const wrong=event(5,'number',{success:false}),penalty=event(6,'penalty',{reveals:[{player:0,index:0,value:3,reason:'penalty'}]});
  expect(batchOutcomeCue([wrong,penalty])).toEqual({outcome:wrong,cue:{event:'number_wrong'}});
  expect(batchOutcomeCue([wrong,penalty],true)).toBeNull();
 });
 it('identifies actual authoritative timeout outcomes',()=>{
  expect(outcomeCue(event(7,'timeout'))).toEqual({event:'time_warning',state:'expired'});
 });
});
describe('online outcome observation',()=>{
 it('seeds initial history, emits new IDs once and ignores duplicates/out-of-order snapshots',()=>{
  const tracker=new ObservedOutcomes(),a=event(1,'question'),b=event(2,'number'),c=event(3,'penalty');
  expect(tracker.observe('A',[a,b])).toEqual({fresh:[],baseline:true});
  expect(tracker.observe('A',[a,b,c])).toEqual({fresh:[c],baseline:false});
  expect(tracker.observe('A',[a,b,c]).fresh).toEqual([]);
  expect(tracker.observe('A',[a]).fresh).toEqual([]);
 });
 it('silences reconnection/hidden backlog but permits subsequent live results',()=>{
  const tracker=new ObservedOutcomes(),a=event(1,'number'),b=event(2,'question'),c=event(3,'gap'),d=event(4,'number');
  tracker.observe('A',[]);tracker.observe('A',[a]);tracker.rebase();
  expect(tracker.observe('A',[a,b]).fresh).toEqual([]);
  expect(tracker.observe('A',[a,b,c],true).fresh).toEqual([]);
  expect(tracker.observe('A',[a,b,c,d]).fresh).toEqual([d]);
 });
 it('resets IDs for a new room and explicit new match',()=>{
  const tracker=new ObservedOutcomes(),a=event(1,'number');
  tracker.observe('A',[]);expect(tracker.observe('A',[a]).fresh).toEqual([a]);
  expect(tracker.observe('B',[a]).fresh).toEqual([]);
  tracker.reset();tracker.observe('B',[]);expect(tracker.observe('B',[a]).fresh).toEqual([a]);
 });
});
describe('deadline threshold',()=>{
 it('warns once on crossing ten seconds, not each tick or after expiry',()=>{
  const timer=new DeadlineWarning();expect(timer.sample('turn1',11_000,true,true)).toBe(false);
  expect(timer.sample('turn1',10_000,true,true)).toBe(true);
  expect(timer.sample('turn1',9_000,true,true)).toBe(false);
  expect(timer.sample('turn1',0,true,true)).toBe(false);
  expect(timer.sample('turn2',11_000,true,true)).toBe(false);
  expect(timer.sample('turn2',9_900,true,true)).toBe(true);
 });
 it('does not replay a warning on reconnect, hidden return, disabled timers or overdue snapshots',()=>{
  const timer=new DeadlineWarning();expect(timer.sample('restore',5_000,true,true)).toBe(false);
  expect(timer.sample('hidden',11_000,true,true)).toBe(false);
  expect(timer.sample('hidden',9_000,true,false)).toBe(false);
  expect(timer.sample('hidden',8_000,true,true)).toBe(false);
  expect(timer.sample(null,9_000,true,true)).toBe(false);
  expect(timer.sample('disabled',11_000,false,true)).toBe(false);
  expect(timer.sample('disabled',9_000,true,true)).toBe(false);
  expect(timer.sample('late',11_000,true,true)).toBe(false);
  expect(timer.sample('late',-1,true,true)).toBe(false);
 });
});
