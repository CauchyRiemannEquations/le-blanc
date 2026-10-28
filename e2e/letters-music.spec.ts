import {test,expect} from '@playwright/test';
for(const viewport of [{width:800,height:360},{width:1440,height:900},{width:320,height:568}])test(`friend navigation remains visible ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/?room=');
 const back=page.getByRole('button',{name:'돌아가기',exact:true});await expect(back).toBeVisible();
 const box=(await back.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
 await back.click();await expect(page.getByRole('button',{name:'AI 대전',exact:true})).toBeVisible();
});
test('music files decode; scene changes and mute persist',async({page})=>{
 await page.addInitScript(()=>{
  const RealAudio=window.Audio;(window as any).__audio=[];
  window.Audio=class extends RealAudio {constructor(src?:string){super(src);(window as any).__audio.push(this);}} as typeof Audio;
 });
 await page.goto('/');await page.getByRole('button',{name:'설정',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__audio.some((a:HTMLAudioElement)=>a.src.endsWith('bgm_menu.ogg')&&!a.paused&&a.currentTime>0))).toBe(true);
 const decoded=await page.evaluate(async()=>{const c=new AudioContext();const names=['bgm_menu','bgm_solo','bgm_duel','amb_tavern','cue_victory','cue_defeat'];const durations=[];for(const name of names){const r=await fetch(`/audio/${name}.ogg`);if(!r.ok)throw Error(name);const a=await c.decodeAudioData(await r.arrayBuffer());durations.push({name,seconds:a.duration});}await c.close();return durations;});
 expect(decoded.every(d=>d.seconds>1)).toBe(true);console.log('Decoded audio',decoded);
 await page.getByRole('button',{name:/배경 음악/}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__audio.every((a:HTMLAudioElement)=>a.paused))).toBe(true);
 await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('leblanc-settings-v1')!).music)).toBe(false);
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('button',{name:/배경 음악/}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:'솔로 모드',exact:true}).click();await page.getByTestId('stage-main-anchor-v2').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__audio.some((a:HTMLAudioElement)=>a.src.endsWith('bgm_solo.ogg')&&!a.paused&&a.currentTime>0))).toBe(true);
});
for(const viewport of [{width:800,height:360},{width:1440,height:900},{width:390,height:844}])test(`letters and hint review ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/');await page.getByRole('button',{name:'솔로 모드',exact:true}).click();await page.getByTestId('stage-main-anchor-v2').click();
 await expect(page.locator('canvas[data-renderer="three-webgl"]')).toBeVisible();await page.screenshot({path:`screenshots/letter-table-${viewport.width}.png`});
 await page.getByRole('button',{name:'힌트',exact:true}).click();await page.getByRole('button',{name:'힌트 보기',exact:true}).click();
 await expect(page.locator('.letter-body')).toContainText('쪽지 01');await page.screenshot({path:`screenshots/letter-hint-${viewport.width}.png`});
 await page.getByRole('button',{name:'다음 힌트 보기'}).click();await page.getByText('이전 쪽지 1장',{exact:true}).click();await expect(page.locator('.letter-history p')).toBeVisible();
 await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:'힌트',exact:true}).click();await expect(page.locator('.letter-body')).toContainText('쪽지 02');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('leblanc-solo-v1')!));expect(saved.active.actions.filter((a:{type:string})=>a.type==='hint')).toHaveLength(2);
});
