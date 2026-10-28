import {useEffect} from 'react';

export type AudioScene='menu'|'solo'|'duel'|'victory'|'defeat';
let scene:AudioScene|null=null,enabled=false,installed=false;
let music:HTMLAudioElement|undefined,ambience:HTMLAudioElement|undefined;
function play(audio:HTMLAudioElement){if(audio.paused&&!audio.ended)void audio.play().then(()=>{if(!enabled||document.hidden||(audio!==music&&audio!==ambience))audio.pause();}).catch(()=>{/* Retry on the next real gesture when autoplay is blocked. */});}
function sync(){
 if(!music)return;
 if(!enabled||document.hidden){music.pause();ambience?.pause();return;}
 play(music);if(ambience&&scene!=='victory'&&scene!=='defeat')play(ambience);else ambience?.pause();
}
function configure(next:AudioScene,on:boolean){
 enabled=on;
 if(!installed){installed=true;document.addEventListener('pointerdown',sync);document.addEventListener('keydown',sync);document.addEventListener('visibilitychange',sync);}
 if(scene!==next){
  if(music){music.pause();music.removeAttribute('src');music.load();}scene=next;
  const cue=next==='victory'||next==='defeat';
  music=new Audio(`/audio/${cue?'cue':'bgm'}_${next}.ogg`);music.loop=!cue;music.volume=cue?.32:.22;music.preload='auto';
  ambience??=new Audio('/audio/amb_tavern.ogg');ambience.loop=true;ambience.volume=.075;
 }
 sync();
}
// Only the active screen owns the scene; lazy solo/online screens supply their own state.
export function useGameAudio(scene:AudioScene|null,enabled:boolean){useEffect(()=>{if(scene)configure(scene,enabled);},[scene,enabled]);}
