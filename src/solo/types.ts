import type { GapConnection } from '../engine/types';

export type Pair = [number, number];
export type Condition =
 | {kind:'value'; tile:number; value:number}
 | {kind:'bound'; tile:number; min:number; max:number}
 | {kind:'gap'; pair:Pair; value:number}
 | {kind:'gapRange'; pair:Pair; min:number; max:number}
 | {kind:'equal'|'greater'; left:Pair; right:Pair};
export type Relation = Exclude<Condition,{kind:'value'|'bound'}>;
export interface SoloQuestion {id:string; condition:Relation}
/** This is the only stage information available to inference and hints. */
export interface PublicStage {
 id:string; version:number; rulesVersion:number; title:string; subtitle:string;
 min:number; max:number; count:number; excluded:number[];
 initialOpen:{tile:number;value:number}[]; clues:Condition[];
 questions:SoloQuestion[]; parQuestions:number; focus:string;
}
export type Strategy = {question:string; yes:Strategy; no:Strategy} | {done:true};
export interface LegacyStage extends PublicStage {
 answer:number[]; strategy:Strategy;
 walkthrough:{questions:string[]; inputs:{tile:number;value:number}[]; explanation:string};
}
export interface ProofStep {
 clues:number[]; answers?:{id:string;answer:boolean}[];
 conclusions:Condition[]; reason:string;
}
export interface Stage extends PublicStage {
 section:'tutorial'|'main'; answer:number[]; strategy:Strategy;
 proof:ProofStep[];
 walkthrough:{actions:SoloAction[];explanation:string};
}
export type SoloAction = {type:'question';id:string} | {type:'guess';tile:number;value:number} | {type:'gap';a:number;b:number;value:number} | {type:'hint'} | {type:'memo';tile:number;value:number};
export interface Reveal {index:number;value:number;from?:number}
export interface SoloEvent {id:number;kind:SoloAction['type'];text:string;reveals:Reveal[];guessed?:boolean;success?:boolean}
/** Persist actions, then replay through the judge. Derived state is never trusted on load. */
export interface Run {id:string;stageId:string;stageVersion:number;rulesVersion:number;startedAt:number;actions:SoloAction[]}
export interface SoloState {
 opened:(number|null)[];connections:GapConnection[];
 answers:{id:string;answer:boolean}[];failed:{tile:number;value:number}[];failedGaps:{a:number;b:number;value:number}[];
 memos:number[][];questionsUsed:number;hintsUsed:number;guesses:number;
 events:SoloEvent[];cleared:boolean;
}
export interface PublicState {stage:PublicStage;opened:(number|null)[];answers:SoloState['answers'];failed:SoloState['failed'];failedGaps:SoloState['failedGaps'];connections:GapConnection[]}
export interface RecordEntry {runId:string;stageId:string;stageVersion:number;stars:number;questions:number;mistakes:number;hints:number;guesses:number;finishedAt:number}
export interface SoloSave {schema:2;active:Run|null;records:RecordEntry[];archivedRuns:Run[]}
