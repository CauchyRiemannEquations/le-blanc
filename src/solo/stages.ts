import type {Stage,Strategy,SoloAction} from './types';
const done:Strategy={done:true};
const ask=(question:string,yes:Strategy=done,no:Strategy=done):Strategy=>({question,yes,no});
const common={version:1,rulesVersion:2,min:1,initialOpen:[]};
const link=(a:number,value:number):SoloAction=>({type:'gap',a,b:a+1,value});
const guess=(tile:number,value:number):SoloAction=>({type:'guess',tile,value});
const question=(id:string):SoloAction=>({type:'question',id});
export const STAGES:Stage[]=[
 {...common,id:'intro-evidence-v2',section:'tutorial',title:'남겨진 세 장',subtitle:'튜토리얼 · 단서와 해독',max:6,count:3,
  answer:[2,4,5],excluded:[1,3,6],clues:[{kind:'gap',pair:[0,1],value:2}],questions:[],parQuestions:0,strategy:done,
  focus:'제외 숫자를 빼면 세 숫자만 남습니다. 작은 숫자부터 놓아 보세요.',
  proof:[{clues:[0],conclusions:[{kind:'value',tile:0,value:2},{kind:'value',tile:1,value:4},{kind:'value',tile:2,value:5}],reason:'1·3·6을 제외하면 2·4·5만 남고, 오름차순이므로 위치도 정해진다.'}],
  walkthrough:{actions:[guess(0,2),guess(2,5)],explanation:'1·3·6을 제외하면 2·4·5만 남습니다. 2를 해독하면 확보된 간격 2를 따라 4도 열립니다. 연결되지 않은 5는 직접 해독합니다.'}},
 {...common,id:'intro-relations-v2',section:'tutorial',title:'아니오 다음에',subtitle:'튜토리얼 · 질문과 연결',max:10,count:3,
  answer:[2,5,8],excluded:[1,4,6,9,10],initialOpen:[{tile:1,value:5}],clues:[{kind:'equal',left:[0,1],right:[1,2]}],
  questions:[{id:'left-two',condition:{kind:'gap',pair:[0,1],value:2}},{id:'outer-six',condition:{kind:'gap',pair:[0,2],value:6}}],parQuestions:1,strategy:ask('left-two'),
  focus:'가운데 5에서 양쪽 간격이 같습니다. 남은 양 끝의 조합을 보세요.',
  proof:[{clues:[0],answers:[{id:'left-two',answer:false}],conclusions:[{kind:'gap',pair:[0,1],value:3},{kind:'gap',pair:[1,2],value:3}],reason:'대칭인 배열은 2·5·8과 3·5·7이다. 왼쪽 간격이 2가 아니면 양쪽 모두 3이다.'}],
  walkthrough:{actions:[question('left-two'),link(0,3),link(1,3)],explanation:'같은 간격으로 5를 둘러싼 조합은 2·5·8과 3·5·7입니다. 간격 2가 아니라면 3. 알아낸 간격을 직접 입력하면 공개된 5에서 양쪽으로 해독됩니다. 다시 질문할 필요는 없습니다.'}},
 {...common,id:'main-anchor-v2',section:'main',title:'숨은 기준점',subtitle:'본게임 A',max:20,count:5,
  answer:[3,7,10,14,17],excluded:[2,5,8,11,16],
  clues:[{kind:'bound',tile:0,min:2,max:5},{kind:'gap',pair:[0,4],value:14},{kind:'equal',left:[0,1],right:[2,3]},{kind:'equal',left:[1,2],right:[3,4]},{kind:'greater',left:[0,1],right:[1,2]}],
  questions:[{id:'first-four',condition:{kind:'gap',pair:[0,1],value:4}},{id:'second-three',condition:{kind:'gap',pair:[1,2],value:3}},{id:'half-seven',condition:{kind:'gap',pair:[0,2],value:7}}],parQuestions:0,strategy:done,
  focus:'반복되는 두 간격과 양끝의 간격을 함께 보세요.',
  proof:[
   {clues:[0,1,2,3],conclusions:[{kind:'gap',pair:[0,2],value:7},{kind:'bound',tile:0,min:3,max:4}],reason:'두 간격을 a·b라 두면 전체는 a+b+a+b=14. 따라서 1–3번은 7이며, 1번 범위에서 2·5를 제외하면 3 또는 4다.'},
   {clues:[0,1,2,3],conclusions:[{kind:'value',tile:0,value:3},{kind:'value',tile:2,value:10},{kind:'value',tile:4,value:17}],reason:'1번이 4라면 3번은 제외 숫자 11이다. 따라서 1번은 3, 3번은 10, 5번은 17이다.'},
   {clues:[0,1,2,3,4],conclusions:[{kind:'gap',pair:[0,1],value:4},{kind:'gap',pair:[1,2],value:3},{kind:'value',tile:1,value:7},{kind:'value',tile:3,value:14}],reason:'a+b=7이며 a>b이므로 a는 4·5·6. a=5면 2번이 제외 숫자 8, a=6이면 4번이 제외 숫자 16이다. 그러므로 a=4, b=3이다.'}],
  walkthrough:{actions:[link(0,4),link(1,3),link(2,4),link(3,3),guess(2,10)],explanation:'두 간격이 번갈아 반복되어 1–3번과 3–5번은 각각 7입니다. 1번은 3 또는 4지만, 4라면 3번이 제외 숫자 11이 됩니다. 기준은 3·10·17. 첫 간격은 4·5·6 중 하나인데 5는 제외 숫자 8을, 6은 제외 숫자 16을 만듭니다. 따라서 간격은 4·3·4·3입니다.'}},
 {...common,id:'main-question-v2',section:'main',title:'물어야 할 곳',subtitle:'본게임 B',max:20,count:5,
  answer:[3,7,11,15,18],excluded:[1,4,6,10,13,16,20],
  clues:[{kind:'bound',tile:0,min:2,max:4},{kind:'bound',tile:4,min:17,max:19},{kind:'equal',left:[0,1],right:[1,2]},{kind:'gap',pair:[3,4],value:3},{kind:'gapRange',pair:[2,3],min:2,max:5}],
  questions:[{id:'left-repeat',condition:{kind:'equal',left:[0,1],right:[1,2]}},{id:'bridge-like-end',condition:{kind:'equal',left:[2,3],right:[3,4]}},{id:'first-five',condition:{kind:'gap',pair:[0,1],value:5}},{id:'end-three',condition:{kind:'gap',pair:[3,4],value:3}},{id:'bridge-four',condition:{kind:'gap',pair:[2,3],value:4}}],
  parQuestions:2,strategy:ask('first-five',ask('bridge-like-end'),ask('bridge-like-end')),
  focus:'왼쪽 세 장의 같은 간격과 오른쪽 두 장의 간격을 따로 좁혀 보세요.',
  proof:[
   {clues:[0,1,2,3,4],conclusions:[{kind:'value',tile:1,value:7},{kind:'bound',tile:0,min:2,max:3},{kind:'bound',tile:2,min:11,max:12},{kind:'bound',tile:3,min:14,max:15},{kind:'bound',tile:4,min:17,max:18}],reason:'오른쪽은 14·17 또는 15·18(19의 짝인 16은 제외). 다리 간격 2~5와 제외 숫자를 적용하면 3번은 9·11·12 중 하나다. 9에서 같은 간격으로 거슬러 가면 첫 숫자 2에서는 정수가 안 되고, 3에서는 가운데 6이 제외된다. 남는 왼쪽은 2·7·12 또는 3·7·11이다.'},
   ...[true,false].map(answer=>({clues:[0,1,2,3,4],answers:[{id:'first-five',answer}],conclusions:[{kind:'value' as const,tile:0,value:answer?2:3},{kind:'value' as const,tile:2,value:answer?12:11}],reason:answer?'첫 간격이 5이면 왼쪽은 2·7·12다.':'첫 간격이 5가 아니면 왼쪽은 3·7·11이고 간격은 4다.'})),
  ],
  walkthrough:{actions:[question('first-five'),question('bridge-like-end'),link(0,4),link(1,4),link(2,4),guess(2,11)],explanation:'오른쪽은 14·17 또는 15·18, 왼쪽은 2·7·12 또는 3·7·11로 좁혀집니다. 같은 간격인지 다시 묻는 질문은 새 정보를 주지 않습니다. 첫 간격 5에 아니오 → 왼쪽은 3·7·11. 다리 간격이 오른쪽의 3과 같은지에도 아니오 → 4번은 14가 아닌 15, 마지막은 18입니다.'}},
 {...common,id:'main-branches-v2',section:'main',title:'갈라지는 답',subtitle:'본게임 C',max:20,count:5,
  answer:[3,6,11,14,17],excluded:[1,4,7,12,16,20],
  clues:[{kind:'bound',tile:0,min:2,max:4},{kind:'gap',pair:[0,4],value:14},{kind:'equal',left:[0,1],right:[3,4]},{kind:'gapRange',pair:[0,1],min:2,max:4},{kind:'greater',left:[1,2],right:[2,3]},{kind:'gapRange',pair:[2,3],min:1,max:3}],
  questions:[{id:'outer-match',condition:{kind:'equal',left:[0,1],right:[3,4]}},{id:'left-eight',condition:{kind:'gap',pair:[1,2],value:8}},{id:'outer-two',condition:{kind:'gap',pair:[0,1],value:2}},{id:'right-three',condition:{kind:'gap',pair:[2,3],value:3}},{id:'inner-order',condition:{kind:'greater',left:[1,2],right:[2,3]}}],
  parQuestions:2,strategy:ask('outer-two',ask('left-eight'),ask('right-three')),
  focus:'양끝을 먼저 좁힌 뒤, 바깥 간격에 따라 가운데 자리가 어떻게 바뀌는지 보세요.',
  proof:[
   {clues:[0,1,2,3,4,5],conclusions:[{kind:'value',tile:0,value:3},{kind:'value',tile:4,value:17},{kind:'gapRange',pair:[0,1],min:2,max:3}],reason:'1번은 2 또는 3이다. 2면 끝이 제외 숫자 16이므로 양끝은 3·17. 바깥 간격 4는 2번에 제외 숫자 7을 만들므로 2 또는 3이다.'},
   {clues:[0,1,2,3,4,5],answers:[{id:'outer-two',answer:true}],conclusions:[{kind:'value',tile:1,value:5},{kind:'value',tile:3,value:15},{kind:'bound',tile:2,min:13,max:14}],reason:'바깥 간격이 2이면 2·4번은 5·15. 오른쪽 안 간격 1~3에서 3번은 12·13·14지만 12는 제외. 남은 13·14는 왼쪽 안 간격 8·9로 구별한다. 오른쪽 안 간격 3은 둘 다 아니므로 쓸모없다.'},
   {clues:[0,1,2,3,4,5],answers:[{id:'outer-two',answer:false}],conclusions:[{kind:'value',tile:1,value:6},{kind:'value',tile:3,value:14},{kind:'bound',tile:2,min:11,max:13}],reason:'바깥 간격이 2가 아니면 3이므로 2·4번은 6·14. 3번은 11·12·13에서 12를 제외한 11·13. 오른쪽 안 간격 3·1로 구별한다. 왼쪽 안 간격 8은 둘 다 아니므로 쓸모없다.'}],
  walkthrough:{actions:[question('outer-two'),question('right-three'),link(0,3),link(1,5),link(3,3),guess(2,11)],explanation:'1번이 2면 끝이 제외 숫자 16이므로 양끝은 3·17. 바깥 간격은 2 또는 3입니다. 간격 2에 아니오를 받아 2·4번이 6·14가 되었습니다. 이제 가운데는 11 또는 13. 오른쪽 안 간격 3에 예 → 가운데 11입니다. 반대로 첫 답이 예라면 가운데는 13·14여서 왼쪽 안 간격 8을 묻는 편이 유용합니다.'}},
];
export const getStage=(id:string)=>STAGES.find(s=>s.id===id);
