import { initializeTestEnvironment,assertFails,assertSucceeds } from '@firebase/rules-unit-testing';
import { doc,getDoc,getDocs,collection,setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
const env=await initializeTestEnvironment({projectId:'demo-le-blanc',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync('firestore.rules','utf8')}});
try {
 await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();await setDoc(doc(db,'matches/TESTROOM'),{secret:[1,2,3]});await setDoc(doc(db,'matches/TESTROOM/views/alice'),{own:[1,2,3]});});
 const own=env.authenticatedContext('alice').firestore(),other=env.authenticatedContext('eve').firestore(),anon=env.unauthenticatedContext().firestore();
 await assertSucceeds(getDoc(doc(own,'matches/TESTROOM/views/alice')));
 await assertFails(getDoc(doc(own,'matches/TESTROOM')));
 await assertFails(getDoc(doc(other,'matches/TESTROOM/views/alice')));
 await assertFails(getDoc(doc(anon,'matches/TESTROOM/views/alice')));
 await assertFails(getDocs(collection(own,'matches/TESTROOM/views')));
 await assertFails(setDoc(doc(own,'matches/TESTROOM/views/alice'),{cheat:true}));
 await assertFails(setDoc(doc(own,'matches/TESTROOM'),{cheat:true}));
 console.log('Firestore rules: 7 assertions passed');
}finally{await env.cleanup();}
