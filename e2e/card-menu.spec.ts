import {test,expect} from '@playwright/test';
for(const viewport of [{width:800,height:360},{width:844,height:390},{width:1440,height:900},{width:360,height:800}])test(`menu anchors and friend setup ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true,initial:false}));});await page.goto('/');
 await page.getByRole('button',{name:'설정',exact:true}).click();await expect(page.getByText('가운데 카드 공개',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'닫기',exact:true}).click();
 async function checkNavigation(back=false){
  await expect(page.locator('main>header')).toHaveCount(0);
  const nav=page.getByRole('navigation',{name:'메뉴 이동 및 설정'});
  await expect(nav).toBeVisible();
  if(back)await expect(nav.getByRole('button',{name:'돌아가기',exact:true})).toHaveCount(1);
  for(const button of await nav.getByRole('button').all()){
   const r=(await button.boundingBox())!;
   expect(r.height).toBeGreaterThanOrEqual(44);
   expect(r.y).toBeGreaterThan(100);
   expect(r.y+r.height).toBeLessThanOrEqual(viewport.height);
   expect(r.x+r.width).toBeLessThanOrEqual(viewport.width);
  }
  await nav.getByRole('button',{name:'설정',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
 }
 await checkNavigation();
 const main=await page.getByRole('button',{name:'솔로 모드',exact:true}).boundingBox();await page.screenshot({path:`screenshots/cards-title-${viewport.width}.png`});await page.getByRole('button',{name:'솔로 모드',exact:true}).click();const first=(await page.getByTestId('stage-first-mark').boundingBox())!;expect(first.x).toBe(main!.x);expect(first.y).toBe(main!.y);await expect(page.getByTestId('stage-first-mark')).toBeInViewport();await checkNavigation(true);await page.screenshot({path:`screenshots/cards-solo-menu-${viewport.width}.png`});await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();const mode=await page.getByRole('button',{name:'AI 대전',exact:true}).boundingBox();expect(mode!.x).toBe(main!.x);expect(mode!.y).toBe(main!.y);await expect(page.getByRole('button',{name:'같은 기기로 연습'})).toBeInViewport();await checkNavigation(true);await page.screenshot({path:`screenshots/cards-mode-${viewport.width}.png`});
 await page.getByRole('button',{name:'AI 대전',exact:true}).click();const level=await page.getByRole('button',{name:'초급',exact:true}).boundingBox();expect(level!.x).toBe(main!.x);expect(level!.y).toBe(main!.y);for(const name of ['중급','고급'])expect((await page.getByRole('button',{name,exact:true}).boundingBox())!.y).toBe(level!.y);await expect(page.getByRole('button',{name:'대전 시작',exact:true})).toBeInViewport();await checkNavigation(true);await page.screenshot({path:`screenshots/cards-difficulty-${viewport.width}.png`});await page.getByRole('button',{name:'고급',exact:true}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 const near=page.getByRole('group',{name:'나의 카드'});await expect(near.getByRole('button',{name:/비공개/})).toHaveCount(4);await expect(page.locator('.opponent-name')).toHaveText('Carl');await page.screenshot({path:`screenshots/cards-board-${viewport.width}.png`});
 await page.getByRole('button',{name:'내 숫자 확인',exact:true}).click();await expect(near.getByRole('button',{name:/비공개/})).toHaveCount(0);await page.screenshot({path:`screenshots/cards-peek-${viewport.width}.png`});
 await page.goto('/');await page.getByRole('button',{name:'듀얼 모드',exact:true}).click();await page.getByRole('button',{name:'같은 기기로 연습'}).click();await expect(page.getByRole('checkbox',{name:'가운데 카드 공개'})).toBeChecked();await page.getByRole('checkbox',{name:'가운데 카드 공개'}).uncheck();await checkNavigation(true);await page.screenshot({path:`screenshots/cards-friend-${viewport.width}.png`});await page.getByRole('button',{name:'2인 대전 시작'}).click();await page.getByRole('button',{name:/준비됐어요/}).click();await expect(near.getByRole('button',{name:/비공개/})).toHaveCount(5);
 await page.getByRole('button',{name:'플레이 도움말'}).click();await expect(page.getByRole('dialog')).not.toContainText('소피');await page.screenshot({path:`screenshots/cards-help-${viewport.width}.png`});
 await page.goto('/?room=');await expect(page.getByRole('heading',{name:'친구 대전'})).toBeVisible();for(const locator of [page.getByRole('heading',{name:'친구 대전'}),page.getByRole('textbox',{name:'내 이름'}),page.getByRole('textbox',{name:'방 코드'}),page.getByRole('button',{name:'방 만들기',exact:true}),page.getByRole('button',{name:'방 입장',exact:true})]){const r=(await locator.boundingBox())!;expect(r.y).toBeGreaterThanOrEqual(50);expect(r.y+r.height).toBeLessThanOrEqual(viewport.height);expect(r.x+r.width).toBeLessThanOrEqual(viewport.width);}await checkNavigation(true);await page.screenshot({path:`screenshots/cards-online-setup-${viewport.width}.png`});await page.getByRole('button',{name:'돌아가기',exact:true}).click();await expect(page.getByRole('heading',{name:'듀얼 모드',exact:true})).toBeVisible();await page.getByRole('button',{name:'돌아가기',exact:true}).click();await expect(page.getByRole('button',{name:'솔로 모드',exact:true})).toBeVisible();
});
