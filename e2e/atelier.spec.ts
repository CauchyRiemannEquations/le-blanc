import {test,expect} from '@playwright/test';

test('Figma 타일 위치, 원본 에셋, 선택 색상과 공격 시트의 분리',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true,initial:true}));});
 await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('.wordmark h1')).toHaveCSS('font-family',/Bodoni Moda Variable/);
 await expect(page.locator('.title-photograph img')).toHaveJSProperty('naturalWidth',1280);
 await page.getByRole('button',{name:'시작하기',exact:true}).click();
 await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작'}).click();
 const tile=page.getByRole('group',{name:'상대의 암호'}).getByRole('button').first();
 await expect(tile).toBeVisible();const box=(await tile.boundingBox())!;
 expect(box.x).toBe(24);expect(box.y).toBe(244);expect(box.width).toBe(62);expect(box.height).toBe(104);
 await page.getByRole('button',{name:/공격하기/}).click();await page.getByRole('button',{name:/간격 공격/}).click();
 const targets=page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button');await targets.nth(1).click();await targets.nth(2).click();
 const value=page.getByRole('group',{name:'간격 선택',exact:true}).getByRole('button',{name:'3',exact:true});await value.click();
 await expect(value).toHaveCSS('background-color','rgb(68, 43, 50)');
 expect((await targets.nth(1).boundingBox())!.y).toBe(244);
 expect((await page.locator('.action-backdrop .overlay').boundingBox())!.y).toBe(430);
 await page.screenshot({path:'screenshots/atelier-gap.png'});
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'내 패 보기',exact:true}).click();
 const hand=(await page.locator('#own-hand-tiles').boundingBox())!,actions=(await page.locator('.game-actions').boundingBox())!;
 expect(hand.y+hand.height).toBeLessThan(actions.y);
});
