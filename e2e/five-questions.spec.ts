import {test,expect} from '@playwright/test';
import {createGame} from '../src/engine/game';
import {answerQuestion,questionLabel} from '../src/engine/questions';

for(const viewport of [{width:568,height:320},{width:844,height:390},{width:1440,height:900}]){
 for(const kind of ['sumAtMost','containsMultiple'] as const)test(`${kind} 선택·조절·공개 결과·노트 ${viewport.width}`,async({browser})=>{
  const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,voice:'ael',reduced:true}));});
   await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).tap();await page.getByRole('button',{name:'AI 대전',exact:true}).tap();await page.getByRole('button',{name:'대전 시작',exact:true}).tap();
   await page.getByRole('button',{name:'질문하기',exact:true}).tap();
   const options=page.locator('.question-options-list button');
   expect(await options.allTextContents()).toEqual([
    '간격두 숫자가 얼마나 가까운지 확인','합의 크기두 숫자의 합이 기준 이하인지 확인',
    '합의 배수두 숫자의 합이 특정 수의 배수인지 확인','배수 포함두 숫자 중 특정 수의 배수가 있는지 확인','서로소두 숫자의 공약수가 1뿐인지 확인',
   ]);
   await page.screenshot({path:`screenshots/five-questions-menu-${viewport.width}.png`});
   // The last option remains reachable by touch/scroll on narrow landscape screens.
   await page.getByRole('button',{name:'서로소',exact:true}).tap();await expect(page.getByLabel('기준 숫자',{exact:true})).toHaveCount(0);
   const targets=page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button');
   await targets.nth(0).tap();await targets.nth(4).tap();await page.getByRole('button',{name:'질문 바꾸기',exact:true}).tap();
   await page.getByRole('button',{name:kind==='sumAtMost'?'합의 크기':'배수 포함',exact:true}).tap();
   await expect(page.getByRole('button',{name:'질문 확정',exact:true})).toBeDisabled();
   await expect(page.getByLabel('기준 숫자',{exact:true})).toHaveText(kind==='sumAtMost'?'20':'3');
   const parameter=kind==='sumAtMost'?21:4;
   await page.getByRole('button',{name:'기준 숫자 늘리기',exact:true}).tap();
   await expect(page.getByLabel('기준 숫자',{exact:true})).toHaveText(String(parameter));
   await expect(page.locator('.sheet-title')).toHaveText(questionLabel({kind,parameter}));
   for(const i of [4,0]){await targets.nth(i).tap();await expect(targets.nth(i)).toHaveAttribute('aria-pressed','true');}
   await expect(page.locator('.question-confirmation')).toHaveText('1번 · 5번 선택됨');
   for(const name of ['기준 숫자 줄이기','기준 숫자 늘리기','질문 확정']){
    const button=page.getByRole('button',{name,exact:true});await expect(button).toBeInViewport();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
   await page.screenshot({path:`screenshots/five-questions-${kind}-${viewport.width}.png`});
   await page.getByRole('button',{name:'질문 확정',exact:true}).tap();
   const truth=createGame(4242).players[1].tiles,answer=answerQuestion({kind,parameter},truth[0].value,truth[4].value)?'YES':'NO';
   await expect(page.locator('.shared-question .outcome-word')).toHaveText(answer);
   await expect(page.locator('.shared-question h2')).toHaveText(questionLabel({kind,parameter}));
   await expect(page.locator('.shared-question .question-target')).toHaveText('나 → Carl · 1번 ↔ 5번');
   await expect(page.getByRole('button',{name:'확인',exact:true})).toBeInViewport();
   await page.screenshot({path:`screenshots/five-questions-result-${kind}-${viewport.width}.png`});
   await page.getByRole('button',{name:'확인',exact:true}).tap();
   for(let i=0;i<15;i++){
    const confirm=page.getByRole('button',{name:'확인 · 계속',exact:true}),ready=page.getByRole('button',{name:'질문하기',exact:true}),skip=page.getByRole('button',{name:'결과 바로 보기'});
    await expect.poll(async()=>await confirm.isVisible()||await skip.isVisible()||await ready.isVisible()&&await page.getByRole('dialog').count()===0).toBe(true);
    if(await skip.isVisible()){await skip.tap();continue;}if(await confirm.isVisible()){await confirm.tap();continue;}
    if(await page.getByRole('dialog').count()===0)break;
   }
   await page.getByRole('button',{name:/추리 노트/}).tap();
   await expect(page.locator('.clue-entry')).toContainText(questionLabel({kind,parameter}));await expect(page.locator('.clue-entry b')).toHaveText(answer);
   await page.getByRole('button',{name:'대전 기록',exact:true}).tap();
   await expect(page.locator('.shared-question.compact').filter({hasText:'나 → Carl'})).toContainText(questionLabel({kind,parameter}));
   expect(errors).toEqual([]);
  }finally{await context.close();}
 });
}

test('합의 크기·배수 포함의 기준 경계와 종류 전환 초기화',async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,voice:'ael',reduced:true}));});
 await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('button',{name:'AI 대전',exact:true}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();await page.getByRole('button',{name:'질문하기',exact:true}).click();
 for(const [name,min,max,initial] of [['합의 크기',3,38,20],['배수 포함',2,10,3]] as const){
  await page.getByRole('button',{name,exact:true}).click();
  for(let n=initial;n<max;n++)await page.getByRole('button',{name:'기준 숫자 늘리기',exact:true}).click();
  await expect(page.getByLabel('기준 숫자',{exact:true})).toHaveText(String(max));await expect(page.getByRole('button',{name:'기준 숫자 늘리기',exact:true})).toBeDisabled();
  for(let n=max;n>min;n--)await page.getByRole('button',{name:'기준 숫자 줄이기',exact:true}).click();
  await expect(page.getByLabel('기준 숫자',{exact:true})).toHaveText(String(min));await expect(page.getByRole('button',{name:'기준 숫자 줄이기',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'질문 바꾸기',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();
  await expect(page.getByLabel('기준 숫자',{exact:true})).toHaveText(String(initial));await page.getByRole('button',{name:'질문 바꾸기',exact:true}).click();
 }
});
