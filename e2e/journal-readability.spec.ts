import {test,expect} from '@playwright/test';
import {configureQuestion} from './questionHelper';
import {createGame} from '../src/engine/game';

for(const viewport of [{width:568,height:320},{width:844,height:390},{width:1440,height:900}])test(`상대 질문의 강조와 분리된 추리 노트 ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);
 await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,voice:'ael',reduced:true}));});
 await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('button',{name:'AI 대전',exact:true}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 await page.getByRole('button',{name:'질문하기',exact:true}).click();await configureQuestion(page,'합의 배수',4);await page.getByRole('button',{name:'질문 확정',exact:true}).click();await page.getByRole('button',{name:'확인',exact:true}).click();
 const confirm=page.getByRole('button',{name:'확인 · 계속',exact:true});await expect(confirm).toBeVisible();
 const question=page.locator('.tavern-dispatch .shared-question'),sentence=question.locator('h2'),answer=question.locator('.outcome-word');
 const text=await sentence.innerText(),result=await answer.innerText();
 await expect(question.locator('.question-target')).toContainText('Carl → 나');await expect(page.locator('.next-turn-note')).toHaveText('다음 차례 · 나');
 expect(await sentence.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(await answer.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)));
 for(const el of [sentence,answer,confirm])await expect(el).toBeInViewport();
 await page.screenshot({path:`screenshots/readable-opponent-question-${viewport.width}.png`});await confirm.click();
 await page.getByRole('button',{name:/추리 노트/}).click();
 await expect(page.locator('.clue-entry')).toHaveCount(1);await expect(page.locator('.clue-entry')).toContainText('나 → Carl');
 await page.getByRole('button',{name:'상대의 질문',exact:true}).click();
 await expect(page.getByRole('button',{name:'상대의 질문',exact:true})).toHaveAttribute('aria-pressed','true');
 const entry=page.locator('.clue-entry');await expect(entry).toHaveCount(1);await expect(entry).toContainText('Carl → 나');await expect(entry.locator('.question-sentence')).toHaveText(text);await expect(entry.locator('.question-answer')).toHaveText(result);
 expect(await entry.locator('.question-sentence').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(17);
 await entry.locator('.answer-stamp').scrollIntoViewIfNeeded();await expect(entry.locator('.answer-stamp')).toBeInViewport();
 await page.screenshot({path:`screenshots/readable-opponent-journal-${viewport.width}.png`});
 for(const name of ['나의 단서','상대의 질문','대전 기록','닫기'])await expect(page.getByRole('button',{name,exact:true})).toBeInViewport();
 await page.getByRole('button',{name:'대전 기록',exact:true}).click();await expect(page.locator('.shared-question.compact')).toHaveCount(2);
 await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('공격 중단과 같은 기기 교대 화면의 빈티지 안내',async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,voice:'ael',reduced:true}));});
 await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('button',{name:'같은 기기로 연습',exact:true}).click();await page.getByRole('button',{name:'2인 대전 시작',exact:true}).click();
 const ready=page.getByRole('button',{name:/플레이어 1 · 준비됐어요/});await expect(ready).toBeInViewport();await expect(page.locator('.handover-card')).toBeVisible();await page.screenshot({path:'screenshots/vintage-handover.png'});await ready.click();
 const value=createGame(4242).players[1].tiles[0].value;
 await page.getByRole('button',{name:'공격하기',exact:true}).click();await page.getByRole('button',{name:/^숫자 공격/}).click();await page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button').nth(0).click();await page.getByRole('group',{name:'숫자 선택',exact:true}).getByRole('button',{name:String(value),exact:true}).click();await page.getByRole('button',{name:`1번은 ${value} · 공격`,exact:true}).click();await page.getByRole('button',{name:'다음 선택',exact:true}).click();
 await page.getByRole('button',{name:'여기서 멈추기',exact:true}).click();await expect(page.locator('.turn-notice h2')).toHaveText('플레이어 2의 차례입니다.');await expect(page.getByRole('button',{name:'기기 전달하기',exact:true})).toBeInViewport();await page.screenshot({path:'screenshots/vintage-turn-notice.png'});
 await page.getByRole('button',{name:'기기 전달하기',exact:true}).click();await expect(page.getByTestId('privacy-curtain')).toBeVisible();await expect(page.getByTestId('game-board')).toHaveCount(0);await expect(page.getByRole('button',{name:/플레이어 2 · 준비됐어요/})).toBeInViewport();
});
