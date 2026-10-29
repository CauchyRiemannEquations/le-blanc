import {TypecastClient} from '@neosapience/typecast-js';
import type {SubscriptionResponse} from '@neosapience/typecast-js';
import {existsSync,readFileSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {buildCatalog} from '../src/voice/catalog';
import {ATTRIBUTION,resolveVoices,makePlan,planSummary,produce,readManifest,atomicJson,cached,writeDurations} from './voice/core';
import type {VoiceConfig,Scope} from './voice/core';
const root=process.cwd(),args=process.argv.slice(2),command=args[0]??'plan';
const option=(name:string,fallback:string)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]??fallback;};
const scope=option('--scope','audition') as Scope,maxFiles=Number(option('--max-files','12')),maxChars=Number(option('--max-chars','500'));
if(!['audition','numbers','game','all'].includes(scope)||!Number.isInteger(maxFiles)||maxFiles<0||!Number.isInteger(maxChars)||maxChars<0)throw new Error('Invalid explicit limits/scope');
const concurrency=Number(option('--concurrency','2'));
if(!Number.isInteger(concurrency)||concurrency<1)throw new Error('Invalid concurrency');
const privateEnv=resolve(root,'.env.typecast.local');
if(existsSync(privateEnv)&&!process.env.TYPECAST_API_KEY)process.env.TYPECAST_API_KEY=parseEnv(readFileSync(privateEnv,'utf8')).TYPECAST_API_KEY;
// SDK 0.4.15 has no signal/timeout option. Bound its native-fetch transport in this CLI only.
const nativeFetch=globalThis.fetch;globalThis.fetch=(input,init)=>nativeFetch(input,{...init,signal:AbortSignal.timeout(45_000)});
const client=process.env.TYPECAST_API_KEY?new TypecastClient({apiKey:process.env.TYPECAST_API_KEY,...ATTRIBUTION}):null;
const configPath=resolve(root,'voice-production/config.json');
let config:VoiceConfig=existsSync(configPath)?JSON.parse(readFileSync(configPath,'utf8')):resolveVoices([]),subscription:SubscriptionResponse|null=null;
let lock:number|undefined;
try{
 if(command==='discover'||command==='generate'||command==='plan'&&client){
  if(!client)throw new Error('MISSING_KEY');
  const [voices,account]=await Promise.all([client.getVoicesV3(),client.getMySubscription()]);config=resolveVoices(voices);subscription=account;atomicJson(configPath,config);
  atomicJson(resolve(root,'voice-production/account.json'),{checkedAt:new Date().toISOString(),...account});
 }
 const catalog=buildCatalog();atomicJson(resolve(root,'voice-production/catalog.json'),catalog);
 if(command==='discover'){console.log(JSON.stringify({config,subscription},null,2));}
 else if(command==='verify'){const manifest=readManifest(root);writeDurations(root,manifest);const bad=manifest.assets.filter(a=>a.status==='ready'&&!cached(a,root));console.log(JSON.stringify({ready:manifest.assets.filter(a=>a.status==='ready').length,invalid:bad.length,notReady:manifest.assets.filter(a=>a.status!=='ready').length}));if(bad.length)process.exitCode=1;}
 else if(command==='plan'||command==='generate'){
  if(command==='generate')lock=openSync(resolve(root,'voice-production/.generation.lock'),'wx');
  const manifest=readManifest(root),items=makePlan(config,manifest,root,scope,catalog),summary=planSummary(items,subscription,catalog,maxFiles,maxChars);
  atomicJson(resolve(root,'voice-production/plan.json'),{scope,...summary,items:items.map(({request,previous,...item})=>({...item,request}))});console.log(JSON.stringify(summary,null,2));
  if(command==='generate'){
   if(!client||!subscription||!summary.canGenerate)throw new Error('PLAN_BLOCKED');
   // Follow the requested production order even across separate invocations.
   if(scope!=='audition')for(const prerequisite of scope==='numbers'?['audition']:['audition','numbers'])if(makePlan(config,manifest,root,prerequisite as Scope,catalog).some(i=>!i.reuse))throw new Error('GENERATE_AUDITION_THEN_NUMBERS_FIRST');
   const report=await produce(items,manifest,root,{maxFiles,maxChars,concurrency,subscription,retryUncertain:args.includes('--retry-uncertain')},{speak:r=>client.textToSpeech(r),subscription:()=>client.getMySubscription()});
   const after=await client.getMySubscription();atomicJson(resolve(root,`voice-production/run-${scope}-${Date.now()}.json`),{at:new Date().toISOString(),...report,before:subscription.credits,after:after.credits,scope});console.log(JSON.stringify({...report,credits:after.credits}));if(report.failed||report.stopped)process.exitCode=1;
  }
 }else throw new Error('Use discover, plan, generate, verify');
}catch(error){
 // Never print API errors, response bodies, headers or request config: those may carry secrets.
 const status=typeof error==='object'&&error!==null&&'statusCode'in error?Number(error.statusCode):null;
 const known=error instanceof Error&&['MISSING_KEY','PLAN_BLOCKED','GENERATE_AUDITION_THEN_NUMBERS_FIRST'].includes(error.message)?error.message:'VOICE_TOOL_FAILED';
 console.error(JSON.stringify({error:known,status,name:error instanceof Error?error.name:'unknown',code:typeof error==='object'&&error!==null&&'code'in error?error.code:undefined,location:error instanceof Error?error.stack?.split('\n').slice(1,3):undefined}));process.exitCode=1;
}finally{if(lock!==undefined){closeSync(lock);unlinkSync(resolve(root,'voice-production/.generation.lock'));}}
