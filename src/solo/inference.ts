import {matches,describe} from './conditions';
import type {PublicState} from './types';

export function candidates(p:PublicState):number[][] {
 const {stage:s}=p,result:number[][]=[];
 const pool=Array.from({length:s.max-s.min+1},(_,i)=>i+s.min).filter(n=>!s.excluded.includes(n));
 function visit(board:number[],start:number){
  if(board.length===s.count){
   if(s.clues.every(c=>matches(board,c))&&s.initialOpen.every(t=>board[t.tile]===t.value)&&p.connections.every(e=>board[e.b]-board[e.a]===e.delta)&&p.answers.every(a=>{const q=s.questions.find(q=>q.id===a.id);return q&&matches(board,q.condition)===a.answer;}))result.push(board);
   return;
  }
  const tile=board.length;
  for(let i=start;i<=pool.length-(s.count-tile);i++){const n=pool[i];if((p.opened[tile]===null||p.opened[tile]===n)&&!p.failed.some(f=>f.tile===tile&&f.value===n))visit([...board,n],i+1);}
 }
 visit([],0);return result;
}
export function recommend(p:PublicState){
 const boards=candidates(p);
 return p.stage.questions.filter(q=>!p.answers.some(a=>a.id===q.id)).map(q=>{const yes=boards.filter(b=>matches(b,q.condition)).length;return {q,score:Math.min(yes,boards.length-yes)};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)[0]?.q;
}
export function hint(p:PublicState,level:number):string {
 if(level<=1)return p.stage.focus;
 const q=recommend(p);
 if(q)return level===2?`살펴볼 질문: “${describe(q.condition)}?”`:`“${describe(q.condition)}?”에 예인 경우와 아니오인 경우를 나눠 보세요. 어느 답이든 아직 가능한 배열 일부를 제외할 수 있습니다.`;
 const boards=candidates(p),i=p.opened.findIndex((v,i)=>v===null&&boards.length>0&&boards.every(b=>b[i]===boards[0][i]));
 return i>=0?`${i+1}번은 지금까지의 단서로 ${boards[0][i]} 하나만 가능합니다. 직접 입력하면 확보한 연결을 따라 열립니다.`:'이미 확인한 질문과 제외 숫자를 함께 살펴보세요.';
}
