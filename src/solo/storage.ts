import {apply,initial,stars} from './engine';
import {getStage} from './stages';
import type {Run,SoloSave,SoloState,Stage} from './types';
export const SOLO_KEY='leblanc-solo-v1';
export const emptySave=():SoloSave=>({schema:1,active:null,records:[]});
export function newRun(s:Stage):Run{return {id:crypto.randomUUID(),stageId:s.id,stageVersion:s.version,rulesVersion:s.rulesVersion,startedAt:Date.now(),actions:[]};}
export function replay(run:Run):SoloState{
 const stage=getStage(run.stageId);if(!stage||stage.version!==run.stageVersion||stage.rulesVersion!==run.rulesVersion||!Array.isArray(run.actions)||run.actions.length>5000)throw Error('진행 버전이 다릅니다.');
 return run.actions.reduce((state,a)=>{if(!a||!['memo','guess','question','hint'].includes(a.type))throw Error('잘못된 기록');return apply(stage,state,a);},initial(stage));
}
export function parseSave(raw:string|null):SoloSave{
 try{const data=JSON.parse(raw||'null');if(data?.schema!==1||!Array.isArray(data.records))return emptySave();
 const records=data.records.filter((r:SoloSave['records'][number])=>r&&typeof r.runId==='string'&&getStage(r.stageId)?.version===r.stageVersion&&[1,2,3].includes(r.stars)&&[r.questions,r.mistakes,r.hints,r.guesses,r.finishedAt].every(n=>Number.isFinite(n)&&n>=0)).slice(-500);
 let active:Run|null=null;try{if(data.active&&typeof data.active.id==='string'&&Number.isFinite(data.active.startedAt)){replay(data.active);active=data.active;}}catch{/* Incompatible/corrupt run does not affect records or duels. */}
 return {schema:1,active,records};}catch{return emptySave();}
}
export function loadSave(){try{return parseSave(localStorage.getItem(SOLO_KEY));}catch{return emptySave();}}
export function completed(save:SoloSave,stage:Stage,state:SoloState):SoloSave{
 const run=save.active;if(!run||!state.cleared||save.records.some(r=>r.runId===run.id))return save;
 return {...save,records:[...save.records,{runId:run.id,stageId:stage.id,stageVersion:stage.version,stars:stars(stage,state),questions:state.questionsUsed,mistakes:state.failed.length,hints:state.hintsUsed,guesses:state.guesses,finishedAt:Date.now()}].slice(-500)};
}
