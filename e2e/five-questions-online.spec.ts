import {test,expect} from '@playwright/test';
import {configureQuestion} from './questionHelper';

test('새 질문 두 종류의 서버 판정·양쪽 표시·재접속·공개 기록',async({browser})=>{
 test.setTimeout(90000);
 test.skip(process.env.VITE_USE_FIREBASE_EMULATORS!=='true'&&process.env.LE_BLANC_LIVE_TEST!=='true','에뮬레이터 또는 명시적으로 설정한 운영 검증에서 실행합니다.');
 const contexts=await Promise.all([browser.newContext({viewport:{width:844,height:390}}),browser.newContext({viewport:{width:568,height:320}})]);
 for(const context of contexts)await context.addInitScript(()=>localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true,dialogue:'all'})));
 const [a,b]=await Promise.all(contexts.map(c=>c.newPage()));
 try{
  for(const [page,name] of [[a,'Alice'],[b,'Bob']] as const){await page.goto('/?room=');await page.getByRole('textbox',{name:'내 이름'}).fill(name);}
  await a.getByRole('group',{name:'내 캐릭터 외형'}).getByRole('button',{name:'여성',exact:true}).click();
  await b.getByRole('group',{name:'내 캐릭터 외형'}).getByRole('button',{name:'남성',exact:true}).click();
  const created=a.waitForResponse(r=>r.url().includes('createRoom')&&r.request().method()==='POST'&&r.status()===200);
  await a.getByRole('button',{name:'방 만들기',exact:true}).click();expect((await (await created).json()).result.voices).toEqual(['ael']);await expect(a.locator('.room-code')).toBeVisible({timeout:30000});
  const code=(await a.locator('.room-code').innerText()).trim();await b.getByRole('textbox',{name:'방 코드'}).fill(code);const joined=b.waitForResponse(r=>r.url().includes('joinRoom')&&r.request().method()==='POST'&&r.status()===200);await b.getByRole('button',{name:'방 입장',exact:true}).click();expect((await (await joined).json()).result.game.voices).toEqual(['ael','jongdae']);
  for(const page of [a,b]){await expect(page.getByTestId('online-board')).toBeVisible({timeout:30000});await expect(page.getByTestId('dealing-screen')).toHaveCount(0);}
  await expect(a.locator('.opponent-name')).toHaveText('Bob');await expect(b.locator('.opponent-name')).toHaveText('Alice');
  await expect(a.locator('canvas[data-renderer="three-webgl"]')).toHaveAttribute('data-appearance','male');
  await expect(b.locator('canvas[data-renderer="three-webgl"]')).toHaveAttribute('data-appearance','female');
  await b.screenshot({path:'screenshots/character-online-female-568.png'});
  for(const [name,parameter] of [['합의 크기',20],['배수 포함',3]] as const){
   await expect.poll(async()=>await a.getByRole('button',{name:'질문하기',exact:true}).isVisible()||await b.getByRole('button',{name:'질문하기',exact:true}).isVisible()).toBe(true);
   const actor=await a.getByRole('button',{name:'질문하기',exact:true}).isVisible()?a:b,observer=actor===a?b:a;
   // Only the card owner reads its private hand to independently check the server answer.
   await observer.getByRole('button',{name:'내 숫자 확인',exact:true}).click();
   const labels=await observer.getByRole('group',{name:'나의 카드'}).getByRole('button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')!));
   const values=labels.map(label=>Number(label.match(/타일, (\d+)/)![1]));
   await observer.getByRole('button',{name:'확인 닫기',exact:true}).click();
   const answer=(name==='합의 크기'?values[0]+values[4]<=parameter:values[0]%parameter===0||values[4]%parameter===0)?'YES':'NO';
   await actor.getByRole('button',{name:'질문하기',exact:true}).click();await configureQuestion(actor,name,parameter,[4,0]);await actor.getByRole('button',{name:'질문 확정',exact:true}).click();
   await expect(actor.getByRole('dialog',{name:'질문 대화'})).toHaveAttribute('data-step','question',{timeout:20000});
   await expect(actor.locator('.speech-bubble.own .speech-heading strong')).toHaveText(actor===a?'Alice':'Bob');
   await expect(observer.getByRole('dialog',{name:'질문 대화'})).toHaveAttribute('data-step','question',{timeout:20000});
   await expect(observer.locator('.speech-bubble.opponent .speech-heading strong')).toHaveText(actor===a?'Alice':'Bob');
   const label=name==='합의 크기'?'두 숫자의 합이 20 이하인가?':'두 숫자 중 3의 배수가 하나라도 있는가?';
   for(const page of [actor,observer]){
    await expect(page.locator('.shared-question h2')).toHaveText(label,{timeout:15000});await expect(page.locator('.shared-question .outcome-word')).toHaveText(answer);
    await expect(page.locator('.shared-question .question-target')).toContainText('1번 ↔ 5번');
   }
   const target=await actor.locator('.shared-question .question-target').innerText();await expect(observer.locator('.shared-question .question-target')).toHaveText(target);
   const synced=observer.waitForResponse(r=>r.url().includes('roomCommand')&&r.request().method()==='POST'&&r.status()===200);await observer.reload();expect((await (await synced).json()).result.game.voices).toEqual(['ael','jongdae']);await expect(observer.getByTestId('online-board')).toBeVisible();
   await expect(observer.locator('canvas[data-renderer="three-webgl"]')).toHaveAttribute('data-appearance',observer===a?'male':'female');
   await expect(observer.getByRole('dialog',{name:'질문 대화'})).toHaveCount(0);await expect(observer.locator('.shared-question h2')).toHaveText(label);await expect(observer.locator('.shared-question .outcome-word')).toHaveText(answer);
   for(const page of [actor,observer])await page.getByRole('button',{name:'확인',exact:true}).click();
   await expect(observer.getByRole('button',{name:'질문하기',exact:true})).toBeVisible();await expect(actor.getByRole('button',{name:'질문하기',exact:true})).toHaveCount(0);
   for(const page of [actor,observer]){
    await page.getByRole('button',{name:'추리 노트',exact:true}).click();
    if(page===observer)await page.getByRole('button',{name:'상대의 질문',exact:true}).click();
    await expect(page.locator('.shared-question.compact').filter({hasText:label})).toContainText(answer);
    await page.screenshot({path:`screenshots/five-questions-online-${name}-${page===a?'alice':'bob'}.png`});await page.getByRole('button',{name:'닫기',exact:true}).click();
   }
  }
  await a.getByRole('button',{name:'온라인 대전 나가기'}).click();await a.getByRole('button',{name:'대전 나가기',exact:true}).click();await expect(b.getByRole('heading',{name:'VICTORY',exact:true})).toBeVisible();
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
