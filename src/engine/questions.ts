import type { QuestionKind, QuestionSpec, Rules } from './types';

/** Menu order, wording and defaults are shared by the UI and AI. */
export const QUESTION_CHOICES = [
 {kind:'distance',label:'간격',description:'두 숫자가 얼마나 가까운지 확인'},
 {kind:'sumAtMost',label:'합의 크기',description:'두 숫자의 합이 기준 이하인지 확인'},
 {kind:'sumMultiple',label:'합의 배수',description:'두 숫자의 합이 특정 수의 배수인지 확인'},
 {kind:'containsMultiple',label:'배수 포함',description:'두 숫자 중 특정 수의 배수가 있는지 확인'},
 {kind:'coprime',label:'서로소',description:'두 숫자의 공약수가 1뿐인지 확인'},
] as const;
export type MenuQuestionKind = typeof QUESTION_CHOICES[number]['kind'];
export function questionParameterRange(kind:QuestionKind,rules:Rules):{min:number;max:number}|null {
 switch(kind){
  case 'distance':return {min:1,max:rules.max-rules.min-1};
  // Distinct integers: omit the always-true threshold 2 * max - 1.
  case 'sumAtMost':return {min:2*rules.min+1,max:2*rules.max-2};
  case 'sumMultiple':case 'containsMultiple':return {min:2,max:Math.min(10,rules.max)};
  case 'ratio':return {min:2,max:Math.min(5,Math.floor(rules.max/rules.min))};
  default:return null;
 }
}
export function defaultQuestion(kind:MenuQuestionKind,rules:Rules):QuestionSpec {
 const range=questionParameterRange(kind,rules);
 return {kind,...(range?{parameter:Math.max(range.min,Math.min(kind==='sumAtMost'?20:3,range.max))}:{})};
}

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
 const range=questionParameterRange(n.kind,rules);
 return range!==null&&Number.isInteger(p)&&p!>=range.min&&p!<=range.max;
}
export function answerQuestion(input:QuestionKind|QuestionSpec,a:number,b:number):boolean {
 const q=normalizeQuestion(input);let yes:boolean;
 switch(q.kind){
  case 'distance':yes=Math.abs(a-b)<=q.parameter!;break;
  case 'sumAtMost':yes=a+b<=q.parameter!;break;
  case 'sumMultiple':yes=(a+b)%q.parameter! === 0;break;
  case 'containsMultiple':yes=a%q.parameter! === 0||b%q.parameter! === 0;break;
  case 'coprime':yes=gcd(a,b)===1;break;
  case 'multiple':yes=Math.max(a,b)%Math.min(a,b)===0;break;
  case 'ratio':yes=Math.max(a,b)===Math.min(a,b)*q.parameter!;break;
  default:throw new Error('지원하지 않는 질문입니다.');
 }
 return q.negate?!yes:yes;
}
export function questionLabel(input:QuestionKind|QuestionSpec,numberText:(value:number)=>string=String):string {
 const q=normalizeQuestion(input);
 switch(q.kind){
  case 'distance':return `두 숫자의 차이가 ${numberText(q.negate?q.parameter!+1:q.parameter!)} ${q.negate?'이상':'이하'}인가?`;
  case 'sumAtMost':return `두 숫자의 합이 ${numberText(q.negate?q.parameter!+1:q.parameter!)} ${q.negate?'이상':'이하'}인가?`;
  case 'sumMultiple':return `두 숫자의 합이 ${numberText(q.parameter!)}의 배수${q.negate?'가 아닌가':'인가'}?`;
  case 'containsMultiple':return `두 숫자 중 ${numberText(q.parameter!)}의 배수가 ${q.negate?'하나도 없는가':'하나라도 있는가'}?`;
  case 'coprime':return q.negate?`두 숫자에 ${numberText(1)}보다 큰 공약수가 있는가?`:`두 숫자의 공약수가 ${numberText(1)}뿐인가?`;
  case 'multiple':return `큰 숫자는 작은 숫자의 배수${q.negate?'가 아닌가':'인가'}?`;
  case 'ratio':return `큰 숫자는 작은 숫자의 ${numberText(q.parameter!)}배${q.negate?'가 아닌가':'인가'}?`;
  default:throw new Error('지원하지 않는 질문입니다.');
 }
}
/** Easy AI uses each family's default; other difficulties evaluate all valid thresholds. */
export function questionOptions(rules:Rules,expanded=true):QuestionSpec[] {
 const options=QUESTION_CHOICES.map(({kind})=>defaultQuestion(kind,rules));
 if(expanded)for(const {kind} of QUESTION_CHOICES){
  const range=questionParameterRange(kind,rules),initial=defaultQuestion(kind,rules).parameter;
  if(range)for(let parameter=range.min;parameter<=range.max;parameter++)if(parameter!==initial)options.push({kind,parameter});
 }
 return options.filter(q=>validQuestion(q,rules));
}
