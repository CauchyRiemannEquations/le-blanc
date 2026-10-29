import type { GameState,GameView,PlayerId } from '../engine/types';
import type {VoiceId} from '../voice/types';
import type {Appearance} from '../engine/characters';
export const TURN_MS=60_000;
export interface RoomState {
 voices?:VoiceId[];
 appearances?:Appearance[];
 initialReveal?:boolean;
 code:string;members:string[];names:string[];status:'waiting'|'playing'|'finished'|'closed';
 game:GameState|null;deadline:number|null;version:number;createdAt:number;
 missed:[number,number];lastCommand:{uid:string;id:string}|null;
}
/** Only this per-user projection is delivered to a client. */
export interface RoomView {
 voices?:VoiceId[];
 appearances?:Appearance[];
 initialReveal:boolean;
 code:string;status:RoomState['status'];player:PlayerId;names:string[];
 game:GameView|null;deadline:number|null;version:number;serverTime:number;
 finalBoards:{values:number[]}[]|null;
}
