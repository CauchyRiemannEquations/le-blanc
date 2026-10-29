import {buildCatalog,questionVoiceId,targetVoiceId} from './catalog';
import type {AudioSettings} from '../audioScene';
import type {GameView,Outcome,PlayerId} from '../engine/types';
import type {VoiceId} from './types';
export interface SpeechPhase {speaker:PlayerId;lines:string[];text:string;duration:number}
export function speechEnabled(speaker:PlayerId,viewer:PlayerId,settings:AudioSettings){return !settings.muted&&settings.volume>0&&(settings.voiceVolume??.8)>0&&(settings.dialogue==='all'||settings.dialogue==='opponent'&&speaker!==viewer);}
/** Silent dialogue has a reading clock; audible dialogue follows actual playback. */
export function questionPresentation(view:GameView,event:Outcome):SpeechPhase[]{
 if(event.type!=='question'||!event.question||event.a===undefined||event.b===undefined||typeof event.answer!=='boolean')return [];
 const catalog=buildCatalog(view.rules),voices=view.voices??['jongdae','jongdae'];
 const phases=[{speaker:event.actor,lines:[targetVoiceId(event.a,event.b),questionVoiceId({kind:event.question,parameter:event.parameter,negate:event.negate})]},
  {speaker:(1-event.actor) as PlayerId,lines:[event.answer?'INF_04':'INF_05']}];
 return phases.map((phase,index)=>{
  const voice=voices[phase.speaker] as VoiceId;
  return {...phase,text:phase.lines.map(id=>catalog.find(l=>l.id===id)?.scripts[voice]??'').join(' '),duration:index===0?1800:700};
 });
}
