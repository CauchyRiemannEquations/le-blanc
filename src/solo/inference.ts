import {matches,describe} from './conditions';
import type {PublicState} from './types';

export function candidates(p:PublicState):number[][] {
 const {stage:s}=p,result:number[][]=[];
 const pool=Array.from({length:s.max-s.min+1},(_,i)=>i+s.min).filter(n=>!s.excluded.includes(n));
 function visit(board:number[],start:number){
  if(board.length===s.count){
   if(s.clues.every(c=>matches(board,c))&&p.failedGaps.every(f=>board[f.b]-board[f.a]!==f.value)&&s.initialOpen.every(t=>board[t.tile]===t.value)&&p.connections.every(e=>board[e.b]-board[e.a]===e.delta)&&p.answers.every(a=>{const q=s.questions.find(q=>q.id===a.id);return q&&matches(board,q.condition)===a.answer;}))result.push(board);
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
const values=(boards:number[][],tile:number)=>[...new Set(boards.map(b=>b[tile]))].sort((a,b)=>a-b).join(' 또는 ');
/** All branches depend on visible evidence, never on the judge's answer or walkthrough. */
export function hint(p:PublicState,level:number):string {
 const boards=candidates(p);if(!boards.length)return '기록한 질문과 공개된 단서를 다시 확인하세요.';
 if(p.opened.every(v=>v!==null))return '암호가 모두 열렸습니다.';
 const fresh=p.connections.every(e=>p.stage.clues.some(c=>c.kind==='gap'&&c.pair[0]===e.a&&c.pair[1]===e.b&&c.value===e.delta))&&!p.answers.length&&!p.failed.length&&!p.failedGaps.length&&p.opened.every((v,i)=>v===null||p.stage.initialOpen.some(t=>t.tile===i&&t.value===v));
 if(level===1&&fresh)return p.stage.focus;
 const q=recommend(p);
 if(q){
  let reason='두 답이 남은 가능성을 서로 다르게 나눕니다.';
  if(p.stage.id==='intro-relations-v2')reason='가운데 5와 같은 양쪽 간격에 맞는 조합은 2·5·8 또는 3·5·7입니다. 간격 2에 아니오여도 간격 3을 알아낼 수 있습니다.';
  if(p.stage.id==='main-question-v2'){
   reason=q.id==='first-five'?'왼쪽은 2·7·12 또는 3·7·11입니다. 같은 간격인지 다시 묻는 답은 이미 단서에 있지만, 첫 간격 5에 대한 답은 두 조합을 구별합니다.':`왼쪽의 같은 간격과 제외 숫자를 적용한 뒤, 3번에는 ${values(boards,2)}, 4번에는 ${values(boards,3)}이 남습니다. 다리 간격이 끝의 3과 같은지 비교하면 남은 조합을 구별할 수 있습니다.`;
  }
  if(p.stage.id==='main-branches-v2'){
   reason=q.id==='outer-two'?'1번 2는 마지막에 제외 숫자 16을 만듭니다. 양끝은 3·17이고, 바깥 간격 4는 제외 숫자 7을 만듭니다. 이제 바깥 간격 2와 3이 만드는 안쪽 자리를 구별하세요.':q.id==='left-eight'?'바깥 간격 2를 확인하면 2·4번은 5·15입니다. 가운데는 제외 숫자 12를 뺀 13·14. 왼쪽 안 간격은 8·9로 달라집니다. 오른쪽 안 간격 3은 둘 다 아니어서 도움이 안 됩니다.':'바깥 간격 2를 제외하면 2·4번은 6·14입니다. 가운데는 11·13. 오른쪽 안 간격은 3·1로 달라집니다. 왼쪽 안 간격 8은 둘 다 아니어서 도움이 안 됩니다.';
   // If an alternate question or a guessed reveal changed the path, explain only the live possibilities.
   if(q.id!=='outer-two'&&!p.answers.some(a=>a.id==='outer-two'))reason=`현재 3번에는 ${values(boards,2)}이 남습니다. “${describe(q.condition)}”의 답이 달라지는 쪽을 확인하세요.`;
  }
  return level<=2?reason:`${reason} 다음 질문으로 “${describe(q.condition)}?”를 살펴보세요.`;
 }
 if(p.stage.id==='main-anchor-v2'&&p.opened[0]===null){
  if(level<=2)return '반복되는 두 간격을 합하면 전체 14의 절반인 7입니다. 1번은 3 또는 4. 1번에 4를 놓으면 3번에 어떤 제외 숫자가 오는지 보세요.';
  if(boards.every(b=>b[0]===3))return '1–3번과 3–5번 간격은 각각 7. 1번이 4라면 3번이 제외 숫자 11이므로 1번은 3입니다. 기준을 입력하거나, 나머지 간격을 먼저 연결할 수 있습니다.';
 }
 const edge=Array.from({length:p.stage.count-1},(_,a)=>a).find(a=>!p.connections.some(e=>e.a===a&&e.b===a+1)&&(p.opened[a]===null||p.opened[a+1]===null)&&boards.every(b=>b[a+1]-b[a]===boards[0][a+1]-boards[0][a]));
 if(edge!==undefined){
  if(level<=1)return `${edge+1}–${edge+2}번 사이에는 아직 연결이 없습니다. 확인한 답과 단서를 함께 읽어 보세요.`;
  const a=boards[0][edge],b=boards[0][edge+1];
  if(p.stage.id==='main-anchor-v2')return '첫 간격과 둘째 간격의 합은 7이고 첫 간격이 더 큽니다. 첫 간격 5는 제외 숫자 8을, 6은 제외 숫자 16을 만듭니다. 따라서 간격은 4·3·4·3입니다. 아직 없는 연결을 직접 입력하세요.';
  return `${edge+1}번은 ${a}, ${edge+2}번은 ${b}로 좁혀졌으므로 간격은 ${b}−${a}=${b-a}입니다. 질문으로 재확인하지 않고 간격을 입력할 수 있습니다.`;
 }
 const i=p.opened.findIndex((v,i)=>v===null&&boards.every(b=>b[i]===boards[0][i]));
 if(i>=0)return level<=1?'연결된 타일의 기준 숫자를 직접 해독하세요.':`${i+1}번은 ${boards[0][i]}로 확정됩니다. 확인한 관계와 제외 숫자에 맞는 값이며, 직접 입력하면 확보한 연결을 따라 열립니다.`;
 return '확인한 질문과 제외 숫자를 함께 살펴보세요.';
}
