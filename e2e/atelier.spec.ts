import {test,expect} from '@playwright/test';
import {createGame} from '../src/engine/game';

test('3D tabletop: fixed slots, private inspection, gap continue, chain and stable demand rendering',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:false,initial:true}));});
 await page.goto('/');await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();await page.getByRole('button',{name:'건너뛰기'}).click();
 const canvas=page.locator('canvas[data-renderer="three-webgl"]');await expect(canvas).toBeVisible();
 const slots=async()=>JSON.parse((await canvas.getAttribute('data-slots'))??'[]') as {id:string;x:number;z:number;revealed:boolean}[];
 await expect.poll(async()=>(await slots()).length).toBe(10);const initial=await slots(),clock=await page.getByRole('timer').getAttribute('aria-label');
 await page.getByRole('button',{name:'내 숫자 확인',exact:true}).click();
 const own=page.getByRole('group',{name:'나의 카드'});await expect(own.getByRole('button',{name:/^2번/})).toBeDisabled();await page.waitForTimeout(1200);await page.screenshot({path:'screenshots/tavern-private-inspection.png',fullPage:true});
 expect(await slots()).toEqual(initial);await expect(page.getByRole('timer')).toHaveAttribute('aria-label',clock!);await expect(page.getByRole('button',{name:'질문하기',exact:true})).toBeVisible();
 const frames=await canvas.getAttribute('data-frames');await page.waitForTimeout(700);expect(await canvas.getAttribute('data-frames')).toBe(frames);
 await page.getByRole('button',{name:'확인 닫기',exact:true}).click();await expect(own.getByRole('button',{name:/비공개/})).toHaveCount(4);
 const truth=createGame(4242).players[1].tiles.map(t=>t.value);await page.getByRole('button',{name:'공격하기',exact:true}).click();await page.getByRole('button',{name:/간격 공격/}).click();
 const targets=page.getByRole('group',{name:'공격 또는 질문 대상'});await targets.getByRole('button').nth(0).click();await targets.getByRole('button').nth(1).click();await page.getByRole('group',{name:'간격 선택',exact:true}).getByRole('button',{name:String(truth[1]-truth[0]),exact:true}).click();await page.screenshot({path:'screenshots/tavern-gap-targets.png',fullPage:true});await page.getByRole('button',{name:/1 ↔ 2번 간격/}).click();await expect(page.getByText('LINKED',{exact:true})).toBeVisible();await page.getByRole('button',{name:'다음 선택'}).click();
 await page.getByRole('button',{name:'계속 공격',exact:true}).click();await expect(page.getByRole('button',{name:/간격 공격/})).toBeDisabled();await page.getByRole('button',{name:/숫자 공격/}).click();await targets.getByRole('button').nth(0).click();await page.getByRole('group',{name:'숫자 선택',exact:true}).getByRole('button',{name:String(truth[0]),exact:true}).click();await page.getByRole('button',{name:`1번은 ${truth[0]} · 공격`}).click();await expect(page.getByText('CHAIN ×2',{exact:true})).toBeVisible();await page.waitForTimeout(1200);await page.screenshot({path:'screenshots/tavern-chain.png',fullPage:true});expect((await slots()).map(({id,x,z})=>({id,x,z}))).toEqual(initial.map(({id,x,z})=>({id,x,z})));expect((await slots()).filter(c=>c.id.startsWith('opponent')&&c.revealed)).toHaveLength(3);
});

test('WebGL loss keeps a safe playable fallback',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'솔로 모드'}).click();await page.getByTestId('stage-intro-evidence-v2').click();const canvas=page.locator('canvas[data-renderer="three-webgl"]');await expect(canvas).toBeVisible();await canvas.evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(page.getByText('3D 화면을 사용할 수 없어 간소화된 암호판을 표시합니다.')).toBeVisible();await page.getByRole('button',{name:'1번 타일, 비공개',exact:true}).click();await page.getByRole('button',{name:'숫자 2',exact:true}).click();await page.getByRole('button',{name:'2 · 해독하기'}).click();await expect(page.getByRole('button',{name:'1번 타일, 2',exact:true})).toBeVisible();
});

test('penalty flips an original near slot without removing or reordering any cards',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true,initial:true}));});
 await page.goto('/');await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 const canvas=page.locator('canvas[data-renderer="three-webgl"]'),slots=async()=>JSON.parse((await canvas.getAttribute('data-slots'))??'[]') as {id:string;x:number;z:number;revealed:boolean}[];
 await expect.poll(async()=>(await slots()).length).toBe(10);const before=await slots();
 await page.getByRole('button',{name:'공격하기',exact:true}).click();await page.getByRole('button',{name:/^숫자 공격/}).click();await page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button').nth(0).click();await page.getByRole('group',{name:'숫자 선택',exact:true}).getByRole('button',{name:'4',exact:true}).click();await page.getByRole('button',{name:'1번은 4 · 공격'}).click();await page.getByRole('button',{name:'무작위 타일 공개'}).click();
 await expect.poll(async()=>(await slots()).filter(c=>c.id.startsWith('own')&&c.revealed).length).toBe(2);
 expect((await slots()).map(({id,x,z})=>({id,x,z}))).toEqual(before.map(({id,x,z})=>({id,x,z})));
 await expect(page.getByRole('group',{name:'나의 카드'}).getByRole('button')).toHaveCount(5);await expect(page.getByRole('group',{name:'나의 카드'}).getByRole('button',{name:/비공개/})).toHaveCount(3);
});
