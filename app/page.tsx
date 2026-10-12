"use client";
import { useCallback,useEffect,useRef,useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { AudioPanel } from './components/AudioPanel';
import { useDialogFocusTrap } from './components/focusTrap';
import { DEFAULT_AUDIO_SETTINGS,applyAudioPatch,readAudioSettings,writeAudioSettings,type AudioSettings } from './components/audioSettings';
import { createAudioEngine,type MixerAudioEngine,type SfxId } from '../lib/engine/audio';
import { ARENA,FOODS,TUNING,createArcade,inFrenzy,launchFood,slamHatch,stepArcade,type ArcadeEvent,type ArcadeState,type ArcadeCommand,type Ingredient } from '../lib/game/arcade';
import { DEV_HOOKS,devHookBag } from '../lib/dev/hook';
const LABELS:Record<Ingredient,string>={metal:'Tin can',balloon:'Air puff',pepper:'Hot pepper'};
/** What three of a snack turn it into. The chip and the legend say only this. */
const TRAITS:Record<Ingredient,string>={metal:'Magnet mouth',balloon:'Balloon belly',pepper:'Fire breath'};
/** How many frames the simulation holds after a catch. Pillar 7: the hit-stop. */
const HIT_STOP_FRAMES=3;
/** Which cue an event plays. The renderer draws them; this is the sound. */
function cueFor(e:ArcadeEvent):SfxId|null{
  switch(e.type){
    case 'feed':return 'feed';
    case 'chew':return 'chew';
    case 'launch':return 'launch';
    case 'miss':return 'mistake';
    case 'clank':return 'clank';
    case 'bounce':return e.name==='floor'?null:'bounce';
    case 'bank':return 'bank';
    case 'frenzy':return e.name==='start'?'frenzy-start':'frenzy-end';
    case 'utensil':return e.name==='caught'?'utensil':null;
    case 'cooked':return 'cooked';
    case 'flame':return e.name==='tell'?'flame-tell':'flame';
    case 'fire':return e.name==='start'?'fire':null;
    case 'jam':return 'jam';
    case 'grow':return 'grow';
    case 'mutation':return 'mutation';
    case 'tantrum':return 'tantrum';
    case 'craving':return e.name==='start'?'craving':null;
    case 'beat':return e.name==='sneeze'?'gust':e.name==='bite'?'jam':null;
    case 'end':return 'end';
    default:return null;
  }
}
function Icon({name}:{name:'sound'|'mute'|'help'|'expand'|'pause'}){return <svg viewBox="0 0 24 24" aria-hidden="true">{name==='sound'||name==='mute'?<><path d="M11 4 6 8H3v8h3l5 4Z"/>{name==='sound'?<><path d="M15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14"/></>:<path d="m16 9 6 6m0-6-6 6"/>}</>:name==='help'?<><circle cx="12" cy="12" r="9"/><path d="M9.5 8.5c0-3 6-3 5 0-.5 2-2.5 1.5-2.5 4M12 16v.2"/></>:name==='expand'?<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>:<path d="M8 5v14M16 5v14"/>}</svg>}
function Modal({kind,onClose,onRestart,reduced,onReduced}:{kind:'help'|'pause';onClose:()=>void;onRestart:()=>void;reduced:boolean;onReduced:(v:boolean)=>void}){const ref=useDialogFocusTrap(onClose);return <div className="modal-scrim" onMouseDown={onClose}><div className={kind==='help'?'help-modal':'pause-modal'} ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={onClose}>×</button><p className="eyebrow">EMPLOYEE HANDBOOK · SECTOR 04</p><h2 id="dialog-title">{kind==='help'?'A very questionable job.':'Take a breather.'}</h2>{kind==='help'?<><p>Keep your unusual customer fed for as long as you can. It grows with every serving, and it always wins.</p><div className="help-steps"><div className="help-step"><span>1</span><div><strong>Feed it. Constantly.</strong><p>Pick a snack with 1, 2 or 3. Aim with the mouse or ← →. Hold Space to charge, let go to launch. The mouth is open unless it is chewing — do not shoot into a chewing mouth.</p></div></div><div className="help-step"><span>2</span><div><strong>The kitchen is a playground.</strong><p>Bounce a snack off a pan, the shelf, the chain, the pot or the lamp before it lands: a bank multiplies the serving. Five catches in a row is a FRENZY.</p></div></div><div className="help-step"><span>3</span><div><strong>Three of a kind changes it for good.</strong><p>Tin cans give it a magnet mouth — and the cutlery flies. Air puffs make it float, and its belly a trampoline. Peppers give it fire breath that cooks snacks for double. An empty belly ends your shift.</p></div></div></div><label className="reduced-label"><input type="checkbox" checked={reduced} onChange={e=>onReduced(e.target.checked)}/> Reduce motion and particles</label><button className="primary-control" onClick={onClose}>Got it <span className="arrow">→</span></button></>:<><p>Your shift is paused. The creature can wait.</p><button className="primary-control" onClick={onClose}>Back to the kitchen <span className="arrow">→</span></button><button className="text-button" onClick={onRestart}>Restart shift</button></>}</div></div>}
function clone(run:ArcadeState){return {...run,servings:{...run.servings},mutations:{...run.mutations},creature:{...run.creature},threat:run.threat?{...run.threat}:null,craving:run.craving?{...run.craving}:null,vent:run.vent?{...run.vent}:null,flame:run.flame?{...run.flame}:null,events:[...run.events],projectiles:[...run.projectiles]};}
export default function Home(){
  const [view,setView]=useState<ArcadeState|null>(null);const [selected,setSelected]=useState<Ingredient>('metal');const [angle,setAngle]=useState<number>(ARENA.defaultAngle);const [active,setActive]=useState(false);const [dialog,setDialog]=useState<'audio'|'help'|'pause'|null>(null);const [audio,setAudio]=useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);const [reduced,setReduced]=useState(false);const [best,setBest]=useState(0);const [bestSeconds,setBestSeconds]=useState(0);const [shiftNo,setShiftNo]=useState(1);const [newBest,setNewBest]=useState(false);
  const runRef=useRef<ArcadeState|null>(null);const engineRef=useRef<MixerAudioEngine|null>(null);const commands=useRef<ArcadeCommand[]>([]);const seenEvent=useRef(0);const shell=useRef<HTMLDivElement>(null);const bestRef=useRef(0);const bestTicks=useRef(0);const angleRef=useRef<number>(ARENA.defaultAngle);const held=useRef(new Set<string>());const manual=useRef(false);const charging=useRef<number|null>(null);const shifts=useRef(0);const hitStop=useRef(0);const reducedRef=useRef(false);
  useEffect(()=>{reducedRef.current=reduced;},[reduced]);
  useEffect(()=>{const engine=createAudioEngine();engineRef.current=engine;const saved=readAudioSettings();applyAudioPatch(engine,saved);const handle=requestAnimationFrame(()=>{setAudio(saved);try{const n=Number(localStorage.getItem('dnfi-arcade-best-v2'));if(Number.isFinite(n)&&n>0){setBest(n);bestRef.current=n;}const t=Number(localStorage.getItem('dnfi-arcade-best-ticks-v2'));if(Number.isFinite(t)&&t>0){bestTicks.current=t;setBestSeconds(Math.floor(t/60));}const motion=localStorage.getItem('dnfi-reduced-motion');setReduced(motion===null?matchMedia('(prefers-reduced-motion: reduce)').matches:motion==='true');}catch{}});return()=>{cancelAnimationFrame(handle);engine.dispose();engineRef.current=null;};},[]);
  const changeAudio=useCallback((patch:Partial<AudioSettings>)=>{engineRef.current?.unlock();if(engineRef.current)applyAudioPatch(engineRef.current,patch);setAudio(prev=>{const next={...prev,...patch};writeAudioSettings(next);return next;});},[]);
  const changeReduced=(v:boolean)=>{setReduced(v);try{localStorage.setItem('dnfi-reduced-motion',String(v));}catch{}};
  const aim=useCallback((v:number)=>{const next=Math.round(Math.max(ARENA.minAngle,Math.min(ARENA.maxAngle,v)));angleRef.current=next;setAngle(next);},[]);
  const start=useCallback(()=>{runRef.current=createArcade(crypto.getRandomValues(new Uint32Array(1))[0]);commands.current=[];seenEvent.current=0;held.current.clear();charging.current=null;hitStop.current=0;try{shifts.current=Number(localStorage.getItem('dnfi-shifts')||0)+1;localStorage.setItem('dnfi-shifts',String(shifts.current));}catch{shifts.current+=1;}setShiftNo(shifts.current);setSelected('metal');aim(ARENA.defaultAngle);setView(clone(runRef.current));setNewBest(false);setDialog(null);setActive(true);engineRef.current?.unlock();engineRef.current?.play('ui-click');requestAnimationFrame(()=>document.querySelector<HTMLCanvasElement>('.game-canvas')?.focus({preventScroll:true}));},[aim]);
  const serve=useCallback((power:number)=>{const run=runRef.current;if(!active||dialog||!run)return;engineRef.current?.unlock();const p=Math.round(Math.max(ARENA.minPower,Math.min(ARENA.maxPower,power)));if(launchFood(run,selected,angleRef.current,p)){commands.current.push({tick:run.tick,kind:'launch',ingredient:selected,angle:angleRef.current,power:p});setView(clone(run));}},[active,dialog,selected]);
  const hatch=useCallback(()=>{const run=runRef.current;if(!active||dialog||!run)return;engineRef.current?.unlock();if(slamHatch(run)){commands.current.push({tick:run.tick,kind:'hatch'});engineRef.current?.play('ui-click');setView(clone(run));}},[active,dialog]);
  useEffect(()=>{if(!active)return;let frame=0,last=performance.now(),remainder=0,lastHud=0;const update=(now:number)=>{const run=runRef.current;if(!run)return;if(!dialog&&!document.hidden){
        // The hit-stop: for three frames after a catch the simulation holds.
        // Time is not banked — the remainder is dropped — so the world resumes
        // at its own pace rather than lurching to catch up. Under reduced
        // motion there is no hold.
        const holding=hitStop.current>0&&!reducedRef.current;
        if(holding){hitStop.current-=1;remainder=0;}
        else remainder+=Math.min(.1,(now-last)/1000)*60;
        const steps=(DEV_HOOKS&&manual.current)||holding?0:Math.floor(remainder);remainder-=steps;const dir=(held.current.has('ArrowRight')||held.current.has('d')?1:0)-(held.current.has('ArrowLeft')||held.current.has('a')?1:0);if(dir&&steps){const aimSteps=Math.floor((run.tick+steps)/2)-Math.floor(run.tick/2);if(aimSteps)aim(angleRef.current+dir*aimSteps);}for(let i=0;i<steps;i++)stepArcade(run);if(charging.current!==null)run.charge=Math.min(1,Math.max(0,(run.tick-charging.current)/ARENA.chargeTicks));else run.charge=0;
        for(const event of run.events){if(event.id<=seenEvent.current)continue;seenEvent.current=event.id;const cue=cueFor(event);if(cue)engineRef.current?.play(cue);if(event.type==='feed'||(event.type==='utensil'&&event.name==='caught'))hitStop.current=HIT_STOP_FRAMES;}
        engineRef.current?.setFrenzy(inFrenzy(run));
        if(now-lastHud>80||run.phase!=='playing'){setView(clone(run));lastHud=now;}}last=now;if(run.phase!=='playing'){setActive(false);engineRef.current?.setFrenzy(false);if(run.score>bestRef.current){bestRef.current=run.score;setBest(run.score);try{localStorage.setItem('dnfi-arcade-best-v2',String(run.score));}catch{}}if(run.tick>bestTicks.current){const hadOne=bestTicks.current>0;bestTicks.current=run.tick;setBestSeconds(Math.floor(run.tick/60));setNewBest(hadOne);try{localStorage.setItem('dnfi-arcade-best-ticks-v2',String(run.tick));}catch{}}return;}frame=requestAnimationFrame(update);};frame=requestAnimationFrame(update);return()=>cancelAnimationFrame(frame);},[active,dialog,aim]);
  useEffect(()=>{engineRef.current?.setPlaying(active&&!dialog);},[active,dialog]);
  useEffect(()=>{const stop=()=>{held.current.clear();if(active)setDialog(current=>current??'pause');};const visibility=()=>{if(document.hidden)stop();};window.addEventListener('blur',stop);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',visibility);};},[active]);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{if(dialog||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='Escape'&&active){e.preventDefault();held.current.clear();setDialog('pause');return;}const target=e.target instanceof HTMLElement?e.target:null;if(target?.closest('input,textarea,select,button,[contenteditable=true]'))return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowLeft','ArrowRight','a','d'].includes(key)&&active){e.preventDefault();held.current.add(key);if(!e.repeat)aim(angleRef.current+(['ArrowRight','d'].includes(key)?1:-1));}if(e.repeat)return;if(['1','2','3'].includes(key)){e.preventDefault();setSelected(FOODS[Number(key)-1]);}if(e.code==='Space'){e.preventDefault();if(active){if(charging.current===null)charging.current=runRef.current?.tick??0;}else start();}
    if((key==='s'||key==='ArrowDown')&&active){e.preventDefault();hatch();}if(key==='r'&&!active){e.preventDefault();start();}};const up=(e:KeyboardEvent)=>{held.current.delete(e.key.length===1?e.key.toLowerCase():e.key);
      if(e.code==='Space'&&charging.current!==null){const from=charging.current;charging.current=null;
        const run=runRef.current;const heldTicks=run?Math.max(0,run.tick-from):0;
        serve(ARENA.minPower+(ARENA.maxPower-ARENA.minPower)*Math.min(1,heldTicks/ARENA.chargeTicks));}};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};},[active,dialog,serve,hatch,start,aim]);
  useEffect(()=>{if(!DEV_HOOKS)return;const bag=devHookBag();if(!bag)return;
    const snapshot=()=>{const run=runRef.current;return run?{tick:run.tick,phase:run.phase,failureReason:run.failureReason,hunger:run.hunger,rage:run.rage,score:run.score,combo:run.combo,bestCombo:run.bestCombo,frenzies:run.frenzies,frenzyUntil:run.frenzyUntil,banks:run.banks,clanks:run.clanks,cooked:run.cooked,utensils:run.utensils,wanted:run.wanted,servings:{...run.servings},mutations:{...run.mutations},threat:run.threat?{...run.threat}:null,craving:run.craving?{...run.craving}:null,flame:run.flame?{...run.flame}:null,benchFireUntil:run.benchFireUntil,creature:{...run.creature},size:run.size,appetite:run.appetite,misses:run.misses,totalFeeds:run.totalFeeds,hatchClosedUntil:run.hatchClosedUntil,hatchReadyAt:run.hatchReadyAt,reloadUntil:run.reloadUntil,vent:run.vent?{...run.vent}:null,ending:run.ending,projectiles:run.projectiles.length,events:run.events.slice(-8).map(e=>({tick:e.tick,type:e.type,label:e.label,name:e.name??null,ingredient:e.ingredient??null}))}:null;};
    bag.play={
      start:(seed=1234)=>{runRef.current=createArcade(seed>>>0);commands.current=[];seenEvent.current=0;held.current.clear();hitStop.current=0;manual.current=true;setSelected('metal');aim(ARENA.defaultAngle);setView(clone(runRef.current));setNewBest(false);setDialog(null);setActive(true);return snapshot();},
      manual:(value:boolean)=>{manual.current=value;},
      step:(count=1)=>{const run=runRef.current;if(!run)return null;for(let i=0;i<count&&run.phase==='playing';i++)stepArcade(run);setView(clone(run));return snapshot();},
      launch:(ingredient:Ingredient,angleValue:number,power?:number)=>{const run=runRef.current;if(!run)return false;setSelected(ingredient);aim(angleValue);const p=Math.round(power??ARENA.defaultPower);const fired=launchFood(run,ingredient,angleValue,p);if(fired)commands.current.push({tick:run.tick,kind:'launch',ingredient,angle:Math.round(angleValue),power:p});setView(clone(run));return fired;},
      hatch:()=>{const run=runRef.current;if(!run)return false;const ok=slamHatch(run);if(ok)commands.current.push({tick:run.tick,kind:'hatch'});setView(clone(run));return ok;},
      select:(ingredient:Ingredient)=>{setSelected(ingredient);},
      // Development only: sets the belly and irritation directly, so a HUD
      // state that takes a hundred seconds of play to reach can be
      // photographed in one frame. It writes state, never rules.
      vitals:(v:{hunger?:number;rage?:number;combo?:number})=>{const run=runRef.current;if(!run)return null;if(v.hunger!==undefined)run.hunger=v.hunger;if(v.rage!==undefined)run.rage=v.rage;if(v.combo!==undefined)run.combo=v.combo;setView(clone(run));return snapshot();},
      // Development only: jumps the creature to a given size so the render
      // budget can be measured at the size it actually costs the most.
      setSize:(value:number)=>{const run=runRef.current;if(!run)return null;run.creature.size=value;run.size=value;setView(clone(run));return snapshot();},
      // Development only: puts the creature straight into a given set of
      // mutation levels so a capture can check what each one looks like.
      // `lift` is honoured; the legacy `clog` and `pressure` are accepted and
      // ignored, since the rules no longer have them.
      setMutations:(levels:{metal?:number;balloon?:number;pepper?:number},extra?:{clog?:number;lift?:number;pressure?:number;track?:number})=>{
        const run=runRef.current;if(!run)return null;
        run.mutations.metal=levels.metal??0;run.mutations.balloon=levels.balloon??0;run.mutations.pepper=levels.pepper??0;
        for(const food of FOODS)run.servings[food]=run.mutations[food]*TUNING.servingsPerLevel;
        if(extra?.lift!==undefined)run.creature.lift=extra.lift;
        if(extra?.track!==undefined)run.creature.track=extra.track;
        setView(clone(run));return snapshot();},
      point:(value:number)=>{aim(value);},
      // Development only: irritation is otherwise only reachable by missing.
      setRage:(value:number)=>{const run=runRef.current;if(!run)return;run.rage=Math.max(0,Math.min(100,value));setView(clone(run));},
      // Development only: holds or releases the charge the way the space bar
      // does, so a capture can show the launcher winding up before a shot.
      hold:(on:boolean,fromTick?:number)=>{const run=runRef.current;charging.current=on?(fromTick??run?.tick??0):null;if(!on&&run)run.charge=0;},
      state:snapshot,
      commands:()=>commands.current.map(item=>({...item})),
      stop:()=>{manual.current=false;setActive(false);},
    };
    return()=>{delete bag.play;};
  },[aim]);
  // The shift is endless, so the clock counts up.
  const seconds=view?Math.floor(view.tick/60):0;
  const traits=view?FOODS.filter(f=>view.mutations[f]>0):[];const ready=active&&!!view&&view.tick-view.lastLaunchTick>=(inFrenzy(view)?ARENA.frenzyCooldownTicks:ARENA.cooldownTicks)&&view.tick>=view.reloadUntil&&view.tick>=view.hatchClosedUntil;const ended=view&&!active;const clock=(total:number)=>`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  // The trajectory guide is a first-shift aid and then it is gone.
  const guideSteps=!active||!view?0:shiftNo<=1?(view.tick<900?34:10):shiftNo<=2?8:0;
  const fullscreen=()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else void shell.current?.requestFullscreen?.().catch(()=>{});};
  return <main><header className="masthead"><div className="brand"><div className="brand-mark" aria-hidden="true">!</div><div><h1>DO NOT FEED IT</h1><p>DEPARTMENT OF QUESTIONABLE APPETITES</p></div></div><div className="header-actions"><span className="practice-label"><i className="status-dot"/> LOCAL PRACTICE</span><button className="icon-button" onClick={()=>changeAudio({muted:!audio.muted})} aria-label={audio.muted?'Unmute sound':'Mute sound'} title={audio.muted?'Unmute':'Mute'}><Icon name={audio.muted?'mute':'sound'}/></button><input className="volume-control" type="range" min="0" max="100" value={Math.round(audio.master*100)} onChange={e=>changeAudio({master:Number(e.target.value)/100})} aria-label="Master volume"/><button className="icon-button" onClick={()=>setDialog('help')} aria-label="How to play" title="How to play"><Icon name="help"/></button><button className="icon-button" onClick={fullscreen} aria-label="Toggle fullscreen" title="Fullscreen"><Icon name="expand"/></button>{active&&<button className="icon-button" onClick={()=>setDialog('pause')} aria-label="Pause game" title="Pause"><Icon name="pause"/></button>}</div></header>
    <div className="game-shell" ref={shell}><section className={`stage ${ended?'is-result':''}`} aria-label="Creature feeding kitchen"><GameCanvas runRef={runRef} angle={angle} selected={selected} playing={active} reduced={reduced} guideSteps={guideSteps} onAim={aim}/><div className="stage-vignette"/>
    <div className="hud"><div className="score-group"><div><div className="hud-label">{active?'SCORE':'BEST SHIFT'}</div><div className="hud-value score">{active?String(view?.score??0).padStart(5,'0'):best>0?String(best).padStart(5,'0'):"-----"}</div></div></div><div className={`hud-timer ${active&&(view?.hunger??100)<25?'low':''}`}><span className="hud-label">{active?'TIME ON SHIFT':ended?'SHIFT LASTED':'NIGHT SHIFT · 004'}</span><div className="hud-value">{active||ended?clock(seconds):bestSeconds>0?clock(bestSeconds):"--:--"}</div></div></div>
    {!active&&!ended&&<div className="start-copy"><div className="section-tag">YOUR SHIFT STARTS HERE</div><h2>DO NOT<br/>FEED <span>IT.</span></h2><p className="lede">It’s hungry. You’re on duty.<br/>Feed the creature. Deal with what it becomes.</p><button className="primary-control" onClick={start}>Start your shift <span className="arrow">→</span></button><p className="start-note">Endless · No wallet needed · Mildly inadvisable</p></div>}
    {ended&&<div className="start-copy result-copy"><div className="section-tag">SHIFT REPORT</div><h2>{newBest?<>STILL<br/><span>EMPLOYED.</span></>:<>YOU’RE<br/><span>THE SNACK.</span></>}</h2><div className="result-cause">{view.failureReason==='empty-belly'?'IT WENT HUNGRY.':view.failureReason==='kitchen-destroyed'?'IT WRECKED THE KITCHEN.':'IT OUTGREW THE KITCHEN.'}</div><p className="lede">{view.announcement}</p><div className="result-score">{clock(Math.floor(view.tick/60))} <span className="hud-label">ON SHIFT</span></div><div className="result-sub">{view.score.toLocaleString()} pts</div>{newBest&&<div className="record">✦ New personal best</div>}<div className="result-stats"><div><small>SNACKS FED</small><strong>{view.totalFeeds}</strong></div><div><small>BEST COMBO</small><strong>×{view.bestCombo}</strong></div><div><small>FRENZIES</small><strong>{view.frenzies}</strong></div><div><small>FINAL SIZE</small><strong>×{view.creature.size.toFixed(2)}</strong></div></div><button className="primary-control" onClick={start}>Another shift <span className="arrow">↗</span></button></div>}
    {active&&view&&traits.length>0&&<div className="trait-stack">{traits.map(f=><div key={`${f}-${view.mutations[f]}`} className={`trait-chip ${f} ${reduced?'':'landed'}`}><span className={`item-art ${f}`}/><span><strong>{TRAITS[f]}</strong></span><em>×{view.mutations[f]}</em></div>)}</div>}
    {!active&&<div className="scene-caption"><div className="subject-name">SPECIMEN 04 · “MUNCH”</div><p>Friendly disposition. Unverified.</p></div>}</section>
    {active?<div className="control-deck"><fieldset className="ingredients"><legend className="sr-only">Load snack</legend>{FOODS.map((food,index)=><button className="ingredient" key={food} aria-pressed={selected===food} onClick={event=>{setSelected(food);engineRef.current?.play('ui-click');if(event.detail>0&&active)document.querySelector<HTMLCanvasElement>('.game-canvas')?.focus({preventScroll:true});}}><span className={`item-art ${food}`} aria-hidden="true"/><span><span className="ingredient-name">{LABELS[food]}</span><span className="ingredient-desc">{TRAITS[food]}</span></span><kbd>{index+1}</kbd></button>)}</fieldset><div className="launch-area"><label className="aim-touch">Aim <input aria-label="Aim angle" type="range" min={ARENA.minAngle} max={ARENA.maxAngle} value={angle} onChange={e=>aim(Number(e.target.value))}/></label><button className="primary-control launch-button" style={{'--reload':`${view?Math.min(100,view.tick<view.reloadUntil?0:(view.tick-view.lastLaunchTick)/(inFrenzy(view)?ARENA.frenzyCooldownTicks:ARENA.cooldownTicks)*100):100}%`,'--charge':`${Math.round((view?.charge??0)*100)}%`} as React.CSSProperties} onPointerDown={()=>{if(active){if(charging.current===null)charging.current=runRef.current?.tick??0;}else start();}} onPointerUp={()=>{if(!active)return;const from=charging.current;charging.current=null;if(from===null)return;const run=runRef.current;const heldTicks=run?Math.max(0,run.tick-from):0;serve(ARENA.minPower+(ARENA.maxPower-ARENA.minPower)*Math.min(1,heldTicks/ARENA.chargeTicks));}} disabled={active&&!ready}>{active?(view&&view.tick<view.reloadUntil?'Jammed':'Launch'):'Clock in'}<kbd>{active?'HOLD SPACE':'↗'}</kbd></button></div></div>:<div className="preflight"><span>AIM. FEED. ADAPT.</span><div className="preflight-foods"><span className="item-art metal"/><span className="item-art balloon"/><span className="item-art pepper"/><p>Three snacks. Unusual side effects.</p></div><button className="text-button" onClick={()=>setDialog('help')}>How to play ↗</button></div>}</div>
    <footer className="underbar"><div className={`keyboard-guide ${active?'':'inactive'}`}><span><kbd>1</kbd> Tin can · Magnet mouth</span><span><kbd>2</kbd> Air puff · Balloon belly</span><span><kbd>3</kbd> Hot pepper · Fire breath</span><span><kbd>SPACE</kbd> Hold to charge, release to launch</span></div><div className="underbar-right"><span>Local practice · Scores saved on this device</span><button className="text-button" onClick={()=>setDialog('audio')}>Sound mix</button><button className="text-button" onClick={()=>setDialog('help')}>Field guide ↗</button></div></footer>
    {dialog==='audio'&&<AudioPanel settings={audio} onChange={changeAudio} onClose={()=>setDialog(null)}/>} {(dialog==='help'||dialog==='pause')&&<Modal kind={dialog} onClose={()=>setDialog(null)} onRestart={start} reduced={reduced} onReduced={changeReduced}/>}
  </main>;
}
