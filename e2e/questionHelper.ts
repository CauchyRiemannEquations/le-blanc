import type {Page} from '@playwright/test';
export async function configureQuestion(page:Page,kind:'간격'|'합의 배수'|'서로소',parameter=3,indices=[0,1]){
 await page.getByRole('button',{name:kind,exact:true}).click();
 if(kind!=='서로소'){let current=Number(await page.getByLabel('기준 숫자',{exact:true}).textContent());while(current!==parameter){await page.getByRole('button',{name:current<parameter?'기준 숫자 늘리기':'기준 숫자 줄이기',exact:true}).click();current+=current<parameter?1:-1;}}
 const targets=page.getByRole('group',{name:'공격 또는 질문 대상'}).getByRole('button');for(const i of indices)await targets.nth(i).click();
}
