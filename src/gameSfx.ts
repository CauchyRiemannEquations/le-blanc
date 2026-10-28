import type {Outcome} from './engine/types';
import type {SfxEvent} from './sfx';

export interface OutcomeCue {event:SfxEvent;state?:string}
/** Only public outcome semantics select a cue: never card values or hidden state. */
export function outcomeCue(event:Outcome,final=false,reduced=false):OutcomeCue|null {
 if(final)return null; // Existing victory/defeat cues own the final result.
 if(event.type==='question'&&typeof event.answer==='boolean')return {event:'question_answer',state:event.answer?'yes':'no'};
 if((event.type==='number'||event.type==='gap')&&event.success===false)return {event:'number_wrong'};
 if(event.reveals.length>1&&!reduced&&event.success!==false)return null; // Renderer owns staged chains, without overlapping result melodies.
 if(event.type==='number'&&event.success)return {event:'number_correct'};
 if(event.type==='gap'&&event.success)return {event:'interval_link'};
 if(event.type==='penalty'&&event.reveals.length)return {event:'penalty_reveal'};
 if(event.type==='timeout')return {event:'time_warning',state:'expired'};
 return null;
}
/** An online failed attack and its automatic penalty arrive atomically: one representative cue. */
export function batchOutcomeCue(events:Outcome[],final=false,reduced=false):{outcome:Outcome;cue:OutcomeCue}|null {
 const event=events.find(e=>(e.type==='number'||e.type==='gap')&&e.success===false)??events.at(-1);
 if(!event)return null;const cue=outcomeCue(event,final,reduced);return cue?{outcome:event,cue}:null;
}

/** First/reconnected snapshots are a baseline, not a playlist of old results. */
export class ObservedOutcomes {
 private room='';private baseline=true;private highWater=0;private seen=new Set<number>();
 rebase(){this.baseline=true;}
 reset(){this.room='';this.baseline=true;this.highWater=0;this.seen.clear();}
 observe(room:string,history:Outcome[],silentBaseline=false):{fresh:Outcome[];baseline:boolean} {
  if(room!==this.room){this.reset();this.room=room;}
  const baseline=this.baseline||silentBaseline;
  const fresh=baseline?[]:history.filter(e=>e.id>this.highWater&&!this.seen.has(e.id));
  for(const event of history){this.seen.add(event.id);this.highWater=Math.max(this.highWater,event.id);}
  // Keep a bounded recent set plus the high-water mark for older duplicate snapshots.
  for(const id of this.seen)if(id<this.highWater-256)this.seen.delete(id);
  this.baseline=false;return {fresh,baseline};
 }
}

/** Only a visible, continuously observed crossing warns; mounting at five seconds is silent. */
export class DeadlineWarning {
 private key='';private remaining:number|null=null;private warned=false;
 sample(key:string|null,remaining:number,enabled:boolean,visible:boolean):boolean {
  if(key!==this.key){this.key=key??'';this.remaining=null;this.warned=false;}
  if(!key||!enabled||!visible){this.remaining=null;return false;}
  const previous=this.remaining;this.remaining=remaining;
  if(!this.warned&&previous!==null&&previous>10_000&&remaining>0&&remaining<=10_000){this.warned=true;return true;}
  return false;
 }
}
