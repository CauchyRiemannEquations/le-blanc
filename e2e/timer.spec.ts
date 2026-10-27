import { test,expect } from '@playwright/test';
test('공격창을 열어도 60초가 지나면 차례가 넘어간다',async({page})=>{
 await page.addInitScript(()=>{Date.now=()=>4242;Math.random=()=>.1;localStorage.setItem('leblanc-settings-v1',JSON.stringify({sound:false,reduced:true,initial:true}));});
 await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('button',{name:/AI 대전/}).click();await page.getByRole('button',{name:'대전 시작'}).click();await expect(page.getByTestId('game-board')).toBeVisible();await expect(page.getByRole('timer')).toContainText('01:00');await page.getByRole('button',{name:/공격하기/}).click();await page.evaluate(()=>{Date.now=()=>65242;});await expect(page.getByRole('dialog')).toContainText('제한시간이 끝나 차례를 넘겼습니다.');await expect(page.getByRole('button',{name:/숫자 공격/})).toHaveCount(0);
});
