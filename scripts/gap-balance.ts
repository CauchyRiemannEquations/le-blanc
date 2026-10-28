import {writeFileSync} from 'node:fs';
import {applyAction,canTargetPair,createGame,observe,seededRandom} from '../src/engine/game';
import {chooseAction} from '../src/ai/inference';
import type {Action,AIObservation,Difficulty,PlayerId,Rules} from '../src/engine/types';
function randomGap(o:AIObservation,r:()=>number):Action{
 if(o.phase==='penalty')return {type:'penalty'};
 const gaps:Action[]=[];
 for(let a=0;a<5;a++)for(let b=a+1;b<5;b++)if(canTargetPair(o,a,b,'gap'))for(let value=b-a;value<20;value++)if(!o.failed.some(f=>f.kind==='gap'&&f.a===a&&f.b===b&&f.value===value))gaps.push({type:'gap',a,b,value});
 if(gaps.length)return gaps[Math.floor(r()*gaps.length)];
 const numbers:Action[]=[];for(let a=0;a<5;a++)if(!o.opponent[a].revealed)for(let value=1;value<=20;value++)if(!o.own.some(t=>t.value===value)&&!o.failed.some(f=>f.kind==='number'&&f.a===a&&f.value===value))numbers.push({type:'number',a,value});
 return numbers[Math.floor(r()*numbers.length)];
}
function game(seed:number,first:PlayerId,gapPolicy:Rules['gapPolicy'],level:Difficulty,randomBot=false){
 let s=createGame(seed,{gapPolicy},['A','B'],first),actions=0,questions=0,numbers=0,numberHits=0,gaps=0,gapHits=0,attackChains=0,penaltyChains=0,run=0,longest=0;
 const rng=[seededRandom(seed+10000),seededRandom(seed+20000)],links:{player:number;a:number;b:number;turn:number;used:boolean;wait:number}[]=[];
 while(s.phase!=='over'&&actions<400){const actor=s.active,turn=s.turn,o=observe(s,actor),action=randomBot&&actor===0?randomGap(o,rng[actor]):chooseAction(o,level,rng[actor]);s=applyAction(s,actor,action);actions++;const e=s.history.at(-1)!;
  if(e.type==='question')questions++;
  if(e.type==='number'){numbers++;if(e.success)numberHits++;}
  if(e.type==='gap'){gaps++;if(e.success){gapHits++;links.push({player:1-actor,a:e.a!,b:e.b!,turn,used:false,wait:0});}}
  if((e.type==='number'||e.type==='gap')&&e.success){run++;longest=Math.max(longest,run);if(e.reveals.length>1)attackChains++;}
  if(e.type==='penalty'&&e.reveals.length>1)penaltyChains++;
  for(const reveal of e.reveals)if(reveal.from!==undefined){const link=links.find(l=>l.player===reveal.player&&((l.a===reveal.index&&l.b===reveal.from)||(l.b===reveal.index&&l.a===reveal.from)));if(link&&!link.used){link.used=true;link.wait=turn-link.turn;}}
  if(s.turn!==turn||!e.success)run=0;
 }
 if(s.phase!=='over')throw Error(`Unfinished ${seed}/${first}/${gapPolicy}`);
 return {seed,first,gapPolicy,level,randomBot,actions,turns:s.turn,questions,numbers,numberHits,gaps,gapHits,links:links.length,used:links.filter(l=>l.used).length,wait:links.reduce((n,l)=>n+l.wait,0),attackChains,penaltyChains,longest,firstWin:s.result!.winner===first,botWin:randomBot&&s.result!.winner===0};
}
const rows:ReturnType<typeof game>[]=[],summaries=[];
for(const gapPolicy of ['legacy','continue-once'] as const)for(const kind of ['medium','hard','random-gap'] as const){
 const group:ReturnType<typeof game>[]=[];for(let seed=1;seed<=100;seed++)for(const first of [0,1] as const)group.push(game(seed,first,gapPolicy,kind==='medium'?'medium':'hard',kind==='random-gap'));
 rows.push(...group);const sum=(key:keyof typeof group[number])=>group.reduce((n,r)=>n+Number(r[key]),0),mean=(key:keyof typeof group[number])=>+(sum(key)/group.length).toFixed(3);
 const summary={gapPolicy,kind,games:group.length,turns:mean('turns'),actions:mean('actions'),questions:mean('questions'),numbers:mean('numbers'),numberSuccess:sum('numberHits')/sum('numbers'),gaps:mean('gaps'),gapSuccess:sum('gapHits')/sum('gaps'),linkUtilization:sum('used')/sum('links'),turnsUntilUse:sum('wait')/sum('used'),attackChains:mean('attackChains'),penaltyChains:mean('penaltyChains'),meanMaxStreak:mean('longest'),firstWin:mean('firstWin'),randomBotWin:kind==='random-gap'?mean('botWin'):null};summaries.push(summary);console.log(summary);
}
writeFileSync('gap-balance.json',JSON.stringify({method:'Seeds 1–100, both starting players; independent seeded action RNG per player; only gapPolicy changes.',summaries,rows},null,2));
