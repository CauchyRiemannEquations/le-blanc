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
if(failures){console.error('Audio release check failed. Materialize the original Library files before publishing.');process.exitCode=1;}
