import type {Condition,Pair,PublicStage} from './types';

export const gap=(board:readonly number[],[a,b]:Pair)=>board[b]-board[a];
/** Shared by the judge, enumeration and proof checker; never parses display text. */
export function matches(board:readonly number[],condition:Condition):boolean {
 switch(condition.kind){
  case 'value':return board[condition.tile]===condition.value;
  case 'bound':return board[condition.tile]>=condition.min&&board[condition.tile]<=condition.max;
  case 'gap':return gap(board,condition.pair)===condition.value;
  case 'gapRange':return gap(board,condition.pair)>=condition.min&&gap(board,condition.pair)<=condition.max;
  case 'equal':return gap(board,condition.left)===gap(board,condition.right);
  case 'greater':return gap(board,condition.left)>gap(board,condition.right);
 }
}
const interval=([a,b]:Pair)=>`${a+1}–${b+1}번`;
export function describe(c:Condition):string {
 switch(c.kind){
  case 'value':return `${c.tile+1}번은 ${c.value}`;
  case 'bound':return c.min===c.max?`${c.tile+1}번은 ${c.min}`:`${c.tile+1}번은 ${c.min} 이상 ${c.max} 이하`;
  case 'gap':return `${interval(c.pair)} 간격은 ${c.value}`;
  case 'gapRange':return `${interval(c.pair)} 간격은 ${c.min} 이상 ${c.max} 이하`;
  case 'equal':return `${interval(c.left)}과 ${interval(c.right)} 간격이 같다`;
  case 'greater':return `${interval(c.left)} 간격이 ${interval(c.right)}보다 크다`;
 }
}
export function targets(c:Condition):number[]{return [...new Set('tile' in c?[c.tile]:'pair' in c?c.pair:[...c.left,...c.right])].sort((a,b)=>a-b);}
export function publicStage(s:PublicStage):PublicStage {
 // Explicit allow-list: no answer, reference walkthrough or strategy tree escapes.
 return structuredClone({id:s.id,version:s.version,rulesVersion:s.rulesVersion,title:s.title,subtitle:s.subtitle,min:s.min,max:s.max,count:s.count,excluded:s.excluded,initialOpen:s.initialOpen,clues:s.clues,questions:s.questions,parQuestions:s.parQuestions,focus:s.focus});
}
