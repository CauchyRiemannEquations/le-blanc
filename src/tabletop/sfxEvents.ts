import type {SfxEvent} from '../sfx';
/** Presentation cues depend on public transitions/order, never on secret card values. */
export type TabletopCue = {event:'card_deal'|'card_place'|'card_flip'|'chain';state?:'low'|'mid'|'high';gainDb?:number};
export function animationSoundCurrent(hidden:boolean,scheduledEpoch:number,currentEpoch:number){
 return !hidden&&scheduledEpoch===currentEpoch;
}
export function isNewPublicReveal(wasRevealed:boolean,revealed:boolean,order:number,enabled:boolean){
 return enabled&&!wasRevealed&&revealed&&order>=0;
}
export function publicRevealCues(order:number,reduced:boolean,finalResult:boolean):TabletopCue[]{
 if(order<0||(reduced&&order>0))return [];
 const cues:TabletopCue[]=[{event:'card_flip'}];
 if(order>0&&!reduced&&!finalResult)cues.push({event:'chain',state:order===1?'low':order===2?'mid':'high'});
 return cues;
}
export function privatePeekCue(opening:boolean,hasPrivateCards:boolean):TabletopCue|null{
 return opening&&hasPrivateCards?{event:'card_flip',gainDb:-7}:null;
}
/** Each rendered movement/landing is consumed once, even if its sound was muted. */
export class DealMotionEvents {
 private started=false;
 private landed=false;
 reset(){this.started=false;this.landed=false;}
 start(){if(this.started)return false;this.started=true;return true;}
 land(){if(!this.started||this.landed)return false;this.landed=true;return true;}
}

export interface FallbackCue {event:SfxEvent;state?:string}
/** A failed renderer gets one compact cue only when the live renderer has not consumed it. */
export class FallbackRevealEvents {
 private current:string;
 private seen:Set<string>;
 private played=new Set<string>();
 private pending:string|null=null;
 constructor(initialEvent:string){this.current=initialEvent;this.seen=new Set([initialEvent]);}
 observe(id:string,eligible:boolean){
  if(id!==this.current){this.current=id;this.pending=!this.seen.has(id)&&!this.played.has(id)&&eligible?id:null;this.seen.add(id);}
  if(!eligible)this.pending=null;
 }
 markPlayed(id:string){this.played.add(id);if(this.pending===id)this.pending=null;}
 take(id:string){if(this.pending!==id||this.played.has(id))return false;this.markPlayed(id);return true;}
 cancel(){this.pending=null;}
}
