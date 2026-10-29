import type {PlayerId} from '../engine/types';
import type {Dialogue} from './events';
import type {VoiceId,VoiceManifest,VoiceSettings} from './types';
export interface DialogueAudio {context:()=>AudioContext|undefined;destination:()=>AudioNode|undefined;audible:()=>boolean;settings:()=>VoiceSettings;duck:(active:boolean)=>void}
export type SpeechState='started'|'complete'|'silent'|'cancelled'|'error';
export type SpeechListener=(state:SpeechState)=>void;
export class DialoguePlayer {
 private seen=new Set<string>();private epoch=0;private source?:AudioBufferSourceNode;private gain?:GainNode;private compressor?:DynamicsCompressorNode;private finish?:()=>void;private listener?:SpeechListener;private timer?:ReturnType<typeof setTimeout>;private disposed=false;
 private manifest?:VoiceManifest;private manifestLoad?:Promise<VoiceManifest>;private buffers=new Map<string,AudioBuffer>();private loads=new Map<string,Promise<AudioBuffer>>();private controllers=new Set<AbortController>();
 constructor(private audio:DialogueAudio){}
 private settle(state:SpeechState){const listener=this.listener;this.listener=undefined;listener?.(state);}
 cancel(){this.epoch++;clearTimeout(this.timer);try{this.source?.stop();}catch{/* Already ended. */}this.source?.disconnect();this.source=undefined;this.gain?.disconnect();this.gain=undefined;this.finish?.();this.finish=undefined;this.audio.duck(false);this.settle('cancelled');}
 update(){const s=this.audio.settings();if(!this.audio.audible()||s.dialogue==='off'||s.voiceVolume===0)this.cancel();else if(this.gain)this.gain.gain.value=s.voiceVolume*1.8;}
 dispose(){this.disposed=true;this.cancel();for(const controller of this.controllers)controller.abort();this.controllers.clear();this.compressor?.disconnect();this.seen.clear();this.buffers.clear();this.loads.clear();}
 private async request(url:string){
  // Static assets only. Retry one transient download failure; never synthesize at runtime.
  for(let attempt=0;attempt<2;attempt++){
   if(this.disposed)throw new Error('Disposed');const controller=new AbortController();this.controllers.add(controller);const timer=setTimeout(()=>controller.abort(),12000);
   try{const response=await fetch(url,{signal:controller.signal,cache:attempt?'reload':'default'});if(!response.ok)throw new Error('Voice asset unavailable');return await response.arrayBuffer();}
   catch(error){if(attempt||this.disposed)throw error;}
   finally{clearTimeout(timer);this.controllers.delete(controller);}
  }throw new Error('Voice download failed');
 }
 private async getManifest(){
  if(this.manifest)return this.manifest;
  if(!this.manifestLoad)this.manifestLoad=(async()=>{try{const data=JSON.parse(new TextDecoder().decode(await this.request('/audio/voice/manifest.json'))) as VoiceManifest;if(data.version!==1||!Array.isArray(data.assets))throw new Error('Invalid voice manifest');if(!this.disposed)this.manifest=data;return data;}finally{this.manifestLoad=undefined;}})();
  return this.manifestLoad;
 }
 private async buffer(file:string){
  const cached=this.buffers.get(file);if(cached)return cached;const pending=this.loads.get(file);if(pending)return pending;
  const load=(async()=>{try{const bytes=await this.request(file),context=this.audio.context();if(!context||this.disposed)throw new Error('Audio not ready');const buffer=await context.decodeAudioData(bytes);if(this.disposed)throw new Error('Disposed');if(this.buffers.size>=48)this.buffers.delete(this.buffers.keys().next().value!);this.buffers.set(file,buffer);return buffer;}finally{this.loads.delete(file);}})();this.loads.set(file,load);return load;
 }
 private async prepare(lines:string[],voice:VoiceId){
  const manifest=await this.getManifest();const clips=lines.map(line=>manifest.assets.find(a=>a.voice===voice&&a.lineIds.includes(line)&&a.status==='ready'));
  if(clips.some(a=>!a?.file||!/^\/audio\/voice\/files\/[a-f0-9]{64}\.(mp3|wav)$/.test(a.file)))throw new Error('Missing voice mapping');
  return Promise.all(clips.map(clip=>this.buffer(clip!.file!)));
 }
 preload(lines:string[],voice:VoiceId){if(this.disposed||this.audio.settings().dialogue==='off'||!this.audio.context())return;void this.prepare(lines,voice).catch(()=>{/* Playback retries and reports an actual failure. */});}
 play(dialogue:Dialogue,voices:readonly VoiceId[],viewer:PlayerId,preview=false,listener?:SpeechListener){
  if(this.seen.has(dialogue.id))return;this.seen.add(dialogue.id);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value!);
  this.cancel();this.listener=listener;const settings=this.audio.settings();
  if(!preview&&settings.dialogue==='off'||settings.voiceVolume===0){this.settle('silent');return;}
  const utterances=dialogue.utterances.filter(u=>preview||settings.dialogue!=='opponent'||u.speaker!==viewer);
  if(!utterances.length){this.settle('silent');return;}
  if(!this.audio.audible()){this.settle('error');return;}
  const epoch=this.epoch,current=()=>epoch===this.epoch&&!this.disposed&&this.audio.audible();
  // Generic background lines still expire. Visible conversations own their cancel
  // button and must not lose speech merely because the first download is slow.
  if(!listener)this.timer=setTimeout(()=>this.cancel(),dialogue.ttl);
  void (async()=>{try{
   const prepared=await Promise.all(utterances.map(u=>this.prepare(u.lines,voices[u.speaker])));
   const context=this.audio.context(),destination=this.audio.destination();if(!context||!destination||!current())return;
   if(listener)this.timer=setTimeout(()=>{this.settle('error');this.cancel();},dialogue.ttl);
   if(!this.compressor&&context.createDynamicsCompressor){const c=context.createDynamicsCompressor();c.threshold.value=-10;c.knee.value=12;c.ratio.value=4;c.attack.value=.003;c.release.value=.12;c.connect(destination);this.compressor=c;}
   let started=false;
   for(const buffers of prepared)for(const buffer of buffers){
    if(!current())return;const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.connect(gain);gain.connect(this.compressor??destination);gain.gain.value=this.audio.settings().voiceVolume*1.8;this.source=source;this.gain=gain;this.audio.duck(true);
    await new Promise<void>(resolve=>{this.finish=resolve;source.onended=()=>resolve();source.start();if(!started){started=true;this.listener?.('started');}});
    source.onended=null;source.disconnect();gain.disconnect();if(this.source===source){this.source=undefined;this.gain=undefined;this.finish=undefined;}
   }
   if(current())this.settle('complete');
  }catch{if(epoch===this.epoch){this.seen.delete(dialogue.id);this.settle('error');}}
  finally{if(epoch===this.epoch){clearTimeout(this.timer);this.audio.duck(false);}}})();
 }
}
