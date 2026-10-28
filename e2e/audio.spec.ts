import {test,expect,type Page} from '@playwright/test';
import {existsSync} from 'node:fs';
import {applyAction,createGame,viewGame} from '../src/engine/game';
import type {GameState} from '../src/engine/types';
import type {RoomView} from '../src/online/types';

async function startDuel(page:Page) {
 await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();
 await page.getByRole('button',{name:'AI 대전',exact:true}).click();
 await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 await expect(page.getByTestId('game-board')).toBeVisible();
}
async function winDuel(page:Page) {
 const truth=createGame(4242).players[1].tiles.map(tile=>tile.value);
 for(const index of [0,1,3,4]) {
  await page.getByRole('button',{name:/^(공격하기|계속 공격)/}).click();
  await page.getByRole('button',{name:/^숫자 공격/}).click();
  await page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button',{name:new RegExp(`^${index+1}번 타일`)}).click();
  await page.getByRole('group',{name:'숫자 선택',exact:true}).getByRole('button',{name:String(truth[index]),exact:true}).click();
  await page.getByRole('button',{name:`${index+1}번은 ${truth[index]} · 공격`}).click();
  await page.getByRole('button',{name:index===4?'결과 보기':'다음 선택',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'VICTORY',exact:true})).toBeVisible();
}
test('real audio sources follow menu, duel victory and replay without duplicate cues',async({page})=>{
 await page.addInitScript(()=>{
  Date.now=()=>4242;Math.random=()=>.1;
  localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:true,music:true,ambience:true,reduced:true}));
  const starts:{duration:number;loop:boolean}[]=[];(window as any).__realAudio=starts;(window as any).__contexts=new Set();
  const original=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){starts.push({duration:this.buffer?.duration??0,loop:this.loop});(window as any).__realContext=this.context;(window as any).__contexts.add(this.context);return original.apply(this,args);};
 });
 const played=(seconds:number)=>page.evaluate(seconds=>(window as any).__realAudio.some((s:any)=>Math.abs(s.duration-seconds)<.05),seconds);
 await page.goto('/');await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();
 await expect.poll(()=>played(104),{timeout:15000}).toBe(true);await expect.poll(()=>played(96)).toBe(true);
 await page.getByRole('button',{name:'AI 대전',exact:true}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 await expect.poll(()=>played(144),{timeout:15000}).toBe(true);await winDuel(page);
 await expect.poll(()=>played(6)).toBe(true);
 const contextState=()=>page.evaluate(()=>(window as any).__realContext.state);
 const cueCount=()=>page.evaluate(()=>(window as any).__realAudio.filter((s:any)=>Math.abs(s.duration-6)<.05).length);
 await page.setViewportSize({width:844,height:390});expect(await cueCount()).toBe(1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(contextState).toBe('suspended');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(contextState).toBe('running');expect(await cueCount()).toBe(1);
 await page.getByRole('button',{name:'다시 대전',exact:true}).click();await winDuel(page);
 await expect.poll(cueCount).toBe(2);
 expect(await page.evaluate(()=>(window as any).__realAudio.filter((s:any)=>Math.abs(s.duration-144)<.05).length)).toBe(1);
 await page.locator('.result-body').getByRole('button',{name:'메인 메뉴',exact:true}).click();
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('switch',{name:'전체 음소거',exact:true}).click();await expect.poll(contextState).toBe('suspended');
 await page.getByRole('slider',{name:'전체 음량'}).fill('0');
 await page.getByRole('switch',{name:'전체 음소거',exact:true}).click();await expect.poll(contextState).toBe('suspended');
 await page.getByRole('slider',{name:'전체 음량'}).fill('70');await expect.poll(contextState).toBe('running');
 expect(await cueCount()).toBe(2);await page.getByRole('button',{name:'닫기',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__contexts.size)).toBe(1);
 test.info().annotations.push({type:'real-game-audio',description:JSON.stringify(await page.evaluate(()=>(window as any).__realAudio))});
});


async function mockAudio(page:Page) {
 await page.addInitScript(()=>{
  Date.now=()=>4242;Math.random=()=>.1;
  localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:true,music:true,ambience:true,muted:false,volume:.7,reduced:true}));
  const events:{type:string;asset?:string;gain?:number}[]=[];
  (window as any).__audio=events;
  class Param {value=1;setValueAtTime(v:number){this.value=v;}cancelAndHoldAtTime(){}cancelScheduledValues(){}linearRampToValueAtTime(v:number){this.value=v;}exponentialRampToValueAtTime(){}}
  class Node {
   gain=new Param();frequency=new Param();buffer='';loop=false;onended:(()=>void)|null=null;connected?:{gain?:Param};
   connect(target:{gain?:Param}){this.connected=target;}disconnect(){}start(){events.push({type:this.loop?'loop':'cue',asset:this.buffer,gain:this.connected?.gain?.value});}stop(){events.push({type:'stop',asset:this.buffer});}
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
const sfxCount=(page:Page,event:string)=>count(page,'/sfx_'+event,'cue');
const sfxStarts=(page:Page)=>page.evaluate(()=>(window as any).__audio.filter((event:any)=>event.type==='cue'&&event.asset?.includes('/audio/sfx/'))) as Promise<{asset:string;gain:number}[]>;
function onlineSnapshot(game:GameState|null,version=1):RoomView {
 return {initialReveal:true,code:'ABCDEFGH',player:0,names:['Alice','Bob'],deadline:null,version,serverTime:4242,finalBoards:null,status:!game?'waiting':game.result?'finished':'playing',game:game?viewGame(game,0):null};
}
function lostGame() {
 let game=createGame(4242,{},['Alice','Bob'],1);
 for(const index of [0,1,3,4])game=applyAction(game,1,{type:'number',a:index,value:game.players[0].tiles[index].value});
 return game;
}
async function mockRoom(page:Page,initial:RoomView) {
 await page.route('**/src/online/client.ts*',route=>route.fulfill({contentType:'text/javascript',body:
  'export const onlineConfigured=true;let room='+JSON.stringify(initial)+';export async function createOnlineRoom(){return room;}export async function joinOnlineRoom(){return room;}export async function syncOnlineRoom(){return room;}export async function sendOnlineAction(){return room;}export async function leaveOnlineRoom(){}export async function watchRoom(code,receive,onError){window.__emitRoom=r=>{room=r;receive(r);};window.__roomError=onError;return ()=>{delete window.__emitRoom;delete window.__roomError;};}'}));
}
async function emitRoom(page:Page,room:RoomView) {
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).__emitRoom)).toBe('function');
 await page.evaluate(room=>(window as any).__emitRoom(room),room);
}
test('duel result once, replay, settings, hidden tabs and tutorial menu music (mock audio)',async({page})=>{
 await mockAudio(page);await page.setViewportSize({width:390,height:844});await page.goto('/');
 expect(await count(page,'bgm_menu')).toBe(0);
 await startDuel(page);await expect.poll(()=>count(page,'bgm_menu')).toBe(1);
 await expect.poll(()=>count(page,'bgm_duel')).toBe(1);await winDuel(page);
 await expect.poll(()=>count(page,'cue_victory','cue')).toBe(1);
 await page.setViewportSize({width:844,height:390});expect(await count(page,'cue_victory','cue')).toBe(1);
 await page.getByRole('button',{name:'다시 대전',exact:true}).click();await winDuel(page);
 await expect.poll(()=>count(page,'cue_victory','cue')).toBe(2);expect(await count(page,'bgm_duel')).toBe(1);
 await page.locator('.result-body').getByRole('button',{name:'메인 메뉴',exact:true}).click();await expect.poll(()=>count(page,'bgm_menu')).toBe(2);
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
 expect(await count(page,'bgm_menu')).toBe(before);expect(await count(page,'cue_victory','cue')).toBe(2);
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'플레이 방법',exact:true}).click();
 await expect(page.locator('.tutorial')).toBeVisible();expect(await count(page,'bgm_menu')).toBe(before);
 await page.getByRole('button',{name:'건너뛰기',exact:true}).click();
 await expect(page.getByRole('heading',{name:'듀얼 모드',exact:true})).toBeVisible();expect(await count(page,'bgm_menu')).toBe(before);
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
test('friend waiting, playing, fresh loss, duplicate updates and new match (mock room)',async({page})=>{
 await mockAudio(page);await mockRoom(page,onlineSnapshot(null));
 await page.goto('/?room=');await page.getByRole('button',{name:'방 만들기',exact:true}).click();
 await expect(page.locator('.waiting-room')).toBeVisible();await expect.poll(()=>count(page,'bgm_menu')).toBe(1);
 await emitRoom(page,onlineSnapshot(createGame(4242,{},['Alice','Bob'],1),2));
 await expect(page.getByTestId('online-board')).toBeVisible();await expect.poll(()=>count(page,'bgm_duel')).toBe(1);
 // A real final attack appends public outcomes; result metadata alone is not a fresh event.
 const finished=onlineSnapshot(lostGame(),3);
 await emitRoom(page,finished);await expect(page.getByRole('heading',{name:'DEFEAT'})).toBeVisible();
 await expect.poll(()=>count(page,'cue_defeat','cue')).toBe(1);
 await emitRoom(page,{...finished,version:4});await page.waitForTimeout(400);
 expect(await count(page,'cue_defeat','cue')).toBe(1);expect(await count(page,'bgm_duel')).toBe(1);
 expect(await sfxCount(page,'number_correct')).toBe(0);
 await page.getByRole('button',{name:'새 대전',exact:true}).click();await expect(page.getByRole('button',{name:'방 만들기',exact:true})).toBeVisible();
});

test('initial and restored historical online results stay silent after audio unlock',async({page})=>{
 await mockAudio(page);await mockRoom(page,onlineSnapshot(lostGame(),5));
 await page.goto('/?room=');await page.getByRole('button',{name:'방 만들기',exact:true}).click();
 await expect(page.getByRole('heading',{name:'DEFEAT',exact:true})).toBeVisible();
 await page.waitForTimeout(400);expect(await count(page,'cue_defeat','cue')).toBe(0);
 expect(await sfxCount(page,'number_correct')).toBe(0);
 // The saved room is synchronized on reload. A later gesture must not replay its old result.
 await page.reload();await expect(page.getByRole('heading',{name:'DEFEAT',exact:true})).toBeVisible();
 await page.locator('.brand-small').click();await expect.poll(()=>count(page,'bgm_duel')).toBe(1);
 await page.waitForTimeout(400);expect(await count(page,'cue_defeat','cue')).toBe(0);
 expect(await sfxStarts(page)).toEqual([]);
});

test('the first snapshot after reconnect does not replay historical final outcomes',async({page})=>{
 await mockAudio(page);await mockRoom(page,onlineSnapshot(createGame(4242,{},['Alice','Bob'],1)));
 await page.goto('/?room=');await page.getByRole('button',{name:'방 만들기',exact:true}).click();
 await expect(page.getByTestId('online-board')).toBeVisible();await expect.poll(()=>count(page,'bgm_duel')).toBe(1);
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).__roomError)).toBe('function');
 await page.evaluate(()=>(window as any).__roomError('다시 연결 중'));
 const finished=onlineSnapshot(lostGame(),6);await emitRoom(page,finished);
 await expect(page.getByRole('heading',{name:'DEFEAT',exact:true})).toBeVisible();
 await emitRoom(page,{...finished,version:7});await page.waitForTimeout(400);
 expect(await count(page,'cue_defeat','cue')).toBe(0);expect(await sfxCount(page,'number_correct')).toBe(0);
});

test('fresh online YES and NO use neutral answer states; duplicates and atomic penalties do not double cue',async({page})=>{
 let game=createGame(4242,{},['Alice','Bob']);
 await mockAudio(page);await mockRoom(page,onlineSnapshot(game));
 await page.goto('/?room=');await page.getByRole('button',{name:'방 만들기',exact:true}).click();
 await expect(page.getByTestId('online-board')).toHaveAttribute('data-dealing','false');
 game=applyAction(game,0,{type:'question',kind:'distance',a:0,b:1,parameter:5});
 expect(game.history.at(-1)?.answer).toBe(true);await emitRoom(page,onlineSnapshot(game,2));
 await expect(page.getByRole('dialog').getByText('YES',{exact:true})).toBeVisible();
 await expect.poll(()=>sfxCount(page,'question_answer_yes')).toBe(1);
 await emitRoom(page,onlineSnapshot(game,3));await page.waitForTimeout(400);
 expect(await sfxCount(page,'question_answer_yes')).toBe(1);expect(await sfxCount(page,'number_wrong')).toBe(0);
 await page.getByRole('button',{name:'확인',exact:true}).click();
 game=applyAction(game,1,{type:'question',kind:'distance',a:0,b:4,parameter:1});
 expect(game.history.at(-1)?.answer).toBe(false);await emitRoom(page,onlineSnapshot(game,4));
 await expect(page.getByRole('dialog').getByText('NO',{exact:true})).toBeVisible();
 await expect.poll(()=>sfxCount(page,'question_answer_no')).toBe(1);
 await emitRoom(page,onlineSnapshot(game,5));await page.waitForTimeout(400);
 expect(await sfxCount(page,'question_answer_no')).toBe(1);expect(await sfxCount(page,'number_wrong')).toBe(0);
 await page.getByRole('button',{name:'확인',exact:true}).click();
 // The online server returns a wrong attack and its penalty together: one wrong cue, not two result melodies.
 const wrong=Array.from({length:20},(_,i)=>i+1).find(value=>!game.players[0].tiles.some(tile=>tile.value===value)&&value!==game.players[1].tiles[0].value&&value<game.players[1].tiles[2].value)!;
 game=applyAction(game,0,{type:'number',a:0,value:wrong});game=applyAction(game,0,{type:'penalty'});
 await emitRoom(page,onlineSnapshot(game,6));await expect.poll(()=>sfxCount(page,'number_wrong')).toBe(1);
 await emitRoom(page,onlineSnapshot(game,7));await page.waitForTimeout(400);
 expect(await sfxCount(page,'number_wrong')).toBe(1);expect(await sfxCount(page,'penalty_reveal')).toBe(0);
});

test('private peek is one quiet group cue and card selection replaces the generic UI click',async({page})=>{
 await mockAudio(page);await page.goto('/');await startDuel(page);
 await expect(page.getByTestId('game-board')).toHaveAttribute('data-dealing','false');
 await page.waitForTimeout(150);const beforePeek=await sfxStarts(page);
 await page.getByRole('button',{name:'내 숫자 확인',exact:true}).click();
 await expect.poll(()=>sfxCount(page,'card_flip')).toBe(1);
 // Long enough to include all possible staggered card-flip callbacks, not just the first card.
 await page.waitForTimeout(1500);
 const peek=(await sfxStarts(page)).slice(beforePeek.length);
 expect(peek).toHaveLength(1);expect(peek[0].asset).toContain('/sfx_card_flip_');
 expect(peek[0].gain).toBeCloseTo(Math.pow(10,-7/20),6);
 await page.getByRole('button',{name:'확인 닫기',exact:true}).click();await page.waitForTimeout(150);
 expect(await sfxCount(page,'card_flip')).toBe(1);
 await page.getByRole('button',{name:'공격하기',exact:true}).click();await page.getByRole('button',{name:/^숫자 공격/}).click();
 await page.waitForTimeout(150);const beforeSelect=await sfxStarts(page);
 const target=page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button',{name:'1번 타일, 비공개',exact:true});
 await target.click();await expect.poll(()=>sfxCount(page,'card_select')).toBe(1);await page.waitForTimeout(150);
 const selected=(await sfxStarts(page)).slice(beforeSelect.length);
 expect(selected).toHaveLength(1);expect(selected[0].asset).toContain('/sfx_card_select_');
 await target.click();await expect.poll(()=>sfxCount(page,'card_deselect')).toBe(1);await page.waitForTimeout(150);
 const deselected=(await sfxStarts(page)).slice(beforeSelect.length);
 expect(deselected).toHaveLength(2);expect(deselected[1].asset).toContain('/sfx_card_deselect_');
});
test('unavailable real audio never blocks gameplay',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:true,music:true,ambience:true,reduced:true}));});
 await page.route('**/audio/*.ogg',route=>route.fulfill({status:404,body:'missing'}));
 await page.goto('/');await startDuel(page);
 await expect(page.getByRole('button',{name:'공격하기',exact:true})).toBeVisible();expect(errors).toEqual([]);
 const capability=await page.evaluate(()=>({ogg:new Audio().canPlayType('audio/ogg; codecs="vorbis"'),webAudio:typeof AudioContext}));
 expect(capability.webAudio).toBe('function');test.info().annotations.push({type:'capability',description:JSON.stringify(capability)});
});
test('delivered OGG assets decode to expected duration and schedule full-buffer loops',async({page})=>{
 const assets=[['bgm_menu',104],['bgm_duel',144],['cue_victory',6],['cue_defeat',4.5],['amb_tavern',96]] as const;
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
