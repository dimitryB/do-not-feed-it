"use client";
import { useEffect, useRef, type RefObject } from "react";
import { ARENA, type ArcadeState, type Ingredient } from "../../lib/game/arcade";
import { createScene } from "../../lib/render/scene";
import { DEV_HOOKS, devHookBag, devRender, drawCostSummary, recordDrawCost, resetDrawCost } from "../../lib/dev/hook";

export function GameCanvas({runRef,angle,selected,playing,reduced,onAim}:{runRef:RefObject<ArcadeState|null>;angle:number;selected:Ingredient;playing:boolean;reduced:boolean;onAim:(angle:number)=>void}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const propsRef=useRef({angle,selected,playing,reduced});
  useEffect(()=>{propsRef.current={angle,selected,playing,reduced};},[angle,selected,playing,reduced]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const context=canvas.getContext('2d');if(!context)return;
    const scene=createScene();let frame=0;let disposed=false;
    const resize=()=>{const rect=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);};
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    const draw=(now:number)=>{
      if(disposed)return;
      const p=propsRef.current;
      let time=now/1000,state=runRef.current,aim=p.angle,food=p.selected,live=p.playing,motion=p.reduced;
      if(DEV_HOOKS){
        if(devRender.clock!==null)time=devRender.clock;
        if(devRender.reduced!==null)motion=devRender.reduced;
        const pose=devRender.pose;
        if(pose){state=pose.state;aim=pose.angle;food=pose.selected;live=pose.playing;}
      }
      const started=performance.now();
      scene.draw(context,canvas.width,canvas.height,state,aim,food,live,motion,time);
      if(DEV_HOOKS)recordDrawCost(performance.now()-started);
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    let detachHooks:(()=>void)|undefined;
    if(DEV_HOOKS){
      const bag=devHookBag();
      if(bag){
        bag.pose=async(id:string,options?:{t?:number})=>{
          const {buildPose,CREATURE_STATE_IDS}=await import("../../lib/dev/poses");
          if(!(CREATURE_STATE_IDS as readonly string[]).includes(id))throw new Error(`Unknown creature state: ${id}`);
          devRender.pose=buildPose(id as never,options?.t??0);
          return id;
        };
        bag.states=async()=>{
          const {CREATURE_STATE_IDS}=await import("../../lib/dev/poses");
          return [...CREATURE_STATE_IDS];
        };
        bag.clearPose=()=>{devRender.pose=null;};
        // Settle the springs at a frozen clock: replay the run-up to `t` so a
        // still capture shows the pose the performance actually arrives at.
        bag.settle=async(id:string,t:number,seconds=1.1,clock=12)=>{
          const {buildPose}=await import("../../lib/dev/poses");
          const steps=Math.round(seconds*60);
          for(let step=steps;step>=0;step--){
            const at=t-step/60;
            const frame=buildPose(id as never,at);
            devRender.pose=frame;
            devRender.clock=clock+at;
            scene.warm(frame.state,frame.playing,devRender.reduced??false,clock+at,1/60);
          }
          devRender.clock=clock+t;
          devRender.pose=buildPose(id as never,t);
          return id;
        };
        bag.clock=(seconds:number|null)=>{devRender.clock=seconds;};
        bag.reduced=(value:boolean|null)=>{devRender.reduced=value;};
        bag.hideAim=(value:boolean)=>{devRender.hideAim=value;};bag.hideLabels=(value:boolean)=>{devRender.hideLabels=value;};
        bag.holdBlink=(value:boolean)=>{devRender.holdBlink=value;};
        bag.timing=()=>drawCostSummary();
        bag.resetTiming=()=>{resetDrawCost();};
        bag.sceneReady=()=>scene.ready();
        bag.rigDump=(part:string)=>{
          const built=scene.debugRig();
          if(!built)return null;
          const parts:Record<string,HTMLCanvasElement|undefined>={
            art:built.art,tooth:built.tooth.canvas,tongue:built.tongue.canvas,
            pupilLeft:built.pupil.left.canvas,lidLeft:built.lidUpper.left.canvas,
          };
          return parts[part]?.toDataURL('image/png')??null;
        };
        bag.canvasSize=()=>({width:canvas.width,height:canvas.height});
        // The mouth the rig drew on the last frame, in arena coordinates. Used
        // by scripts/mouth-calibrate.mjs to keep the rules' collision ellipse
        // and the drawn mouth the same object.
        bag.mouthBox=async()=>{const {lastMouth}=await import("../../lib/render/creature/draw");return {...lastMouth};};
        detachHooks=()=>{delete bag.mouthBox;delete bag.sceneReady;delete bag.canvasSize;delete bag.rigDump;delete bag.settle;delete bag.hideAim;delete bag.hideLabels;delete bag.holdBlink;};
      }
    }
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();detachHooks?.();};
  },[runRef]);
  const aim=(clientX:number,clientY:number)=>{const rect=canvasRef.current?.getBoundingClientRect();if(!rect)return;const x=(clientX-rect.left)/rect.width*ARENA.width;const y=(clientY-rect.top)/rect.height*ARENA.height;onAim(Math.round(Math.max(ARENA.minAngle,Math.min(ARENA.maxAngle,Math.atan2(y-ARENA.launcher.y,Math.max(30,x-ARENA.launcher.x))*180/Math.PI))));};
  return <canvas ref={canvasRef} className="game-canvas" aria-label="Feeding kitchen. Aim with arrow keys or drag in the kitchen; launch with Space or the Launch button." onPointerDown={e=>{if(!playing)return;e.currentTarget.setPointerCapture(e.pointerId);aim(e.clientX,e.clientY);e.currentTarget.focus();}} onPointerMove={e=>{if(playing&&e.buttons===1)aim(e.clientX,e.clientY);}} tabIndex={playing?0:-1}/>;
}
