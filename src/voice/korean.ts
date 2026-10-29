/** Values, ordinal positions and card counts intentionally use different functions. */
export function readValue(value:number):string {
 if(!Number.isInteger(value)||value<0||value>9999)throw new Error('지원하지 않는 정수입니다.');
 if(value===0)return '영';
 const digits=['','일','이','삼','사','오','육','칠','팔','구'];let text='';
 for(const [unit,name] of [[1000,'천'],[100,'백'],[10,'십'],[1,'']] as const){const d=Math.floor(value/unit);if(d)text+=(d===1&&unit>1?'':digits[d])+name;value%=unit;}
 return text;
}
export function readPosition(index:number):string {const names=['첫','두','세','네','다섯','여섯','일곱','여덟','아홉','열'];if(!Number.isInteger(index)||index<0||index>=names.length)throw new Error('잘못된 카드 위치입니다.');return `${names[index]} 번째`;}
export function readCount(count:number):string {const names=['','한','두','세','네','다섯','여섯','일곱','여덟','아홉','열'];if(!Number.isInteger(count)||count<0||count>=names.length)throw new Error('잘못된 장수입니다.');return count===0?'한 장도 없어.':`${names[count]} 장이야.`;}
export function ro(text:string):string {const code=text.charCodeAt(text.length-1);if(code<0xac00||code>0xd7a3)throw new Error('완성된 한글 읽기가 필요합니다.');const final=(code-0xac00)%28;return final===0||final===8?'로':'으로';}
export function validateSpoken(text:string){if(!text.trim()||text.length>2000||/[{}\[\]|`<>#*\d]/u.test(text)||/받침|기본형|연기 메모|능청스럽게|재치 있게/u.test(text)||/(십|백|천)(이야|이지)/u.test(text))throw new Error('미해결 변수·표기 또는 모호한 원고입니다.');}
