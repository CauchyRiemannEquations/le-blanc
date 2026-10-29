import {describe,it,expect} from 'vitest';
import {buildCatalog,questionVoiceId} from '../src/voice/catalog';
import {readValue,readPosition,readCount,ro,validateSpoken} from '../src/voice/korean';
import {outcomeDialogue} from '../src/voice/events';
import {voiceSettings} from '../src/voice/types';
import {createGame,applyAction,viewGame,observe} from '../src/engine/game';
import {questionOptions,questionLabel} from '../src/engine/questions';
import {createRoomState,joinRoomState,projectRoom} from '../functions/src/domain';
import {ObservedOutcomes} from '../src/gameSfx';
import {questionPresentation,speechEnabled} from '../src/voice/presentation';
import {audioSettings} from '../src/audioScene';

describe('speech semantics and Korean numbers',()=>{
 it('separates values, positions and counts and handles final consonants',()=>{
  expect([0,1,2,4,7,10,12,14].map(readValue)).toEqual(['영','일','이','사','칠','십','십이','십사']);
  expect([0,1,7,10,12].map(n=>readValue(n)+ro(readValue(n)))).toEqual(['영으로','일로','칠로','십으로','십이로']);
  expect(ro('공')).toBe('으로');expect(()=>ro('7')).toThrow();
  expect(readPosition(2)).toBe('세 번째');expect([0,1,2,4].map(readCount)).toEqual(['한 장도 없어.','한 장이야.','두 장이야.','네 장이야.']);
  for(const n of [-1,1.5,NaN])expect(()=>readValue(n)).toThrow();
  const strings=[10,12,20,22,100,102].map(n=>`합은 ${readValue(n)}.`);expect(new Set(strings).size).toBe(6);
  for(const text of ['{값읽기}','[기본] 합은 십.','[받침 O]','세 번째 카드. 7로.','합은 십이야.'])expect(()=>validateSpoken(text)).toThrow();
 });
 it('shares all actual question wording and never adds exact-sum/count answers',()=>{
  const g=createGame(42),catalog=buildCatalog(g.rules);
  for(const q of questionOptions(g.rules))for(const negate of [false,true]){const spec={...q,negate},line=catalog.find(l=>l.id===questionVoiceId(spec))!;
   expect(line.display).toBe(questionLabel(spec));expect(line.scripts.jongdae).toBe(questionLabel(spec,readValue));expect(line.scripts.ael).toBe(line.scripts.jongdae);
  }
  for(const id of ['INF_01','INF_02','INF_03','INF_06','INF_07'])expect(catalog.find(l=>l.id===id)?.status).toBe('unresolved');
  expect(catalog.filter(l=>l.scope==='game'&&l.status==='ready').some(l=>l.scripts.jongdae.startsWith('합은 '))).toBe(false);
  expect(catalog.filter(l=>l.scope==='audition')).toHaveLength(6);
  expect(catalog.find(l=>l.id==='INF_08_2_10')!.scripts.jongdae).toBe('세 번째 카드. 십으로 보겠어.');
  expect(catalog.find(l=>l.id==='INF_08_2_12')!.scripts.ael).toBe('세 번째 카드. 십이로 볼게.');
 });
 it('uses committed public positions and boolean answer, never hidden truth on a miss',()=>{
  const game=createGame(42),next=applyAction(game,0,{type:'question',kind:'sumAtMost',parameter:20,a:4,b:0});
  const view=viewGame(next,0),e=next.history[0],d=outcomeDialogue('m',view,[e])!;
  expect(d.utterances).toEqual([{speaker:0,lines:['PAIR_0_4','Q_sumAtMost_20_yes']},{speaker:1,lines:[e.answer?'INF_04':'INF_05']}]);
  const fake={id:7,actor:1 as const,type:'number' as const,a:2,value:7,success:false,reveals:[],text:'untrusted display string'};
  expect(outcomeDialogue('m',view,[fake])!.utterances).toEqual([{speaker:1,lines:['INF_08_2_7']},{speaker:0,lines:['REA_02']}]);
  expect(outcomeDialogue('m',view,[{...fake,value:21}])!.utterances).toEqual([]);
 });
 it('last correct / penalty / timeout wins all lead only to winner then loser, from speaker perspective',()=>{
  const view=viewGame(createGame(42),0);view.result={winner:1,turns:1,maxChain:1,finalChain:1};
  const e={id:99,actor:0 as const,type:'timeout' as const,reveals:[],text:''};
  expect(outcomeDialogue('m',view,[e])!.utterances).toEqual([{speaker:1,lines:['END_01']},{speaker:0,lines:['END_02']}]);
 });
 it('voices survive serialization and both perspectives; same voice is allowed; AI never receives it',()=>{
  const r=joinRoomState(createRoomState('ABCDEFGH','a','A',0,true,'female','jongdae'),'b','B',1,42,0,'male','jongdae');
  for(const uid of ['a','b'])expect(projectRoom(JSON.parse(JSON.stringify(r)),uid,2).game!.voices).toEqual(['jongdae','jongdae']);
  expect(observe(r.game!,0)).not.toHaveProperty('voices');
  const legacy=structuredClone(r);delete legacy.voices;delete legacy.game!.voices;
  expect(projectRoom(legacy,'b',2).game!.voices).toEqual(['ael','jongdae']);
  expect(()=>createRoomState('ABCDEFGH','a','A',0,true,'male','unknown')).toThrow('보이스');
  expect(()=>joinRoomState(createRoomState('ABCDEFGH','a','A',0),'b','B',1,42,0,'male',null)).toThrow('보이스');
  expect(voiceSettings({voiceVolume:NaN})).toMatchObject({voice:'jongdae',dialogue:'off',voiceVolume:.8});
 });
 it('reconnected history is only a baseline, duplicate arrivals are silent',()=>{
  const tracker=new ObservedOutcomes(),e={id:1,actor:0 as const,type:'number' as const,a:2,value:7,reveals:[],success:false,text:''};
  expect(tracker.observe('m',[]).fresh).toEqual([]);expect(tracker.observe('m',[e]).fresh).toEqual([e]);expect(tracker.observe('m',[e]).fresh).toEqual([]);
  tracker.rebase();expect(tracker.observe('m',[e,{...e,id:2}]).fresh).toEqual([]);
 });
 it('question bubbles keep authoritative speaker order and a bounded clock even with voices off',()=>{
  const next=applyAction(createGame(42,undefined,undefined,0,undefined,['ael','jongdae']),0,{type:'question',kind:'containsMultiple',parameter:3,a:4,b:0}),event=next.history[0];
  const silent=questionPresentation(viewGame(next,0),event);
  expect(silent.map(p=>p.speaker)).toEqual([0,1]);expect(silent.map(p=>p.duration)).toEqual([1800,700]);
  expect(silent[0].text).toContain('삼의 배수가 하나라도');expect(silent[1].text).toBe(event.answer?'맞아.':'아니야.');
  const opponent=questionPresentation(viewGame(next,1),event);
  expect(speechEnabled(opponent[0].speaker,1,audioSettings({dialogue:'opponent'}))).toBe(true);expect(speechEnabled(opponent[1].speaker,1,audioSettings({dialogue:'opponent'}))).toBe(false);
  expect(opponent.every(p=>p.duration<=11000)).toBe(true);
 });
});
