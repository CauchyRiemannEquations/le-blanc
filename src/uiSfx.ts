import {playSfx} from './audio';
import type {SfxEvent} from './sfx';

export interface UiInteraction {event?:string;disabled?:boolean;checked?:boolean}
/** A semantic cue replaces, rather than accompanies, the generic button cue. */
export function uiCue({event,disabled,checked}:UiInteraction):{event:SfxEvent;state?:string}|null {
 if(disabled||event==='none')return null;
 if(event==='ui_toggle')return typeof checked==='boolean'?{event:'ui_toggle',state:checked?'on':'off'}:null;
 if(event==='ui_back'||event==='ui_invalid')return {event};
 return {event:'ui_press'};
}

export function attachUiSfx(){
 let active=true;
 const click=(event:MouseEvent)=>{
  if(!(event.target instanceof Element))return;
  const control=event.target.closest<HTMLElement>('button,input[type="checkbox"],summary');
  if(!control||!control.closest('#root'))return;
  const explicit=control.closest<HTMLElement>('[data-sfx]')?.dataset.sfx;
  const toggle=control.matches('input[type="checkbox"]')?control as HTMLInputElement:control.querySelector<HTMLElement>('[role="switch"]');
  // Native checkboxes already have their new value at click capture; custom
  // switches still expose the old React value until their handler commits.
  const checked=toggle instanceof HTMLInputElement?toggle.checked:toggle?! (toggle.getAttribute('aria-checked')==='true'):undefined;
  const cue=uiCue({event:explicit??(toggle?'ui_toggle':undefined),checked,disabled:control.matches(':disabled,[aria-disabled="true"]')||!!control.closest('[inert]')});
  if(!cue)return;
  // Capture sees overlay clicks even when the React handler stops bubbling;
  // defer playback until that handler and the gesture unlock have run.
  queueMicrotask(()=>{if(active&&!document.hidden)playSfx(cue.event,{state:cue.state});});
 };
 document.addEventListener('click',click,true);
 return()=>{active=false;document.removeEventListener('click',click,true);};
}
