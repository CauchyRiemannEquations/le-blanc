import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { applyAction,createGame,observe,seededRandom,DEFAULT_RULES } from '../src/engine/game';
import { chooseAction as previous } from '../tests/fixtures/ai-v1';
import { chooseAction as current } from '../src/ai/inference';
import type { Difficulty } from '../src/engine/types';
const runs=[];
interface Match { seed:number;winner:number;turns:number;actions:number;questions:number;gaps:number;successfulGaps:number;setups:number;chains:number;penaltyChains:number;chainTiles:number;numberAttacks:number;numberSuccesses:number;decisionMs:number }
for(const difficulty of ['medium','hard'] as Difficulty[])for(const version of ['before','after'] as const){
 const choose=version==='before'?previous:current,rows:Match[]=[];
 for(let seed=1;seed<=100;seed++){
  let game=createGame(seed),actions=0,questions=0,gaps=0,successfulGaps=0,setups=0,chains=0,penaltyChains=0,chainTiles=0,numberAttacks=0,numberSuccesses=0,decisionMs=0;
  const random=seededRandom(10000+seed);
  while(game.phase!=='over'&&actions<400){const start=performance.now();const action=choose(observe(game,game.active),difficulty,random);decisionMs+=performance.now()-start;game=applyAction(game,game.active,action);const e=game.history.at(-1)!;actions++;
   if(e.type==='question')questions++;if(e.type==='number'){numberAttacks++;if(e.success)numberSuccesses++;}if(e.type==='gap'){gaps++;if(e.success){successfulGaps++;if(!e.reveals.length)setups++;}}
   if(e.reveals.length>1){if(e.type==='penalty')penaltyChains++;else chains++;chainTiles+=e.reveals.length;}
  }
  if(game.phase!=='over')throw new Error(`Unfinished ${version} ${difficulty} ${seed}`);
  rows.push({seed,winner:game.result!.winner,turns:game.turn,actions,questions,gaps,successfulGaps,setups,chains,penaltyChains,chainTiles,numberAttacks,numberSuccesses,decisionMs});
 }
 const sum=(key:Exclude<keyof typeof rows[number],'seed'|'winner'>)=>rows.reduce((n,r)=>n+r[key],0);
 runs.push({version,difficulty,games:100,summary:{firstPlayerWins:rows.filter(r=>r.winner===0).length,turnsPerGame:sum('turns')/100,actionsPerGame:sum('actions')/100,questionsPerGame:sum('questions')/100,gapsPerGame:sum('gaps')/100,gapSuccessRate:sum('successfulGaps')/sum('gaps'),setupsPerGame:sum('setups')/100,attackChainsPerGame:sum('chains')/100,penaltyChainsPerGame:sum('penaltyChains')/100,allChainsPerGame:(sum('chains')+sum('penaltyChains'))/100,gamesWithAttackChain:rows.filter(r=>r.chains>0).length,numberSuccessRate:sum('numberSuccesses')/sum('numberAttacks'),averageDecisionMs:sum('decisionMs')/sum('actions'),maxActions:Math.max(...rows.map(r=>r.actions))},rows});
}
const report={baselineCommit:'636d9881275d96661351eb1bf040568e2e40de2f',rules:DEFAULT_RULES,seedRange:[1,100],decisionSeed:'10000 + deal seed',firstPlayer:0,runs};
writeFileSync('ai-comparison.json',JSON.stringify(report,null,2));console.log(JSON.stringify(runs.map(({version,difficulty,summary})=>({version,difficulty,...summary})),null,2));
