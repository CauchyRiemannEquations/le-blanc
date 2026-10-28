import type { PlayerId } from './engine/types';
export type MusicTrack = 'menu' | 'solo' | 'duel';
export type ResultCue = 'victory' | 'defeat';
export interface AudioScene { track: MusicTrack; result?: { id: string; cue: ResultCue } }
export const MENU_AUDIO: AudioScene = { track: 'menu' };
export function duelAudio(result: { winner: PlayerId } | null | undefined, player: PlayerId, id: string, shared = false): AudioScene {
 return { track: 'duel', ...(result ? { result: { id, cue: shared || result.winner === player ? 'victory' : 'defeat' } } : {}) };
}
export interface AudioSettings { sound: boolean; music: boolean; ambience: boolean; muted: boolean; volume: number }
export function audioSettings(saved: Partial<AudioSettings> | null): AudioSettings {
 const sound = typeof saved?.sound === 'boolean' ? saved.sound : false;
 return { sound, music: typeof saved?.music === 'boolean' ? saved.music : sound,
  ambience: typeof saved?.ambience === 'boolean' ? saved.ambience : sound,
  muted: typeof saved?.muted === 'boolean' ? saved.muted : false,
  volume: typeof saved?.volume === 'number' && Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : .7 };
}
