// Explicit live smoke test: creates one disposable match, disconnects both clients,
// then reads the server-owned deadline result without sending a sync request.
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.FIREBASE_TOOLS_LIB;
if(process.env.LE_BLANC_LIVE_TEST!=='true'||!base)throw Error('Set LE_BLANC_LIVE_TEST=true and FIREBASE_TOOLS_LIB explicitly.');
const {configstore}=require(path.join(base,'configstore')),{requireAuth}=require(path.join(base,'requireAuth')),{Client}=require(path.join(base,'apiv2'));
(async()=>{
 await requireAuth({project:'le-blanc-noir-2026',user:configstore.get('user'),tokens:configstore.get('tokens')});
 const admin=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
 const browser=await chromium.launch({channel:'chrome',headless:true});let room,authorization;
 try {
  const a=await browser.newContext(),b=await browser.newContext(),p=await a.newPage(),q=await b.newPage();
  q.on('request',r=>{if(r.url().endsWith('/joinRoom'))authorization=r.headers().authorization;});
  for(const page of [p,q]){await page.goto('https://le-blanc-noir-2026.web.app/?room=');await page.getByRole('textbox',{name:'내 이름'}).fill('Deadline check');}
  await p.getByRole('button',{name:'방 만들기',exact:true}).click();await p.locator('.room-code').waitFor();const code=(await p.locator('.room-code').innerText()).trim();
  await q.getByRole('textbox',{name:'방 코드'}).fill(code);const response=q.waitForResponse(r=>r.url().endsWith('/joinRoom')&&r.request().method()==='POST');await q.getByRole('button',{name:'방 입장',exact:true}).click();room=(await (await response).json()).result;
  assert.equal(room.status,'playing');await a.close();await b.close();console.log('Both browsers disconnected; waiting for server deadline.',{turn:room.game.turn});
  await new Promise(r=>setTimeout(r,Math.max(0,room.deadline-Date.now()+12000)));
  const r=await admin.get(`/projects/le-blanc-noir-2026/databases/(default)/documents/matches/${room.code}`);
  const fields=r.body.fields,turn=Number(fields.game.mapValue.fields.turn.integerValue),missed=fields.missed.arrayValue.values.map(x=>Number(x.integerValue));
  assert.ok(turn>room.game.turn,`Server did not advance turn: ${turn}`);assert.equal(missed.reduce((a,b)=>a+b,0),1);
  console.log('PASS: Cloud Tasks advanced the turn with both clients disconnected.',{before:room.game.turn,after:turn,missed});
 } finally {
  if(room&&authorization)await fetch('https://asia-northeast3-le-blanc-noir-2026.cloudfunctions.net/roomCommand',{method:'POST',headers:{authorization,'Content-Type':'application/json'},body:JSON.stringify({data:{code:room.code,operation:'leave'}})});
  await browser.close();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
