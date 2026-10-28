import { GameAudio } from './soundtrack';
let active: GameAudio | undefined;
export function mountAudio() {
 const audio = new GameAudio(); active = audio; audio.attach();
 return { audio, dispose: () => { audio.dispose(); if (active === audio) active = undefined; } };
}
export function playTone(kind: 'select' | 'success' | 'fail' | 'chain', enabled: boolean) { active?.tone(kind, enabled); }
