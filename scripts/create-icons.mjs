import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
// Resize the generated master only; no drawing or alteration of the artwork.
const source=readFileSync('assets/branding/le-blanc-icon.png').toString('base64');
mkdirSync('public/icons',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const favicons=[];
try {
 for(const size of [32,48,180,192,512]) {
  const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
  await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#100c09}img{display:block;width:100%;height:100%}</style><img alt="" src="data:image/png;base64,${source}">`);
  await page.locator('img').evaluate(image=>image.decode());
  const png=await page.screenshot({path:`public/icons/le-blanc-${size}.png`,type:'png'});
  if(size<=48)favicons.push({size,png});
  await page.close();
 }
} finally {await browser.close();}
// ICO directory containing the same PNGs, for older tab/bookmark consumers.
const header=Buffer.alloc(6+16*favicons.length);header.writeUInt16LE(1,2);header.writeUInt16LE(favicons.length,4);
let offset=header.length;
favicons.forEach(({size,png},i)=>{const at=6+i*16;header[at]=size;header[at+1]=size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(png.length,at+8);header.writeUInt32LE(offset,at+12);offset+=png.length;});
writeFileSync('public/favicon.ico',Buffer.concat([header,...favicons.map(icon=>icon.png)]));
console.log('Created five PNG sizes and favicon.ico from the generated LB master.');
