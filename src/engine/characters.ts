/** Public cosmetic metadata only; never part of an AI observation. */
export const appearanceVoice=(appearance:Appearance)=>appearance==='female'?'ael' as const:'jongdae' as const;
export type Appearance = 'male' | 'female';
export const CHARACTERS = {
 male: {name:'Carl',subject:'Carl이',label:'남성',portrait:'/materials/karl-portrait.webp'},
 female: {name:'Sofya',subject:'Sofya가',label:'여성',portrait:'/materials/sofya-portrait.png'},
} as const;
export function validAppearance(value:unknown):value is Appearance {return value==='male'||value==='female';}
export function readAppearance(value:unknown):Appearance {
 if(value===undefined)return 'male'; // Rooms created before appearance selection.
 if(!validAppearance(value))throw new Error('캐릭터 외형을 확인해주세요.');
 return value;
}
export function randomAppearance(random:()=>number=Math.random):Appearance {return random()<.5?'male':'female';}
