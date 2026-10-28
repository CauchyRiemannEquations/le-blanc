import {test,expect} from '@playwright/test';
for(const viewport of [{width:800,height:360},{width:1440,height:900},{width:320,height:568}])test(`friend navigation remains visible ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/?room=');
 const back=page.getByRole('button',{name:'돌아가기',exact:true});await expect(back).toBeVisible();
 const box=(await back.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
 await back.click();await expect(page.getByRole('button',{name:'AI 대전',exact:true})).toBeVisible();
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
