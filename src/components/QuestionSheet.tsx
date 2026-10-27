import { useState } from 'react';
import { ArrowLeft,ArrowRight,Check,MessageCircle } from 'lucide-react';
import { parseQuestion } from '../engine/questionParser';
import { questionLabel } from '../engine/questions';
import { canTargetPair } from '../engine/game';
import type { Action,GameView,QuestionSpec } from '../engine/types';
import Overlay from './Overlay';
import TileRow from './TileRow';
interface Props { view:GameView;onClose:()=>void;onAction:(a:Action)=>void;reduced:boolean }
export default function QuestionSheet({view,onClose,onAction,reduced}:Props) {
 const [text,setText]=useState(''),[question,setQuestion]=useState<QuestionSpec|null>(null),[selected,setSelected]=useState<number[]>([]),[error,setError]=useState('');
 function check(){const result=parseQuestion(text,view.rules);if(!result.ok){setError(result.message);return;}setQuestion(result.question);setSelected(result.targets??[]);setError('');}
 function preset(q:QuestionSpec){setText(questionLabel(q));setQuestion(q);setSelected([]);setError('');}
 const pairOk=question!==null&&selected.length===2&&canTargetPair(view,selected[0],selected[1],question);
 return <Overlay title="질문하기" onClose={onClose} wide reduced={reduced}>
  {!question?<><h2>무엇이 궁금한가요?</h2><p className="muted">두 숫자의 관계를 물어보세요. 질문권 {view.ownQuestionsLeft}회</p>
   <form className="question-composer" onSubmit={e=>{e.preventDefault();check();}}>
    <label htmlFor="question-text">물어볼 내용</label><input id="question-text" value={text} maxLength={120} autoComplete="off" placeholder="두 숫자의 차이가 5 이하인가?" aria-describedby="question-input-help" aria-invalid={!!error} onChange={e=>{setText(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter'&&e.nativeEvent.isComposing)e.preventDefault();}}/>
    <p id="question-input-help">차이, 합의 배수, 서로소, 배수 관계를 판정할 수 있습니다.</p>
    {error?<p className="inline-error" role="alert">{error}</p>:null}
    <button className="primary full" type="submit" disabled={!text.trim()}>질문 판정<ArrowRight size={16}/></button>
   </form>
   <div className="quick-questions"><span className="eyebrow">바로 고르기</span><div>{([{kind:'near'},{kind:'sum3'},{kind:'coprime'}] as QuestionSpec[]).map((q,i)=><button className="secondary" key={q.kind} onClick={()=>preset(q)}>{['차이 ≤ 3','합이 3의 배수','서로소'][i]}</button>)}</div></div>
   <details className="question-examples"><summary>어떻게 물어보나요?</summary><p>예시의 숫자를 바꿔 쓸 수 있습니다. 타일 번호를 적지 않으면 다음 화면에서 고릅니다.</p>{['1번과 2번의 차이가 5 이하인가?','두 숫자의 합이 4의 배수인가?','한 숫자가 다른 숫자의 배수인가?','큰 숫자가 작은 숫자의 2배인가?','두 숫자는 서로소인가?'].map(example=><button className="text-button" key={example} onClick={()=>{setText(example);setError('');}}>{example}<ArrowRight size={13}/></button>)}<small>지원하는 관계를 정해진 문장 패턴으로 해석합니다. 복합 조건이나 뜻이 불분명한 문장은 판정하지 않습니다.</small></details>
   <p className="sheet-foot">판정만으로는 질문권을 쓰지 않습니다.</p>
  </>:<>
   <button className="text-button back-inline" onClick={()=>{setQuestion(null);setError('');}}><ArrowLeft size={14}/>질문 수정</button>
   <p className="question-approved"><Check size={15}/>이 질문을 사용할 수 있습니다</p><h2 className="sheet-title">{questionLabel(question)}</h2>
   <p className="step-label"><span>01</span>상대 타일 두 개 선택<b>{selected.length} / 2</b></p>
   <TileRow tiles={view.opponent} selected={selected} onSelect={index=>setSelected(prev=>prev.includes(index)?prev.filter(i=>i!==index):prev.length<2?[...prev,index]:[prev[1],index])} compact label="공격 또는 질문 대상" reduced={reduced}/>
   {selected.length===2&&!pairOk?<p className="inline-error" role="status">이미 물어본 질문이거나 두 타일이 모두 공개됐습니다. 다른 질문이나 타일을 골라주세요.</p>:null}
   <div className="question-confirmation">{selected.length===2?`${[...selected].sort((a,b)=>a-b).map(i=>i+1).join('번 · ')}번에 질문합니다.`:'위에서 타일을 고르세요.'}</div>
   <button className="primary full" disabled={!pairOk} onClick={()=>{if(pairOk)onAction({type:'question',...question,a:selected[0],b:selected[1]});}}><MessageCircle size={17}/>질문 확정</button>
   <p className="sheet-foot">질문권 1회 사용 · 내 차례 종료<br/>질문 내용과 답은 상대에게 보이지 않습니다.</p>
  </>}
 </Overlay>;
}
