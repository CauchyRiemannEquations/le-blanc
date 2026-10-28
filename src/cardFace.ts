/** Shared print layout for 3D textures and flat result cards. */
export const CARD_FACE = {
 width:512, height:768,
 family:'Georgia', weight:700, size:272, ink:'#21180f',
 x:256, baseline:470,
 marker:{x:208,y:504,width:96,height:8},
} as const;
export const needsOrientationMark=(value:number)=>value===6||value===9;
