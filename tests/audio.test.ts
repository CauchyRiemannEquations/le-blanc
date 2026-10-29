import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AUDIO_FILES,GameAudio} from '../src/soundtrack';
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
 it('ships only the menu/duel soundtrack, ambience and duel result cues',()=>{
  expect(AUDIO_FILES).toEqual({menu:'bgm_menu.ogg',duel:'bgm_duel.ogg',victory:'cue_victory.ogg',defeat:'cue_defeat.ogg',ambience:'amb_tavern.ogg'});
 });
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
 it('ducks BGM for character speech and restores it on skip/mute',async()=>{
  await audio.unlock();await flush();audio.setSettings({...enabled,dialogue:'all',voiceVolume:.8});
  const file=`/audio/voice/files/${'a'.repeat(64)}.mp3`;
  vi.mocked(fetch).mockImplementation(async(url)=>({ok:true,json:async()=>({version:1,assets:[{voice:'ael',lineIds:['Q'],status:'ready',file}]}),arrayBuffer:async()=>String(url).endsWith('manifest.json')?new TextEncoder().encode(JSON.stringify({version:1,assets:[{voice:'ael',lineIds:['Q'],status:'ready',file}]})).buffer:String(url)}) as never);
  audio.dialogue({id:'voice:1',ttl:12000,utterances:[{speaker:0,lines:['Q']}]},['ael','jongdae'],0);await flush();
  expect(context().gains[1].gain.value).toBe(.16);expect(sources('.mp3')).toHaveLength(1);
  audio.cancelDialogue();expect(context().gains[1].gain.value).toBe(.65);expect(sources('.mp3')[0].stop).toHaveBeenCalledOnce();
  audio.dialogue({id:'voice:2',ttl:12000,utterances:[{speaker:0,lines:['Q']}]},['ael','jongdae'],0);await flush();
  audio.setSettings({...enabled,dialogue:'off'});expect(context().gains[1].gain.value).toBe(.65);
 });
 it('retries a pending muted resume when volume becomes audible again',async()=>{
  await audio.unlock();await flush();audio.setSettings({...enabled,volume:0});
  context().resume.mockImplementationOnce(()=>new Promise(()=>{}));void audio.unlock(true);await flush();
  const attempts=context().resume.mock.calls.length;audio.setSettings(enabled);await flush();
  expect(context().resume.mock.calls.length).toBeGreaterThan(attempts);expect(context().state).toBe('running');
 });
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
  audio.setScene({track:'duel'});await flush();await vi.advanceTimersByTimeAsync(600);
  expect(old.stop).not.toHaveBeenCalled();
  resolve('bgm_duel.ogg');await flush();
  const next=sources('bgm_duel')[0];expect(next.start).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(500);expect(old.stop).toHaveBeenCalledOnce();expect(old.disconnect).toHaveBeenCalledOnce();
  expect(amb.stop).not.toHaveBeenCalled();
 });
 it('ignores late decodes after quick navigation and disposal',async()=>{
  let resolve!:(v:unknown)=>void;
  await audio.unlock();await flush();
  context().decodeAudioData.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
  audio.setScene({track:'duel'});await flush();audio.setScene({track:'menu'});await flush();
  resolve('bgm_duel.ogg');await flush();
  expect(sources('bgm_duel')).toHaveLength(0);expect(sources('bgm_menu')).toHaveLength(1);
  audio.dispose();expect(context().close).toHaveBeenCalledOnce();
  expect(context().sources.every(s=>s.stop.mock.calls.length>0)).toBe(true);
 });
 it('rapidly returning to the fading song keeps its source',async()=>{
  await audio.unlock();await flush();audio.setScene({track:'duel'});await flush();audio.setScene({track:'menu'});await flush();
  await vi.advanceTimersByTimeAsync(500);
  expect(sources('bgm_menu')).toHaveLength(1);expect(sources('bgm_menu')[0].stop).not.toHaveBeenCalled();
  expect(sources('bgm_duel')[0].stop).toHaveBeenCalledOnce();
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
 it('uses sampled effects, never duplicate sine notes, and stops effects on tab hide',async()=>{
  await audio.unlock();await flush();audio.tone('chain',true);await flush();
  expect(context().oscillators).toHaveLength(0);
  expect(sources('sfx_chain_low')).toHaveLength(1);
  audio.setHidden(true);expect(sources('sfx_chain_low')[0].stop).toHaveBeenCalledOnce();
  audio.tone('fail',true);await flush();expect(sources('sfx_number_wrong')).toHaveLength(0);
 });
 it('cancels delayed/decoding SFX on scene, sound and mute changes without replay',async()=>{
  await audio.unlock();await flush();
  let resolve!:(value:unknown)=>void;context().decodeAudioData.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
  audio.sfx('card_flip',{id:'old-scene'});await flush();audio.setScene({track:'duel'});resolve('sfx_card_flip.ogg');await flush();
  expect(sources('sfx_card_flip')).toHaveLength(0);
  audio.sfx('number_correct',{delayMs:100,id:'muted-queue'});audio.setSettings({...enabled,sound:false});await vi.advanceTimersByTimeAsync(200);
  expect(sources('sfx_number_correct')).toHaveLength(0);
  audio.setSettings(enabled);audio.sfx('number_correct',{id:'new-result'});await flush();expect(sources('sfx_number_correct')).toHaveLength(1);
  audio.setSettings({...enabled,muted:true});expect(sources('sfx_number_correct')[0].stop).toHaveBeenCalledOnce();
  audio.setSettings(enabled);await flush();expect(sources('sfx_number_correct')).toHaveLength(1);
  audio.setSettings({...enabled,volume:0});audio.sfx('ui_back');await flush();expect(sources('sfx_ui_back')).toHaveLength(0);
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
  audio.tone('select',true);await flush();expect(context().oscillators).toHaveLength(0);expect(sources('sfx_ui_press')).toHaveLength(0);
  audio.dispose();audio=new GameAudio();vi.stubGlobal('AudioContext',class {constructor(){throw Error('unsupported');}});
  await expect(audio.unlock()).resolves.toBeUndefined();
 });
 it('retries autoplay unlock on the next gesture',async()=>{
  await audio.unlock();await flush();context().state='suspended';
  context().resume.mockRejectedValueOnce(new Error('NotAllowedError'));
  await expect(audio.unlock()).resolves.toBeUndefined();await audio.unlock();await flush();
  expect(context().state).toBe('running');expect(sources('bgm_menu')).toHaveLength(1);
 });
 it('restores foreground audio even while a previous suspend is still queued',async()=>{
  await audio.unlock();await flush();
  let finishSuspend!:()=>void;
  const suspended=new Promise<void>(resolve=>{finishSuspend=()=>{context().state='suspended';resolve();};});
  context().suspend.mockImplementation(()=>suspended);
  context().resume.mockImplementation(()=>suspended.then(()=>{context().state='running';}));
  audio.setHidden(true);expect(context().gains[0].gain.value).toBe(0);
  audio.setHidden(false); // Control thread has not applied suspend yet.
  finishSuspend();await flush();
  expect(context().state).toBe('running');expect(context().gains[0].gain.value).toBe(.7);
  expect(sources('bgm_menu')).toHaveLength(1);expect(sources('amb_tavern')).toHaveLength(1);
 });
 it('retries a still-pending resume on a later touch activation, restoring every audio bus',async()=>{
  const doc=new EventTarget(),win=new EventTarget();
  Object.defineProperty(doc,'hidden',{value:false});vi.stubGlobal('document',doc);vi.stubGlobal('window',win);
  let activated=false;
  class GestureContext extends Context {
   resume=vi.fn(()=>activated?Promise.resolve().then(()=>{this.state='running';}):new Promise<void>(()=>{}));
  }
  vi.stubGlobal('AudioContext',GestureContext);audio.attach();
  // Background restoration/autoplay may start resume before a usable gesture.
  void audio.unlock();await flush();expect(context().state).toBe('suspended');
  expect(context().resume).toHaveBeenCalledTimes(1);expect(fetch).not.toHaveBeenCalled();
  activated=true;
  const up=new Event('pointerup');Object.defineProperty(up,'pointerType',{value:'touch'});doc.dispatchEvent(up);
  audio.sfx('ui_press');await flush();
  expect(context().resume).toHaveBeenCalledTimes(2);expect(context().state).toBe('running');
  expect(sources('bgm_menu')).toHaveLength(1);expect(sources('amb_tavern')).toHaveLength(1);expect(sources('sfx_ui_press')).toHaveLength(1);
  expect(context().gains[0].gain.value).toBe(.7);expect(Context.instances).toHaveLength(1);
 });
 it('unlocks touch on release rather than unactivated pointerdown, with click and touchend fallbacks',async()=>{
  const doc=new EventTarget(),win=new EventTarget();
  Object.defineProperty(doc,'hidden',{value:false});vi.stubGlobal('document',doc);vi.stubGlobal('window',win);audio.attach();
  const down=new Event('pointerdown');Object.defineProperty(down,'pointerType',{value:'touch'});doc.dispatchEvent(down);await flush();
  expect(Context.instances).toHaveLength(0);
  const up=new Event('pointerup');Object.defineProperty(up,'pointerType',{value:'touch'});doc.dispatchEvent(up);
  await flush();expect(context().state).toBe('running');expect(sources('bgm_menu')).toHaveLength(1);
  context().state='suspended';doc.dispatchEvent(new Event('touchend'));await flush();expect(context().state).toBe('running');
  context().state='suspended';doc.dispatchEvent(new Event('click'));audio.sfx('ui_press');await flush();expect(context().state).toBe('running');
  expect(sources('sfx_ui_press')).toHaveLength(1);expect(sources('bgm_menu')).toHaveLength(1);expect(Context.instances).toHaveLength(1);
 });
 it('registers and removes lifecycle listeners, closes even with a late fetch',async()=>{
  const doc=new EventTarget(),win=new EventTarget();
  Object.defineProperty(doc,'hidden',{value:false});vi.stubGlobal('document',doc);vi.stubGlobal('window',win);
  const remove=vi.spyOn(doc,'removeEventListener');
  audio.attach();doc.dispatchEvent(new Event('pointerdown'));await flush();
  audio.dispose();expect(remove).toHaveBeenCalledTimes(6);expect(context().close).toHaveBeenCalledOnce();
  doc.dispatchEvent(new Event('keydown'));await flush();expect(Context.instances).toHaveLength(1);
 });
});
