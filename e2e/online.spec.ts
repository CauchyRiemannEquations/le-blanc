import {configureQuestion} from './questionHelper';
import { test,expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
test('두 기기의 방 입장·공개 질문·재접속·기권',async({browser})=>{
 test.skip(process.env.VITE_USE_FIREBASE_EMULATORS!=='true'&&process.env.LE_BLANC_LIVE_TEST!=='true','에뮬레이터 또는 명시적으로 허용한 운영 검증에서 실행합니다.');
 const a=await browser.newContext({viewport:{width:390,height:844}}),b=await browser.newContext({viewport:{width:360,height:800}});
 for(const c of [a,b])await c.addInitScript(()=>localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true,initial:true})));
 const p=await a.newPage(),q=await b.newPage();
 try {
  for(const page of [p,q]){await page.goto('/?room=');await page.getByRole('textbox',{name:'내 이름'}).fill(page===p?'Alice':'Bob');}
  await p.getByRole('checkbox',{name:'가운데 카드 공개'}).uncheck();await p.getByRole('button',{name:'방 만들기',exact:true}).click();await expect(p.locator('.room-code')).toBeVisible({timeout:30000});
  await expect(p.locator('.room-rule')).toHaveText('가운데 카드 비공개');const code=(await p.locator('.room-code').innerText()).trim();await q.getByRole('textbox',{name:'방 코드'}).fill(code);await q.getByRole('button',{name:'방 입장',exact:true}).click();
  for(const page of [p,q]){await expect(page.getByTestId('online-board')).toBeVisible({timeout:30000});await expect(page.getByTestId('dealing-screen')).toHaveCount(0);}
  await expect.poll(async()=>await p.getByRole('button',{name:'질문하기',exact:true}).isVisible()||await q.getByRole('button',{name:'질문하기',exact:true}).isVisible()).toBe(true);
  for(const page of [p,q])await expect(page.getByRole('group',{name:'나의 카드'}).getByRole('button',{name:/비공개/})).toHaveCount(5);
  const actor=await p.getByRole('button',{name:'질문하기',exact:true}).isVisible()?p:q,observer=actor===p?q:p;
  await expect(actor.getByRole('timer')).toBeVisible();await actor.getByRole('button',{name:'질문하기',exact:true}).click();await configureQuestion(actor,'합의 배수',4);await actor.getByRole('button',{name:'질문 확정'}).click();
  await expect(actor.getByRole('dialog')).toContainText('두 숫자의 합은 4의 배수인가?');await expect(observer.getByRole('dialog')).toBeVisible();await expect(observer.getByRole('dialog')).toContainText('4의 배수');await expect(observer.locator('.shared-question')).toHaveText((await actor.locator('.shared-question').textContent())!);await expect(observer.locator('.shared-question .outcome-word')).toHaveText(/YES|NO/);
  mkdirSync('screenshots',{recursive:true});await actor.screenshot({path:'screenshots/public-online-question.png'});
  for(const page of [p,q])await page.getByRole('button',{name:'확인',exact:true}).click();
  await observer.reload();await expect(observer.getByTestId('online-board')).toBeVisible();if(await observer.getByRole('button',{name:'확인',exact:true}).isVisible())await observer.getByRole('button',{name:'확인',exact:true}).click();
  await observer.screenshot({path:'screenshots/v6-online-board.png'});expect(await observer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  // Both clients provide their own lawful hand to this test; the production renderer still receives only its view.
  await actor.getByRole('button',{name:'내 숫자 확인',exact:true}).click();
  const labels=await actor.getByRole('group',{name:'나의 카드'}).getByRole('button').evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')!));
  const values=labels.map(l=>Number(l.split(', ')[1]));
  const remaining=async()=>Number((await observer.getByRole('timer').first().getAttribute('aria-label'))!.match(/\d+/)![0]);const before=await remaining();
  await observer.getByRole('button',{name:'공격하기',exact:true}).click();await observer.getByRole('button',{name:/^간격 공격/}).click();
  const targets=observer.getByRole('group',{name:'공격 또는 질문 대상'});
  await targets.getByRole('button').nth(0).click();await targets.getByRole('button').nth(1).click();
  await observer.getByRole('group',{name:'간격 선택',exact:true}).getByRole('button',{name:String(values[1]-values[0]),exact:true}).click();await observer.getByRole('button',{name:/1 ↔ 2번 간격/}).click();
  for(const page of [observer,actor])await page.getByRole('button',{name:'확인',exact:true}).click();
  await observer.reload();await expect(observer.getByTestId('online-board')).toBeVisible();await observer.getByRole('button',{name:'확인',exact:true}).click();
  expect(await remaining()).toBeLessThanOrEqual(before);await expect(observer.getByRole('button',{name:'질문하기',exact:true})).toHaveCount(0);
  await observer.getByRole('button',{name:'계속 공격',exact:true}).click();await expect(observer.getByRole('button',{name:/^간격 공격/})).toBeDisabled();
  await observer.getByRole('button',{name:/^숫자 공격/}).click();await targets.getByRole('button').nth(1).click();await observer.getByRole('group',{name:'숫자 선택',exact:true}).getByRole('button',{name:String(values[1]),exact:true}).click();await observer.getByRole('button',{name:`2번은 ${values[1]} · 공격`}).click();
  await expect(observer.getByText('CHAIN ×2',{exact:true})).toBeVisible();await observer.screenshot({path:'screenshots/tavern-online-chain.png'});
  for(const page of [observer,actor])await page.getByRole('button',{name:'확인',exact:true}).click();
  await actor.getByRole('button',{name:'온라인 대전 나가기'}).click();await actor.getByRole('button',{name:'대전 나가기',exact:true}).click();await expect(observer.getByRole('heading',{name:'VICTORY',exact:true})).toBeVisible({timeout:15000});await expect(observer.locator('.final-hand')).toHaveCount(2);await expect(observer.locator('.final-boards details')).toHaveCount(0);for(const name of ['Alice','Bob']){const hand=observer.getByRole('group',{name:`${name} · 최종 암호`});await expect(hand.getByRole('button')).toHaveCount(5);for(const tile of await hand.getByRole('button').all())await expect(tile).toBeVisible();}await observer.screenshot({path:'screenshots/v6-online-result.png'});
 } finally {await a.close();await b.close();}
});
