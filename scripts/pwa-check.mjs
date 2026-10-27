import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text());});
try{
 await page.addInitScript(()=>{Math.random=()=>.1;Date.now=()=>4242;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true,initial:true,questions:4}));});
 await page.goto('http://127.0.0.1:4180/');
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);
 await page.reload();
 await page.getByRole('button',{name:'시작하기',exact:true}).click();
 await page.getByRole('button',{name:/AI 대전/}).click();
 await page.getByRole('button',{name:'대전 시작'}).click();
 await page.getByTestId('game-board').waitFor();
 await page.getByRole('button',{name:/질문하기/}).click();
 await page.getByRole('textbox',{name:'물어볼 내용'}).fill('1번과 2번의 합이 4의 배수인가?');
 await page.getByRole('button',{name:'질문 판정'}).click();
 await page.getByRole('button',{name:'질문 확정'}).click();
 await page.getByRole('dialog').getByText(/^(YES|NO)$/).waitFor();
 if(errors.length)throw new Error(errors.join('\n'));
 await page.screenshot({path:'screenshots/offline-game.png',fullPage:true});
 console.log('PASS: production service worker, cached offline reload, AI game startup, custom question parsing and answer offline, no page errors');
}catch(error){console.log('Page errors',errors);console.log('Visible text',await page.locator('body').innerText());console.log('Caches',await page.evaluate(async()=>Promise.all((await caches.keys()).map(async k=>[k,(await(await caches.open(k)).keys()).map(r=>r.url)]))));await page.screenshot({path:'screenshots/offline-failure.png'});throw error;}finally{await browser.close();}
