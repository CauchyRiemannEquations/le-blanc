import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname,join} from 'node:path';
import type {TTSRequest,TTSResponse,VoiceV3Response,SubscriptionResponse} from '@neosapience/typecast-js';
import {buildCatalog} from '../../src/voice/catalog';
import type {VoiceLine} from '../../src/voice/catalog';
import {VOICE_NAMES} from '../../src/voice/types';
import type {VoiceId,VoiceAsset,VoiceManifest} from '../../src/voice/types';
export const ATTRIBUTION={source:'api-page',generatedBy:'codex'} as const;
export interface VoiceConfig {checkedAt:string|null;source:'api-page';generated_by:'codex';voices:Record<VoiceId,{status:'resolved'|'unresolved';voice_id:string|null;model:'ssfm-v30'|'ssfm-v21'|null;emotions:string[];reason?:string}>}
export function resolveVoices(voices:VoiceV3Response[]):VoiceConfig {
 const config:VoiceConfig={checkedAt:new Date().toISOString(),source:'api-page',generated_by:'codex',voices:{} as VoiceConfig['voices']};
 for(const voice of Object.keys(VOICE_NAMES) as VoiceId[]){const found=voices.filter(v=>v.voice_name.kor===VOICE_NAMES[voice]);const model=found.length===1?['ssfm-v30','ssfm-v21'].map(m=>found[0].models.find(x=>x.version===m&&x.emotions.includes('normal'))).find(Boolean):undefined;
  config.voices[voice]=model?{status:'resolved',voice_id:found[0].voice_id,model:model.version,emotions:model.emotions}:{status:'unresolved',voice_id:null,model:null,emotions:[],reason:found.length!==1?'정확한 이름의 후보가 없거나 중복됨':'중립 감정 지원 모델 미확인'};
 }return config;
}
export function requestFor(voice:VoiceId,text:string,config:VoiceConfig):TTSRequest|null {const c=config.voices[voice];return c.status!=='resolved'||!c.voice_id||!c.model?null:{voice_id:c.voice_id,model:c.model,text,language:'kor',prompt:c.model==='ssfm-v30'?{emotion_type:'preset',emotion_preset:'normal',emotion_intensity:0}:{emotion_preset:'normal',emotion_intensity:0},output:{audio_format:'mp3',volume:100,audio_pitch:0,audio_tempo:1}};}
export const sha256=(data:Uint8Array|string)=>createHash('sha256').update(data).digest('hex');
export const generationKey=(request:TTSRequest)=>sha256(JSON.stringify(request));
/** Validate binary audio, not extension or SDK's content-type-derived format alone. */
export function inspectAudio(data:Uint8Array):{duration:number;bytes:number;format:'mp3'|'wav'} {
 const b=Buffer.from(data);let duration=0,format:'mp3'|'wav'='mp3';
 if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WAVE'){
  format='wav';let rate=0,size=0;for(let p=12;p+8<=b.length;){const n=b.readUInt32LE(p+4);if(p+8+n>b.length)throw new Error('Truncated WAV');const tag=b.toString('ascii',p,p+4);if(tag==='fmt '&&n>=16)rate=b.readUInt32LE(p+16);if(tag==='data')size=n;p+=8+n+(n%2);}duration=size/rate;
 }else{
  let p=0,frames=0;if(b.toString('ascii',0,3)==='ID3'){if(b.length<10)throw new Error('Bad ID3');p=10+((b[6]&127)<<21)+((b[7]&127)<<14)+((b[8]&127)<<7)+(b[9]&127);if(b[5]&16)p+=10;}
  while(p+4<=b.length){if(b.toString('ascii',p,p+3)==='TAG'&&b.length-p===128)break;
   const h=b.readUInt32BE(p),version=(h>>>19)&3,layer=(h>>>17)&3,bi=(h>>>12)&15,si=(h>>>10)&3;
   if((h>>>21)!==2047||version===1||layer!==1||bi===0||bi===15||si===3)throw new Error('Invalid MPEG audio');
   const bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bi]*1000;
   const rate=[44100,48000,32000][si]/(version===3?1:version===2?2:4),length=Math.floor((version===3?144:72)*bitrate/rate)+((h>>>9)&1);
   if(p+length>b.length)throw new Error('Truncated MP3');duration+=(version===3?1152:576)/rate;p+=length;frames++;
  }if(frames<2||p<b.length&&b.length-p!==128)throw new Error('Empty MP3');
 }
 if(!Number.isFinite(duration)||duration<.1||duration>30)throw new Error('Invalid duration');return {duration,bytes:b.length,format};
}
export function atomicJson(path:string,value:unknown){mkdirSync(dirname(path),{recursive:true});writeFileSync(path+'.part',JSON.stringify(value,null,2)+'\n');try{renameSync(path+'.part',path);}catch(error){if((error as NodeJS.ErrnoException).code!=='EPERM')throw error;/* Windows may hold a replace-denying handle. Keep a recoverable sidecar until the complete write succeeds. */writeFileSync(path,readFileSync(path+'.part'));unlinkSync(path+'.part');}}
export function writeDurations(root:string,manifest:VoiceManifest){
 const durations:Record<VoiceId,Record<string,number>>={jongdae:{},ael:{}};
 for(const asset of manifest.assets)if(asset.status==='ready'&&asset.duration)for(const id of asset.lineIds)durations[asset.voice][id]=Math.ceil(asset.duration*1000)/1000;
 atomicJson(join(root,'src/voice/durations.json'),durations);
}
export function cached(asset:VoiceAsset,root:string){if(asset.status!=='ready'||!asset.file)return false;try{const path=join(root,'public',asset.file.replace(/^\//,''));const data=readFileSync(path);inspectAudio(data);return sha256(data)===asset.sha256;}catch{return false;}}
export interface PlanItem {key:string;voice:VoiceId;text:string;lineIds:string[];request:TTSRequest|null;reuse:boolean;previous?:VoiceAsset}
export type Scope='audition'|'numbers'|'game'|'all';
export function makePlan(config:VoiceConfig,manifest:VoiceManifest,root:string,scope:Scope,catalog=buildCatalog()):PlanItem[]{
 const groups=new Map<string,PlanItem>();
 for(const line of catalog.filter(l=>l.status==='ready'&&(scope==='all'||l.scope===scope)).sort((a,b)=>a.id.localeCompare(b.id)))for(const voice of Object.keys(VOICE_NAMES) as VoiceId[]){const text=line.scripts[voice],request=requestFor(voice,text,config),key=request?generationKey(request):sha256(`${voice}:${text}`);const found=groups.get(key);if(found){found.lineIds.push(line.id);continue;}let previous=manifest.assets.find(a=>a.key===key);if(request&&(!previous||!cached(previous,root))){const file=`/audio/voice/files/${key}.${request.output!.audio_format}`;try{const data=readFileSync(join(root,'public',file.slice(1))),info=inspectAudio(data);previous={key,voice,text,lineIds:[...(previous?.lineIds??[]),line.id],file,status:'ready',...info,sha256:sha256(data)};}catch{/* Missing or invalid file remains pending. */}}groups.set(key,{key,voice,text,lineIds:[line.id],request,reuse:!!previous&&cached(previous,root),previous});}
 return [...groups.values()];
}
export function planSummary(items:PlanItem[],subscription:SubscriptionResponse|null,catalog:VoiceLine[],maxFiles:number,maxChars:number){const fresh=items.filter(i=>!i.reuse);const remaining=subscription?Math.max(0,subscription.credits.plan_credits-subscription.credits.used_credits):null;
 return {voices:Object.fromEntries(Object.keys(VOICE_NAMES).map(v=>[v,{files:items.filter(i=>i.voice===v).length,characters:items.filter(i=>i.voice===v).reduce((n,i)=>n+i.text.length,0),reused:items.filter(i=>i.voice===v&&i.reuse).length}])),files:items.length,characters:items.reduce((n,i)=>n+i.text.length,0),reused:items.length-fresh.length,newFiles:fresh.length,newCharacters:fresh.reduce((n,i)=>n+i.text.length,0),unresolved:fresh.filter(i=>!i.request).length,excluded:catalog.filter(l=>l.status!=='ready').map(l=>({id:l.id,reason:l.reason})),limits:{maxFiles,maxChars,remainingCredits:remaining,concurrency:subscription?.limits.concurrency_limit??null},canGenerate:!!subscription&&fresh.every(i=>i.request)&&fresh.length<=maxFiles&&fresh.reduce((n,i)=>n+i.text.length,0)<=Math.min(maxChars,remaining??0)};
}
export async function produce(items:PlanItem[],manifest:VoiceManifest,root:string,options:{maxFiles:number;maxChars:number;concurrency:number;subscription:SubscriptionResponse;retryUncertain?:boolean},api:{speak:(request:TTSRequest)=>Promise<TTSResponse>;subscription:()=>Promise<SubscriptionResponse>}){
 let calls=0,characters=0,generated=0,reused=0,failed=0,stopped=false,index=0;
 const manifestPath=join(root,'public/audio/voice/manifest.json');
 const save=(asset:VoiceAsset)=>{
  // A changed script/settings owns its line IDs immediately; old audio remains a content cache only.
  for(const old of manifest.assets)if(old.voice===asset.voice&&old.key!==asset.key)old.lineIds=old.lineIds.filter(id=>!asset.lineIds.includes(id));
  const at=manifest.assets.findIndex(a=>a.key===asset.key);if(at>=0)manifest.assets[at]=asset;else manifest.assets.push(asset);atomicJson(manifestPath,manifest);
 };
 const workers=Math.max(1,Math.min(2,options.concurrency,options.subscription.limits.concurrency_limit));
 const worker=async()=>{while(index<items.length&&!stopped){const item=items[index++];
  if(item.reuse&&item.previous){save({...item.previous,lineIds:[...new Set([...item.previous.lineIds,...item.lineIds])]});reused++;continue;}
  if(!item.request||item.previous?.status==='uncertain'&&!options.retryUncertain){failed++;continue;}
  if(calls>=options.maxFiles||characters+item.text.length>options.maxChars){stopped=true;break;}
  // Reserve before awaiting. Included credits are checked before every synthesis batch.
  calls++;characters+=item.text.length;
  const asset:VoiceAsset={key:item.key,file:null,lineIds:item.lineIds,voice:item.voice,text:item.text,status:'uncertain'};save(asset);
  try{
   const current=await api.subscription();const remaining=current.credits.plan_credits-current.credits.used_credits;
   // Account for the other worker's reserved request, including its worst-case 2000 chars.
   if(remaining<item.text.length+(workers-1)*2000){asset.status='missing';save(asset);stopped=true;continue;}
   const response=await api.speak(item.request);const data=Buffer.from(response.audioData),info=inspectAudio(data);
   if(info.format!==item.request.output?.audio_format)throw new Error('Format mismatch');
   const file=`/audio/voice/files/${item.key}.${info.format}`,path=join(root,'public',file.slice(1));mkdirSync(dirname(path),{recursive:true});writeFileSync(path+'.part',data);inspectAudio(readFileSync(path+'.part'));renameSync(path+'.part',path);
   save({...asset,...info,file,status:'ready',sha256:sha256(data)});generated++;
  }catch(error){const status=typeof error==='object'&&error!==null&&'statusCode'in error?Number(error.statusCode):0;asset.status=status>=400&&status<500?'failed':'uncertain';save(asset);console.error(JSON.stringify({lineIds:item.lineIds,voice:item.voice,status,errorType:error instanceof Error?error.name:'unknown'}));failed++;if([401,402,403,429].includes(status)||!status)stopped=true;}
 }};
 await Promise.all(Array.from({length:workers},worker));writeDurations(root,manifest);return {generated,reused,failed,calls,attemptedCharacters:characters,stopped};
}
export function readManifest(root:string):VoiceManifest {const path=join(root,'public/audio/voice/manifest.json');return existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{version:1,assets:[]};}
