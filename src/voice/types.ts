export const VOICE_NAMES={jongdae:'종대',ael:'아엘'} as const;
export const VOICE_LABELS={jongdae:'남자',ael:'여자'} as const;
export type VoiceId=keyof typeof VOICE_NAMES;
export function isVoice(value:unknown):value is VoiceId{return value==='jongdae'||value==='ael';}
export function readVoice(value:unknown):VoiceId {if(value===undefined)return 'jongdae';if(!isVoice(value))throw new Error('보이스를 확인해주세요.');return value;}
export interface VoiceSettings {voice:VoiceId;dialogue:'all'|'opponent'|'off';voiceVolume:number}
export function voiceSettings(saved:Partial<VoiceSettings>|null):VoiceSettings{return {voice:isVoice(saved?.voice)?saved.voice:'jongdae',dialogue:saved?.dialogue==='all'||saved?.dialogue==='opponent'?saved.dialogue:'off',voiceVolume:typeof saved?.voiceVolume==='number'&&Number.isFinite(saved.voiceVolume)?Math.max(0,Math.min(1,saved.voiceVolume)):.8};}
export interface VoiceAsset {key:string;file:string|null;lineIds:string[];voice:VoiceId;text:string;status:'ready'|'missing'|'failed'|'uncertain';bytes?:number;duration?:number;sha256?:string}
export interface VoiceManifest {version:1;assets:VoiceAsset[]}
