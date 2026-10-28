import {ArrowLeft,Settings2} from 'lucide-react';

export default function MenuNavigation({onBack,onSettings,onHelp}:{onBack?:()=>void;onSettings:()=>void;onHelp?:()=>void}){
 return <nav className="menu-utilities" aria-label="메뉴 이동 및 설정">
  {onBack?<button data-sfx="ui_back" onClick={onBack}><ArrowLeft size={15}/>돌아가기</button>:null}
  {onHelp?<button onClick={onHelp}>플레이 방법</button>:null}
  <button onClick={onSettings}><Settings2 size={15}/>설정</button>
 </nav>;
}
