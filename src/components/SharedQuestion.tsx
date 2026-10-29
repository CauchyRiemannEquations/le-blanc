import type {Outcome} from '../engine/types';
import {questionLabel} from '../engine/questions';
export default function SharedQuestion({event,names,compact=false}:{event:Outcome;names:readonly string[];compact?:boolean}) {
 if(event.type!=='question'||!event.question||event.a===undefined||event.b===undefined||event.answer===undefined)return null;
 const label=questionLabel({kind:event.question,parameter:event.parameter,negate:event.negate});
 return <div className={compact?'shared-question compact':'shared-question'}>
  <p className="question-target"><span>{names[event.actor]} → {names[1-event.actor]}</span>{' · '}<span className="question-card-pair">{event.a+1}번 ↔ {event.b+1}번</span></p>
  {compact?<p className="question-sentence">{label}</p>:<h2 className="question-sentence">{label}</h2>}
  <div className={`answer-stamp ${event.answer?'affirmative':'negative'}`}><span>답변</span>{compact?<b className="question-answer">{event.answer?'YES':'NO'}</b>:<strong className="outcome-word">{event.answer?'YES':'NO'}</strong>}<span>{event.answer?'예':'아니오'}</span></div>
 </div>;
}
