import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text());});
try{
 await page.goto('http://127.0.0.1:4180/');
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);
 await page.reload();
 await page.getByRole('button',{name:'시작하기',exact:true}).click();
 await page.getByRole('button',{name:/AI 대전/}).click();
 await page.getByRole('button',{name:'테이블에 앉기'}).click();
 await page.getByTestId('game-board').waitFor();
 if(errors.length)throw new Error(errors.join('\n'));
 await page.screenshot({path:'screenshots/offline-game.png',fullPage:true});
 console.log('PASS: production service worker, cached offline reload, AI game startup, no page errors');
}catch(error){console.log('Page errors',errors);console.log('Visible text',await page.locator('body').innerText());console.log('Caches',await page.evaluate(async()=>Promise.all((await caches.keys()).map(async k=>[k,(await(await caches.open(k)).keys()).map(r=>r.url)]))));await page.screenshot({path:'screenshots/offline-failure.png'});throw error;}finally{await browser.close();}
