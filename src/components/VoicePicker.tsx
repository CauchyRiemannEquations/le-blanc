import {useState} from 'react';
import {VOICE_LABELS} from '../voice/types';
import type {VoiceId} from '../voice/types';
import {previewVoice} from '../audio';
export default function VoicePicker({value,onChange,label='내 캐릭터',labels=VOICE_LABELS,preview=true}:{value:VoiceId;onChange:(voice:VoiceId)=>void;label?:string;labels?:Record<VoiceId,string>;preview?:boolean}){
 const [message,setMessage]=useState('');
 return <div className="voice-picker"><label>{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value as VoiceId)}>{Object.entries(labels).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>{preview?<button type="button" onClick={()=>{previewVoice(value);setMessage('미리듣기 요청 · 음소거와 음성 음량 설정을 따릅니다.');}} aria-label={`${label} 미리듣기`}>미리듣기</button>:null}{message?<span className="sr-only" role="status">{message}</span>:null}</div>;
}
