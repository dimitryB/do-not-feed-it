/**
 * Small DNFI audio scaffold adapted from POP's lazy Web Audio lifecycle and
 * user-bus mixer design. New tone cues; POP music and crowd synthesis excluded.
 * Original MIT notice: licenses/ProofOfPatience-MIT.txt.
 */
export interface AudioMixState {
  master: number; music: boolean; musicLevel: number;
  sfx: boolean; sfxLevel: number; ambience: boolean; ambienceLevel: number;
}
export type SfxId = "feed" | "mistake" | "mutation" | "ui-click";
export interface MixerAudioEngine {
  unlock(): void;
  play(id: SfxId): void;
  setMuted(value: boolean): void;
  setMasterLevel(value: number): void;
  setMusicEnabled(value: boolean): void;
  setMusicLevel(value: number): void;
  setSfxEnabled(value: boolean): void;
  setSfxLevel(value: number): void;
  setAmbienceEnabled(value: boolean): void;
  setAmbienceLevel(value: number): void;
  dispose(): void;
}

export function createAudioEngine(): MixerAudioEngine {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let effects: GainNode | null = null;
  let muted = false;
  let activeVoices = 0;
  const voices = new Set<OscillatorNode>();
  const mix: AudioMixState = { master: .5, music: true, musicLevel: 1, sfx: true, sfxLevel: 1, ambience: true, ambienceLevel: 1 };
  const level = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  function sync() {
    if (!context) return;
    master?.gain.setTargetAtTime(muted ? 0 : mix.master * .3, context.currentTime, .02);
    effects?.gain.setTargetAtTime(mix.sfx ? mix.sfxLevel : 0, context.currentTime, .02);
  }
  const api: MixerAudioEngine = {
    unlock() {
      if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        effects = context.createGain();
        master.gain.value = muted ? 0 : mix.master * .3;
        effects.gain.value = mix.sfx ? mix.sfxLevel : 0;
        effects.connect(master);
        master.connect(context.destination);
      }
      void context.resume().catch(() => {});
    },
    play(id) {
      if (!context || !effects || muted || !mix.sfx || activeVoices >= 8) return;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const time = context.currentTime;
      const frequencies: Record<SfxId, [number, number]> = { feed: [280, 520], mistake: [140, 70], mutation: [180, 680], "ui-click": [600, 500] };
      oscillator.type = id === "mistake" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequencies[id][0], time);
      oscillator.frequency.exponentialRampToValueAtTime(frequencies[id][1], time + .12);
      envelope.gain.setValueAtTime(.001, time);
      envelope.gain.exponentialRampToValueAtTime(.4, time + .01);
      envelope.gain.exponentialRampToValueAtTime(.001, time + .18);
      oscillator.connect(envelope);
      envelope.connect(effects);
      voices.add(oscillator);
      activeVoices += 1;
      oscillator.onended = () => { voices.delete(oscillator); activeVoices = Math.max(0, activeVoices - 1); oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(time);
      oscillator.stop(time + .2);
    },
    setMuted(value) { muted = value; sync(); },
    setMasterLevel(value) { mix.master = level(value); sync(); },
    setMusicEnabled(value) { mix.music = value; },
    setMusicLevel(value) { mix.musicLevel = level(value); },
    setSfxEnabled(value) { mix.sfx = value; sync(); },
    setSfxLevel(value) { mix.sfxLevel = level(value); sync(); },
    setAmbienceEnabled(value) { mix.ambience = value; },
    setAmbienceLevel(value) { mix.ambienceLevel = level(value); },
    dispose() { for (const voice of voices) { try { voice.stop(); } catch {} } voices.clear(); activeVoices = 0; void context?.close().catch(() => {}); context = null; master = null; effects = null; },
  };
  return api;
}
