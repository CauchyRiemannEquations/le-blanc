import { initializeApp } from 'firebase/app';
import { getAuth,signInAnonymously,connectAuthEmulator } from 'firebase/auth';
import { getFirestore,doc,onSnapshot,connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions,httpsCallable,connectFunctionsEmulator } from 'firebase/functions';
import type { Action } from '../engine/types';
import type { RoomView } from './types';
const emulator=import.meta.env.DEV&&import.meta.env.VITE_USE_FIREBASE_EMULATORS==='true';
export const onlineConfigured=emulator||!!import.meta.env.VITE_FIREBASE_API_KEY;
let services:ReturnType<typeof setup>|undefined;
let signingIn:Promise<unknown>|undefined;
function setup(){
 const app=initializeApp({apiKey:import.meta.env.VITE_FIREBASE_API_KEY||'demo-key',authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:emulator?'demo-le-blanc':import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID||'demo-app'});
 const auth=getAuth(app),db=getFirestore(app),functions=getFunctions(app,'asia-northeast3');
 if(emulator){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8080);connectFunctionsEmulator(functions,'127.0.0.1',5001);}
 return {auth,db,functions};
}
async function ready(){if(!onlineConfigured)throw new Error('온라인 서버 연결 설정이 필요합니다.');services??=setup();await services.auth.authStateReady();if(!services.auth.currentUser){signingIn??=signInAnonymously(services.auth).finally(()=>{signingIn=undefined;});await signingIn;}return services;}
async function call(name:string,data:unknown){const {functions}=await ready();return (await httpsCallable<unknown,RoomView>(functions,name)(data)).data;}
export const createOnlineRoom=(name:string,initialReveal=true)=>call('createRoom',{name,initialReveal});
export const joinOnlineRoom=(code:string,name:string)=>call('joinRoom',{code,name});
export const syncOnlineRoom=(code:string)=>call('roomCommand',{code,operation:'sync'});
export const leaveOnlineRoom=(code:string)=>call('roomCommand',{code,operation:'leave'});
export const sendOnlineAction=(room:RoomView,action:Action)=>call('roomCommand',{code:room.code,operation:'act',version:room.version,id:crypto.randomUUID(),action});
export async function watchRoom(code:string,onValue:(room:RoomView)=>void,onError:(message:string)=>void){const {auth,db}=await ready();return onSnapshot(doc(db,'matches',code,'views',auth.currentUser!.uid),snap=>{if(snap.exists())onValue(snap.data() as RoomView);},e=>onError(e.message));}
