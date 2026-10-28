import {test,expect,type Page} from '@playwright/test';
import {STAGES} from '../src/solo/stages';
import {targets} from '../src/solo/conditions';
async function enter(page:Page){await page.goto('/');await page.getByRole('button',{name:'솔로 모드'}).click();}
test('all six stages: target selection, exact connections, chain, result and next stage',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await enter(page);
 await page.getByTestId(`stage-${STAGES[0].id}`).click();
 for(const [index,s] of STAGES.entries()){
  for(const id of s.walkthrough.questions){await page.getByRole('button',{name:'질문하기'}).click();await page.getByTestId(`question-${id}`).click();await expect(page.getByRole('button',{name:'질문 실행'})).toBeDisabled();for(const i of targets(s.questions.find(q=>q.id===id)!.condition))await page.getByRole('button',{name:new RegExp(`^${i+1}번 타일,`)}).click();await page.getByRole('button',{name:'질문 실행'}).click();}
  for(const {tile,value} of s.walkthrough.inputs){await page.getByRole('button',{name:new RegExp(`^${tile+1}번 타일,`)}).click();await page.getByRole('button',{name:`숫자 ${value}`,exact:true}).click();await page.getByRole('button',{name:`${value} · 해독하기`,exact:true}).click();}
  await page.getByRole('button',{name:'결과 보기'}).click();await expect(page.getByLabel('3성',{exact:true})).toBeVisible();
  if(index<5)await page.getByRole('button',{name:'다음 암호'}).click();
 }
 await page.screenshot({path:'screenshots/solo-six-cleared.png',fullPage:true});
});
test('notes, wrong answer and hints survive refresh; cancelling a question costs nothing',async({page})=>{
 await page.setViewportSize({width:360,height:800});await enter(page);await page.getByTestId('stage-useful-no').click();
 await page.getByRole('button',{name:'질문하기'}).click();await page.getByTestId('question-middle-equal').click();await page.getByRole('button',{name:'취소'}).click();await expect(page.getByText('질문 0 / 목표 2',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/^3번 타일,/}).click();await page.getByRole('button',{name:'후보 메모',exact:true}).click();await page.getByRole('button',{name:'후보 8',exact:true}).click();await page.getByRole('button',{name:'숫자 해독',exact:true}).click();await page.getByRole('button',{name:'숫자 8',exact:true}).click();await page.getByRole('button',{name:'8 · 해독하기'}).click();
 await page.getByRole('button',{name:'힌트',exact:true}).click();await page.getByRole('button',{name:'힌트 보기'}).click();await page.reload();await page.getByRole('button',{name:'솔로 모드'}).click();await page.getByRole('button',{name:/^이어하기/}).click();await page.getByRole('button',{name:'기록',exact:true}).click();await expect(page.getByText('3번은 8이 아닙니다.',{exact:true})).toBeVisible();await expect(page.getByText(STAGES[4].focus,{exact:true})).toBeVisible();
});
for(const viewport of [{width:844,height:390},{width:800,height:360},{width:320,height:568},{width:360,height:800},{width:390,height:844},{width:1440,height:900}])test(`table and tools ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);await enter(page);await page.getByTestId('stage-whole-chain').click();await page.getByRole('button',{name:/^3번 타일,/}).click();await expect(page.getByRole('button',{name:'숫자 11',exact:true})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
 const tool=await page.locator('.solo-keypad').boundingBox();for(const target of await page.getByRole('group',{name:'암호 타일'}).getByRole('button').all()){const b=await target.boundingBox();expect(b).toBeTruthy();expect(b!.y+b!.height).toBeLessThan(tool!.y);}
 if(viewport.height>=800){const submit=await page.getByRole('button',{name:'숫자를 선택하세요',exact:true}).boundingBox();expect(submit!.y+submit!.height).toBeLessThanOrEqual(viewport.height);}
 await page.screenshot({path:`screenshots/solo-input-${viewport.width}.png`,fullPage:true});
});
test('chain animation locks actions and reload retains committed clear',async({page})=>{
 await enter(page);await page.getByTestId('stage-first-link').click();await page.getByRole('button',{name:'질문하기'}).click();await page.getByTestId('question-right-three').click();
 for(const i of [2,3])await page.getByRole('button',{name:new RegExp(`^${i}번 타일,`)}).click();await page.getByRole('button',{name:'질문 실행'}).click();
 await page.getByRole('button',{name:/^2번 타일,/}).click();await page.getByRole('button',{name:'숫자 4',exact:true}).click();await page.getByRole('button',{name:'4 · 해독하기'}).click();
 await expect(page.getByRole('button',{name:'결과 보기'})).toBeDisabled();await expect(page.getByRole('button',{name:'스테이지 목록'})).toBeDisabled();await page.reload();await page.getByRole('button',{name:'솔로 모드'}).click();await page.getByTestId('stage-first-link').click();await expect(page.getByLabel('3성',{exact:true})).toBeVisible();
});
