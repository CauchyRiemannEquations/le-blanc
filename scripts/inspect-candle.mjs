import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const viewport of [{width:800,height:360},{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{Math.random=()=>.1;Date.now=()=>4242;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true}));});
  await page.goto('http://127.0.0.1:4173/');
  const asset=page.waitForResponse(r=>r.url().endsWith('/materials/candle-brass-v1.webp')&&r.ok());
  await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();await page.getByRole('button',{name:'AI 대전',exact:true}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();await asset;
  await expect(page.locator('canvas[data-renderer="three-webgl"]')).toBeVisible();await expect(page.getByRole('button',{name:'질문하기',exact:true})).toBeVisible();
  await page.screenshot({path:`screenshots/candle-duel-${viewport.width}.png`});
  await page.getByRole('button',{name:'질문하기',exact:true}).click();await page.getByRole('button',{name:'간격',exact:true}).click();const targets=page.getByRole('group',{name:'공격 또는 질문 대상'});await targets.getByRole('button').nth(0).click();await targets.getByRole('button').nth(1).click();await expect(targets.getByRole('button',{pressed:true})).toHaveCount(2);await expect(page.getByRole('button',{name:'질문 확정',exact:true})).toBeEnabled();
  await page.goto('http://127.0.0.1:4173/');await page.getByRole('button',{name:'솔로 모드',exact:true}).click();await page.getByTestId('stage-whole-chain').click();await expect(page.locator('canvas[data-renderer="three-webgl"]')).toBeVisible();await expect(page.getByRole('group',{name:'암호 타일'}).getByRole('button').first()).toBeVisible();await page.screenshot({path:`screenshots/candle-solo-${viewport.width}.png`});
  expect(errors).toEqual([]);console.log(`PASS ${viewport.width}x${viewport.height}: image asset, real 3D duel/solo, two-card targeting, no page errors`);await context.close();
 }
}finally{await browser.close();}
