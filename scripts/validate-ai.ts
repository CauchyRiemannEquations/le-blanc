import { writeFileSync } from 'node:fs';
import { applyAction,createGame,observe,seededRandom } from '../src/engine/game';
import { chooseAction as before } from '../tests/fixtures/ai-v1';
import { chooseAction as after } from '../src/ai/inference';
const heldOut=[];
for(const [version,choose] of [['before',before],['after',after]] as const){let gaps=0,chains=0,turns=0;
 for(let seed=1001;seed<=1100;seed++){let state=createGame(seed),steps=0;const random=seededRandom(seed+10000);while(state.phase!=='over'&&steps++<400){state=applyAction(state,state.active,choose(observe(state,state.active),'hard',random));const e=state.history.at(-1)!;if(e.type==='gap')gaps++;if(e.reveals.length>1&&e.type!=='penalty')chains++;}if(state.phase!=='over')throw new Error('Held-out game stuck');turns+=state.turn;}
 heldOut.push({version,games:100,seedRange:[1001,1100],gapsPerGame:gaps/100,attackChainsPerGame:chains/100,turnsPerGame:turns/100});
}
let newWins=0,newFirstWins=0,newSecondWins=0;const matches=[];
for(let seed=1;seed<=100;seed++){const newPlayer=seed%2;let state=createGame(seed),steps=0;const random=seededRandom(seed+20000);while(state.phase!=='over'&&steps++<400){const choose=state.active===newPlayer?after:before;state=applyAction(state,state.active,choose(observe(state,state.active),'hard',random));}if(state.phase!=='over')throw new Error('Head-to-head game stuck');const won=state.result!.winner===newPlayer;if(won){newWins++;if(newPlayer===0)newFirstWins++;else newSecondWins++;}matches.push({seed,newPlayer,winner:state.result!.winner});}
const result={heldOut,headToHead:{games:100,newWins,newFirstWins,outOfFirst:50,newSecondWins,outOfSecond:50,matches}};
writeFileSync('ai-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,headToHead:{...result.headToHead,matches:undefined}},null,2));
