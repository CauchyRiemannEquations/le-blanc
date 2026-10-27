import { writeFileSync } from 'node:fs';
import { applyAction,createGame,observe,seededRandom } from '../src/engine/game';
import { chooseAction,enumerateCandidates } from '../src/ai/inference';
import { normalizeQuestion } from '../src/engine/questions';

const results=[];
for(const level of ['medium','hard'] as const){
 let firstWins=0,turns=0,gaps=0,links=0,attackChains=0,penaltyChains=0,questions=0,maxActions=0;
 const kinds:Record<string,number>={},games=[];
 for(let seed=1;seed<=100;seed++){
  let s=createGame(seed),steps=0;const random=seededRandom(10000+seed);
  while(s.phase!=='over'&&steps<400){
   const o=observe(s,s.active),truth=s.players[1-s.active].tiles.map(t=>t.value);
   if(!enumerateCandidates(o).some(row=>row.every((v,i)=>v===truth[i])))throw new Error(`Truth excluded: ${seed}`);
   const action=chooseAction(o,level,random);s=applyAction(s,s.active,action);const e=s.history.at(-1)!;
   if(action.type==='question'){questions++;const kind=normalizeQuestion(action).kind;kinds[kind]=(kinds[kind]??0)+1;}
   if(e.type==='gap'){gaps++;if(e.success&&e.reveals.length===0)links++;}
   if(e.reveals.length>1){if(e.type==='penalty')penaltyChains++;else attackChains++;}
   steps++;
  }
  if(s.phase!=='over')throw new Error(`Unfinished ${level} ${seed}`);
  firstWins+=Number(s.result!.winner===0);turns+=s.turn;maxActions=Math.max(maxActions,steps);games.push({seed,winner:s.result!.winner,turns:s.turn,actions:steps});
 }
 const row={level,completed:100,firstWins,averageTurns:turns/100,gapsPerGame:gaps/100,hiddenLinksPerGame:links/100,attackChainsPerGame:attackChains/100,penaltyChainsPerGame:penaltyChains/100,questionsPerGame:questions/100,questionKinds:kinds,maxActions,games};
 results.push(row);console.log(JSON.stringify({...row,games:undefined}));
}
writeFileSync('question-balance.json',JSON.stringify({rules:'Expanded private questions, uniform random hidden-tile penalty',seedRange:[1,100],actionSeed:'10000 + seed',firstPlayer:0,results},null,2));
