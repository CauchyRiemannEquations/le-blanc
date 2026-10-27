import { test,expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
test('두 기기의 방 입장·비밀 질문·재접속·기권',async({browser})=>{
 test.skip(process.env.VITE_USE_FIREBASE_EMULATORS!=='true','Firebase 에뮬레이터 실행 시 검증합니다.');
 const a=await browser.newContext({viewport:{width:390,height:844}}),b=await browser.newContext({viewport:{width:360,height:800}});
 for(const c of [a,b])await c.addInitScript(()=>localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true,initial:true})));
 const p=await a.newPage(),q=await b.newPage();
 try {
  for(const page of [p,q]){await page.goto('/?room=');await page.getByRole('textbox',{name:'내 이름'}).fill(page===p?'Alice':'Bob');}
  await p.getByRole('button',{name:'방 만들기',exact:true}).click();await expect(p.locator('.room-code')).toBeVisible({timeout:30000});
  const code=(await p.locator('.room-code').innerText()).trim();await q.getByRole('textbox',{name:'방 코드'}).fill(code);await q.getByRole('button',{name:'방 입장',exact:true}).click();
  for(const page of [p,q])await expect(page.getByTestId('online-board')).toBeVisible({timeout:30000});
  const actor=await p.getByRole('button',{name:'질문하기',exact:true}).isVisible()?p:q,observer=actor===p?q:p;
  await expect(actor.getByRole('timer')).toBeVisible();await actor.getByRole('button',{name:'질문하기',exact:true}).click();await actor.getByRole('textbox',{name:'물어볼 내용'}).fill('1번과 2번의 합이 4의 배수인가?');await actor.getByRole('button',{name:'질문 판정'}).click();await actor.getByRole('button',{name:'질문 확정'}).click();
  await expect(actor.getByRole('dialog')).toContainText('두 숫자의 합은 4의 배수인가?');await expect(observer.getByRole('dialog')).toBeVisible();await expect(observer.getByRole('dialog')).not.toContainText('4의 배수');await expect(observer.getByRole('dialog')).not.toContainText(/YES|NO/);
  mkdirSync('screenshots',{recursive:true});await actor.screenshot({path:'screenshots/v6-online-private-question.png'});
  for(const page of [p,q])await page.getByRole('button',{name:'확인',exact:true}).click();
  await observer.reload();await expect(observer.getByTestId('online-board')).toBeVisible();if(await observer.getByRole('button',{name:'확인',exact:true}).isVisible())await observer.getByRole('button',{name:'확인',exact:true}).click();
  await observer.screenshot({path:'screenshots/v6-online-board.png'});expect(await observer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await actor.getByRole('button',{name:'온라인 대전 나가기'}).click();await actor.getByRole('button',{name:'대전 나가기',exact:true}).click();await expect(observer.getByRole('heading',{name:'VICTORY',exact:true})).toBeVisible({timeout:15000});await observer.screenshot({path:'screenshots/v6-online-result.png'});
 } finally {await a.close();await b.close();}
});
