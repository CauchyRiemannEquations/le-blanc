import {test,expect} from '@playwright/test';

for(const viewport of [{width:800,height:360},{width:844,height:390},{width:1440,height:900}])test(`landscape art and uninterrupted table ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);
 await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true,initial:true}));});
 await page.goto('/');
 await expect(page.locator('.menu-keyart img')).toBeVisible();
 await expect.poll(()=>page.locator('.menu-keyart img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(page.locator('canvas')).toHaveCount(0);
 for(const name of ['듀얼 모드','플레이 방법']){const b=await page.getByRole('button',{name,exact:true}).boundingBox();expect(b!.y+b!.height).toBeLessThanOrEqual(viewport.height);}
 await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 const canvas=page.locator('canvas[data-renderer="three-webgl"]');await expect(canvas).toBeVisible();await expect(page.getByTestId('dealing-screen')).toHaveCount(0);
 await canvas.evaluate(el=>el.setAttribute('data-identity','same-table'));
 await page.getByRole('button',{name:'내 숫자 확인',exact:true}).click();
 const before=await page.locator('.tabletop-hits:not(.near-hits) .card-hit').first().boundingBox();
 await page.getByRole('button',{name:'공격하기',exact:true}).click();await page.getByRole('button',{name:/간격 공격/}).click();
 await expect(canvas).toHaveAttribute('data-identity','same-table');await expect(page.locator('canvas')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'확인 닫기',exact:true})).toBeVisible();
 const cards=page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button');const after=await cards.first().boundingBox();expect(after).toEqual(before);
 await cards.nth(0).click();await cards.nth(1).click();
 const pad=await page.getByRole('group',{name:'간격 선택',exact:true}).boundingBox();expect(pad!.y).toBeGreaterThan(after!.y+after!.height);
 await expect(page.locator('.hand-slots')).toHaveCount(0);
 await page.getByRole('button',{name:'공격 바꾸기',exact:true}).click();await page.getByRole('button',{name:'공격 취소',exact:true}).click();
 await page.getByRole('button',{name:'질문하기',exact:true}).click();await page.getByRole('button',{name:'간격',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-identity','same-table');expect(await page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button').first().boundingBox()).toEqual(before);
 await page.screenshot({path:`screenshots/landscape-question-${viewport.width}.png`});
});
