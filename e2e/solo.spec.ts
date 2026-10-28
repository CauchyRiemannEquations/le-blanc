import {test,expect,type Page} from '@playwright/test';
import {STAGES} from '../src/solo/stages';
import {targets} from '../src/solo/conditions';
import type {SoloAction,Stage} from '../src/solo/types';
async function enter(page:Page){await page.goto('/');await page.getByRole('button',{name:'솔로 모드',exact:true}).click();}
async function action(page:Page,s:Stage,a:SoloAction){
 const cards=page.getByRole('group',{name:'암호 타일',exact:true});
 if(a.type==='question'){
  await page.getByRole('button',{name:'질문하기',exact:true}).click();await page.getByTestId(`question-${a.id}`).click();await expect(page.getByRole('button',{name:'질문 실행'})).toBeDisabled();
  for(const i of targets(s.questions.find(q=>q.id===a.id)!.condition))await cards.getByRole('button').nth(i).click();
  await page.getByRole('button',{name:'질문 실행'}).click();
 }else if(a.type==='gap'){
  await page.getByRole('button',{name:'간격 연결',exact:true}).click();await cards.getByRole('button').nth(a.a).click();await cards.getByRole('button').nth(a.b).click();
  await page.getByRole('button',{name:`간격 ${a.value}`,exact:true}).click();await page.getByRole('button',{name:`간격 ${a.value} · 연결하기`,exact:true}).click();
 }else if(a.type==='guess'){
  await cards.getByRole('button').nth(a.tile).click();await page.getByRole('button',{name:`숫자 ${a.value}`,exact:true}).click();await page.getByRole('button',{name:`${a.value} · 해독하기`,exact:true}).click();
 }
}
for(const viewport of [{width:844,height:390},{width:1440,height:900}])test(`all five stages: question, direct links, chain and next stage ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:'reduce'});await enter(page);
 await expect(page.locator('.solo-stage-list li')).toHaveCount(5);await page.screenshot({path:`screenshots/solo-v2-menu-${viewport.width}.png`});await page.getByTestId(`stage-${STAGES[0].id}`).click();
 for(const [index,s] of STAGES.entries()){
  await expect(page.locator('canvas[data-renderer="three-webgl"]')).toBeVisible();
  if(index>=2)await page.screenshot({path:`screenshots/solo-v2-${s.id}-${viewport.width}.png`});
  for(const a of s.walkthrough.actions)await action(page,s,a);
  await page.getByRole('button',{name:'결과 보기'}).click();await expect(page.getByLabel('3성',{exact:true})).toBeVisible();
  const next=page.getByRole('button',{name:index<STAGES.length-1?'다음 암호 →':'스테이지 목록으로',exact:true});
  const box=(await next.boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
  await expect(page.locator('.solo-solution')).not.toHaveAttribute('open','');
  if(index<STAGES.length-1)await next.click();
 }
 await page.screenshot({path:`screenshots/solo-v2-cleared-${viewport.width}.png`});await page.getByRole('button',{name:'스테이지 목록으로',exact:true}).click();await expect(page.locator('.solo-stage-list .solo-stars')).toHaveText(['★★★','★★★','★★★','★★★','★★★']);
});
test('cancel/review questions; gap errors, notes and hints survive refresh without using duel settings',async({page})=>{
 await page.setViewportSize({width:844,height:390});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(()=>localStorage.setItem('duel-save-sentinel','unchanged'));await enter(page);await page.getByTestId('stage-main-question-v2').click();
 await page.getByRole('button',{name:'질문하기',exact:true}).click();await page.getByTestId('question-first-five').click();await page.getByRole('button',{name:'취소 ×',exact:true}).click();await expect(page.getByText('질문 0 / 목표 2',{exact:true})).toBeVisible();
 await action(page,STAGES[3],{type:'question',id:'first-five'});await action(page,STAGES[3],{type:'question',id:'first-five'});await expect(page.getByText('질문 1 / 목표 2',{exact:true})).toBeVisible();
 await action(page,STAGES[3],{type:'gap',a:2,b:3,value:2});
 await page.getByRole('group',{name:'암호 타일',exact:true}).getByRole('button').nth(2).click();await page.getByRole('button',{name:'후보 메모',exact:true}).click();await page.getByRole('button',{name:'후보 9',exact:true}).click();await page.getByRole('button',{name:'숫자 해독',exact:true}).click();await page.getByRole('button',{name:'숫자 9',exact:true}).click();await page.getByRole('button',{name:'9 · 해독하기'}).click();
 await page.getByRole('button',{name:'힌트',exact:true}).click();await page.getByRole('button',{name:'힌트 보기'}).click();await page.reload();await page.getByRole('button',{name:'솔로 모드',exact:true}).click();await page.getByRole('button',{name:/^이어하기/}).click();await page.getByRole('button',{name:'기록',exact:true}).click();
 await expect(page.getByText('3–4번 간격은 2이 아닙니다.',{exact:true})).toBeVisible();await expect(page.getByText('3번은 9이 아닙니다.',{exact:true})).toBeVisible();await expect(page.getByRole('dialog')).toContainText('아니오');
 expect(await page.evaluate(()=>localStorage.getItem('duel-save-sentinel'))).toBe('unchanged');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('leblanc-solo-v1')!));expect(saved.active.actions.some((a:SoloAction)=>a.type==='hint')).toBe(true);expect(saved.active.actions.some((a:SoloAction)=>a.type==='memo')).toBe(true);
});
for(const viewport of [{width:800,height:360},{width:320,height:568},{width:390,height:844},{width:1440,height:900}])test(`table, clues and gap tools ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);await enter(page);await page.getByTestId('stage-main-branches-v2').click();await page.getByRole('button',{name:'간격 연결',exact:true}).click();
 const cards=page.getByRole('group',{name:'암호 타일',exact:true}).getByRole('button');await cards.nth(1).click();await cards.nth(2).click();await expect(page.getByRole('button',{name:'간격 5',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 const clues=page.getByRole('region',{name:'공개 단서'}),clueBox=(await clues.boundingBox())!;
 for(const target of await cards.all()){const b=(await target.boundingBox())!;expect(clueBox.x+clueBox.width<=b.x||clueBox.y+clueBox.height<=b.y).toBe(true);}
 const tool=(await page.locator('.solo-keypad').boundingBox())!;for(const target of await cards.all()){const b=(await target.boundingBox())!;expect(b.y+b.height).toBeLessThan(tool.y);}
 const submit=(await page.getByRole('button',{name:'간격을 선택하세요',exact:true}).boundingBox())!;expect(submit.y+submit.height).toBeLessThanOrEqual(viewport.height);
 await expect(page.getByRole('region',{name:'공개 단서'})).toContainText('1–5번 간격은 14');
 await page.screenshot({path:`screenshots/solo-v2-gap-${viewport.width}.png`,fullPage:true});
});
test('chain animation locks actions and reload retains committed clear',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:false})));await enter(page);await page.getByTestId('stage-main-anchor-v2').click();
 for(const a of STAGES[2].walkthrough.actions)await action(page,STAGES[2],a);
 await expect(page.getByRole('button',{name:'결과 보기'})).toBeDisabled();await expect(page.getByRole('button',{name:'스테이지 목록',exact:true})).toBeDisabled();await page.reload();await page.getByRole('button',{name:'솔로 모드',exact:true}).click();await page.getByTestId('stage-main-anchor-v2').click();await expect(page.getByLabel('3성',{exact:true})).toBeVisible();
});
test('legacy third clear is archived, never interpreted as new third clear',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('leblanc-solo-v1',JSON.stringify({schema:1,active:null,records:[{runId:'old',stageId:'useful-question',stageVersion:1,stars:3,questions:1,mistakes:0,hints:0,guesses:0,finishedAt:1}]})));await enter(page);
 await expect(page.locator('.solo-stage-list .solo-stars')).toHaveText(['—','—','—','—','—']);await page.getByRole('button',{name:'이전 기록',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('어디에 물을까 · ★★★');await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByTestId('stage-main-anchor-v2').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('leblanc-solo-v1')!).records[0].stageId)).toBe('useful-question');
});
