import {test,expect} from '@playwright/test';
import {configureQuestion} from './questionHelper';
for(const viewport of [{width:800,height:360},{width:1440,height:900}])test(`public Carl question and shared journal ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true}));});
 await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('button',{name:'AI 대전',exact:true}).click();await page.getByRole('button',{name:'대전 시작',exact:true}).click();
 await page.getByRole('button',{name:'질문하기',exact:true}).click();await configureQuestion(page,'합의 배수',4);await page.getByRole('button',{name:'질문 확정',exact:true}).click();
 await expect(page.locator('.shared-question .question-target')).toHaveText('나 → Carl · 1번 ↔ 2번');await page.getByRole('button',{name:'확인',exact:true}).click();
 await expect(page.getByRole('button',{name:'확인 · 계속',exact:true})).toBeVisible();const question=page.locator('.shared-question');await expect(question).toBeVisible();await expect(question.locator('.question-target')).toContainText('Carl → 나');await expect(question.locator('.outcome-word')).toHaveText(/YES|NO/);
 const text=await question.locator('h2').innerText(),answer=await question.locator('.outcome-word').innerText();for(const el of [question,page.getByRole('button',{name:'확인 · 계속',exact:true})])await expect(el).toBeInViewport();await page.screenshot({path:`screenshots/public-question-${viewport.width}.png`});
 await page.getByRole('button',{name:'확인 · 계속',exact:true}).click();await page.getByRole('button',{name:'추리 노트',exact:false}).click();await page.getByRole('button',{name:'대전 기록',exact:true}).click();
 const record=page.locator('.log-entry').filter({hasText:'Carl → 나'});await expect(record).toContainText(text);await expect(record).toContainText(answer);await expect(page.locator('.shared-question.compact')).toHaveCount(2);await page.screenshot({path:`screenshots/public-journal-${viewport.width}.png`});
});
