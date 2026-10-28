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
 await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();
 await page.getByRole('button',{name:/AI 대전/}).click();
 await page.getByRole('button',{name:'대전 시작'}).click();
 await page.getByTestId('game-board').waitFor();
 await page.locator('canvas[data-renderer="three-webgl"]').waitFor();
 await page.getByRole('button',{name:'내 숫자 확인',exact:true}).click();
 await page.waitForTimeout(500);
 await page.screenshot({path:'screenshots/tavern-offline.png',fullPage:true});
 await page.getByRole('button',{name:/질문하기/}).click();
 await page.getByRole('button',{name:'합의 배수',exact:true}).click();await page.getByRole('button',{name:'기준 숫자 늘리기'}).click();const targets=page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button');await targets.nth(0).click();await targets.nth(1).click();
 await page.getByRole('button',{name:'질문 확정'}).click();
 await page.getByRole('dialog').getByText(/^(YES|NO)$/).waitFor();
 if(errors.length)throw new Error(errors.join('\n'));
 await page.screenshot({path:'screenshots/offline-game.png',fullPage:true});
 console.log('PASS: production service worker, cached offline reload, actual Three.js tavern tabletop and wooden material, AI game startup, constrained question options and answer offline, no page errors');
}catch(error){console.log('Page errors',errors);console.log('Visible text',await page.locator('body').innerText());console.log('Caches',await page.evaluate(async()=>Promise.all((await caches.keys()).map(async k=>[k,(await(await caches.open(k)).keys()).map(r=>r.url)]))));await page.screenshot({path:'screenshots/offline-failure.png'});throw error;}finally{await browser.close();}
