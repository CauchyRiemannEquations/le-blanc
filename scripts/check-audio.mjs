import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('../public/audio/manifest.json',import.meta.url),'utf8'));
let failures=0;
for(const asset of manifest.files){
 try{
  const bytes=readFileSync(new URL('../public/audio/'+asset.file,import.meta.url));
  if(bytes.length!==asset.bytes||bytes.subarray(0,4).toString()!=='OggS')throw Error('expected original OGG bytes/header do not match');
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(hash!==asset.sha256)throw Error('SHA-256 does not match the supplied audio');
  console.log(asset.file,bytes.length,hash);
 }catch(error){failures++;console.error(asset.file+': '+error.message);}
}
const sfx=JSON.parse(readFileSync(new URL('../public/audio/sfx/manifest.json',import.meta.url),'utf8'));
const seen=new Set();
for(const event of sfx.events){
 for(const asset of event.variants){
  try{
   if(!/^ogg\/[a-z0-9_]+\.ogg$/.test(asset.ogg)||seen.has(asset.ogg))throw Error('invalid or duplicate SFX asset path');
   seen.add(asset.ogg);
   const bytes=readFileSync(new URL('../public/audio/sfx/'+asset.ogg,import.meta.url));
   if(bytes.subarray(0,4).toString()!=='OggS'||createHash('sha256').update(bytes).digest('hex')!==asset.sha256_ogg)throw Error('SFX OGG header or SHA-256 mismatch');
   if(event.loop!==false||sfx.loop!==false)throw Error('SFX must be one-shot');
   console.log(event.event_id,asset.slot,bytes.length,asset.sha256_ogg);
  }catch(error){failures++;console.error(asset.ogg+': '+error.message);}
 }
}
if(sfx.events.length!==18||seen.size!==36){failures++;console.error('Expected 18 SFX groups and 36 unique OGG assets.');}
if(failures){console.error('Audio release check failed. Restore the original supplied audio files before publishing.');process.exitCode=1;}
