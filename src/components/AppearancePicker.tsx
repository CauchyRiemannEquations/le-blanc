import {previewVoice} from '../audio';
import {CHARACTERS,appearanceVoice} from '../engine/characters';
import type {Appearance} from '../engine/characters';
export default function AppearancePicker({value,onChange,label='내 캐릭터 외형'}:{value:Appearance;onChange:(value:Appearance)=>void;label?:string}){
 return <fieldset className="appearance-picker"><legend>{label}</legend><div>{(['male','female'] as const).map(id=><button key={id} type="button" data-sfx="ui_toggle" aria-pressed={value===id} onClick={()=>onChange(id)}><img src={CHARACTERS[id].portrait} alt=""/><span>{CHARACTERS[id].label}</span><span className="radio-dot" aria-hidden="true"/></button>)}</div><button type="button" className="appearance-preview" aria-label={`${label} 목소리 듣기`} onClick={()=>previewVoice(appearanceVoice(value))}>목소리 듣기</button></fieldset>;
}
