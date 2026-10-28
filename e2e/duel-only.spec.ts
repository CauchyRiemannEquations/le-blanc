import {expect,test} from '@playwright/test';

const legacySave=JSON.stringify({schema:1,active:{stageId:'main-anchor-v2',actions:[{type:'hint'}]},records:[{runId:'kept',stageId:'useful-question',stars:3}]});
test.beforeEach(async({page})=>{
 await page.addInitScript(({save})=>{
  Math.random=()=>.1;Date.now=()=>4242;
  if(!localStorage.getItem('leblanc-settings-v1'))localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:true,music:true,ambience:true,muted:false,volume:.4,reduced:true}));
  if(!localStorage.getItem('leblanc-solo-v1'))localStorage.setItem('leblanc-solo-v1',save);
 },{save:legacySave});
});

for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1440,height:900}])test(`only duel choices remain, with help and settings at ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);
 const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
 await page.goto('/');
 await expect(page.locator('.title-actions > button')).toHaveText(['듀얼 모드']);
 await expect(page.getByRole('button',{name:'솔로 모드',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'플레이 방법',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await expect(page.getByRole('switch',{name:'효과음',exact:true})).toHaveAttribute('aria-checked','true');
 await expect(page.getByRole('dialog')).not.toContainText('솔로');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'플레이 방법',exact:true}).click();
 await expect(page.getByRole('heading',{name:'작은 숫자부터 놓습니다.'})).toBeVisible();
 await page.getByRole('button',{name:'건너뛰기',exact:true}).click();
 await expect(page.getByRole('heading',{name:'듀얼 모드',exact:true})).toBeVisible();
 await expect(page.locator('.mode-options > button')).toHaveText(['AI 대전','친구 대전','같은 기기로 연습']);
 for(let i=0;i<2;i++){
  await page.getByRole('button',{name:'AI 대전',exact:true}).click();
  await expect(page.getByRole('button',{name:'대전 시작',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 }
 await page.getByRole('button',{name:'2인 대전 · 친구와 대전',exact:true}).click();
 await expect(page.getByRole('heading',{name:'친구 대전',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.getByRole('button',{name:'같은 기기로 연습',exact:true}).click();
 await expect(page.getByRole('button',{name:'2인 대전 시작',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await expect(page.locator('.title-actions > button')).toHaveText(['듀얼 모드']);
 expect(await page.evaluate(()=>localStorage.getItem('leblanc-solo-v1'))).toBe(legacySave);
 expect(requests.some(url=>/bgm_solo|\/src\/solo\//.test(url))).toBe(false);
 await page.screenshot({path:`../le_blanc_duel_only_evidence/title-${viewport.width}.png`});
});

test('old solo save and URL cannot reopen solo; direct friend entry returns to duel menus',async({page})=>{
 await page.goto('/?solo=main-anchor-v2#solo');
 await expect(page.locator('.title-actions > button')).toHaveText(['듀얼 모드']);
 await expect(page.locator('.solo-screen,[data-mode="solo"]')).toHaveCount(0);
 await page.reload();
 expect(await page.evaluate(()=>localStorage.getItem('leblanc-solo-v1'))).toBe(legacySave);
 await page.goto('/?room=');
 await expect(page.getByRole('heading',{name:'친구 대전',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await expect(page).toHaveURL(/\/$/);
 await expect(page.getByRole('heading',{name:'듀얼 모드',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await expect(page.getByRole('button',{name:'듀얼 모드',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('leblanc-solo-v1'))).toBe(legacySave);
});
