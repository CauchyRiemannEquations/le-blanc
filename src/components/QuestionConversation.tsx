import {flushSync} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import {cancelDialogue,playDialogue,preloadVoice} from '../audio';
import type {AudioSettings} from '../audioScene';
import type {GameView,Outcome} from '../engine/types';
import {questionPresentation,speechEnabled} from '../voice/presentation';
import {questionLabel} from '../engine/questions';
export default function QuestionConversation({match,view,event,settings,onDone}:{match:string;view:GameView;event:Outcome;settings:AudioSettings;onDone:()=>void}){
 const [phases]=useState(()=>questionPresentation(view,event)),[step,setStep]=useState(0),[status,setStatus]=useState<'loading'|'speaking'|'error'>('loading'),[retry,setRetry]=useState(0);
 const resumeStep=useRef(0),settingsRef=useRef(settings);settingsRef.current=settings;
 const done=useRef(onDone);done.current=onDone;
 const skip=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  let stopped=false,activeStep=-1,timer:ReturnType<typeof setTimeout>;
  const finish=()=>{if(stopped)return;stopped=true;clearTimeout(timer);cancelDialogue();done.current();};
  const voices=view.voices??['jongdae','jongdae'];
  for(const phase of phases)if(speechEnabled(phase.speaker,view.player,settingsRef.current))preloadVoice(phase.lines,voices[phase.speaker]);
  const show=(index:number)=>{if(stopped)return;const phase=phases[index];if(!phase){finish();return;}activeStep=index;resumeStep.current=index;flushSync(()=>{setStep(index);setStatus('loading');});
   const next=()=>{clearTimeout(timer);timer=setTimeout(()=>show(index+1),150);};
   if(!speechEnabled(phase.speaker,view.player,settingsRef.current)){setStatus('speaking');timer=setTimeout(()=>show(index+1),phase.duration);return;}
   playDialogue({id:`${match}:${event.id}:speech-${index}:try-${retry}`,ttl:30000,utterances:[{speaker:phase.speaker,lines:phase.lines}]},voices,view.player,state=>{
    if(stopped||activeStep!==index)return;
    if(state==='started')setStatus('speaking');
    else if(state==='error')setStatus('error');
    else if(state==='complete'||state==='silent'||state==='cancelled')next();
   });
  };
  // StrictMode probes must not consume a playback ID before the real mount.
  timer=setTimeout(()=>show(resumeStep.current),0);skip.current?.focus();
  const visibility=()=>{if(document.hidden)finish();};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();finish();}if(e.key==='Tab'){const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.question-conversation button'));const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
  document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',key);
  return()=>{stopped=true;clearTimeout(timer);cancelDialogue();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',key);};
 },[match,event.id,phases,view.player,retry]);
 return <section className="question-conversation" role="dialog" aria-modal="true" aria-label="질문 대화" data-step={step===0?'question':'answer'} data-speech={status}>
  <div className="conversation-table">{phases.slice(0,step+1).map((phase,index)=><div key={index} className={`speech-bubble ${phase.speaker===view.player?'own':'opponent'} ${index===step?'speaking':'spoken'}`} data-speaker={phase.speaker}>
   <div className="speech-heading"><strong>{view.names[phase.speaker]}</strong><span>{index===0?'질문':'답변'}</span></div>
   {index===0?<p className="speech-target">{event.a!+1}번과 {event.b!+1}번 카드</p>:null}
   <p className="speech-text" aria-live={index===step?'polite':'off'}>{index===step&&status==='loading'&&speechEnabled(phase.speaker,view.player,settings)?'…':index===0?questionLabel({kind:event.question!,parameter:event.parameter,negate:event.negate}):phase.text}</p>
  </div>)}</div>
  {status==='error'?<div className="conversation-audio-error" role="alert"><span>음성을 불러오지 못했습니다.</span><button onClick={()=>setRetry(n=>n+1)}>다시 재생</button></div>:null}
  <button ref={skip} className="conversation-skip" data-sfx="none" onClick={()=>{cancelDialogue();done.current();}}>결과 바로 보기 <span aria-hidden="true">→</span></button>
 </section>;
}
