import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {DialoguePlayer} from '../src/voice/player';
import type {VoiceManifest,VoiceSettings} from '../src/voice/types';
import type {Dialogue} from '../src/voice/events';
class Gain{gain={value:1};connect=vi.fn();disconnect=vi.fn();}
class Source {buffer:{url:string}|undefined;onended:(()=>void)|null=null;connect=vi.fn();disconnect=vi.fn();start=vi.fn();stop=vi.fn();}
class Context{sources:Source[]=[];createBufferSource(){const s=new Source();this.sources.push(s);return s;}createGain(){return new Gain();}decodeAudioData=vi.fn(async(b:ArrayBuffer)=>({url:new TextDecoder().decode(b)}));}
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const dialogue=(id='m:1'):Dialogue=>({id,ttl:12000,utterances:[{speaker:0,lines:['PAIR_0_1','Q']},{speaker:1,lines:['YES']}]});
let context:Context,player:DialoguePlayer,settings:VoiceSettings,audible:boolean,manifest:VoiceManifest;const duck=vi.fn();
beforeEach(()=>{
 vi.useFakeTimers();context=new Context();settings={voice:'jongdae',dialogue:'all',voiceVolume:.8};audible=true;duck.mockReset();
 manifest={version:1,assets:[]};for(const voice of ['jongdae','ael'] as const)for(const id of ['PAIR_0_1','Q','YES']){const key=String(manifest.assets.length+1).padStart(64,'0');manifest.assets.push({key,file:`/audio/voice/files/${key}.mp3`,lineIds:[id],voice,text:id,status:'ready'});}
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>manifest,arrayBuffer:async()=>new TextEncoder().encode(url.endsWith('manifest.json')?JSON.stringify(manifest):url).buffer})));
 player=new DialoguePlayer({context:()=>context as unknown as AudioContext,destination:()=>new Gain() as unknown as AudioNode,settings:()=>settings,audible:()=>audible,duck});
});
afterEach(()=>{player.dispose();vi.useRealTimers();vi.unstubAllGlobals();});
describe('dialogue playback without game locks',()=>{
 it('plays targets → question → respondent once, keeps same-voice speakers separate and restores music',async()=>{
  player.play(dialogue(),['jongdae','jongdae'],0);await flush();expect(context.sources).toHaveLength(1);expect(duck).toHaveBeenLastCalledWith(true);
  player.play(dialogue(),['jongdae','jongdae'],0);await flush();expect(context.sources).toHaveLength(1);
  context.sources[0].onended!();await flush();expect(context.sources).toHaveLength(2);context.sources[1].onended!();await flush();expect(context.sources).toHaveLength(3);
  context.sources[2].onended!();await flush();expect(duck).toHaveBeenLastCalledWith(false);
 });
 it('opponent-only uses the speaker id from either player perspective',async()=>{
  settings.dialogue='opponent';player.play(dialogue(),['jongdae','ael'],0);await flush();expect(context.sources[0].buffer?.url).toBe(manifest.assets[5].file);
  player.cancel();player.play(dialogue('m:2'),['jongdae','ael'],1);await flush();expect(context.sources[1].buffer?.url).toBe(manifest.assets[0].file);
 });
 it('rapid next action cancels queued old answers and late fetch/decode cannot resurrect them',async()=>{
  let resolve!:(value:unknown)=>void;context.decodeAudioData.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}) as never);
  player.play(dialogue(),['jongdae','ael'],0);await flush();player.play({id:'m:2',ttl:1000,utterances:[]},['jongdae','ael'],0);resolve({url:'stale'});await flush();expect(context.sources).toHaveLength(0);expect(duck).toHaveBeenLastCalledWith(false);
 });
 it('TTL, mute, volume zero and scene disposal cancel the voice and restore ducking',async()=>{
  player.play(dialogue(),['jongdae','ael'],0);await flush();await vi.advanceTimersByTimeAsync(12001);expect(context.sources[0].stop).toHaveBeenCalled();expect(context.sources).toHaveLength(1);expect(duck).toHaveBeenLastCalledWith(false);
  player.play(dialogue('m:2'),['jongdae','ael'],0);await flush();settings.voiceVolume=.25;player.update();settings.voiceVolume=0;player.update();expect(duck).toHaveBeenLastCalledWith(false);
  settings.voiceVolume=.8;audible=false;player.play(dialogue('m:3'),['jongdae','ael'],0);await flush();expect(context.sources).toHaveLength(2);audible=true;player.play(dialogue('m:3'),['jongdae','ael'],0);expect(context.sources).toHaveLength(2);
 });
 it('preloads silently, reuses downloads on commit, and reports missing assets instead of pretending completion',async()=>{
  player.preload(['PAIR_0_1','Q'],'jongdae');await flush();expect(context.sources).toHaveLength(0);const requests=vi.mocked(fetch).mock.calls.length;
  const state=vi.fn();player.play({id:'m:prefetched',ttl:12000,utterances:[{speaker:0,lines:['PAIR_0_1','Q']}]},['jongdae','ael'],0,false,state);await flush();expect(vi.mocked(fetch).mock.calls).toHaveLength(requests);expect(state).toHaveBeenCalledWith('started');
  player.cancel();player.play({id:'m:missing',ttl:12000,utterances:[{speaker:0,lines:['MISSING']}]},['jongdae','ael'],0,false,state);await flush();expect(state).toHaveBeenLastCalledWith('error');
 });
 it('missing assets, HTTP errors and invalid decode never block or call Typecast',async()=>{
  manifest.assets=[];player.play(dialogue(),['jongdae','ael'],0);await flush();expect(context.sources).toHaveLength(0);expect(duck).toHaveBeenLastCalledWith(false);
  expect(vi.mocked(fetch).mock.calls.every(([url])=>String(url).startsWith('/audio/voice/'))).toBe(true);
 });
 it('a slow download still plays the visible conversation fully after preparation',async()=>{
  let release!:(v:unknown)=>void;context.decodeAudioData.mockImplementationOnce(()=>new Promise(r=>{release=r;}) as never);
  const listener=vi.fn();player.play(dialogue(),['jongdae','ael'],0,false,listener);await flush();
  await vi.advanceTimersByTimeAsync(1800);expect(listener).not.toHaveBeenCalled();release({url:'late'});await flush();expect(context.sources).toHaveLength(1);expect(listener).toHaveBeenLastCalledWith('started');
  for(let i=0;i<3;i++){context.sources[i].onended!();await flush();}expect(listener).toHaveBeenLastCalledWith('complete');
 });
});
