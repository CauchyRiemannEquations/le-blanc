import {useSyncExternalStore} from 'react';

export const MOBILE_PORTRAIT_QUERY='(pointer: coarse) and (orientation: portrait)';
const portrait=()=>typeof matchMedia==='function'&&matchMedia(MOBILE_PORTRAIT_QUERY).matches;
function subscribe(change:()=>void){
 if(typeof matchMedia!=='function')return ()=>{};
 const media=matchMedia(MOBILE_PORTRAIT_QUERY);
 if(media.addEventListener){media.addEventListener('change',change);return()=>media.removeEventListener('change',change);}
 media.addListener(change);return()=>media.removeListener(change);
}
export function useMobilePortrait(){return useSyncExternalStore(subscribe,portrait,()=>false);}

export interface LandscapeHost {
 mobile:boolean;
 fullscreen:()=>boolean;
 requestFullscreen?:()=>Promise<void>;
 lock?:()=>Promise<void>;
}
function browserHost():LandscapeHost {
 const orientation=screen.orientation as ScreenOrientation&{lock?:(value:'landscape')=>Promise<void>};
 return {mobile:typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches,
  fullscreen:()=>!!document.fullscreenElement,
  requestFullscreen:document.documentElement.requestFullscreen?()=>document.documentElement.requestFullscreen():undefined,
  lock:orientation?.lock?()=>orientation.lock!('landscape'):undefined};
}
/** Explicit gestures only. Unsupported/denied locking falls back to the rotate gate. */
export async function requestLandscape(host:LandscapeHost=browserHost()):Promise<boolean>{
 if(!host.mobile||!host.lock)return false;
 if(!host.fullscreen()&&host.requestFullscreen){
  try{await host.requestFullscreen();}catch{/* Standalone apps may still allow locking. */}
 }
 try{await host.lock();return true;}catch{return false;}
}
