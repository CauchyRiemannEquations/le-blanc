import { randomInt } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Transaction,DocumentReference } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { onCall,HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { setGlobalOptions } from 'firebase-functions/v2';
import { actInRoom,cleanName,closeGame,createRoomState,expireRoomState,joinRoomState,projectRoom } from './domain';
import type { RoomState } from '../../src/online/types';
import type { Action,PlayerId } from '../../src/engine/types';
initializeApp();const db=getFirestore();db.settings({ignoreUndefinedProperties:true});
setGlobalOptions({region:'asia-northeast3',maxInstances:5,memory:'256MiB',timeoutSeconds:30});
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeOf=(value:unknown)=>{if(typeof value!=='string'||!new RegExp(`^[${alphabet}]{8}$`).test(value.toUpperCase()))throw new HttpsError('invalid-argument','8자리 방 코드를 확인해주세요.');return value.toUpperCase();};
function save(tx:Transaction,ref:DocumentReference,room:RoomState,now:number){tx.set(ref,room);for(const uid of room.members)tx.set(ref.collection('views').doc(uid),projectRoom(room,uid,now));}
function uidOf(auth:{uid:string}|undefined){if(!auth)throw new HttpsError('unauthenticated','접속을 확인한 뒤 다시 시도해주세요.');return auth.uid;}
function convert(error:unknown):never {if(error instanceof HttpsError)throw error;throw new HttpsError('failed-precondition',error instanceof Error?error.message:'요청을 처리하지 못했습니다.');}
export const createRoom=onCall(async request=>{
 const uid=uidOf(request.auth);try {
  const name=cleanName(request.data?.name),code=Array.from({length:8},()=>alphabet[randomInt(alphabet.length)]).join(''),ref=db.doc(`matches/${code}`),profile=db.doc(`players/${uid}`);
  return await db.runTransaction(async tx=>{
   const now=Date.now(),[existing,newDoc]=await Promise.all([tx.get(profile),tx.get(ref)]);
   if(existing.exists&&typeof existing.data()?.code==='string'){
    const previous=await tx.get(db.doc(`matches/${existing.data()!.code}`));const old=previous.data() as RoomState|undefined;
    if(old&&(!old.game||old.game.rules.version===2&&old.game.rules.gapPolicy==='continue-once')&&old.members.includes(uid)&&(old.status==='playing'||old.status==='waiting'&&now-old.createdAt<30*60_000))return projectRoom(old,uid,now);
   }
   if(now-(existing.data()?.lastCreate??0)<10_000)throw new HttpsError('resource-exhausted','잠시 뒤 새 방을 만들어주세요.');
   if(newDoc.exists)throw new HttpsError('already-exists','방 코드를 다시 생성해주세요.');
   const room=createRoomState(code,uid,name,now,request.data?.initialReveal??true);save(tx,ref,room,now);tx.set(profile,{code,lastCreate:now});return projectRoom(room,uid,now);
  });
 }catch(e){convert(e);}
});
export const joinRoom=onCall(async request=>{
 const uid=uidOf(request.auth);try {
  const code=codeOf(request.data?.code),name=cleanName(request.data?.name),ref=db.doc(`matches/${code}`);
  return await db.runTransaction(async tx=>{
   const now=Date.now(),doc=await tx.get(ref);if(!doc.exists)throw new HttpsError('not-found','방을 찾지 못했습니다. 코드를 확인해주세요.');
   const room=joinRoomState(doc.data() as RoomState,uid,name,now,randomInt(0x7fffffff),randomInt(2) as PlayerId);save(tx,ref,room,now);return projectRoom(room,uid,now);
  });
 }catch(e){convert(e);}
});
export const roomCommand=onCall(async request=>{
 const uid=uidOf(request.auth);try {
  const code=codeOf(request.data?.code),operation=request.data?.operation,ref=db.doc(`matches/${code}`);
  return await db.runTransaction(async tx=>{
   const now=Date.now(),doc=await tx.get(ref);if(!doc.exists)throw new HttpsError('not-found','방을 찾지 못했습니다.');
   const room=doc.data() as RoomState,player=room.members.indexOf(uid);if(player<0)throw new HttpsError('permission-denied','참가자가 아닙니다.');
   let next=room;
   if(operation==='sync')next=expireRoomState(room,now);
   else if(operation==='leave'){
    if(room.status==='waiting')next={...room,status:'closed',version:room.version+1};
    else if(room.status==='playing')next=closeGame(room,player as PlayerId,'상대가 대전을 나갔습니다.');
   }else if(operation==='act'){
    if(typeof request.data.id!=='string'||request.data.id.length>80||!Number.isInteger(request.data.version))throw new HttpsError('invalid-argument','행동 정보를 확인해주세요.');
    next=actInRoom(room,uid,request.data.action as Action,request.data.version,request.data.id,now);
   }else throw new HttpsError('invalid-argument','알 수 없는 요청입니다.');
   if(next!==room)save(tx,ref,next,now);return projectRoom(next,uid,now);
  });
 }catch(e){convert(e);}
});
// A durable deadline job still runs when both clients disconnect. Stale or duplicate
// jobs are harmless: the transaction compares the current turn AND deadline.
export const scheduleTurnExpiry=onDocumentWritten({document:'matches/{code}',retry:true},async event=>{
 if(process.env.FUNCTIONS_EMULATOR==='true')return;
 const room=event.data?.after.data() as RoomState|undefined,before=event.data?.before.data() as RoomState|undefined;
 if(!room||room.status!=='playing'||room.deadline===null||!room.game||(room.deadline===before?.deadline&&room.game.turn===before?.game?.turn))return;
 await getFunctions().taskQueue('locations/asia-northeast3/functions/expireRoom').enqueue({code:room.code,deadline:room.deadline,turn:room.game.turn},{scheduleTime:new Date(Math.max(Date.now(),room.deadline)),dispatchDeadlineSeconds:60});
});
export const expireRoom=onTaskDispatched({retryConfig:{maxAttempts:5,minBackoffSeconds:1},rateLimits:{maxConcurrentDispatches:10}},async request=>{
 const code=codeOf(request.data?.code),ref=db.doc(`matches/${code}`);
 await db.runTransaction(async tx=>{const doc=await tx.get(ref);if(!doc.exists)return;const room=doc.data() as RoomState;if(room.deadline!==request.data.deadline||room.game?.turn!==request.data.turn)return;const now=Date.now(),next=expireRoomState(room,now);if(next!==room)save(tx,ref,next,now);});
});
