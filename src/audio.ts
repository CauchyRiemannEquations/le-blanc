import type {SpeechListener} from './voice/player';
import type { SfxEvent, SfxOptions } from './sfx';
import { GameAudio } from './soundtrack';
import type {Dialogue} from './voice/events';
import type {VoiceId} from './voice/types';
import type {PlayerId} from './engine/types';
export function playDialogue(value:Dialogue|null,voices:readonly VoiceId[],viewer:PlayerId,listener?:SpeechListener){try{if(value&&active)active.dialogue(value,voices,viewer,false,listener);else listener?.('error');}catch{listener?.('error');}}
export function preloadVoice(lines:string[],voice:VoiceId){active?.preloadVoice(lines,voice);}
export function cancelDialogue(){try{active?.cancelDialogue();}catch{/* Optional audio. */}}
export function previewVoice(voice:VoiceId){void active?.previewVoice(voice).catch(()=>{});}
let active: GameAudio | undefined;
export function mountAudio() {
 const audio = new GameAudio(); active = audio; audio.attach();
 return { audio, dispose: () => { audio.dispose(); if (active === audio) active = undefined; } };
}
export function playTone(kind: 'select' | 'success' | 'fail' | 'chain', enabled: boolean) { active?.tone(kind, enabled); }

export function playSfx(event:SfxEvent,options:SfxOptions={}) { active?.sfx(event,options); }

export function cancelSfx(id:string) { active?.cancelSfx(id); }
