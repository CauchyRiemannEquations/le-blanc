import { Volume2, VolumeX } from 'lucide-react';
import type { AudioSettings } from '../audioScene';

export default function AudioSettingsControls({settings,onChange}:{settings:AudioSettings;onChange:(patch:Partial<AudioSettings>)=>void}) {
 return <>
  <button data-sfx="ui_toggle" onClick={()=>onChange({muted:!settings.muted})}>{settings.muted?<VolumeX size={19}/>:<Volume2 size={19}/>}<span>전체 음소거<small>배경음악 · 환경음 · 모든 효과음</small></span><b className={`switch ${settings.muted?'on':''}`} role="switch" aria-checked={settings.muted} aria-label="전체 음소거"/></button>
  <label className="audio-volume">전체 음량 <output>{Math.round(settings.volume*100)}%</output><input aria-label="전체 음량" type="range" min="0" max="100" step="5" value={Math.round(settings.volume*100)} onChange={e=>onChange({volume:Number(e.target.value)/100})}/></label>
  <button data-sfx="ui_toggle" onClick={()=>onChange({music:!settings.music})}><Volume2 size={19}/><span>배경음악<small>메뉴 · 대전 음악</small></span><b className={`switch ${settings.music?'on':''}`} role="switch" aria-checked={settings.music} aria-label="배경음악"/></button>
  <button data-sfx="ui_toggle" onClick={()=>onChange({ambience:!settings.ambience})}><Volume2 size={19}/><span>환경음<small>작게 흐르는 선술집 공간음</small></span><b className={`switch ${settings.ambience?'on':''}`} role="switch" aria-checked={settings.ambience} aria-label="환경음"/></button>
 </>;
}
