import {test,expect,type Page} from '@playwright/test';
import {existsSync} from 'node:fs';
import {STAGES} from '../src/solo/stages';
import {createGame,viewGame} from '../src/engine/game';

test('real audio sources follow menu, solo clear, replay and duel game flow',async({page})=>{
 await page.addInitScript(()=>{
  Math.random=()=>.1;
  localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:true,music:true,ambience:true,reduced:true}));
  const starts:{duration:number;loop:boolean}[]=[];(window as any).__realAudio=starts;(window as any).__contexts=new Set();
  const original=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){starts.push({duration:this.buffer?.duration??0,loop:this.loop});(window as any).__realContext=this.context;(window as any).__contexts.add(this.context);return original.apply(this,args);};
 });
 const played=(seconds:number)=>page.evaluate(seconds=>(window as any).__realAudio.some((s:any)=>Math.abs(s.duration-seconds)<.05),seconds);
 await page.goto('/');await page.getByRole('button',{name:'솔로 모드',exact:true}).click();
 await expect.poll(()=>played(104),{timeout:15000}).toBe(true);await expect.poll(()=>played(96)).toBe(true);
 await page.getByTestId('stage-'+STAGES[0].id).click();await expect.poll(()=>played(160),{timeout:15000}).toBe(true);
 for(const {tile,value} of STAGES[0].walkthrough.inputs){
  await page.getByRole('button',{name:new RegExp('^'+(tile+1)+'번 타일,')}).click();
  await page.getByRole('button',{name:'숫자 '+value,exact:true}).click();
  await page.getByRole('button',{name:value+' · 해독하기',exact:true}).click();
 }
 await page.getByRole('button',{name:'결과 보기'}).click();await expect.poll(()=>played(6)).toBe(true);
 const contextState=()=>page.evaluate(()=>(window as any).__realContext.state);
 const cueCount=()=>page.evaluate(()=>(window as any).__realAudio.filter((s:any)=>s.duration===6).length);
 await page.setViewportSize({width:844,height:390});expect(await cueCount()).toBe(1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(contextState).toBe('suspended');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(contextState).toBe('running');expect(await cueCount()).toBe(1);
 await page.getByRole('button',{name:'다시 풀기'}).click();
 for(const {tile,value} of STAGES[0].walkthrough.inputs){
  await page.getByRole('button',{name:new RegExp('^'+(tile+1)+'번 타일,')}).click();
  await page.getByRole('button',{name:'숫자 '+value,exact:true}).click();
  await page.getByRole('button',{name:value+' · 해독하기',exact:true}).click();
 }
 await page.getByRole('button',{name:'결과 보기'}).click();await expect.poll(cueCount).toBe(2);
 expect(await page.evaluate(()=>(window as any).__realAudio.filter((s:any)=>s.duration===160).length)).toBe(1);
 await page.getByRole('button',{name:'스테이지 목록'}).click();await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('switch',{name:'전체 음소거',exact:true}).click();await expect.poll(contextState).toBe('suspended');
 await page.getByRole('slider',{name:'전체 음량'}).fill('0');
 await page.getByRole('switch',{name:'전체 음소거',exact:true}).click();await expect.poll(contextState).toBe('suspended');
 await page.getByRole('slider',{name:'전체 음량'}).fill('70');await expect.poll(contextState).toBe('running');
 expect(await cueCount()).toBe(2);await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();
 await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작'}).click();
 await expect.poll(()=>played(144),{timeout:15000}).toBe(true);
 expect(await page.evaluate(()=>(window as any).__contexts.size)).toBe(1);
 test.info().annotations.push({type:'real-game-audio',description:JSON.stringify(await page.evaluate(()=>(window as any).__realAudio))});
});


async function mockAudio(page:Page) {
 await page.addInitScript(()=>{
  Math.random=()=>.1;
  localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:true,music:true,ambience:true,muted:false,volume:.7,reduced:true}));
  const events:{type:string;asset?:string}[]=[];
  (window as any).__audio=events;
  class Param {value=1;setValueAtTime(v:number){this.value=v;}cancelAndHoldAtTime(){}cancelScheduledValues(){}linearRampToValueAtTime(v:number){this.value=v;}exponentialRampToValueAtTime(){}}
  class Node {
   gain=new Param();frequency=new Param();buffer='';loop=false;onended:(()=>void)|null=null;
   connect(){}disconnect(){}start(){events.push({type:this.loop?'loop':'cue',asset:this.buffer});}stop(){events.push({type:'stop',asset:this.buffer});}
  }
  class MockAudioContext {
   state='suspended';currentTime=0;destination={};
   constructor(){events.push({type:'context'});}
   createGain(){return new Node();}createBufferSource(){return new Node();}createOscillator(){return new Node();}
   async decodeAudioData(data:ArrayBuffer){return new TextDecoder().decode(data);}
   async resume(){this.state='running';events.push({type:'resume'});}async suspend(){this.state='suspended';events.push({type:'suspend'});}async close(){this.state='closed';events.push({type:'close'});}
  }
  (window as any).AudioContext=MockAudioContext;
  const original=window.fetch.bind(window);
  window.fetch=(input,init)=>String(input).includes('/audio/')?Promise.resolve(new Response(String(input))):original(input,init);
 });
}
const count=(page:Page,asset:string,type='loop')=>page.evaluate(({asset,type})=>(window as any).__audio.filter((e:any)=>e.type===type&&e.asset?.includes(asset)).length,{asset,type});
test('scene navigation, solo result once, replay, settings and hidden tabs (mock audio)',async({page})=>{
 await mockAudio(page);await page.setViewportSize({width:390,height:844});await page.goto('/');
 expect(await count(page,'bgm_menu')).toBe(0);
 await page.getByRole('button',{name:'솔로 모드',exact:true}).click();
 await expect.poll(()=>count(page,'bgm_menu')).toBe(1);
 await page.getByTestId('stage-first-mark').click();await expect.poll(()=>count(page,'bgm_solo')).toBe(1);
 const stage=STAGES[0];
 for(const {tile,value} of stage.walkthrough.inputs){
  await page.getByRole('button',{name:new RegExp('^'+(tile+1)+'번 타일,')}).click();
  await page.getByRole('button',{name:'숫자 '+value,exact:true}).click();
  await page.getByRole('button',{name:value+' · 해독하기',exact:true}).click();
 }
 await page.getByRole('button',{name:'결과 보기'}).click();
 await expect.poll(()=>count(page,'cue_victory','cue')).toBe(1);
 await page.setViewportSize({width:844,height:390});expect(await count(page,'cue_victory','cue')).toBe(1);
 await page.getByRole('button',{name:'다시 풀기'}).click();expect(await count(page,'bgm_solo')).toBe(1);
 await page.getByRole('button',{name:'스테이지 목록'}).click();await expect.poll(()=>count(page,'bgm_menu')).toBe(2);
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('switch',{name:'모션 줄이기'}).scrollIntoViewIfNeeded();
 await expect(page.getByRole('switch',{name:'모션 줄이기'})).toBeInViewport();
 await page.getByRole('switch',{name:'전체 음소거'}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'test-results/audio-settings-844.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/audio-settings-390.png'});
 await page.getByRole('switch',{name:'전체 음소거',exact:true}).click();
 await expect(page.getByRole('switch',{name:'전체 음소거'})).toHaveAttribute('aria-checked','true');
 const before=await count(page,'bgm_menu');
 await page.getByRole('switch',{name:'전체 음소거',exact:true}).click();
 await page.getByRole('slider',{name:'전체 음량'}).fill('35');
 await page.getByRole('switch',{name:'효과음',exact:true}).click();
 await page.getByRole('switch',{name:'환경음',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('leblanc-settings-v1')!));
 expect(saved).toMatchObject({muted:false,volume:.35,sound:false,ambience:false,music:true});
 expect(await count(page,'bgm_menu')).toBe(before);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 expect(await count(page,'bgm_menu')).toBe(before);expect(await count(page,'cue_victory','cue')).toBe(1);
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.getByRole('button',{name:'플레이 방법',exact:true}).click();await expect.poll(()=>count(page,'bgm_solo')).toBe(2);
});
test('AI and shared-device duel use duel music without restarts on overlays/back events',async({page})=>{
 await mockAudio(page);await page.goto('/');await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();
 await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작'}).click();
 await expect.poll(()=>count(page,'bgm_duel')).toBe(1);await expect(page.getByTestId('game-board')).toBeVisible();
 await page.getByRole('button',{name:'대전 메뉴'}).click();
 await page.getByRole('switch',{name:'배경음악',exact:true}).click();await page.getByRole('switch',{name:'배경음악',exact:true}).click();
 await page.getByRole('button',{name:'대전 나가기',exact:true}).click();await page.getByRole('button',{name:'끝내고 메인 메뉴로'}).click();
 await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();await page.getByRole('button',{name:/^같은 기기/}).click();
 const starts=await count(page,'bgm_duel');await page.getByRole('button',{name:'2인 대전 시작'}).click();
 await expect(page.getByTestId('privacy-curtain')).toBeVisible();
 expect(await count(page,'bgm_duel')).toBeGreaterThanOrEqual(starts);
 const playing=await count(page,'bgm_duel');await page.evaluate(()=>window.dispatchEvent(new PopStateEvent('popstate')));
 expect(await count(page,'bgm_duel')).toBe(playing);
});
test('friend waiting, playing, loss, duplicate updates and new match (mock room)',async({page})=>{
 await mockAudio(page);
 const game=createGame(4242),base={initialReveal:true,code:'ABCDEFGH',player:0,names:['Alice','Bob'],deadline:null,version:1,serverTime:Date.now(),finalBoards:null};
 const waiting={...base,status:'waiting',game:null};
 await page.route('**/src/online/client.ts*',route=>route.fulfill({contentType:'text/javascript',body:
  'export const onlineConfigured=true;let room='+JSON.stringify(waiting)+';export async function createOnlineRoom(){return room;}export async function joinOnlineRoom(){return room;}export async function syncOnlineRoom(){return room;}export async function sendOnlineAction(){return room;}export async function leaveOnlineRoom(){}export async function watchRoom(code,receive){window.__emitRoom=r=>{room=r;receive(r);};return ()=>{delete window.__emitRoom;};}'}));
 await page.goto('/?room=');await page.getByRole('button',{name:'방 만들기',exact:true}).click();
 await expect(page.locator('.waiting-room')).toBeVisible();await expect.poll(()=>count(page,'bgm_menu')).toBe(1);
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).__emitRoom)).toBe('function');
 await page.evaluate(room=>(window as any).__emitRoom(room),{...base,status:'playing',version:2,game:viewGame(game,0)});
 await expect(page.getByTestId('online-board')).toBeVisible();await expect.poll(()=>count(page,'bgm_duel')).toBe(1);
 const finished={...base,status:'finished',version:3,game:{...viewGame(game,0),result:{winner:1,turns:3,maxChain:1,finalChain:1}}};
 await page.evaluate(room=>(window as any).__emitRoom(room),finished);await expect(page.getByRole('heading',{name:'DEFEAT'})).toBeVisible();
 await expect.poll(()=>count(page,'cue_defeat','cue')).toBe(1);
 await page.evaluate(room=>(window as any).__emitRoom(room),{...finished,version:4});
 expect(await count(page,'cue_defeat','cue')).toBe(1);expect(await count(page,'bgm_duel')).toBe(1);
 await page.getByRole('button',{name:'새 대전',exact:true}).click();await expect(page.getByRole('button',{name:'방 만들기',exact:true})).toBeVisible();
});
test('unavailable real audio never blocks gameplay',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:true,music:true,ambience:true,reduced:true})));
 await page.route('**/audio/*.ogg',route=>route.fulfill({status:404,body:'missing'}));
 await page.goto('/');await page.getByRole('button',{name:'솔로 모드',exact:true}).click();await page.getByTestId('stage-first-mark').click();
 await expect(page.locator('.solo-play')).toBeVisible();expect(errors).toEqual([]);
 const capability=await page.evaluate(()=>({ogg:new Audio().canPlayType('audio/ogg; codecs="vorbis"'),webAudio:typeof AudioContext}));
 expect(capability.webAudio).toBe('function');test.info().annotations.push({type:'capability',description:JSON.stringify(capability)});
});
test('delivered OGG assets decode to expected duration and schedule full-buffer loops',async({page})=>{
 const assets=[['bgm_menu',104],['bgm_solo',160],['bgm_duel',144],['cue_victory',6],['cue_defeat',4.5],['amb_tavern',96]] as const;
 test.skip(assets.some(([name])=>!existsSync('public/audio/'+name+'.ogg')),'Library materialization failed: original audio bytes unavailable on this PC.');
 await page.goto('/');await page.locator('body').click({position:{x:5,y:5}});
 const measurements=await page.evaluate(async assets=>{
  const ctx=new AudioContext(),results=[];await ctx.resume();
  for(const [name,seconds] of assets){
   const response=await fetch('/audio/'+name+'.ogg');if(!response.ok)throw Error('Missing '+name);
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
   const source=ctx.createBufferSource();source.buffer=buffer;source.loop=name.startsWith('bgm_')||name.startsWith('amb_');
   const mute=ctx.createGain();mute.gain.value=0;source.connect(mute);mute.connect(ctx.destination);
   let ended=false;source.onended=()=>{ended=true;};
   source.start(0,Math.max(0,buffer.duration-.1));
   await new Promise(resolve=>setTimeout(resolve,250));
   results.push({name,seconds,duration:buffer.duration,channels:buffer.numberOfChannels,loop:source.loop,ended});
   source.stop();source.disconnect();mute.disconnect();
  }
  await ctx.close();return results;
 },assets);
 for(const m of measurements){expect(m.duration).toBeCloseTo(m.seconds,1);expect(m.channels).toBe(2);expect(m.ended).toBe(!m.loop);}
 test.info().annotations.push({type:'decoded-originals',description:JSON.stringify(measurements)});
});
