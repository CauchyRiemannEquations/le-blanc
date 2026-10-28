import manifest from '../public/audio/sfx/manifest.json';

export const SFX_EVENTS = ['ui_press','ui_back','ui_toggle','ui_invalid','card_select','card_deselect','card_deal','card_flip','card_place','action_submit','question_answer','number_correct','number_wrong','interval_link','chain','turn_change','penalty_reveal','time_warning'] as const;
export type SfxEvent = typeof SFX_EVENTS[number];
export interface SfxOptions { state?: string; gainDb?: number; id?: string; delayMs?: number }
type Variant = typeof manifest.events[number]['variants'][number];
type Definition = typeof manifest.events[number];
export const SFX_MANIFEST = new Map<SfxEvent, Definition>(manifest.events.map(event=>[event.event_id as SfxEvent,event]));
interface Host { context:()=>AudioContext|undefined; destination:()=>GainNode|undefined; enabled:()=>boolean; audible:()=>boolean; voiceLimit?:()=>number }
interface Request { id?:string; canceled:boolean; timer?:ReturnType<typeof setTimeout> }
interface Voice { id?:string; source:AudioBufferSourceNode; gain:GainNode; event:SfxEvent; priority:number; order:number; timer?:ReturnType<typeof setTimeout> }
const RESULT_MELODY=new Set<SfxEvent>(['number_correct','number_wrong','interval_link','penalty_reveal','chain']);
const MAX_VOICES=6, MAX_BUFFERS=36, MAX_IDS=512, MAX_LATENESS_MS=1000;

/** Presentation-only one-shots. Values and hidden game state never enter this player. */
export class SfxPlayer {
 private generation=0;
 private disposed=false;
 private order=0;
 private voices=new Set<Voice>();
 private tails=new Set<Voice>();
 private buffers=new Map<string,AudioBuffer>();
 private loads=new Map<string,{controller:AbortController;promise:Promise<AudioBuffer|undefined>}>();
 private failures=new Map<string,{attempts:number;retryAt:number}>();
 private pending=new Set<ReturnType<typeof setTimeout>>();
 private requests=new Set<Request>();
 private ids=new Set<string>();
 private lastPlayed=new Map<string,number>();
 private lastStarted=new Map<string,number>();
 private bags=new Map<SfxEvent,Variant[]>();
 private lastVariant=new Map<SfxEvent,string>();
 constructor(private host:Host){}
 private now(){return performance.now();}
 private remember(event:SfxEvent,id:string|undefined){
  if(id===undefined)return true;
  const key=event+':'+id;if(this.ids.has(key))return false;
  this.ids.add(key);if(this.ids.size>MAX_IDS)this.ids.delete(this.ids.values().next().value!);
  return true;
 }
 play(event:SfxEvent,options:SfxOptions={},unlocking?:Promise<void>){
  const definition=SFX_MANIFEST.get(event);
  if(!definition||this.disposed||!this.remember(event,options.id))return;
  if(definition.selection==='semantic_state'&&!definition.variants.some(variant=>variant.slot===options.state))return;
  // A silent event is consumed rather than queued for a later unmute/foreground.
  if(!this.host.enabled()||(!this.host.audible()&&!unlocking)||this.requests.size>=64)return;
  const request:Request={id:options.id,canceled:false};this.requests.add(request);
  const generation=this.generation;
  const delay=Math.min(5000,Math.max(0,Number.isFinite(options.delayMs)?options.delayMs!:0));
  const intended=this.now()+delay;
  const run=()=>{
   if(request.canceled||generation!==this.generation||this.disposed||!this.host.enabled()){this.requests.delete(request);return;}
   void (async()=>{
    if(!this.host.audible()&&unlocking)await unlocking;
    if(request.canceled||generation!==this.generation||!this.host.audible()||this.now()-intended>MAX_LATENESS_MS)return;
    // Expiration must not be suppressed by a just-observed low-time warning.
    const cooldownKey=event==='time_warning'?event+':'+options.state:event;
    const now=this.now();if(now-(this.lastPlayed.get(cooldownKey)??-Infinity)<definition.cooldown_ms)return;
    this.lastPlayed.set(cooldownKey,now);
    const variant=this.choose(event,definition,options.state);if(!variant)return;
    const context=this.host.context(),destination=this.host.destination();if(!context||!destination)return;
    const buffer=await this.load(variant,context);
    if(!buffer||request.canceled||generation!==this.generation||this.disposed||!this.host.audible()||this.now()-intended>MAX_LATENESS_MS)return;
    this.start(event,definition,variant,buffer,context,destination,options.gainDb??0,cooldownKey,options.id);
   })().catch(()=>{/* Audio failure never blocks a game action. */}).finally(()=>this.requests.delete(request));
  };
  if(delay){const timer=setTimeout(()=>{this.pending.delete(timer);request.timer=undefined;run();},delay);request.timer=timer;this.pending.add(timer);}else run();
 }
 private choose(event:SfxEvent,definition:Definition,state?:string):Variant|undefined{
  if(definition.selection==='semantic_state')return definition.variants.find(variant=>variant.slot===state);
  let bag=this.bags.get(event);
  if(!bag?.length){
   bag=[...definition.variants];
   for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   // pop() is the next draw; avoid repeating the previous bag's final draw.
   if(bag.length>1&&bag.at(-1)!.asset_id===this.lastVariant.get(event))[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
   this.bags.set(event,bag);
  }
  return bag.pop();
 }
 private async load(variant:Variant,context:AudioContext):Promise<AudioBuffer|undefined>{
  const path=variant.ogg,cached=this.buffers.get(path);if(cached)return cached;
  const existing=this.loads.get(path);if(existing)return existing.promise;
  const failure=this.failures.get(path);if(failure&&(failure.attempts>=2||this.now()<failure.retryAt))return;
  const controller=new AbortController(),generation=this.generation;
  const timeout=setTimeout(()=>{
   if(!this.disposed&&generation===this.generation)this.failures.set(path,{attempts:(failure?.attempts??0)+1,retryAt:this.now()+5000});
   controller.abort();
  },5000);
  const promise=(async()=>{
   try{
    const response=await fetch(import.meta.env.BASE_URL+'audio/sfx/'+path,{signal:controller.signal});
    if(!response.ok)throw Error('SFX HTTP '+response.status);
    const buffer=await context.decodeAudioData(await response.arrayBuffer());
    if(controller.signal.aborted||this.disposed||generation!==this.generation)return;
    if(this.buffers.size>=MAX_BUFFERS)this.buffers.delete(this.buffers.keys().next().value!);
    this.buffers.set(path,buffer);this.failures.delete(path);return buffer;
   }catch{
    if(!controller.signal.aborted&&!this.disposed)this.failures.set(path,{attempts:(failure?.attempts??0)+1,retryAt:this.now()+5000});
   }finally{
    clearTimeout(timeout);if(this.loads.get(path)?.controller===controller)this.loads.delete(path);
   }
  })();
  this.loads.set(path,{controller,promise});return promise;
 }
 private start(event:SfxEvent,definition:Definition,variant:Variant,buffer:AudioBuffer,context:AudioContext,destination:GainNode,gainDb:number,cooldownKey:string,id?:string){
  if(this.now()-(this.lastStarted.get(cooldownKey)??-Infinity)<definition.cooldown_ms)return;
  if(definition.variants.length>1&&definition.selection!=='semantic_state'&&this.lastVariant.get(event)===variant.asset_id)return;
  const limit=Math.max(0,Math.min(MAX_VOICES,this.host.voiceLimit?.()??MAX_VOICES));if(!limit)return;
  let evicted=false;
  // One result melody at a time; card/UI textures stay on their own layer.
  if(RESULT_MELODY.has(event))for(const voice of [...this.voices])if(RESULT_MELODY.has(voice.event)){this.stop(voice,true);evicted=true;}
  const same=[...this.voices].filter(voice=>voice.event===event);
  if(same.length>=definition.max_simultaneous){this.stop(same[0],true);evicted=true;}
  if(this.voices.size>=limit){
   const lowest=[...this.voices].sort((a,b)=>a.priority-b.priority||a.order-b.order)[0];
   if(lowest.priority>definition.priority)return;
   this.stop(lowest,true);evicted=true;
  }
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=false;
  const extra=Number.isFinite(gainDb)?Math.max(-30,Math.min(6,gainDb)):0;
  gain.gain.value=Math.pow(10,(definition.gain_db+variant.gain_db+extra)/20);
  source.connect(gain);gain.connect(destination);
  const voice:Voice={id,source,gain,event,priority:definition.priority,order:this.order++};
  this.voices.add(voice);
  source.onended=()=>this.release(voice);
  // Allow a priority-evicted voice its 10ms tail before the replacement starts.
  try{source.start(context.currentTime+(evicted?.012:0));}catch{this.release(voice);return;}
  this.lastStarted.set(cooldownKey,this.now());this.lastVariant.set(event,variant.asset_id);
  voice.timer=setTimeout(()=>this.stop(voice),variant.duration_sec*1000+150);
 }
 private release(voice:Voice){
  clearTimeout(voice.timer);voice.source.onended=null;this.voices.delete(voice);this.tails.delete(voice);voice.source.disconnect();voice.gain.disconnect();
 }
 private stop(voice:Voice,fade=false){
  clearTimeout(voice.timer);this.voices.delete(voice);voice.source.onended=null;
  const context=this.host.context();
  if(fade&&context?.state==='running'){
   this.tails.add(voice);
   const now=context.currentTime;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);voice.gain.gain.linearRampToValueAtTime(0,now+.01);
   try{voice.source.stop(now+.01);}catch{/* Already ended. */}
   const timer=setTimeout(()=>{this.pending.delete(timer);this.release(voice);},12);this.pending.add(timer);
  }else{try{voice.source.stop();}catch{/* Already ended. */}this.release(voice);}
 }
 private cancelRequest(request:Request){
  request.canceled=true;if(request.timer!==undefined){clearTimeout(request.timer);this.pending.delete(request.timer);}this.requests.delete(request);
 }
 /** Unseen IDs are a no-op; canceled invocations remain consumed by dedup. */
 cancelId(id:string){
  for(const request of this.requests)if(request.id===id)this.cancelRequest(request);
  for(const voice of new Set([...this.voices,...this.tails]))if(voice.id===id)this.stop(voice);
 }
 cancel(){
  this.generation++;
  for(const request of this.requests)this.cancelRequest(request);
  for(const timer of this.pending)clearTimeout(timer);this.pending.clear();
  for(const load of this.loads.values())load.controller.abort();this.loads.clear();
  for(const voice of [...this.voices,...this.tails])this.stop(voice);
 }
 dispose(){this.disposed=true;this.cancel();this.buffers.clear();this.failures.clear();this.ids.clear();this.bags.clear();}
}
