import {test,expect} from '@playwright/test';

test('cold 3D entry never exposes the old paper board',async({page})=>{
 await page.route('**/src/tabletop/Tabletop.tsx*',async route=>{await new Promise(r=>setTimeout(r,1500));await route.continue();});
 await page.goto('/');await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 await expect(page.getByTestId('tabletop-boot')).toBeVisible();await expect(page.locator('.atelier-mat')).toBeHidden();await expect(page.locator('.table-caption')).toBeHidden();
 await expect(page.getByTestId('game-board')).toHaveCSS('background-color','rgb(16, 12, 9)');
 await expect(page.locator('canvas[data-renderer="three-webgl"]')).toBeVisible();await expect(page.getByTestId('dealing-screen')).toBeVisible();await expect(page.locator('.tabletop-fallback')).toHaveCount(0);
});

for(const viewport of [{width:844,height:390},{width:390,height:844},{width:1440,height:900}])test(`touch selects two card faces and own cards do nothing ${viewport.width}`,async({browser})=>{
 const context=await browser.newContext({viewport,hasTouch:true});const page=await context.newPage();
 try{
  await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:false,initial:true}));});
  await page.goto('/');await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();await expect(page.getByTestId('dealing-screen')).toHaveCount(0,{timeout:15000});
  await page.getByRole('button',{name:'질문하기',exact:true}).tap();await expect(page.getByRole('textbox')).toHaveCount(0);await page.getByRole('button',{name:'간격',exact:true}).tap();
  const targets=page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button');
  for(const i of [0,4]){const b=(await targets.nth(i).boundingBox())!;await page.touchscreen.tap(b.x+b.width*.55,b.y+b.height*.3);await expect(targets.nth(i)).toHaveAttribute('aria-pressed','true');}
  await expect(page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button',{pressed:true})).toHaveCount(2);
  await expect(page.getByRole('button',{name:'질문 확정'})).toBeEnabled();
  await page.touchscreen.tap(viewport.width-12,viewport.height*.6);await expect(page.getByRole('dialog')).toBeVisible();
  const own=page.getByRole('group',{name:'나의 카드'}).getByRole('button');for(const b of await own.all())await expect(b).toBeDisabled();
  const ownRect=(await own.first().boundingBox())!;await page.touchscreen.tap(ownRect.x+ownRect.width/2,ownRect.y+ownRect.height/2);await expect(page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button',{pressed:true})).toHaveCount(2);
  await page.getByRole('button',{name:'기준 숫자 늘리기'}).tap();await expect(page.getByLabel('기준 숫자',{exact:true})).toHaveText('4');
  await page.screenshot({path:`screenshots/question-touch-${viewport.width}.png`});await page.getByRole('button',{name:'질문 확정'}).tap();await expect(page.getByRole('dialog').getByText(/^(YES|NO)$/)).toBeVisible();
 }finally{await context.close();}
});
