import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {SFX_EVENTS,SFX_MANIFEST,SfxPlayer} from '../src/sfx';
import type {SfxEvent} from '../src/sfx';

class Param {
 value=1;
 cancelScheduledValues=vi.fn();setValueAtTime=vi.fn((value:number)=>{this.value=value;});linearRampToValueAtTime=vi.fn((value:number)=>{this.value=value;});
}
class Gain {gain=new Param();connect=vi.fn();disconnect=vi.fn();}
class Source {
 buffer:{url:string}|undefined;loop=false;onended:(()=>void)|null=null;
 connect=vi.fn();disconnect=vi.fn();start=vi.fn();stop=vi.fn();
}
class Context {
 currentTime=10;state='running';sources:Source[]=[];gains:Gain[]=[];
 createBufferSource(){const source=new Source();this.sources.push(source);return source;}
 createGain(){const gain=new Gain();this.gains.push(gain);return gain;}
 decodeAudioData=vi.fn(async(bytes:ArrayBuffer)=>({url:new TextDecoder().decode(bytes),duration:.3}) as unknown as AudioBuffer);
}
let player:SfxPlayer,context:Context,enabled:boolean,audible:boolean;
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const urls=()=>context.sources.map(source=>source.buffer?.url??'');
beforeEach(()=>{
 vi.useFakeTimers();context=new Context();enabled=true;audible=true;
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer})));
 player=new SfxPlayer({context:()=>context as unknown as AudioContext,destination:()=>new Gain() as unknown as GainNode,enabled:()=>enabled,audible:()=>audible});
});
afterEach(()=>{player.dispose();vi.useRealTimers();vi.unstubAllGlobals();});

describe('manifest-backed SFX',()=>{
 it('covers exactly 18 event groups and 36 one-shot variants',()=>{
  expect(SFX_MANIFEST.size).toBe(18);expect(SFX_EVENTS).toHaveLength(18);
  expect([...SFX_MANIFEST.values()].flatMap(event=>event.variants)).toHaveLength(36);
  expect([...SFX_MANIFEST.values()].every(event=>!event.loop&&event.variants.every(variant=>variant.ogg.startsWith('ogg/')))).toBe(true);
 });
 it('shuffles a bag without immediate repeats and reuses decoded buffers',async()=>{
  vi.spyOn(Math,'random').mockReturnValue(.1);
  for(let i=0;i<8;i++){player.play('card_select');await flush();await vi.advanceTimersByTimeAsync(75);}
  const files=urls();expect(files).toHaveLength(8);
  expect(new Set(files.slice(0,3)).size).toBe(3);
  expect(files.every((file,i)=>!i||file!==files[i-1])).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(3);expect(context.decodeAudioData).toHaveBeenCalledTimes(3);
  expect(context.sources.every(source=>!source.loop)).toBe(true);
 });
 it('selects exact semantic states, rejects missing/unknown states, and allows expiry after low',async()=>{
  player.play('question_answer');player.play('ui_toggle',{state:'maybe'});await flush();expect(fetch).not.toHaveBeenCalled();
  player.play('question_answer',{state:'yes'});await flush();await vi.advanceTimersByTimeAsync(350);
  player.play('question_answer',{state:'no'});player.play('ui_toggle',{state:'off'});await flush();
  expect(urls()).toEqual(expect.arrayContaining([expect.stringContaining('answer_yes.ogg'),expect.stringContaining('answer_no.ogg'),expect.stringContaining('toggle_off.ogg')]));
  player.play('time_warning',{state:'low'});await flush();player.play('time_warning',{state:'expired'});await flush();
  expect(urls().filter(url=>url.includes('time_warning'))).toHaveLength(2);
 });
 it('uses the requested quiet private-peek gain, without value-dependent selection',async()=>{
  player.play('card_flip',{gainDb:-7,id:'peek-1'});await flush();
  expect(context.gains[0].gain.value).toBeCloseTo(Math.pow(10,-7/20),6);
  expect(urls()[0]).toMatch(/sfx_card_flip_v0[123]\.ogg$/);
 });
 it('deduplicates event ids beyond cooldown, but distinct event types remain independent',async()=>{
  player.play('action_submit',{id:'run-1:outcome-2'});player.play('action_submit',{id:'run-1:outcome-2'});await flush();
  await vi.advanceTimersByTimeAsync(500);player.play('action_submit',{id:'run-1:outcome-2'});player.play('number_correct',{id:'run-1:outcome-2'});await flush();
  expect(urls().filter(url=>url.includes('submit'))).toHaveLength(1);expect(urls().filter(url=>url.includes('correct'))).toHaveLength(1);
 });
 it('enforces per-event cooldown even when the first decode is pending',async()=>{
  player.play('card_select');player.play('card_select');await flush();expect(context.sources).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(69);player.play('card_select');await flush();expect(context.sources).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);player.play('card_select');await flush();expect(context.sources).toHaveLength(2);
 });
 it('caps event polyphony and fades the oldest voice before starting its replacement',async()=>{
  for(let i=0;i<3;i++){player.play('card_select');await flush();if(i<2)await vi.advanceTimersByTimeAsync(70);}
  expect(context.sources).toHaveLength(3);expect(context.sources[0].stop).toHaveBeenCalledWith(10.01);
  expect(context.sources[2].start).toHaveBeenCalledWith(10.012);
  player.cancel();expect(context.sources.every(source=>source.disconnect.mock.calls.length>0)).toBe(true);
 });
 it('caps all one-shots at six with priority eviction; low priority cannot steal a higher voice',async()=>{
  const events:SfxEvent[]=['ui_press','ui_back','card_deal','card_place','card_select','card_flip'];
  for(const event of events){player.play(event);await flush();}
  player.play('chain',{state:'high'});await flush();
  expect(context.sources).toHaveLength(7);expect(context.sources[2].stop).toHaveBeenCalledWith(10.01);
  expect(context.sources[6].start).toHaveBeenCalledWith(10.012);
  // Build a full high-priority set; a UI press is dropped instead of displacing it.
  player.cancel();await vi.advanceTimersByTimeAsync(1000);
  for(const event of ['card_flip','card_select','action_submit','question_answer','turn_change','number_correct'] as const){player.play(event,event==='question_answer'?{state:'yes'}:{});await flush();}
  const count=context.sources.length;player.play('ui_press');await flush();expect(context.sources).toHaveLength(count);
 });
});

describe('SFX lifecycle and failure boundaries',()=>{
 it('consumes silent events without replaying them after sound returns',async()=>{
  enabled=false;player.play('number_correct',{id:'silent-outcome'});await flush();
  enabled=true;player.play('number_correct',{id:'silent-outcome'});await flush();expect(fetch).not.toHaveBeenCalled();
  player.play('number_correct',{id:'new-outcome'});await flush();expect(context.sources).toHaveLength(1);
 });
 it('does not request a sound before a gesture, but keeps a current first-gesture event through resume',async()=>{
  audible=false;player.play('ui_press');await flush();expect(fetch).not.toHaveBeenCalled();
  let resume!:()=>void;const unlock=new Promise<void>(resolve=>{resume=resolve;});
  player.play('ui_press',{id:'gesture'},unlock);await flush();expect(fetch).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(30);audible=true;resume();await flush();expect(context.sources).toHaveLength(1);
 });
 it('drops delayed sounds and in-flight decodes after cancellation or disposal',async()=>{
  let resolve!:(buffer:AudioBuffer)=>void;context.decodeAudioData.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
  player.play('number_correct');await flush();player.play('chain',{state:'mid',delayMs:500});
  player.cancel();resolve({} as AudioBuffer);await flush();await vi.advanceTimersByTimeAsync(700);expect(context.sources).toHaveLength(0);
  player.play('ui_back',{delayMs:200});player.dispose();await vi.advanceTimersByTimeAsync(300);expect(context.sources).toHaveLength(0);
 });
 it('cancels a matching in-flight outcome without canceling UI and consumes its old id',async()=>{
  let resolve!:(buffer:AudioBuffer)=>void;context.decodeAudioData.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
  player.play('number_correct',{id:'outcome-1'});await flush();
  player.play('ui_back',{id:'ui-1'});await flush();const ui=context.sources[0];
  player.cancelId('outcome-1');resolve({url:'old-number-correct'} as unknown as AudioBuffer);await flush();
  expect(context.sources).toHaveLength(1);expect(ui.stop).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(500);player.play('number_correct',{id:'outcome-1'});await flush();expect(context.sources).toHaveLength(1);
 });
 it('cancels scheduled and playing matches, but unseen cleanup does not blacklist the first call',async()=>{
  player.cancelId('strict-effect');player.play('number_correct',{id:'strict-effect'});await flush();expect(context.sources).toHaveLength(1);
  player.play('card_flip',{id:'texture'});await flush();
  player.cancelId('strict-effect');expect(context.sources[0].stop).toHaveBeenCalledOnce();expect(context.sources[1].stop).not.toHaveBeenCalled();
  player.play('chain',{id:'scheduled',state:'mid',delayMs:500});player.cancelId('scheduled');
  await vi.advanceTimersByTimeAsync(700);expect(context.sources).toHaveLength(2);
 });
 it('never plays a stale late decode or a long-blocked first gesture',async()=>{
  let resolve!:(buffer:AudioBuffer)=>void;context.decodeAudioData.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
  player.play('number_correct');await flush();await vi.advanceTimersByTimeAsync(1100);resolve({} as AudioBuffer);await flush();expect(context.sources).toHaveLength(0);
  audible=false;let resume!:()=>void;const pending=new Promise<void>(done=>{resume=done;});player.play('ui_press',{},pending);
  await vi.advanceTimersByTimeAsync(1100);audible=true;resume();await flush();expect(context.sources).toHaveLength(0);
 });
 it('contains missing/decode failures and allows one bounded retry after backoff',async()=>{
  vi.mocked(fetch).mockRejectedValue(new Error('offline'));
  player.play('ui_back');await flush();await vi.advanceTimersByTimeAsync(200);player.play('ui_back');await flush();expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(5000);player.play('ui_back');await flush();expect(fetch).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(5000);player.play('ui_back');await flush();expect(fetch).toHaveBeenCalledTimes(2);
  vi.mocked(fetch).mockResolvedValue({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)} as Response);
  context.decodeAudioData.mockRejectedValueOnce(new Error('invalid OGG'));player.play('action_submit');await flush();expect(context.sources).toHaveLength(0);
 });
 it('also bounds retries for requests that time out rather than rejecting promptly',async()=>{
  vi.mocked(fetch).mockImplementation((_url,init)=>new Promise((_resolve,reject)=>{init?.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});}));
  player.play('ui_back');await vi.advanceTimersByTimeAsync(5000);await flush();
  await vi.advanceTimersByTimeAsync(5000);player.play('ui_back');await vi.advanceTimersByTimeAsync(5000);await flush();
  await vi.advanceTimersByTimeAsync(5000);player.play('ui_back');await flush();expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('retries a recoverable fetch and then caches the successful decode',async()=>{
  vi.mocked(fetch).mockRejectedValueOnce(new Error('temporary offline'));
  player.play('ui_back');await flush();await vi.advanceTimersByTimeAsync(5000);player.play('ui_back');await flush();
  expect(context.sources).toHaveLength(1);await vi.advanceTimersByTimeAsync(200);player.play('ui_back');await flush();
  expect(context.sources).toHaveLength(2);expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('gives chain and result melodies one exclusive lane without interrupting card texture',async()=>{
  player.play('number_correct');player.play('card_flip');await flush();
  const correct=context.sources.find(source=>source.buffer?.url.includes('number_correct'))!;
  const flip=context.sources.find(source=>source.buffer?.url.includes('card_flip'))!;
  await vi.advanceTimersByTimeAsync(150);player.play('chain',{state:'low'});await flush();
  const chain=context.sources.at(-1)!;expect(correct.stop).toHaveBeenCalledWith(10.01);expect(chain.start).toHaveBeenCalledWith(10.012);
  expect(flip.stop).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(70);player.play('number_wrong');await flush();
  expect(chain.stop).toHaveBeenCalledWith(10.01);expect(context.sources.at(-1)!.start).toHaveBeenCalledWith(10.012);expect(flip.stop).not.toHaveBeenCalled();
 });
 it('reserves headroom for an existing victory/defeat cue',async()=>{
  player.dispose();player=new SfxPlayer({context:()=>context as unknown as AudioContext,destination:()=>new Gain() as unknown as GainNode,enabled:()=>enabled,audible:()=>audible,voiceLimit:()=>5});
  for(const event of ['card_flip','card_select','action_submit','question_answer','turn_change','number_correct'] as const){player.play(event,event==='question_answer'?{state:'yes'}:{});await flush();}
  expect(context.sources.filter(source=>source.stop.mock.calls.length===0)).toHaveLength(5);
 });
 it('disconnects a source that fails to start and keeps the next event usable',async()=>{
  const broken=new Source();broken.start.mockImplementation(()=>{throw Error('context stopped');});
  vi.spyOn(context,'createBufferSource').mockImplementationOnce(()=>{context.sources.push(broken);return broken;});
  player.play('ui_back');await flush();expect(broken.disconnect).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(200);player.play('ui_back');await flush();expect(context.sources).toHaveLength(2);expect(context.sources[1].start).toHaveBeenCalledOnce();
 });
 it('disconnects naturally ended voices and cancels pending loads without replay',async()=>{
  player.play('ui_press');await flush();const source=context.sources[0];source.onended!();expect(source.disconnect).toHaveBeenCalledOnce();
  let respond!:(value:Response)=>void;vi.mocked(fetch).mockImplementationOnce(()=>new Promise(resolve=>{respond=resolve;}));
  player.play('penalty_reveal');await flush();player.cancel();respond({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)} as Response);await flush();expect(context.sources).toHaveLength(1);
 });
});
