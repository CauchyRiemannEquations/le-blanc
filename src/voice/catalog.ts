import {DEFAULT_RULES} from '../engine/game';
import {normalizeQuestion,questionLabel,questionOptions,questionParameterRange} from '../engine/questions';
import type {QuestionSpec,Rules} from '../engine/types';
import {readPosition,readValue,ro,validateSpoken} from './korean';
import type {VoiceId} from './types';
export interface VoiceLine {id:string;event:string;role:'actor'|'respondent'|'winner'|'loser'|'first'|'test';scripts:Record<VoiceId,string>;display:string;variables:Record<string,number|string>;ranges?:Record<string,{min:number;max:number}>;variant:'base'|'alternative';importance:'information'|'atmosphere';status:'ready'|'unresolved'|'optional';scope:'game'|'audition'|'numbers';reason?:string}
const line=(id:string,event:string,role:VoiceLine['role'],display:string,jongdae:string,ael=jongdae,extra:Partial<VoiceLine>={}):VoiceLine=>({id,event,role,display,scripts:{jongdae,ael},variables:{},variant:'base',importance:'information',status:'ready',scope:'game',...extra});
export const questionVoiceId=(spec:QuestionSpec)=>{const q=normalizeQuestion(spec);return `Q_${q.kind}_${q.parameter??'none'}_${q.negate?'not':'yes'}`;};
export const targetVoiceId=(a:number,b:number)=>`PAIR_${Math.min(a,b)}_${Math.max(a,b)}`;
export const guessVoiceId=(a:number,value:number)=>`INF_08_${a}_${value}`;
export function buildCatalog(rules:Rules=DEFAULT_RULES):VoiceLine[]{
 const lines:VoiceLine[]=[
  line('AMB_01','start','first','대결을 시작합니다.','좋아. 슬슬 시작해 보자.','좋아. 이제 시작해 볼까?',{importance:'atmosphere'}),
  line('INF_04','question.true','respondent','예.','맞아.','응, 맞아.'),
  line('INF_05','question.false','respondent','아니오.','아니야.'),
  line('REA_01','number.correct','respondent','정답입니다.','맞았네. 잘 짚었어.','맞았어. 제법인데?'),
  line('REA_02','number.wrong','respondent','오답입니다.','아니야. 그 숫자는 아니야.','틀렸어. 그 숫자가 아니야.'),
  line('GAP_OK','gap.correct','respondent','간격이 맞습니다.','맞아. 그 간격이야.'),
  line('GAP_NO','gap.wrong','respondent','간격이 틀렸습니다.','아니야. 그 간격은 아니야.'),
  line('END_01','result','winner','승리.','이번 판은 내가 가져가네.','이번 판은 내 승리네.',{importance:'atmosphere'}),
  line('END_02','result','loser','패배.','졌네. 이번엔 네 승리군.','졌어. 이번 판은 네 승리야.',{importance:'atmosphere'}),
 ];
 const excluded=[['INF_01','미확정 조건 템플릿. 실제 질문은 Q_*로 별도 확정.'],['INF_02','정확한 수치 질문은 현재 게임에 없음.'],['INF_03','카드 개수 질문은 현재 게임에 없음.'],['INF_06','질문은 모두 예/아니오. 정확한 합이나 차이를 답하지 않음.'],['INF_07','카드 개수 결과 없음.'],['AMB_02','선택 단계 분위기 대사는 기본 생략.'],['END_03','승자·패자 대사 이후 마무리는 생략.'],['REA_01_ALT','대안 대사는 이번 제작 제외.'],['REA_02_ALT','대안 대사는 이번 제작 제외.'],['END_01_ALT','대안 대사는 이번 제작 제외.'],['END_02_ALT','대안 대사는 이번 제작 제외.']];
 for(const [id,reason] of excluded)lines.push(line(id,'unmapped','test',reason,'','',{status:id.includes('ALT')||id.startsWith('AMB')||id==='END_03'?'optional':'unresolved',reason,variant:id.endsWith('ALT')?'alternative':'base'}));
 // Complete, independent target utterances avoid a pair × question × N cross product.
 for(let a=0;a<rules.handSize;a++)for(let b=a+1;b<rules.handSize;b++)lines.push(line(targetVoiceId(a,b),'pair','actor',`${a+1}번과 ${b+1}번 카드.`,`${readPosition(a)} 카드와 ${readPosition(b)} 카드에 대해 말할게.`,undefined,{variables:{a,b}}));
 const questions=[...questionOptions(rules),{kind:'multiple'} as QuestionSpec];const range=questionParameterRange('ratio',rules)!;
 for(let n=range.min;n<=range.max;n++)questions.push({kind:'ratio',parameter:n});
 for(const q of questions)for(const negate of [false,true]){const spec={...q,negate};lines.push(line(questionVoiceId(spec),`question.${q.kind}`,'actor',questionLabel(spec),questionLabel(spec,readValue),undefined,{variables:{kind:q.kind,...(q.parameter!==undefined?{parameter:q.parameter}:{}),negate:String(negate)}}));}
 for(let a=0;a<rules.handSize;a++)for(let n=rules.min;n<=rules.max;n++){const value=readValue(n),head=`${readPosition(a)} 카드. ${value}${ro(value)}`;lines.push(line(guessVoiceId(a,n),'number','actor',`${a+1}번 카드 추측: ${n}`,`${head} 보겠어.`,`${head} 볼게.`,{variables:{a,value:n}}));}
 for(let n=1;n<=rules.max-rules.min;n++){const value=readValue(n);lines.push(line(`GAP_${n}`,'gap','actor',`간격 추측: ${n}`,`간격은 ${value}${ro(value)} 보겠어.`,`간격은 ${value}${ro(value)} 볼게.`,{variables:{value:n}}));}
 const audition=[['AUD_01','AMB_01'],['AUD_03',guessVoiceId(2,7)],['AUD_04','REA_01'],['AUD_05','REA_02'],['AUD_06','END_02']];
 for(const [id,source] of audition){const original=lines.find(l=>l.id===source);if(original)lines.push({...original,id,scope:'audition',event:'comparison',role:'test'});}
 lines.push(line('AUD_02','comparison','test','비교 청취 전용: 합은 14.','합은 십사.',undefined,{scope:'audition'}));
 // Only actual card values, minimal confusing pair. Reuses the production guess sentence.
 for(const n of [10,12]){const original=lines.find(l=>l.id===guessVoiceId(2,n));if(original)lines.push({...original,id:`NUM_${n}`,scope:'numbers',event:'pronunciation',role:'test'});}
 for(const l of lines){
  l.ranges={};for(const variable of ['a','b'])if(variable in l.variables)l.ranges[variable]={min:0,max:rules.handSize-1};
  if('value'in l.variables)l.ranges.value=l.event==='gap'?{min:1,max:rules.max-rules.min}:{min:rules.min,max:rules.max};
  if('parameter'in l.variables){const range=questionParameterRange(l.variables.kind as QuestionSpec['kind'],rules);if(range)l.ranges.parameter=range;}
  if(l.status==='ready')for(const text of Object.values(l.scripts))validateSpoken(text);
 }
 return lines;
}
