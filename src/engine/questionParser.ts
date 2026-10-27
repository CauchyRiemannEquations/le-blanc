import { questionLabel,validQuestion } from './questions';
import type { QuestionSpec,Rules } from './types';

export type QuestionVerdict={ok:true;question:QuestionSpec;label:string;targets?:[number,number]}|{ok:false;message:string};
const rejected=(message:string):QuestionVerdict=>({ok:false,message});
/** Bounded local language recognition. No code execution, network, or secret hand access.
 * Match the ENTIRE clause: unsupported clauses must never silently change its meaning.
 */
export function parseQuestion(text:string,rules:Rules):QuestionVerdict {
 if(!text.trim())return rejected('두 숫자 사이의 관계를 물어보세요.');
 if(text.length>120)return rejected('질문은 120자 이내로 적어주세요.');
 let s=text.normalize('NFKC').trim().replace(/[?.？。!]+$/u,'').replace(/\s+/gu,'');
 let targets:[number,number]|undefined;
 const pair=s.match(/^(\d+)번(?:타일|숫자|카드)?(?:과|와|하고|이랑|랑|,|·|및)(\d+)번(?:타일|숫자|카드)?(?:의|은|는|이|가)?/u);
 if(pair){targets=[Number(pair[1])-1,Number(pair[2])-1];if(targets[0]===targets[1]||targets.some(i=>i<0||i>=rules.handSize))return rejected(`서로 다른 1~${rules.handSize}번 타일을 골라주세요.`);s=s.slice(pair[0].length);}
 else if(/\d+번/u.test(s))return rejected('타일 두 개를 화면에서 고르거나, “1번과 2번의 차이가 5 이하인가?”처럼 적어주세요.');
 if(/몇|얼마|무엇|뭐야|정확한합/u.test(s))return rejected('숫자나 정확한 합을 직접 묻는 질문은 쓸 수 없습니다.');
 // Optional subject must describe TWO numbers, never a single hidden number.
 s=s.replace(/^(?:두(?:숫자|수|타일|카드)|선택한두(?:숫자|타일)|둘)(?:사이)?(?:의|은|는|이|가)?/u,'');
 s=s.replace(/(?:인가요|인가|입니까|이야|일까|인지|나요|입니다|이다|이에요|예요)$/u,'');
 let q:QuestionSpec|undefined;
 let m=s.match(/^(?:차이|간격)(?:가|는|이|은)?(\d+)(?:보다)?(이하|미만|이상|초과|작은가|큰가|작아|커|작다|크다)$/u);
 if(m){const n=Number(m[1]),comparison=m[2],less=['미만','작은가','작아','작다'].includes(comparison),greater=['초과','큰가','커','크다'].includes(comparison);q={kind:'distance',parameter:less||comparison==='이상'?n-1:n,negate:greater||comparison==='이상'};}
 else if((m=s.match(/^합(?:이|은)?(\d+)(?:의)?배수(?:가아닌가|가아니|가아니다)?$/u)))q={kind:'sumMultiple',parameter:Number(m[1]),negate:s.includes('아니')};
 else if(/^(?:서로소|서로소야|공약수(?:가|는)?1(?:뿐|뿐이|만|만있|뿐이다))$/u.test(s))q={kind:'coprime'};
 else if(/^(?:1보다큰공약수(?:가)?있(?:는가|나|어|다)?|공약수(?:가|는)?1보다큰가)$/u.test(s))q={kind:'coprime',negate:true};
 else if(/^(?:한(?:숫자|수)(?:가|는)?다른(?:숫자|수)(?:의)?|큰(?:숫자|수)(?:가|는)?작은(?:숫자|수)(?:의)?|서로)배수(?:관계)?$/u.test(s))q={kind:'multiple'};
 else if((m=s.match(/^큰(?:숫자|수)(?:가|는)?작은(?:숫자|수)(?:의)?(\d+)배$/u)))q={kind:'ratio',parameter:Number(m[1])};
 if(!q){
  if(/^(차이|간격)(?:가|는|이|은)?\d+$/u.test(s))return rejected('정확한 차이를 맞히려면 간격 공격을 선택하세요. 질문은 “차이가 5 이하인가?”처럼 범위로 물어보세요.');
  return rejected('이 문장은 해석하지 못했습니다. 아래 예시처럼 차이, 합의 배수, 서로소, 배수 관계 중 하나를 물어보세요.');
 }
 if(!validQuestion(q,rules))return rejected(`차이 기준은 1~${rules.max-rules.min-1}, 합의 배수는 2~${Math.min(10,rules.max)}, 배율은 2~${Math.min(5,Math.floor(rules.max/rules.min))} 사이에서 정해주세요.`);
 return {ok:true,question:q,label:questionLabel(q),...(targets?{targets}:{})};
}
