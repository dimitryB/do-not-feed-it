/**
 * Original DNFI procedural score, kitchen atmosphere and creature cues.
 * Lazy Web Audio lifecycle and mixer pattern adapted from POP.
 * Original MIT notice: licenses/ProofOfPatience-MIT.txt.
 * Presentation only: this engine never consumes the gameplay RNG.
 */
export interface AudioMixState {
  master: number; music: boolean; musicLevel: number;
  sfx: boolean; sfxLevel: number; ambience: boolean; ambienceLevel: number;
}
export type SfxId = "feed" | "mistake" | "mutation" | "ui-click" | "launch" | "gust" | "end";
export interface MixerAudioEngine {
  unlock(): void;
  play(id: SfxId): void;
  setPlaying(value: boolean): void;
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

type Bus = "music" | "sfx" | "ambience";
type Voice = { source: AudioScheduledSourceNode; envelope: GainNode; bus: Bus };
const MAX_VOICES = 32;

export function createAudioEngine(): MixerAudioEngine {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let buses: Record<Bus, GainNode> | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let musicTimer: ReturnType<typeof setInterval> | null = null;
  let muted = false;
  let playing = false;
  let backgroundStarted = false;
  let disposed = false;
  const voices = new Set<Voice>();
  const mix: AudioMixState = { master: .5, music: true, musicLevel: 1, sfx: true, sfxLevel: 1, ambience: true, ambienceLevel: 1 };
  const level = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

  function sync() {
    if (!context || !buses) return;
    const time = context.currentTime;
    master?.gain.setTargetAtTime(muted ? 0 : mix.master * .5, time, .025);
    buses.sfx.gain.setTargetAtTime(mix.sfx ? mix.sfxLevel : 0, time, .025);
    buses.music.gain.setTargetAtTime(playing && mix.music ? mix.musicLevel * .38 : 0, time, .12);
    buses.ambience.gain.setTargetAtTime(playing && mix.ambience ? mix.ambienceLevel * .28 : 0, time, .12);
  }

  function register(source: AudioScheduledSourceNode, envelope: GainNode, bus: Bus, nodes: AudioNode[], time: number, duration?: number) {
    const voice = { source, envelope, bus };
    voices.add(voice);
    source.onended = () => {
      voices.delete(voice);
      source.disconnect();
      envelope.disconnect();
      for (const node of nodes) node.disconnect();
    };
    source.start(time);
    if (duration !== undefined) source.stop(time + duration + .04);
  }

  function tone(bus: Bus, frequency: number, endFrequency: number, time: number, duration: number, amplitude: number, type: OscillatorType = "sine", attack = .012) {
    if (!context || !buses || voices.size >= MAX_VOICES) return;
    const source = context.createOscillator();
    const envelope = context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, time);
    source.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(amplitude, time + Math.min(attack, duration * .4));
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(envelope);
    envelope.connect(buses[bus]);
    register(source, envelope, bus, [], time, duration);
  }

  function noise(bus: Bus, time: number, duration: number | undefined, frequency: number, amplitude: number) {
    if (!context || !buses || !noiseBuffer || voices.size >= MAX_VOICES) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency, time);
    filter.Q.value = .7;
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(amplitude, time + (duration ? Math.min(.05, duration * .2) : 1));
    if (duration) {
      filter.frequency.exponentialRampToValueAtTime(frequency * .35, time + duration);
      envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    }
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(buses[bus]);
    register(source, envelope, bus, [filter], time, duration);
  }

  function stopBackground() {
    if (musicTimer !== null) clearInterval(musicTimer);
    musicTimer = null;
    backgroundStarted = false;
    if (!context) return;
    const time = context.currentTime;
    for (const voice of voices) {
      if (voice.bus === "sfx") continue;
      voice.envelope.gain.cancelScheduledValues(time);
      voice.envelope.gain.setTargetAtTime(.0001, time, .025);
      try { voice.source.stop(time + .15); } catch { /* Already ended. */ }
    }
  }

  function startBackground() {
    if (!context || !buses || !playing || backgroundStarted || disposed) return;
    backgroundStarted = true;
    const time = context.currentTime;
    // Low ventilation and a gently beating electrical hum, below the score.
    noise("ambience", time, undefined, 210, .14);
    for (const frequency of [55, 55.35, 110]) {
      if (voices.size >= MAX_VOICES) break;
      const source = context.createOscillator();
      const envelope = context.createGain();
      source.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(frequency === 110 ? .015 : .04, time + 1.2);
      source.connect(envelope);
      envelope.connect(buses.ambience);
      register(source, envelope, "ambience", [], time);
    }
    // An original sparse D-minor kitchen nocturne: soft marimba-like overtones
    // over slow two-note chords. A short lookahead avoids timer jitter.
    const melody = [293.66, 0, 440, 349.23, 0, 261.63, 220, 0, 293.66, 349.23, 0, 523.25, 440, 0, 349.23, 0];
    const chords = [[146.83, 220], [130.81, 196], [116.54, 174.61], [130.81, 220]];
    let step = 0;
    let nextNote = time + .1;
    const schedule = () => {
      if (!context || !playing || context.state !== "running") return;
      if (nextNote < context.currentTime) nextNote = context.currentTime + .04;
      while (nextNote < context.currentTime + .28) {
        const frequency = melody[step % melody.length];
        if (frequency && mix.music && !muted) {
          tone("music", frequency, frequency, nextNote, 1.6, .095, "sine", .035);
          tone("music", frequency * 2.002, frequency * 2, nextNote, .65, .018);
        }
        if (step % 8 === 0 && mix.music && !muted) {
          for (const pitch of chords[Math.floor(step / 8) % chords.length]) {
            tone("music", pitch, pitch, nextNote, 5.1, .06, "sine", .8);
          }
        }
        step += 1;
        nextNote += .72;
      }
    };
    schedule();
    musicTimer = setInterval(schedule, 120);
  }

  const api: MixerAudioEngine = {
    unlock() {
      if (disposed || typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        buses = { music: context.createGain(), sfx: context.createGain(), ambience: context.createGain() };
        master.gain.value = 0;
        for (const bus of Object.values(buses)) { bus.gain.value = 0; bus.connect(master); }
        master.connect(context.destination);
        noiseBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let seed = 38147;
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
          data[i] = seed / 2147483648;
        }
        sync();
      }
      void context.resume().then(() => startBackground()).catch(() => {});
    },
    setPlaying(value) {
      if (disposed || playing === value) return;
      playing = value;
      if (playing) startBackground(); else stopBackground();
      sync();
    },
    play(id) {
      if (!context || !buses || context.state !== "running" || muted || !mix.sfx || disposed) return;
      const time = context.currentTime;
      switch (id) {
        case "launch":
          noise("sfx", time, .2, 1500, .2);
          tone("sfx", 160, 65, time, .17, .18, "triangle");
          break;
        case "feed":
          tone("sfx", 170, 78, time, .2, .33, "sine");
          tone("sfx", 330, 190, time + .055, .2, .13, "triangle");
          tone("sfx", 587.33, 660, time + .11, .3, .12);
          noise("sfx", time, .09, 850, .08);
          break;
        case "mistake":
          noise("sfx", time, .16, 1100, .18);
          tone("sfx", 155, 62, time, .38, .22, "triangle");
          tone("sfx", 120, 57, time + .08, .32, .1);
          break;
        case "mutation":
          for (const [i, frequency] of [146.83, 220, 293.66, 440].entries()) {
            tone("sfx", frequency * .7, frequency, time + i * .075, .55, .13, "triangle", .025);
          }
          noise("sfx", time, .6, 2200, .1);
          break;
        case "gust":
          noise("sfx", time, .7, 1400, .23);
          tone("sfx", 95, 48, time, .55, .12);
          break;
        case "end":
          for (const [i, frequency] of [440, 349.23, 293.66, 146.83].entries()) {
            tone("sfx", frequency, frequency, time + i * .17, .8, .14, "sine", .04);
          }
          break;
        case "ui-click":
          tone("sfx", 740, 480, time, .065, .1);
          break;
      }
    },
    setMuted(value) { muted = value; sync(); },
    setMasterLevel(value) { mix.master = level(value); sync(); },
    setMusicEnabled(value) { mix.music = value; sync(); },
    setMusicLevel(value) { mix.musicLevel = level(value); sync(); },
    setSfxEnabled(value) { mix.sfx = value; sync(); },
    setSfxLevel(value) { mix.sfxLevel = level(value); sync(); },
    setAmbienceEnabled(value) { mix.ambience = value; sync(); },
    setAmbienceLevel(value) { mix.ambienceLevel = level(value); sync(); },
    dispose() {
      disposed = true;
      playing = false;
      stopBackground();
      for (const voice of voices) { try { voice.source.stop(); } catch { /* Already ended. */ } }
      voices.clear();
      void context?.close().catch(() => {});
      context = null;
      master = null;
      buses = null;
      noiseBuffer = null;
    },
  };
  return api;
}
