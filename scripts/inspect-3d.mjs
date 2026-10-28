import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:false,initial:true}));});
 await page.goto('http://127.0.0.1:4173');await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();await page.getByRole('button',{name:'건너뛰기',exact:true}).click();
 await page.locator('canvas[data-renderer="three-webgl"]').waitFor();await page.waitForTimeout(700);await page.screenshot({path:'screenshots/tavern-closed-mobile.png',fullPage:true});await page.getByRole('button',{name:'내 숫자 확인',exact:true}).click();await page.waitForTimeout(1000);await page.screenshot({path:'screenshots/tavern-table-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(800);await page.screenshot({path:'screenshots/tavern-table-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'공격하기',exact:true}).click();await page.getByRole('button',{name:/^숫자 공격/}).click();await page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button').nth(0).click();await page.getByRole('group',{name:'숫자 선택',exact:true}).getByRole('button',{name:'4',exact:true}).click();await page.getByRole('button',{name:'1번은 4 · 공격'}).click();await page.getByRole('button',{name:'무작위 타일 공개'}).click();
 await page.waitForTimeout(250);await page.screenshot({path:'screenshots/tavern-flip.png',fullPage:true});await page.waitForTimeout(1000);await page.screenshot({path:'screenshots/tavern-revealed.png',fullPage:true});
 await expect(page.getByRole('group',{name:'나의 카드'}).getByRole('button',{name:/상대에게 공개됨/})).toHaveCount(2);
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: actual 3D mobile/desktop, private inspection, in-slot penalty flip and original slots; no page errors.');
} finally {await browser.close();}
