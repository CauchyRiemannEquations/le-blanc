import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:844,height:390}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true})));
 await page.goto('http://127.0.0.1:4180/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'솔로 모드',exact:true}).click();await page.getByTestId('stage-intro-relations-v2').click();
 await expect(page.locator('canvas[data-renderer="three-webgl"]')).toBeVisible();
 await page.getByRole('button',{name:'질문하기',exact:true}).click();await page.getByTestId('question-left-two').click();
 const cards=page.getByRole('group',{name:'암호 타일',exact:true}).getByRole('button');await cards.nth(0).click();await cards.nth(1).click();await page.getByRole('button',{name:'질문 실행',exact:true}).click();
 for(const a of [0,1]){await page.getByRole('button',{name:'간격 연결',exact:true}).click();await cards.nth(a).click();await cards.nth(a+1).click();await page.getByRole('button',{name:'간격 3',exact:true}).click();await page.getByRole('button',{name:'간격 3 · 연결하기',exact:true}).click();}
 await page.getByRole('button',{name:'결과 보기'}).click();await expect(page.getByLabel('3성',{exact:true})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'솔로 모드',exact:true}).click();await page.getByTestId('stage-intro-relations-v2').click();await expect(page.getByLabel('3성',{exact:true})).toBeVisible();
 await page.screenshot({path:'screenshots/solo-v2-offline.png'});expect(errors).toEqual([]);
 console.log('PASS: production cache, offline 3D solo, false answer, two manual links, chain clear, saved result after offline reload.');
}finally{await browser.close();}
