import type { QuestionKind, QuestionSpec, Rules } from './types';

export function gcd(a:number,b:number):number { while(b) [a,b]=[b,a%b]; return Math.abs(a); }
export function normalizeQuestion(input:QuestionKind|QuestionSpec):QuestionSpec {
 const q=typeof input==='string'?{kind:input}:input;
 if(q.kind==='near')return {kind:'distance',parameter:3,negate:q.negate===true};
 if(q.kind==='sum3')return {kind:'sumMultiple',parameter:3,negate:q.negate===true};
 return {kind:q.kind,...(q.parameter!==undefined?{parameter:q.parameter}:{}),negate:q.negate===true};
}
/** Complementary wording asks the same fact, so it shares a repeat key. */
export function questionKey(q:QuestionKind|QuestionSpec):string {const n=normalizeQuestion(q);return `${n.kind}:${n.parameter??''}`;}
export function validQuestion(q:QuestionSpec,rules:Rules):boolean {
 if(q.negate!==undefined&&typeof q.negate!=='boolean')return false;
 if((q.kind==='near'||q.kind==='sum3')&&q.parameter!==undefined)return false;
 const n=normalizeQuestion(q),p=n.parameter;
 if(n.kind==='coprime'||n.kind==='multiple')return p===undefined;
 if(!Number.isInteger(p))return false;
 if(n.kind==='distance')return p!>=1&&p!<rules.max-rules.min;
 if(n.kind==='sumMultiple')return p!>=2&&p!<=Math.min(10,rules.max);
 if(n.kind==='ratio')return p!>=2&&p!<=Math.min(5,Math.floor(rules.max/rules.min));
 return false;
}
export function answerQuestion(input:QuestionKind|QuestionSpec,a:number,b:number):boolean {
 const q=normalizeQuestion(input);let yes:boolean;
 switch(q.kind){
  case 'distance':yes=Math.abs(a-b)<=q.parameter!;break;
  case 'sumMultiple':yes=(a+b)%q.parameter! === 0;break;
  case 'coprime':yes=gcd(a,b)===1;break;
  case 'multiple':yes=Math.max(a,b)%Math.min(a,b)===0;break;
  case 'ratio':yes=Math.max(a,b)===Math.min(a,b)*q.parameter!;break;
  default:throw new Error('지원하지 않는 질문입니다.');
 }
 return q.negate?!yes:yes;
}
export function questionLabel(input:QuestionKind|QuestionSpec):string {
 const q=normalizeQuestion(input);
 switch(q.kind){
  case 'distance':return `두 숫자의 차이가 ${q.negate?q.parameter!+1:q.parameter} ${q.negate?'이상':'이하'}인가?`;
  case 'sumMultiple':return `두 숫자의 합은 ${q.parameter}의 배수${q.negate?'가 아닌가':'인가'}?`;
  case 'coprime':return q.negate?'두 숫자에 1보다 큰 공약수가 있는가?':'두 숫자는 서로소인가?';
  case 'multiple':return `큰 숫자는 작은 숫자의 배수${q.negate?'가 아닌가':'인가'}?`;
  case 'ratio':return `큰 숫자는 작은 숫자의 ${q.parameter}배${q.negate?'가 아닌가':'인가'}?`;
  default:throw new Error('지원하지 않는 질문입니다.');
 }
}
/** AI uses the same three question families offered by the current menu. Legacy predicates remain readable for saved records. */
export function questionOptions(rules:Rules):QuestionSpec[] {
 const options:QuestionSpec[]=[{kind:'near'},{kind:'sum3'},{kind:'coprime'}];
 for(let parameter=1;parameter<rules.max-rules.min;parameter++)if(parameter!==3)options.push({kind:'distance',parameter});
 for(let parameter=2;parameter<=Math.min(10,rules.max);parameter++)if(parameter!==3)options.push({kind:'sumMultiple',parameter});
 return options.filter(q=>validQuestion(q,rules));
}
