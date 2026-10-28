import {apply,initial,stars} from './engine';
import {getStage} from './stages';
import {LEGACY_STAGES} from './legacyStages';
import type {Run,SoloSave,SoloState,Stage,RecordEntry} from './types';
export const SOLO_KEY='leblanc-solo-v1';
export const emptySave=():SoloSave=>({schema:2,active:null,records:[],archivedRuns:[]});
const anyStage=(id:string)=>getStage(id)??LEGACY_STAGES.find(s=>s.id===id);
export function newRun(s:Stage):Run{return {id:crypto.randomUUID(),stageId:s.id,stageVersion:s.version,rulesVersion:s.rulesVersion,startedAt:Date.now(),actions:[]};}
export function replay(run:Run):SoloState{
 const stage=anyStage(run.stageId);if(!stage||stage.version!==run.stageVersion||stage.rulesVersion!==run.rulesVersion||!Array.isArray(run.actions)||run.actions.length>5000)throw Error('진행 버전이 다릅니다.');
 return run.actions.reduce((state,a)=>{if(!a||!['memo','guess','gap','question','hint'].includes(a.type)||stage.rulesVersion===1&&a.type==='gap')throw Error('잘못된 기록');return apply(stage,state,a);},initial(stage));
}
function validRun(run:Run){try{if(!run||typeof run.id!=='string'||!Number.isFinite(run.startedAt))return false;replay(run);return true;}catch{return false;}}
export function parseSave(raw:string|null):SoloSave{
 try{const data=JSON.parse(raw||'null');if(![1,2].includes(data?.schema)||!Array.isArray(data.records))return emptySave();
 const records:RecordEntry[]=data.records.filter((r:RecordEntry)=>r&&typeof r.runId==='string'&&anyStage(r.stageId)?.version===r.stageVersion&&[1,2,3].includes(r.stars)&&[r.questions,r.mistakes,r.hints,r.guesses,r.finishedAt].every(n=>Number.isFinite(n)&&n>=0)).slice(-500);
 const archivedRuns:Run[]=(Array.isArray(data.archivedRuns)?data.archivedRuns:[]).filter((r:Run)=>!getStage(r?.stageId)&&validRun(r)).slice(-20);
 let active:Run|null=null;
 if(validRun(data.active)){
  if(getStage(data.active.stageId))active=data.active;
  else if(!archivedRuns.some(r=>r.id===data.active.id))archivedRuns.push(data.active);
 }
 return {schema:2,active,records,archivedRuns:archivedRuns.slice(-20)};}catch{return emptySave();}
}
export function loadSave(){try{return parseSave(localStorage.getItem(SOLO_KEY));}catch{return emptySave();}}
export function completed(save:SoloSave,stage:Stage,state:SoloState):SoloSave{
 const run=save.active;if(!run||!state.cleared||save.records.some(r=>r.runId===run.id))return save;
 return {...save,records:[...save.records,{runId:run.id,stageId:stage.id,stageVersion:stage.version,stars:stars(stage,state),questions:state.questionsUsed,mistakes:state.failed.length+state.failedGaps.length,hints:state.hintsUsed,guesses:state.guesses,finishedAt:Date.now()}].slice(-500)};
}
export const legacyTitle=(id:string)=>LEGACY_STAGES.find(s=>s.id===id)?.title??id;
