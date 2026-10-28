import type {GameView,GapConnection,VisibleTile} from '../engine/types';
export interface SceneCard extends VisibleTile {id:string;slot:number}
export interface SceneData {central:SceneCard[];hand:SceneCard[];connections:GapConnection[];handConnections?:GapConnection[];reference:boolean}
/** No renderer receives GameState or a hidden opponent value, even for a back face. */
export function duelScene(view:GameView,peek:boolean):SceneData {
 return {central:view.opponent.map((t,slot)=>({id:`opponent-${slot}`,slot,revealed:t.revealed,value:t.revealed?t.value:null})),hand:view.own.map((t,slot)=>({id:`own-${slot}`,slot,revealed:t.revealed,value:t.revealed||peek?t.value:null})),connections:view.connections.map(e=>({...e})),handConnections:view.ownConnections.map(e=>({...e})),reference:false};
}
export const centralX=(slot:number,count:number)=>(slot-(count-1)/2)*1.12;
/** Slot position depends only on original index, never revelation or remaining cards. */
export function nearCardPose(slot:number,count:number,peek:boolean,revealed:boolean,reference=false){
 const inspecting=peek&&!revealed&&!reference;
 return {position:[centralX(slot,count),inspecting?.52:.07,1.65] as [number,number,number],rotation:[inspecting?-.78:-Math.PI/2,0,reference||inspecting?0:Math.PI] as [number,number,number]};
}
