"use client";
import { useEffect, useRef, type RefObject } from "react";
import { ARENA, type ArcadeState, type Ingredient } from "../../lib/game/arcade";
import { createScene } from "../../lib/render/scene";

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
    const draw=(now:number)=>{if(disposed)return;const p=propsRef.current;scene.draw(context,canvas.width,canvas.height,runRef.current,p.angle,p.selected,p.playing,p.reduced,now/1000);frame=requestAnimationFrame(draw);};
    frame=requestAnimationFrame(draw);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();};
  },[runRef]);
  const aim=(clientX:number,clientY:number)=>{const rect=canvasRef.current?.getBoundingClientRect();if(!rect)return;const x=(clientX-rect.left)/rect.width*ARENA.width;const y=(clientY-rect.top)/rect.height*ARENA.height;onAim(Math.round(Math.max(ARENA.minAngle,Math.min(ARENA.maxAngle,Math.atan2(y-ARENA.launcher.y,Math.max(30,x-ARENA.launcher.x))*180/Math.PI))));};
  return <canvas ref={canvasRef} className="game-canvas" aria-label="Feeding kitchen. Aim with arrow keys or drag in the kitchen; launch with Space or the Launch button." onPointerDown={e=>{if(!playing)return;e.currentTarget.setPointerCapture(e.pointerId);aim(e.clientX,e.clientY);e.currentTarget.focus();}} onPointerMove={e=>{if(playing&&e.buttons===1)aim(e.clientX,e.clientY);}} tabIndex={playing?0:-1}/>;
}
