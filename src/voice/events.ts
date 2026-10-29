import type {GameView,Outcome,PlayerId} from '../engine/types';
import {validQuestion} from '../engine/questions';
import {guessVoiceId,questionVoiceId,targetVoiceId} from './catalog';
export interface Utterance {speaker:PlayerId;lines:string[]}
export interface Dialogue {id:string;utterances:Utterance[];ttl:number}
/** Reads only authoritative public fields captured at action time; no card values are consulted. */
export function outcomeDialogue(match:string,view:GameView,events:Outcome[]):Dialogue|null {
 const last=events.at(-1);if(!last)return null;
 const id=`${match}:${last.id}`;
 if(view.result){const winner=view.result.winner;return {id,ttl:18000,utterances:[{speaker:winner,lines:['END_01']},{speaker:winner===0?1:0,lines:['END_02']}]};}
 const e=events.filter(e=>e.type==='question'||e.type==='number'||e.type==='gap').at(-1);
 if(!e)return {id,ttl:1,utterances:[]};
 const a=e.a,b=e.b,validIndex=(n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<view.rules.handSize;
 const respondent:PlayerId=e.actor===0?1:0;
 let lines:string[]=[],answer='';
 if(e.type==='question'&&e.question&&typeof e.answer==='boolean'&&validIndex(a)&&validIndex(b)&&a!==b){const q={kind:e.question,parameter:e.parameter,negate:e.negate};if(validQuestion(q,view.rules)){lines=[targetVoiceId(a!,b!),questionVoiceId(q)];answer=e.answer?'INF_04':'INF_05';}}
 if(e.type==='number'&&validIndex(a)&&Number.isInteger(e.value)&&e.value!>=view.rules.min&&e.value!<=view.rules.max&&typeof e.success==='boolean'){lines=[guessVoiceId(a!,e.value!)];answer=e.success?'REA_01':'REA_02';}
 if(e.type==='gap'&&validIndex(a)&&validIndex(b)&&a!==b&&Number.isInteger(e.value)&&e.value!>=1&&e.value!<=view.rules.max-view.rules.min&&typeof e.success==='boolean'){lines=[targetVoiceId(a!,b!),`GAP_${e.value}`];answer=e.success?'GAP_OK':'GAP_NO';}
 return {id,ttl:12000,utterances:lines.length?[{speaker:e.actor,lines},{speaker:respondent,lines:[answer]}]:[]};
}
