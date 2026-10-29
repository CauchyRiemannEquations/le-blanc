import {test,expect} from '@playwright/test';
import {configureQuestion} from './questionHelper';

for(const appearance of ['male','female'] as const)test(`AI 상대의 이름과 실제 초상화 ${appearance}`,async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await page.addInitScript(value=>{Math.random=()=>value;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true}));},appearance==='female'?.75:.1);
 const portrait=page.waitForResponse(r=>r.url().endsWith(appearance==='female'?'/sofya-portrait.png':'/karl-portrait.webp')&&r.status()===200);
 await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('button',{name:'AI 대전',exact:true}).click();
 await page.getByRole('combobox',{name:'내 캐릭터',exact:true}).selectOption(appearance==='female'?'jongdae':'ael');
 await expect(page.getByRole('combobox',{name:'내 캐릭터',exact:true}).locator('option')).toHaveText(['남자','여자']);
 await expect(page.getByRole('button',{name:'미리듣기',exact:true})).toHaveCount(0);
 await expect(page.locator('.character-note')).toHaveCount(0);
 await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 await expect(page.locator('.opponent-name')).toHaveText(appearance==='female'?'Sofya':'Carl');
 await expect(page.locator('canvas[data-renderer="three-webgl"]')).toHaveAttribute('data-appearance',appearance);
 await portrait;await expect(page.getByTestId('dealing-screen')).toHaveCount(0);
 // Pause the opponent's next action for a clear view of the loaded scene.
 await page.clock.install();await page.clock.pauseAt(new Date());
 if(await page.getByRole('button',{name:'결과 바로 보기'}).isVisible())await page.getByRole('button',{name:'결과 바로 보기'}).click();
 if(await page.getByRole('button',{name:'확인 · 계속',exact:true}).isVisible())await page.getByRole('button',{name:'확인 · 계속',exact:true}).click();
 if(await page.getByRole('button',{name:'질문하기',exact:true}).isVisible()){
  await page.getByRole('button',{name:'질문하기',exact:true}).click();await configureQuestion(page,'간격',3);
  await page.getByRole('button',{name:'질문 확정',exact:true}).click();await page.getByRole('button',{name:'결과 바로 보기'}).click();await page.getByRole('button',{name:'확인',exact:true}).click();
 }
 await expect(page.locator('.table-center h2')).toContainText(appearance==='female'?'Sofya가 생각 중입니다':'Carl이 생각 중입니다');
 await page.screenshot({path:`screenshots/character-${appearance}-844.png`});
});

test('작은 가로 화면의 친구 외형 선택과 두 자리의 외형',async({page})=>{
 await page.setViewportSize({width:568,height:320});
 await page.addInitScript(()=>{Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true}));});
 await page.goto('/?room=');
 const picker=page.getByRole('group',{name:'내 캐릭터 외형'});
 await picker.getByRole('button',{name:'여성',exact:true}).click();
 await expect(picker.getByRole('button',{name:'여성',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const label of ['방 만들기','방 입장']){const button=page.getByRole('button',{name:label,exact:true});await button.scrollIntoViewIfNeeded();await expect(button).toBeInViewport();}
 await picker.scrollIntoViewIfNeeded();await page.screenshot({path:'screenshots/character-picker-568.png'});
 await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('button',{name:'같은 기기로 연습',exact:true}).click();
 await page.getByRole('group',{name:'플레이어 2 외형'}).getByRole('button',{name:'여성',exact:true}).click();
 const start=page.getByRole('button',{name:'2인 대전 시작',exact:true});await start.scrollIntoViewIfNeeded();await expect(start).toBeInViewport();await start.click();
 // The hot-seat privacy guard may open when the browser loses visibility during loading.
 const ready=page.getByRole('button',{name:'플레이어 1 · 준비됐어요',exact:true}),canvas=page.locator('canvas[data-renderer="three-webgl"]');
 await expect(ready.or(canvas)).toBeVisible();if(await ready.isVisible())await ready.click();
 await expect(page.locator('.opponent-name')).toHaveText('플레이어 2');
 await expect(page.locator('canvas[data-renderer="three-webgl"]')).toHaveAttribute('data-appearance','female');
});
