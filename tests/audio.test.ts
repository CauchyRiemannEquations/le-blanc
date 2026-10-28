import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {GameAudio} from '../src/soundtrack';
import {audioSettings,duelAudio} from '../src/audioScene';

class Param {
 value=1; ramps:number[]=[];
 setValueAtTime=vi.fn((value:number)=>{this.value=value;});
 cancelAndHoldAtTime=vi.fn(); cancelScheduledValues=vi.fn();
 linearRampToValueAtTime=vi.fn((value:number)=>{this.ramps.push(value);this.value=value;});
 exponentialRampToValueAtTime=vi.fn();
}
class Node {
 gain=new Param(); frequency=new Param(); type='sine'; loop=false; buffer:unknown; onended:(()=>void)|null=null;
 connect=vi.fn(); disconnect=vi.fn(); start=vi.fn(); stop=vi.fn();
}
class Context {
 static instances:Context[]=[];
 currentTime=0; state='suspended'; destination={}; gains:Node[]=[]; sources:Node[]=[]; oscillators:Node[]=[];
 constructor(){Context.instances.push(this);}
 createGain(){const n=new Node();this.gains.push(n);return n;}
 createBufferSource(){const n=new Node();this.sources.push(n);return n;}
 createOscillator(){const n=new Node();this.oscillators.push(n);return n;}
 resume=vi.fn(async()=>{this.state='running';}); suspend=vi.fn(async()=>{this.state='suspended';}); close=vi.fn(async()=>{this.state='closed';});
 decodeAudioData=vi.fn(async(data:unknown)=>data);
}
const enabled={sound:true,music:true,ambience:true,muted:false,volume:.7};
let audio:GameAudio;
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const context=()=>Context.instances.at(-1)!;
const sources=(name:string)=>context().sources.filter(n=>String(n.buffer).includes(name));
beforeEach(()=>{
 vi.useFakeTimers();Context.instances=[];vi.stubGlobal('AudioContext',Context);
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>url})));
 audio=new GameAudio();audio.setSettings(enabled);
});
afterEach(()=>{audio.dispose();vi.useRealTimers();vi.unstubAllGlobals();});
describe('settings and result perspective',()=>{
 it('preserves old opt-out and validates persisted volume',()=>{
  expect(audioSettings({sound:false})).toMatchObject({sound:false,music:false,ambience:false});
  expect(audioSettings({sound:true})).toMatchObject({sound:true,music:true,ambience:true});
  expect(audioSettings({volume:NaN}).volume).toBe(.7);
  expect(audioSettings({volume:5}).volume).toBe(1);
  expect(audioSettings(null).sound).toBe(false);
 });
 it('handles AI/friend perspectives and shared-device winner celebration',()=>{
  expect(duelAudio({winner:1},0,'match').result?.cue).toBe('defeat');
  expect(duelAudio({winner:1},1,'match').result?.cue).toBe('victory');
  expect(duelAudio({winner:1},0,'match',true).result?.cue).toBe('victory');
  expect(duelAudio(null,0,'match').result).toBeUndefined();
 });
});
describe('audio lifecycle',()=>{
 it('waits for a gesture, uses full loops and does not restart for rerenders/turns',async()=>{
  audio.setScene({track:'menu'});expect(fetch).not.toHaveBeenCalled();
  await audio.unlock();await flush();
  expect(sources('bgm_menu')).toHaveLength(1);expect(sources('amb_tavern')).toHaveLength(1);
  for(let i=0;i<5;i++){audio.setScene({track:'menu'});await audio.unlock();}
  await flush();expect(context().sources).toHaveLength(2);
  expect(context().sources.every(n=>n.loop&&n.start.mock.calls.length===1)).toBe(true);
 });
 it('crossfades only when the replacement decodes; keeps ambience and releases old buffers',async()=>{
  await audio.unlock();await flush();const old=sources('bgm_menu')[0],amb=sources('amb_tavern')[0];
  let resolve!:(v:unknown)=>void;
  context().decodeAudioData.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
  audio.setScene({track:'solo'});await flush();await vi.advanceTimersByTimeAsync(600);
  expect(old.stop).not.toHaveBeenCalled();
  resolve('bgm_solo.ogg');await flush();
  const next=sources('bgm_solo')[0];expect(next.start).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(500);expect(old.stop).toHaveBeenCalledOnce();expect(old.disconnect).toHaveBeenCalledOnce();
  expect(amb.stop).not.toHaveBeenCalled();
 });
 it('ignores late decodes after quick navigation and disposal',async()=>{
  let resolve!:(v:unknown)=>void;
  await audio.unlock();await flush();
  context().decodeAudioData.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
  audio.setScene({track:'solo'});await flush();audio.setScene({track:'duel'});await flush();
  resolve('bgm_solo.ogg');await flush();
  expect(sources('bgm_solo')).toHaveLength(0);expect(sources('bgm_duel')).toHaveLength(1);
  audio.dispose();expect(context().close).toHaveBeenCalledOnce();
  expect(context().sources.every(s=>s.stop.mock.calls.length>0)).toBe(true);
 });
 it('rapidly returning to the fading song keeps its source',async()=>{
  await audio.unlock();await flush();audio.setScene({track:'solo'});await flush();audio.setScene({track:'menu'});await flush();
  await vi.advanceTimersByTimeAsync(500);
  expect(sources('bgm_menu')).toHaveLength(1);expect(sources('bgm_menu')[0].stop).not.toHaveBeenCalled();
  expect(sources('bgm_solo')[0].stop).toHaveBeenCalledOnce();
 });
 it('plays one result cue, ducks music, restores it and permits the next result entry',async()=>{
  await audio.unlock();await flush();
  const result={id:'one',cue:'victory' as const};
  audio.setScene({track:'duel',result});await flush();
  const cue=sources('cue_victory')[0];expect(cue.loop).toBe(false);expect(context().gains[1].gain.value).toBe(.16);
  audio.setScene({track:'duel',result:{...result}});audio.setSettings({...enabled,volume:.5});await flush();
  expect(sources('cue_victory')).toHaveLength(1);
  cue.onended!();await flush();expect(context().gains[1].gain.value).toBe(.65);
  audio.setScene({track:'duel'});audio.setScene({track:'duel',result});await flush();
  expect(sources('cue_victory')).toHaveLength(2);
 });
 it('does not replay hidden or muted results, and cancels in-flight cues on leaving',async()=>{
  await audio.unlock();await flush();audio.setHidden(true);
  audio.setScene({track:'duel',result:{id:'hidden',cue:'defeat'}});audio.setHidden(false);await flush();
  expect(sources('cue_defeat')).toHaveLength(0);
  audio.setSettings({...enabled,muted:true});audio.setScene({track:'duel',result:{id:'muted',cue:'defeat'}});
  audio.setSettings(enabled);await flush();expect(sources('cue_defeat')).toHaveLength(0);
  let resolve!:(v:unknown)=>void;context().decodeAudioData.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
  audio.setScene({track:'duel',result:{id:'late',cue:'defeat'}});await flush();
  audio.setScene({track:'menu'});resolve('cue_defeat.ogg');await flush();expect(sources('cue_defeat')).toHaveLength(0);
 });
 it('pauses and resumes loops across visibility, mute and zero volume without restarting',async()=>{
  await audio.unlock();await flush();const menu=sources('bgm_menu')[0];
  audio.setHidden(true);expect(context().state).toBe('suspended');
  audio.setHidden(false);await flush();expect(context().state).toBe('running');
  audio.setSettings({...enabled,muted:true});expect(context().state).toBe('suspended');
  audio.setSettings(enabled);await flush();
  audio.setSettings({...enabled,volume:0});expect(context().state).toBe('suspended');
  audio.setSettings(enabled);await flush();expect(context().state).toBe('running');
  expect(sources('bgm_menu')).toHaveLength(1);expect(menu.start).toHaveBeenCalledOnce();
 });
 it('preserves synthesized SFX notes and prevents stale effects after tab return',async()=>{
  await audio.unlock();await flush();audio.tone('chain',true);
  expect(context().oscillators.map(n=>n.frequency.value)).toEqual([392,494,587]);
  audio.setHidden(true);expect(context().oscillators.every(n=>n.stop.mock.calls.length===2)).toBe(true);
  audio.tone('fail',true);expect(context().oscillators).toHaveLength(3);
 });
 it('independently disables ambience, music, and SFX; full mute covers all',async()=>{
  await audio.unlock();await flush();
  audio.setSettings({...enabled,ambience:false,sound:false});audio.tone('success',true);await vi.advanceTimersByTimeAsync(500);
  expect(sources('amb_tavern')[0].stop).toHaveBeenCalledOnce();expect(sources('bgm_menu')[0].stop).not.toHaveBeenCalled();
  expect(context().oscillators).toHaveLength(0);
  audio.setSettings({...enabled,music:false});await flush();await vi.advanceTimersByTimeAsync(500);
  expect(sources('bgm_menu')[0].stop).toHaveBeenCalledOnce();expect(sources('amb_tavern')).toHaveLength(2);
  expect(context().gains[2].gain.value).toBe(.3);
 });
 it('contains fetch/decode/unsupported-context and autoplay errors',async()=>{
  vi.mocked(fetch).mockRejectedValue(new Error('offline'));
  await audio.unlock();await flush();expect(context().sources).toHaveLength(0);
  await audio.unlock();await flush();expect(fetch).toHaveBeenCalledTimes(2);
  audio.tone('select',true);expect(context().oscillators).toHaveLength(1);
  audio.dispose();audio=new GameAudio();vi.stubGlobal('AudioContext',class {constructor(){throw Error('unsupported');}});
  await expect(audio.unlock()).resolves.toBeUndefined();
 });
 it('retries autoplay unlock on the next gesture',async()=>{
  await audio.unlock();await flush();context().state='suspended';
  context().resume.mockRejectedValueOnce(new Error('NotAllowedError'));
  await expect(audio.unlock()).resolves.toBeUndefined();await audio.unlock();await flush();
  expect(context().state).toBe('running');expect(sources('bgm_menu')).toHaveLength(1);
 });
 it('registers and removes lifecycle listeners, closes even with a late fetch',async()=>{
  const doc=new EventTarget(),win=new EventTarget();
  Object.defineProperty(doc,'hidden',{value:false});vi.stubGlobal('document',doc);vi.stubGlobal('window',win);
  const remove=vi.spyOn(doc,'removeEventListener');
  audio.attach();doc.dispatchEvent(new Event('pointerdown'));await flush();
  audio.dispose();expect(remove).toHaveBeenCalledTimes(3);expect(context().close).toHaveBeenCalledOnce();
  doc.dispatchEvent(new Event('keydown'));await flush();expect(Context.instances).toHaveLength(1);
 });
});
