import { writeFileSync } from 'node:fs';
import { applyAction,createGame,observe,seededRandom } from '../src/engine/game';
import { chooseAction } from '../src/ai/inference';
const results=[];
for(const level of ['medium','hard'] as const)for(const limit of [4,null]){
 let questions=0,gaps=0,chains=0,turns=0,maxActions=0,firstWins=0;const games=[];
 for(let seed=1;seed<=100;seed++){
  let s=createGame(seed,{questions:limit}),steps=0;const random=seededRandom(10000+seed);
  while(s.phase!=='over'&&steps++<300){s=applyAction(s,s.active,chooseAction(observe(s,s.active),level,random));const e=s.history.at(-1)!;if(e.type==='question')questions++;if(e.type==='gap')gaps++;if(e.type!=='penalty'&&e.reveals.length>1)chains++;}
  if(s.phase!=='over')throw new Error(`Unfinished ${level} ${limit} ${seed}`);
  turns+=s.turn;firstWins+=Number(s.result!.winner===0);maxActions=Math.max(maxActions,steps);games.push({seed,winner:s.result!.winner,turns:s.turn,actions:steps});
 }
 const row={level,limit,completed:100,firstWins,averageTurns:turns/100,questionsPerGame:questions/100,gapAttacksPerGame:gaps/100,attackChainsPerGame:chains/100,maxActions,games};results.push(row);console.log(JSON.stringify({...row,games:undefined}));
}
writeFileSync('unlimited-balance.json',JSON.stringify({seedRange:[1,100],actionSeed:'10000 + seed',firstPlayer:0,results},null,2));
