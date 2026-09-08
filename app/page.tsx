"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioPanel } from "./components/AudioPanel";
import { DEFAULT_AUDIO_SETTINGS, applyAudioPatch, readAudioSettings, writeAudioSettings, type AudioSettings } from "./components/audioSettings";
import { Odometer } from "./components/Odometer";
import { createAudioEngine, type MixerAudioEngine } from "../lib/engine/audio";
import { INGREDIENTS, INGREDIENT_LABELS, MUTATION_LABELS, ROUND_SECONDS, ROUND_TICKS, TICKS_PER_SECOND, type Ingredient } from "../lib/game/config";
import { advanceTo, createRun, feed, type FeedCommand, type RunState } from "../lib/game/simulation";

function snapshot(run: RunState): RunState { return { ...run, servings: { ...run.servings } }; }

export default function Home() {
  const [view, setView] = useState<RunState | null>(null);
  const [selected, setSelected] = useState<Ingredient>("metal");
  const [active, setActive] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [audio, setAudio] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const engineRef = useRef<MixerAudioEngine | null>(null);
  const runRef = useRef<RunState | null>(null);
  const commandsRef = useRef<FeedCommand[]>([]);

  useEffect(() => {
    const engine = createAudioEngine();
    engineRef.current = engine;
    const saved = readAudioSettings();
    applyAudioPatch(engine, saved);
    const handle = requestAnimationFrame(() => setAudio(saved));
    return () => { cancelAnimationFrame(handle); engine.dispose(); engineRef.current = null; };
  }, []);

  const changeAudio = useCallback((patch: Partial<AudioSettings>) => {
    engineRef.current?.unlock();
    if (engineRef.current) applyAudioPatch(engineRef.current, patch);
    setAudio(previous => { const next = { ...previous, ...patch }; writeAudioSettings(next); return next; });
  }, []);

  const start = useCallback(() => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    runRef.current = createRun(seed);
    commandsRef.current = [];
    engineRef.current?.unlock();
    engineRef.current?.play("ui-click");
    setView(snapshot(runRef.current));
    setActive(true);
  }, []);

  const serve = useCallback(() => {
    const run = runRef.current;
    if (!active || audioOpen || !run) return;
    const correct = selected === run.wanted;
    const mutations = run.mutationEvents;
    const tick = run.tick;
    if (feed(run, selected)) {
      commandsRef.current.push({ tick, ingredient: selected });
      engineRef.current?.play(run.mutationEvents > mutations ? "mutation" : correct ? "feed" : "mistake");
      setView(snapshot(run));
      if (run.phase !== "playing") setActive(false);
    }
  }, [active, audioOpen, selected]);

  useEffect(() => {
    if (!active) return;
    let frameId = 0;
    let lastTime = performance.now();
    let remainder = 0;
    let lastHud = 0;
    const frame = (now: number) => {
      const run = runRef.current;
      if (!run) return;
      // Practice may pause in hidden tabs and while a dialog is open.
      // Ranked timing policy must be decided before implementing verification.
      if (!document.hidden && !audioOpen) {
        remainder += Math.min(.1, (now - lastTime) / 1000) * TICKS_PER_SECOND;
        const ticks = Math.floor(remainder);
        remainder -= ticks;
        advanceTo(run, Math.min(ROUND_TICKS, run.tick + ticks));
        if (now - lastHud > 100 || run.phase !== "playing") {
          setView(snapshot(run));
          lastHud = now;
        }
      }
      lastTime = now;
      if (run.phase !== "playing") { setActive(false); return; }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [active, audioOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (audioOpen || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, button, [contenteditable=true]")) return;
      if (["1", "2", "3"].includes(event.key)) { event.preventDefault(); setSelected(INGREDIENTS[Number(event.key) - 1]); }
      if (event.code === "Space") { event.preventDefault(); serve(); }
      if (event.key.toLowerCase() === "r" && !active) { event.preventDefault(); start(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, audioOpen, serve, start]);

  const seconds = view ? Math.ceil((ROUND_TICKS - view.tick) / TICKS_PER_SECOND) : ROUND_SECONDS;
  return (
    <main>
      <header className="masthead">
        <div><p className="eyebrow">HEMI ARCADE · LOCAL PRACTICE SCAFFOLD</p><h1>DO NOT FEED IT<span>.</span></h1></div>
        <div className="sound-controls">
          <label>Volume <input aria-label="Master volume" type="range" min="0" max="100" value={Math.round(audio.master * 100)} onChange={event => changeAudio({ master: Number(event.target.value) / 100 })} /></label>
          <button onClick={() => changeAudio({ muted: !audio.muted })}>{audio.muted ? "Unmute" : "Mute"}</button>
          <button onClick={() => setAudioOpen(true)}>Mixer</button>
        </div>
      </header>
      <section className="kitchen" aria-label="Practice kitchen">
        <div className="scoreboard">
          <div><span className="eyebrow">SHIFT REMAINING</span><strong>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong></div>
          <div><span className="eyebrow">SCORE</span><Odometer value={view?.score ?? 0} label="Score" /></div>
          <div><span className="eyebrow">COMBO</span><strong>×{view?.combo ?? 0}</strong></div>
        </div>
        <div className="practice-surface">
          <p className="eyebrow">{active ? "CURRENT CRAVING" : view ? "SHIFT REPORT" : "THE FEEDING TEST"}</p>
          <h2>{active && view ? INGREDIENT_LABELS[view.wanted].toUpperCase() : view ? view.phase === "survived" ? "YOU CLOCKED OUT." : "IT ATE THE STAFF." : "IT'S HUNGRY."}</h2>
          <p className="announcement" role="status">{view?.announcement ?? "Choose an ingredient, then feed. Three correct servings of one ingredient announce a mutation."}</p>
          {view?.mutation && <p className="mutation">{MUTATION_LABELS[view.mutation]}</p>}
          <div className="meters">
            <label>Fullness <meter min="0" max="100" low={25} value={view?.hunger ?? 70} /> <span>{view?.hunger ?? 70}%</span></label>
            <label>Rage <meter min="0" max="100" high={75} optimum={0} value={view?.rage ?? 0} /> <span>{view?.rage ?? 0}%</span></label>
          </div>
          {!active && <button className="primary-control start" onClick={start}>{view ? "ANOTHER SHIFT" : "START PRACTICE"}</button>}
        </div>
        <div className="feeding-controls">
          <fieldset><legend>Load ingredient</legend>{INGREDIENTS.map((ingredient, index) => <button key={ingredient} aria-pressed={selected === ingredient} onClick={() => setSelected(ingredient)}><kbd>{index + 1}</kbd>{INGREDIENT_LABELS[ingredient]}</button>)}</fieldset>
          <button className="primary-control feed" disabled={!active} onClick={serve}>FEED <kbd>SPACE</kbd></button>
        </div>
      </section>
      <footer>
        <p><strong>Development scaffold.</strong> This tests cravings, scoring, mutations and replayable input. Projectile physics, creature artwork, and the communal monster are planned.</p>
        <p>Practice is wallet-free. Mainnet recording is disabled. Original music and ambience are not included yet.</p>
      </footer>
      {audioOpen && <AudioPanel settings={audio} onChange={changeAudio} onClose={() => setAudioOpen(false)} />}
    </main>
  );
}
