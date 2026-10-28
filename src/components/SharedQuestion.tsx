import type {Outcome} from '../engine/types';
import {questionLabel} from '../engine/questions';
export default function SharedQuestion({event,names,compact=false}:{event:Outcome;names:readonly string[];compact?:boolean}) {
 if(event.type!=='question'||!event.question||event.a===undefined||event.b===undefined||event.answer===undefined)return null;
 const label=questionLabel({kind:event.question,parameter:event.parameter,negate:event.negate});
 return <div className={compact?'shared-question compact':'shared-question'}>
  <p className="question-target">{names[event.actor]} → {names[1-event.actor]} · {event.a+1}번 ↔ {event.b+1}번</p>
  {compact?<p>{label}</p>:<h2>{label}</h2>}
  <strong className={compact?'question-answer':'outcome-word'}>{event.answer?'YES':'NO'}</strong>
 </div>;
}
