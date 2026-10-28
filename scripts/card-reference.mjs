import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:600,height:440}});
await page.goto('http://127.0.0.1:4173/');
await page.setContent(`<body style="margin:0;background:#211710;display:flex;gap:30px;padding:28px"><img src="http://127.0.0.1:4173/materials/card-back.svg" width="256" height="384"><svg width="256" height="384" viewBox="0 0 256 384"><rect width="256" height="384" rx="10" fill="#d9c7a2"/><g fill="none" stroke="#9d8054"><rect x="12" y="12" width="232" height="360" rx="7" stroke-width="2"/><rect x="19" y="19" width="218" height="346" rx="4"/></g><text x="128" y="235" text-anchor="middle" font-family="Georgia" font-size="136" font-weight="bold" fill="#211b18">12</text></svg></body>`);
await page.locator('img').evaluate(img=>img.decode());await page.screenshot({path:'screenshots/card-design-reference.png'});await browser.close();
