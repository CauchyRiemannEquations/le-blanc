import { useEffect, useRef } from 'react';
import { mountAudio } from './audio';
import type { GameAudio } from './soundtrack';
import type { AudioScene, AudioSettings } from './audioScene';
export function useGameAudio(settings: AudioSettings, scene: AudioScene) {
 const ref = useRef<GameAudio | null>(null);
 useEffect(() => { const mounted = mountAudio(); ref.current = mounted.audio; return () => { mounted.dispose(); ref.current = null; }; }, []);
 useEffect(() => { ref.current?.setSettings(settings); }, [settings.sound, settings.music, settings.ambience, settings.muted, settings.volume]);
 useEffect(() => { ref.current?.setScene(scene); }, [scene.track, scene.result?.id, scene.result?.cue]);
}
