import { writeFileSync } from 'node:fs';
import { applyAction,createGame,observe,seededRandom } from '../src/engine/game';
import { chooseAction,enumerateCandidates,rankAttacks } from '../src/ai/inference';
import type { Difficulty,Rules } from '../src/engine/types';
const scenarios:{name:string;rules:Partial<Rules>;levels:[Difficulty,Difficulty];randomGap?:boolean}[]=[
 {name:'default-hard',rules:{},levels:['hard','hard']}, {name:'no-initial-reveal',rules:{initialReveal:[]},levels:['hard','hard']},
 {name:'two-questions',rules:{questions:2},levels:['hard','hard']}, {name:'easy-v-hard',rules:{},levels:['easy','hard']},
 {name:'random-gap-v-hard',rules:{},levels:['hard','hard'],randomGap:true}
];
const results=scenarios.map(scenario=>{let wins=0,turns=0,steps=0,questions=0,numbers=0,gaps=0,gapSuccess=0,numberSuccess=0,chainEvents=0,chainTiles=0,maxSteps=0,lowConfidence=0,attacks=0;
 for(let seed=1;seed<=100;seed++){let s=createGame(seed,scenario.rules),count=0;const random=seededRandom(10000+seed);
  while(s.phase!=='over'&&count<400){const o=observe(s,s.active);let action=chooseAction(o,scenario.levels[s.active],random);const candidates=enumerateCandidates(o),ranked=rankAttacks(o,candidates);
   if(scenario.randomGap&&s.active===0&&s.phase!=='penalty'){const gapOptions=ranked.filter(a=>a.action.type==='gap');if(gapOptions.length)action=gapOptions[Math.floor(random()*gapOptions.length)].action;}
   if(action.type==='number'||action.type==='gap'){attacks++;if((ranked.find(a=>JSON.stringify(a.action)===JSON.stringify(action))?.probability??0)<.5)lowConfidence++;}
   s=applyAction(s,s.active,action);const e=s.history.at(-1)!;
   if(e.type==='question')questions++;if(e.type==='number'){numbers++;if(e.success)numberSuccess++;}if(e.type==='gap'){gaps++;if(e.success)gapSuccess++;}if(e.reveals.length>1){chainEvents++;chainTiles+=e.reveals.length;}count++;
  }
  if(s.phase!=='over')throw new Error(`Unfinished ${scenario.name} ${seed}`);if(s.result?.winner===0)wins++;turns+=s.turn;steps+=count;maxSteps=Math.max(maxSteps,count);
 }
 return {scenario:scenario.name,games:100,firstPlayerWinPercent:wins,averageTurns:turns/100,averageActions:steps/100,maxActions:maxSteps,questionsPerGame:questions/100,numberAttacksPerGame:numbers/100,gapAttacksPerGame:gaps/100,numberSuccessRate:numbers?numberSuccess/numbers:0,gapSuccessRate:gaps?gapSuccess/gaps:0,chainEventsPerGame:chainEvents/100,chainTiles,lowConfidenceAttackRate:attacks?lowConfidence/attacks:0};});
writeFileSync('balance-results.json',JSON.stringify({seedRange:[1,100],results},null,2));console.log(JSON.stringify(results,null,2));
