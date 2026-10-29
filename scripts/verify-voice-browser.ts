import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {readManifest,atomicJson} from './voice/core';
const root=process.cwd(),manifest=readManifest(root),ready=manifest.assets.filter(a=>a.status==='ready');
const browser=await chromium.launch({channel:'chrome',headless:true});
const results:{key:string;duration:number;peak:number}[]=[];
try{
 const page=await browser.newPage();
 for(let i=0;i<ready.length;i+=20){const batch=ready.slice(i,i+20).map(a=>({key:a.key,base64:readFileSync(root+'/public'+a.file).toString('base64')}));
  results.push(...await page.evaluate(async clips=>{const c=new AudioContext(),results=[];try{for(const clip of clips){const data=Uint8Array.from(atob(clip.base64),c=>c.charCodeAt(0));const buffer=await c.decodeAudioData(data.buffer);let peak=0;for(const v of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(v));results.push({key:clip.key,duration:buffer.duration,peak});}}finally{await c.close();}return results;},batch));
 }
 const failures=results.filter(r=>r.duration<.1||r.duration>30||r.peak<.0001);atomicJson(root+'/voice-production/browser-check.json',{at:new Date().toISOString(),files:ready.length,failures,actualListening:false,results});console.log(JSON.stringify({decoded:results.length,failures:failures.length,actualListening:false}));if(failures.length)process.exitCode=1;
}finally{await browser.close();}
