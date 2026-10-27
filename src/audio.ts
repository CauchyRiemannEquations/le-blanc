let context:AudioContext|undefined;
export function playTone(kind:'select'|'success'|'fail'|'chain',enabled:boolean) {
 if(!enabled)return;
 try{context??=new AudioContext();void context.resume();const frequencies=kind==='chain'?[392,494,587]:kind==='success'?[440,587]:kind==='fail'?[180]:[330];frequencies.forEach((freq,i)=>{const osc=context!.createOscillator(),gain=context!.createGain(),time=context!.currentTime+i*.12;osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.035,time+.015);gain.gain.exponentialRampToValueAtTime(.001,time+.22);osc.connect(gain);gain.connect(context!.destination);osc.start(time);osc.stop(time+.23);});}catch{/* Sound is optional. */}
}
