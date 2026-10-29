import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {configureQuestion} from './questionHelper';
import type {VoiceManifest} from '../src/voice/types';
const manifest=JSON.parse(readFileSync('public/audio/voice/manifest.json','utf8')) as VoiceManifest;
const file=(id:string,voice='jongdae')=>manifest.assets.find(a=>a.lineIds.includes(id)&&a.voice===voice&&a.status==='ready')?.file;

test('real voice files: gesture, commit order, slow download and failed-file recovery, no runtime TTS',async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await page.route('**/audio/voice/files/**',async route=>{await new Promise(r=>setTimeout(r,1500));await route.continue();});
 await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,music:false,ambience:false,dialogue:'all',voice:'ael',voiceVolume:.8,reduced:true}));
  (window as any).__speechStarts=[];(window as any).__speechEnds=[];const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof start>){const step=document.querySelector('.question-conversation')?.getAttribute('data-step');if(step){(window as any).__speechStarts.push(step);this.addEventListener('ended',()=>{(window as any).__speechEnds.push(document.querySelector('.question-conversation')?.getAttribute('data-step'));});}return start.apply(this,args);};
 });
 const requests:string[]=[],tts:string[]=[];page.on('request',r=>{if(r.url().includes('/audio/voice/files/'))requests.push(new URL(r.url()).pathname);if(r.url().includes('api.typecast.ai'))tts.push(r.url());});
 await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('button',{name:'AI 대전',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'내 캐릭터',exact:true})).toHaveValue('ael');
 await page.getByRole('button',{name:'대전 시작',exact:true}).click();await expect(page.getByTestId('dealing-screen')).toHaveCount(0);
 await expect.poll(()=>requests.includes(file('AMB_01','ael')!)).toBe(true);
 await page.getByRole('button',{name:'질문하기',exact:true}).click();await configureQuestion(page,'합의 크기',20,[0,4]);
 expect(await page.evaluate(()=>(window as any).__speechStarts)).toEqual([]);
 await page.getByRole('button',{name:'질문 확정',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'질문 대화'})).toHaveAttribute('data-step','question');
 await expect(page.locator('.speech-bubble.own .speech-text')).toHaveText('두 숫자의 합이 20 이하인가?');
 await expect(page.locator('.shared-question')).toHaveCount(0);
 await page.screenshot({path:'screenshots/voice-question-bubble-844.png'});
 await expect(page.getByRole('dialog',{name:'질문 대화'})).toHaveAttribute('data-step','answer',{timeout:12000});
 await expect(page.locator('.speech-bubble.opponent')).toBeVisible();
 await page.screenshot({path:'screenshots/voice-answer-bubble-844.png'});
 await expect(page.locator('.shared-question h2')).toHaveText('두 숫자의 합이 20 이하인가?',{timeout:5000});
 expect(await page.evaluate(()=>(window as any).__speechStarts)).toEqual(['question','question','answer']);
 expect(await page.evaluate(()=>(window as any).__speechEnds)).toEqual(['question','question','answer']);
 const answer=await page.locator('.shared-question .outcome-word').innerText();
 const expected=[file('PAIR_0_4','ael'),file('Q_sumAtMost_20_yes','ael'),file(answer==='YES'?'INF_04':'INF_05','jongdae')];
 await expect.poll(()=>expected.every(path=>requests.includes(path!)),{timeout:14000}).toBe(true);
 // Downloads may be prefetched; actual start/end order is checked above.
 // The result button is usable during speech; playing audio is never an action lock.
 await page.getByRole('button',{name:'확인',exact:true}).click();await expect(page.getByRole('button',{name:'확인 · 계속',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'확인 · 계속',exact:true}).click();
 await page.route('**/audio/voice/files/**',r=>r.fulfill({status:404,body:'missing'}));
 await page.getByRole('button',{name:'질문하기',exact:true}).click();await configureQuestion(page,'배수 포함',3,[0,3]);await page.getByRole('button',{name:'질문 확정',exact:true}).click();
 await expect(page.getByRole('button',{name:'결과 바로 보기'})).toBeEnabled();
 await expect(page.getByRole('dialog',{name:'질문 대화'})).toHaveAttribute('data-speech','error');
 await expect(page.locator('.shared-question')).toHaveCount(0);await page.unroute('**/audio/voice/files/**');
 await page.getByRole('button',{name:'다시 재생',exact:true}).click();
 await expect(page.locator('.shared-question h2')).toHaveText('두 숫자 중 3의 배수가 하나라도 있는가?',{timeout:15000});await expect(page.getByRole('button',{name:'확인',exact:true})).toBeEnabled();expect(tts).toEqual([]);
});

test('568×320 settings and comparison audition page are usable',async({page})=>{
 await page.setViewportSize({width:568,height:320});await page.goto('/');await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('combobox',{name:'대사 재생',exact:true}).selectOption('opponent');await page.getByRole('slider',{name:'음성 음량',exact:true}).fill('35');
 const character=page.getByRole('combobox',{name:'다음 대전 내 캐릭터',exact:true});await expect(character.locator('option')).toHaveText(['남자','여자']);await character.selectOption('ael');
 const preview=page.getByRole('button',{name:'다음 대전 내 캐릭터 미리듣기',exact:true});await preview.scrollIntoViewIfNeeded();await expect(preview).toBeInViewport();
 await page.screenshot({path:'screenshots/voice-settings-568.png'});await page.getByRole('button',{name:'닫기',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('leblanc-settings-v1')!));expect(saved.dialogue).toBe('opponent');expect(saved.voiceVolume).toBe(.35);expect(saved.voice).toBe('ael');
 await page.goto('/voice-preview.html');await expect(page.locator('audio')).toHaveCount(16);
 const first=page.locator('audio').first();await first.evaluate(async(el:HTMLAudioElement)=>{await el.play();});await expect.poll(()=>first.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(0);
 await page.screenshot({path:'screenshots/voice-preview-568.png'});
});

test('silent conversation still alternates sides on 568×320 and skips immediately',async({page})=>{
 await page.setViewportSize({width:568,height:320});await page.addInitScript(()=>{Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({dialogue:'off',reduced:true}));});
 const audio:string[]=[];page.on('request',r=>{if(r.url().includes('/audio/voice/files/'))audio.push(r.url());});
 await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('button',{name:'AI 대전',exact:true}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 await expect(page.getByTestId('dealing-screen')).toHaveCount(0);await page.getByRole('button',{name:'질문하기',exact:true}).click();await configureQuestion(page,'배수 포함',3,[0,4]);await page.getByRole('button',{name:'질문 확정',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'질문 대화'});await expect(dialog).toHaveAttribute('data-step','question');await expect(page.locator('.speech-bubble.own')).toBeInViewport();await expect(page.locator('.shared-question')).toHaveCount(0);
 await expect(dialog).toHaveAttribute('data-step','answer');await expect(page.locator('.speech-bubble.opponent')).toBeInViewport();await expect(page.getByRole('button',{name:'결과 바로 보기'})).toBeInViewport();await page.screenshot({path:'screenshots/voice-silent-bubbles-568.png'});
 await page.getByRole('button',{name:'결과 바로 보기'}).click();await expect(dialog).toHaveCount(0);await expect(page.locator('.shared-question h2')).toHaveText('두 숫자 중 3의 배수가 하나라도 있는가?');expect(audio).toEqual([]);
 await expect(page.locator('body')).not.toContainText(/종대|아엘/);
});
