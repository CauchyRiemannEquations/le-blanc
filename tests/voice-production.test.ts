import {describe,it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {generationKey,resolveVoices,makePlan,produce,inspectAudio,readManifest,planSummary} from '../scripts/voice/core';
import type {VoiceManifest} from '../src/voice/types';
import type {VoiceV3Response} from '@neosapience/typecast-js';
import {buildCatalog} from '../src/voice/catalog';
const account={plan:'lite' as const,credits:{plan_credits:200000,used_credits:0},limits:{concurrency_limit:1}};
const voices=['종대','아엘'].map((name,i)=>({voice_id:`tc_fixture_${i}`,voice_name:{kor:name,eng:'test'},models:[{version:'ssfm-v30',emotions:['normal']}]})) as VoiceV3Response[];
const mp3=()=>{const data=Buffer.alloc(417*5);for(let n=0;n<5;n++)data.set([255,251,144,0],417*n);return data;};
describe('bounded voice production',()=>{
 it('does not guess ambiguous/missing voices and requires supported neutral models',()=>{
  expect(resolveVoices([]).voices.jongdae.status).toBe('unresolved');expect(resolveVoices([...voices,voices[0]]).voices.jongdae.status).toBe('unresolved');
  expect(resolveVoices(voices).voices.ael.model).toBe('ssfm-v30');
 });
 it('rejects JSON, empty and truncated binary responses',()=>{
  expect(inspectAudio(mp3()).duration).toBeGreaterThan(.1);
  for(const bytes of [Buffer.from('{"error":"bad"}'),Buffer.alloc(0),mp3().subarray(0,2000)])expect(()=>inspectAudio(bytes)).toThrow();
 });
 it('deduplicates exact payload, keys any changed setting, reuses normal files, and recovers committed orphan files',async()=>{
  const root=mkdtempSync(join(tmpdir(),'leblanc-voice-'));try{
   mkdirSync(join(root,'public'),{recursive:true});const config=resolveVoices(voices),manifest:VoiceManifest={version:1,assets:[]};
   const catalog=buildCatalog().filter(l=>l.id==='AMB_01'||l.id==='AUD_01');const items=makePlan(config,manifest,root,'all',catalog);expect(items).toHaveLength(2);expect(items[0].lineIds).toHaveLength(2);
   const r=items[0].request!;expect(generationKey(r)).not.toBe(generationKey({...r,text:r.text+'!'}));expect(generationKey(r)).not.toBe(generationKey({...r,output:{...r.output,audio_tempo:.9}}));
   let calls=0;const api={subscription:async()=>account,speak:async()=>{calls++;return {audioData:mp3().buffer.slice(0) as ArrayBuffer,format:'mp3' as const,duration:.13};}};
   // Buffer's backing array can include its allocation pool; use an exact copy.
   api.speak=async()=>{calls++;return {audioData:Uint8Array.from(mp3()).buffer,format:'mp3',duration:.13};};
   await produce(items,manifest,root,{maxFiles:2,maxChars:200,concurrency:5,subscription:account},api);expect(calls).toBe(2);
   const again=makePlan(config,readManifest(root),root,'all',catalog);expect(again.every(i=>i.reuse)).toBe(true);
   await produce(again,manifest,root,{maxFiles:0,maxChars:0,concurrency:1,subscription:account},api);expect(calls).toBe(2);
   const recovered=makePlan(config,{version:1,assets:[]},root,'all',catalog);expect(recovered.every(i=>i.reuse)).toBe(true);
   const changed=catalog.map(line=>({...line,scripts:{...line.scripts,jongdae:line.scripts.jongdae+' 다시.'}}));
   await produce(makePlan(config,manifest,root,'all',changed),manifest,root,{maxFiles:1,maxChars:200,concurrency:1,subscription:account},api);
   expect(manifest.assets.filter(a=>a.voice==='jongdae'&&a.lineIds.includes('AMB_01'))).toHaveLength(1);
   expect(manifest.assets.find(a=>a.voice==='jongdae'&&a.lineIds.includes('AMB_01'))?.text).toContain('다시.');
   writeFileSync(join(root,'public',manifest.assets[0].file!.slice(1)),'{"error":true}');expect(makePlan(config,manifest,root,'all',catalog)[0].reuse).toBe(false);
   expect(JSON.stringify(readManifest(root))).not.toContain('API_KEY');
  }finally{if(!root.startsWith(join(tmpdir(),'leblanc-voice-')))throw new Error('Unsafe test cleanup');rmSync(root,{recursive:true,force:true});}
 });
 it('never automatically retries uncertain charged requests or exceeds caps/remaining included credits',async()=>{
  const root=mkdtempSync(join(tmpdir(),'leblanc-voice-'));try{
   const manifest:VoiceManifest={version:1,assets:[]},items=makePlan(resolveVoices(voices),manifest,root,'audition');let calls=0;
   const api={subscription:async()=>account,speak:async()=>{calls++;throw new Error('timeout');}};
   const result=await produce(items,manifest,root,{maxFiles:1,maxChars:100,concurrency:1,subscription:account},api);expect(result.stopped).toBe(true);expect(calls).toBe(1);expect(manifest.assets[0].status).toBe('uncertain');
   const again=makePlan(resolveVoices(voices),manifest,root,'audition').slice(0,1);await produce(again,manifest,root,{maxFiles:1,maxChars:100,concurrency:1,subscription:account},api);expect(calls).toBe(1);
   expect(planSummary(items,{...account,credits:{plan_credits:10,used_credits:10}},buildCatalog(),12,500).canGenerate).toBe(false);
   const saved=readFileSync(join(root,'public/audio/voice/manifest.json'),'utf8');expect(saved).not.toContain('timeout');
  }finally{if(!root.startsWith(join(tmpdir(),'leblanc-voice-')))throw new Error('Unsafe test cleanup');rmSync(root,{recursive:true,force:true});}
 });
});
