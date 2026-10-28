import { applyAction,createGame,expireTurn,other,viewGame } from '../../src/engine/game';
import type { Action,PlayerId } from '../../src/engine/types';
import { TURN_MS } from '../../src/online/types';
import type { RoomState,RoomView } from '../../src/online/types';
function requireCurrentRules(room:RoomState){if(room.game&&(room.game.rules.version!==2||room.game.rules.gapPolicy!=='continue-once'||typeof room.game.gapUsed!=='boolean'))throw new Error('이전 규칙으로 시작한 방입니다. 새 방을 만들어주세요.');}
export function cleanName(value:unknown):string {if(typeof value!=='string'||!value.trim()||value.trim().length>16)throw new Error('이름은 1~16자로 적어주세요.');return value.trim();}
export function createRoomState(code:string,uid:string,name:string,now:number,initialReveal:unknown=true):RoomState {if(typeof initialReveal!=='boolean')throw new Error('공개 설정을 확인해주세요.');return {initialReveal,code,members:[uid],names:[cleanName(name)],status:'waiting',game:null,deadline:null,version:0,createdAt:now,missed:[0,0],lastCommand:null};}
export function joinRoomState(room:RoomState,uid:string,name:string,now:number,seed:number,first:PlayerId):RoomState {
 if(room.members.includes(uid))return room;
 if(room.status!=='waiting'||room.members.length!==1)throw new Error('이미 시작했거나 닫힌 방입니다.');
 if(now-room.createdAt>30*60_000)throw new Error('입장 시간이 지난 방입니다. 새 방을 만들어주세요.');
 const next=structuredClone(room);next.members.push(uid);next.names.push(cleanName(name));next.game=createGame(seed,{initialReveal:next.initialReveal===false?[]:[2]},next.names as [string,string],first);next.status='playing';next.deadline=now+TURN_MS+3000;next.version++;return next;
}
export function projectRoom(room:RoomState,uid:string,now:number):RoomView {
 requireCurrentRules(room);const player=room.members.indexOf(uid);if(player<0)throw new Error('이 방의 참가자가 아닙니다.');
 return {initialReveal:room.game?room.game.rules.initialReveal.length>0:room.initialReveal!==false,code:room.code,status:room.status,player:player as PlayerId,names:[...room.names],game:room.game?viewGame(room.game,player as PlayerId):null,deadline:room.deadline,version:room.version,serverTime:now,finalBoards:room.game?.phase==='over'?room.game.players.map(p=>({values:p.tiles.map(t=>t.value)})):null};
}
export function closeGame(room:RoomState,loser:PlayerId,text:string):RoomState {
 const next=structuredClone(room),g=next.game!;
 g.history.push({id:++g.sequence,actor:loser,type:'resign',text,reveals:[]});g.phase='over';g.result={winner:other(loser),turns:g.turn,maxChain:g.maxChain,finalChain:0};next.status='finished';next.deadline=null;next.version++;return next;
}
export function expireRoomState(room:RoomState,now:number):RoomState {
 requireCurrentRules(room);if(room.status!=='playing'||room.deadline===null||now<room.deadline||!room.game)return room;
 const next=structuredClone(room),actor=next.game!.active;next.missed[actor]++;
 // Bound abandoned games even when both browsers close. Valid actions reset this count.
 if(next.missed[actor]>=3)return closeGame(next,actor,'세 번 연속 시간 초과로 패배했습니다.');
 next.game=expireTurn(next.game!);next.version++;next.status=next.game.phase==='over'?'finished':'playing';next.deadline=next.status==='playing'?now+TURN_MS:null;return next;
}
export function actInRoom(room:RoomState,uid:string,action:Action,expectedVersion:number,id:string,now:number):RoomState {
 requireCurrentRules(room);const player=room.members.indexOf(uid);if(player<0)throw new Error('이 방의 참가자가 아닙니다.');
 if(room.lastCommand?.uid===uid&&room.lastCommand.id===id)return room;
 if(room.status!=='playing'||!room.game)throw new Error('진행 중인 대전이 아닙니다.');
 const expired=expireRoomState(room,now);if(expired!==room)return expired;
 if(expectedVersion!==room.version)throw new Error('화면을 갱신한 뒤 다시 시도해주세요.');
 if(!action||!['question','number','gap','pass'].includes(action.type))throw new Error('허용되지 않은 행동입니다.');
 const next=structuredClone(room),previousTurn=room.game.turn;
 next.game=applyAction(room.game,player as PlayerId,action);
 // No client gets a chance to avoid or choose the penalty.
 if(next.game.phase==='penalty')next.game=applyAction(next.game,player as PlayerId,{type:'penalty'});
 next.missed[player]=0;next.lastCommand={uid,id};next.version++;
 if(next.game.phase==='over'){next.status='finished';next.deadline=null;}
 else if(next.game.turn!==previousTurn)next.deadline=now+TURN_MS;
 return next;
}
