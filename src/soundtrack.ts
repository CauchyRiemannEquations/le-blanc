import { SfxPlayer } from './sfx';
import type { SfxEvent, SfxOptions } from './sfx';
import { audioSettings, MENU_AUDIO } from './audioScene';
import type { AudioScene, AudioSettings, ResultCue } from './audioScene';
export const AUDIO_FILES = {
 menu: 'bgm_menu.ogg', duel: 'bgm_duel.ogg',
 victory: 'cue_victory.ogg', defeat: 'cue_defeat.ogg', ambience: 'amb_tavern.ogg',
} as const;
type Asset = keyof typeof AUDIO_FILES;
type Voice = { source: AudioBufferSourceNode; gain: GainNode; timer?: ReturnType<typeof setTimeout> };
const FADE = .45;

/** Shared context. Retain only current/fading buffers; stale decodes cannot play. */
export class GameAudio {
 private context?: AudioContext;
 private master?: GainNode;
 private musicGain?: GainNode;
 private ambienceGain?: GainNode;
 private effectsGain?: GainNode;
 private voices = new Map<Asset, Voice>();
 private loads = new Map<Asset, AbortController>();
 private failed = new Set<Asset>();
 private scene: AudioScene = MENU_AUDIO;
 private settings: AudioSettings = audioSettings(null);
 private resultId?: string;
 private pendingCue?: ResultCue;
 private cue?: Voice;
 private unlocking?: Promise<void>;
 private sfxPlayer = new SfxPlayer({context:()=>this.context,destination:()=>this.effectsGain,enabled:()=>!this.disposed&&!this.hidden&&this.settings.sound&&!this.settings.muted&&this.settings.volume>0,audible:()=>this.audible()&&this.context?.state==='running',voiceLimit:()=>this.cue||this.pendingCue?5:6});
 private disposed = false;
 private hidden = false;
 private unlocked = false;
 private detach?: () => void;

 attach() {
  const gesture = () => { void this.unlock(); };
  const visibility = () => this.setHidden(document.hidden);
  const hide = () => this.setHidden(true);
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', gesture, true);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', visibility);
  this.hidden = document.hidden;
  this.detach = () => {
   document.removeEventListener('pointerdown', gesture, true);
   document.removeEventListener('keydown', gesture, true);
   document.removeEventListener('visibilitychange', visibility);
   window.removeEventListener('pagehide', hide);
   window.removeEventListener('pageshow', visibility);
  };
 }

 async unlock() {
  if (this.disposed || this.hidden) return;
  if (this.unlocking) return this.unlocking;
  const pending=this.unlockContext();this.unlocking=pending;
  try { await pending; } finally { if(this.unlocking===pending)this.unlocking=undefined; }
 }
 private async unlockContext() {
  try {
   if (!this.context) {
    const context = new AudioContext();
    this.context = context;
    this.master = context.createGain(); this.master.connect(context.destination);
    this.musicGain = context.createGain(); this.ambienceGain = context.createGain(); this.effectsGain = context.createGain();
    for (const gain of [this.musicGain, this.ambienceGain, this.effectsGain]) gain.connect(this.master);
    this.master.gain.value = 0;
   }
   await this.context.resume();
   if (this.disposed || this.hidden) return;
   this.unlocked = this.context.state === 'running';
   this.reconcile();
  } catch { /* Unsupported/blocked audio must never block gameplay. Retry on a gesture. */ }
 }

 setSettings(settings: AudioSettings) {
  this.settings = audioSettings(settings);
  if (!settings.sound || settings.muted || settings.volume === 0) { this.cancelCue(); this.sfxPlayer.cancel(); }
  this.reconcile();
 }
 setScene(scene: AudioScene) {
  if(scene.track!==this.scene.track||scene.result?.id!==this.scene.result?.id)this.sfxPlayer.cancel();
  this.scene = scene;
  if (scene.result?.id !== this.resultId) {
   this.cancelCue(); this.resultId = scene.result?.id;
   // Silent/hidden results are consumed, never replayed on unmute or tab return.
   if (scene.result && this.settings.sound && !this.settings.muted && this.settings.volume > 0 && !this.hidden) this.pendingCue = scene.result.cue;
  }
  this.reconcile();
 }
 setHidden(hidden: boolean) {
  this.hidden = hidden;
  if (hidden) {
   this.cancelCue(); this.sfxPlayer.cancel();
   if (this.master && this.context) { this.master.gain.cancelScheduledValues(this.context.currentTime); this.master.gain.setValueAtTime(0, this.context.currentTime); }
   void this.context?.suspend().catch(() => {});
  } else if (this.context) void this.unlock();
 }
 private ramp(gain: GainNode | undefined, value: number, seconds = FADE) {
  if (!gain || !this.context) return;
  const now = this.context.currentTime;
  if (typeof gain.gain.cancelAndHoldAtTime === 'function') gain.gain.cancelAndHoldAtTime(now);
  else { const current = gain.gain.value; gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(current, now); }
  gain.gain.linearRampToValueAtTime(value, now + seconds);
 }
 private audible() { return this.unlocked && !this.hidden && !this.settings.muted && this.settings.volume > 0; }
 private wanted(asset: Asset) {
  if (!this.audible()) return false;
  if (asset === 'ambience') return this.settings.ambience;
  if (asset === 'victory' || asset === 'defeat') return this.settings.sound && this.pendingCue === asset;
  return this.settings.music && asset === this.scene.track;
 }
 private reconcile() {
  if (this.disposed || !this.context) return;
  this.ramp(this.master, this.hidden || this.settings.muted ? 0 : this.settings.volume, .04);
  this.ramp(this.musicGain, this.cue ? .16 : .65, .15);
  this.ramp(this.ambienceGain, this.settings.ambience ? .3 : 0);
  this.ramp(this.effectsGain, this.settings.sound ? 1 : 0, .04);
  // Master mute pauses the shared clock, preserving loop positions.
  if (!this.audible()) {
   for (const load of this.loads.values()) load.abort();
   this.loads.clear();
   if (this.settings.muted || this.settings.volume === 0) void this.context.suspend().catch(() => {});
   return;
  }
  if (this.context.state !== 'running') { void this.unlock(); return; }
  for (const [asset, load] of this.loads) if (!this.wanted(asset)) { load.abort(); this.loads.delete(asset); }
  for (const [asset, voice] of this.voices) {
   if (this.wanted(asset)) { clearTimeout(voice.timer); voice.timer = undefined; this.ramp(voice.gain, 1); }
   else if (!voice.timer && (asset === 'ambience' || !this.settings.music || this.voices.has(this.scene.track) || this.failed.has(this.scene.track))) {
    this.ramp(voice.gain, 0);
    voice.timer = setTimeout(() => { this.stop(voice); this.voices.delete(asset); }, FADE * 1000 + 30);
   }
  }
  if (this.settings.music) this.ensure(this.scene.track);
  if (this.settings.ambience) this.ensure('ambience');
  if (this.pendingCue) this.ensure(this.pendingCue);
 }
 private ensure(asset: Asset) {
  if (this.voices.has(asset) || this.loads.has(asset) || this.failed.has(asset)) return;
  const context = this.context!, controller = new AbortController();
  this.loads.set(asset, controller);
  const timeout = setTimeout(() => controller.abort(), 15000);
  void (async () => {
   try {
    const response = await fetch(import.meta.env.BASE_URL + 'audio/' + AUDIO_FILES[asset], { signal: controller.signal });
    if (!response.ok) throw new Error('Audio HTTP ' + response.status);
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    if (this.disposed || controller.signal.aborted || this.loads.get(asset) !== controller || !this.wanted(asset)) return;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    const isCue = asset === 'victory' || asset === 'defeat';
    source.loop = !isCue; // Entire decoded buffer, without fades at loop boundaries.
    source.connect(gain); gain.connect(isCue ? this.effectsGain! : asset === 'ambience' ? this.ambienceGain! : this.musicGain!);
    const voice: Voice = { source, gain };
    if (isCue) {
     this.pendingCue = undefined; this.cue = voice; gain.gain.value = 1;
     source.onended = () => {
      if (this.cue !== voice) return;
      this.cue = undefined; source.disconnect(); gain.disconnect(); this.reconcile();
     };
    } else { gain.gain.value = 0; this.voices.set(asset, voice); this.ramp(gain, 1); }
    source.start(); this.ramp(this.musicGain, this.cue ? .16 : .65, .15);
   } catch {
    if (!controller.signal.aborted && !this.disposed) this.failed.add(asset);
    if (this.pendingCue === asset && !controller.signal.aborted) this.pendingCue = undefined;
   } finally {
    clearTimeout(timeout);
    if (this.loads.get(asset) === controller) this.loads.delete(asset);
    // Start fading the old song only after its replacement is ready (or failed).
    if (!controller.signal.aborted) this.reconcile();
   }
  })();
 }
 private cancelCue() {
  this.pendingCue = undefined;
  for (const asset of ['victory', 'defeat'] as const) { this.loads.get(asset)?.abort(); this.loads.delete(asset); }
  if (this.cue) { this.stop(this.cue); this.cue = undefined; }
 }
 private stop(voice: Voice) {
  clearTimeout(voice.timer); voice.source.onended = null;
  try { voice.source.stop(); } catch { /* Already stopped. */ }
  voice.source.disconnect(); voice.gain.disconnect();
 }
 sfx(event:SfxEvent,options:SfxOptions={}) { this.sfxPlayer.play(event,options,this.unlocking); }
 cancelSfx(id:string) { this.sfxPlayer.cancelId(id); }
 /** Legacy callers use the same sample bus; no synthesized duplicate cue remains. */
 tone(kind: 'select' | 'success' | 'fail' | 'chain', enabled: boolean) {
  if(!enabled)return;
  const event={select:'ui_press',success:'number_correct',fail:'number_wrong',chain:'chain'} as const;
  this.sfx(event[kind],kind==='chain'?{state:'low'}:{});
 }
 dispose() {
  this.disposed = true; this.detach?.(); this.cancelCue(); this.sfxPlayer.dispose();
  for (const load of this.loads.values()) load.abort(); this.loads.clear();
  for (const voice of this.voices.values()) this.stop(voice); this.voices.clear();
  void this.context?.close().catch(() => {});
 }
}
