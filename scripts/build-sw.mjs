import { readdirSync,writeFileSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);}
const assets=files('dist').filter(f=>!f.endsWith('sw.js')).map(f=>'/'+f.slice(5));
const hash=createHash('sha256').update('cache-v2'+assets.join('|')+readFileSync('dist/index.html','utf8')).digest('hex').slice(0,12);
writeFileSync('dist/sw.js',`const CACHE='le-blanc-${hash}';const ASSETS=${JSON.stringify(assets)};self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('le-blanc-')&&k!==CACHE).map(k=>caches.delete(k)))));});self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request,{ignoreVary:true}).then(r=>r||(event.request.mode==='navigate'?caches.match('/index.html'):Response.error()))));});`);
console.log(`Offline cache: ${assets.length} files, ${hash}`);

