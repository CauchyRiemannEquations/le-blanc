import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const size of [192,512]){const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{width:100%;height:100%}</style>${readFileSync('public/icon.svg','utf8')}`);await page.screenshot({path:`public/icon-${size}.png`,omitBackground:true});await page.close();}}finally{await browser.close();}
