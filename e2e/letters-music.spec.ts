import {test,expect} from '@playwright/test';
for(const viewport of [{width:800,height:360},{width:1440,height:900},{width:320,height:568}])test(`friend navigation remains visible ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/?room=');
 const back=page.getByRole('button',{name:'돌아가기',exact:true});await expect(back).toBeVisible();
 const box=(await back.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
 await back.click();await expect(page.getByRole('button',{name:'AI 대전',exact:true})).toBeVisible();
});
