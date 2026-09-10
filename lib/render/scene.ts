import { ARENA, FOODS, getHazard, trajectoryPreview, type ArcadeState, type Ingredient } from '../game/arcade';
import { CreatureAnimator } from './creature/pose';
import { buildRig, type CreatureRig } from './creature/rig';
import { drawCreature } from './creature/draw';
import { DEV_HOOKS, devRender } from '../dev/hook';

const COLORS:Record<Ingredient,string>={metal:'#ddea9c',balloon:'#9be9df',pepper:'#f6a074'};

export function createScene(){
  const kitchen=new Image();kitchen.src='/art/kitchen.png';
  const items=new Image();items.src='/art/ingredients.png';
  const cannon=new Image();cannon.src='/art/launcher.png';
  const masks=new Map<string,HTMLCanvasElement>();
  function masked(source:HTMLImageElement){if(!source.complete||!source.naturalWidth)return null;if(masks.has(source.src))return masks.get(source.src)!;const c=document.createElement('canvas');c.width=source.naturalWidth;c.height=source.naturalHeight;const x=c.getContext('2d')!;x.drawImage(source,0,0);const data=x.getImageData(0,0,c.width,c.height);for(let i=0;i<data.data.length;i+=4){const b=Math.max(data.data[i],data.data[i+1],data.data[i+2]);data.data[i+3]=Math.round(Math.min(1,Math.max(0,(b-34)/28))*255);}x.putImageData(data,0,0);masks.set(source.src,c);return c;}

  // The creature rig is cut from the same painting, once, on the first frame
  // after it decodes. It is presentation only and keeps its own clock.
  let rig:CreatureRig|null=null;
  let rigFailed=false;
  const animator=new CreatureAnimator();
  let lastTime=-1;

  let previewKey='';let guide:{x:number;y:number}[]=[];
  function item(ctx:CanvasRenderingContext2D,ingredient:Ingredient,x:number,y:number,size:number,rotation=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
    if(items.complete&&items.naturalWidth){const w=items.naturalWidth/3;ctx.shadowColor='#0008';ctx.shadowBlur=3;ctx.drawImage(masked(items)??items,w*FOODS.indexOf(ingredient),0,w,items.naturalHeight,-size/2,-size/2,size,size);}
    else{ctx.fillStyle=COLORS[ingredient];ctx.beginPath();ctx.arc(0,0,size*.2,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  function draw(ctx:CanvasRenderingContext2D,width:number,height:number,state:ArcadeState|null,angle:number,selected:Ingredient,playing:boolean,reduced:boolean,time:number){
    ctx.setTransform(width/1200,0,0,height/700,0,0);ctx.clearRect(0,0,1200,700);
    const delta=lastTime<0?1/60:Math.min(0.05,Math.max(0.0005,time-lastTime));lastTime=time;
    const tick=state?.tick??0;const m=playing?state?.mutation:null;const active=m?.phase==='active';
    const recent=playing?(state?.events.filter(e=>tick-e.tick<65)??[]):[];
    if(kitchen.complete&&kitchen.naturalWidth){
      if(!rig&&!rigFailed){try{rig=buildRig(kitchen);}catch{rigFailed=true;}}
      // Base layer is the rig's own copy once it exists, so an undisplaced warp
      // cell is a no-op and can be skipped rather than redrawn.
      ctx.drawImage(rig?rig.art:kitchen,0,0,1200,700);
      if(rig){
        const pose=animator.step(state,playing,reduced,time,delta,!(DEV_HOOKS&&devRender.holdBlink));
        drawCreature(ctx,rig,pose,time,reduced);
      }
    }
    const shade=ctx.createLinearGradient(0,0,800,0);shade.addColorStop(0,playing?'#06121255':'#061212bb');shade.addColorStop(1,'#06121200');ctx.fillStyle=shade;ctx.fillRect(0,0,1200,700);
    if(!reduced){ctx.save();for(let i=0;i<22;i++){const x=(i*131.3+time*(3+i%4))%1200;const y=110+(i*79.7-time*(4+i%3))%510;ctx.fillStyle=i%3===0?'#f4c88c35':'#d6ecd21b';ctx.beginPath();ctx.arc(x,y,1+i%2,0,Math.PI*2);ctx.fill();}ctx.restore();}
    if(playing&&state&&!(DEV_HOOKS&&devRender.hideAim)){
      const key=`${Math.floor(tick/6)}-${angle}-${selected}`;if(key!==previewKey){guide=trajectoryPreview(state,selected,angle);previewKey=key;}
      guide.forEach((p,i)=>{ctx.fillStyle=`rgba(224,244,190,${.85-i/guide.length*.55})`;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1.3,3-i*.12),0,Math.PI*2);ctx.fill();});
      // A calibrated target is subtle, and always agrees with collision geometry.
      ctx.save();ctx.strokeStyle='#eff4bd44';ctx.lineWidth=1;ctx.setLineDash([5,12]);ctx.beginPath();ctx.ellipse(ARENA.mouth.x,ARENA.mouth.y,ARENA.mouth.rx,ARENA.mouth.ry,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    const hazard=playing?getHazard(tick):null;
    if(hazard){ctx.save();const {x,y,width:w,height:h,warning}=hazard;ctx.fillStyle='#101d1c';ctx.fillRect(x-16,18,w+32,15);ctx.fillStyle='#22322f';ctx.fillRect(x-16,18,w+32,4);ctx.strokeStyle='#2c3a36';ctx.lineWidth=1;ctx.strokeRect(x-16,18,w+32,15);ctx.strokeStyle='#4a5a54';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+3,33);ctx.lineTo(x+3,y);ctx.moveTo(x+w-3,33);ctx.lineTo(x+w-3,y);ctx.stroke();ctx.fillStyle=warning?'#ffcf7a':'#7f9a6a';ctx.beginPath();ctx.arc(x+w/2,25,3.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=warning?.35:1;const metal=ctx.createLinearGradient(x,0,x+w,0);metal.addColorStop(0,'#182827');metal.addColorStop(.35,'#7b8d77');metal.addColorStop(.55,'#354b43');metal.addColorStop(1,'#122723');ctx.fillStyle=metal;ctx.shadowColor='#000';ctx.shadowBlur=14;ctx.shadowOffsetX=5;ctx.shadowOffsetY=4;ctx.fillRect(x,y,w,h);ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
      // Amber light from the kitchen catches the right edge of the flap.
      const rim=ctx.createLinearGradient(x,0,x+w,0);rim.addColorStop(0,'#00000055');rim.addColorStop(.7,'#00000000');rim.addColorStop(1,'#f0b06a66');ctx.fillStyle=rim;ctx.fillRect(x,y,w,h);
      ctx.strokeStyle='#c0b67e';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);ctx.fillStyle='#d1b15e';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x,y+9+i*22);ctx.lineTo(x+w,y+i*22);ctx.lineTo(x+w,y+7+i*22);ctx.lineTo(x,y+16+i*22);ctx.fill();}ctx.restore();}
    if(m){
      // Effects support the pose; the creature itself carries the mutation.
      const color=COLORS[m.ingredient];const pulse=reduced?.55:.5+.5*Math.sin(time*6);
      ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=active?.6:.2+pulse*.3;
      if(m.ingredient==='metal'){
        if(active){ctx.save();ctx.beginPath();ctx.rect(0,0,ARENA.mouth.x-190,700);ctx.clip();
          if(!reduced){for(let i=0;i<4;i++){const r=85+((time*35+i*35)%145);ctx.globalAlpha=.32*(1-(r-85)/145);ctx.beginPath();ctx.ellipse(ARENA.mouth.x,ARENA.mouth.y,r,r*.65,0,Math.PI*.63,Math.PI*1.37);ctx.stroke();}}
          else{ctx.globalAlpha=.28;ctx.beginPath();ctx.ellipse(ARENA.mouth.x,ARENA.mouth.y,150,98,0,Math.PI*.63,Math.PI*1.37);ctx.stroke();}
          ctx.restore();}
      }else if(m.ingredient==='balloon'){
        // Lift reads on the creature itself; the kitchen only gets a faint
        // shimmer of rising air rather than a row of pasted arrow glyphs.
        ctx.strokeStyle='#9cecdf';ctx.lineWidth=1.4;for(let i=0;i<7;i++){const y=470-((reduced?90:time*46)+i*44)%230;const x=560+i*26;ctx.globalAlpha=.1+(470-y)/1500;ctx.beginPath();ctx.moveTo(x,y+18);ctx.quadraticCurveTo(x+5,y+9,x,y);ctx.stroke();}
      }
      // The headwind is drawn on the creature, as breath leaving its mouth;
      // free-floating arrows in the room read as leftover interface.
      ctx.restore();
    }
    if(playing){
      const {x,y}=ARENA.launcher;const recoil=state?Math.max(0,1-(tick-state.lastLaunchTick)/12)*9:0;
      ctx.save();ctx.translate(x,y);ctx.shadowColor='#0009';ctx.shadowBlur=20;ctx.fillStyle='#071011';ctx.beginPath();ctx.ellipse(0,42,74,15,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      const base=ctx.createLinearGradient(0,10,0,43);base.addColorStop(0,'#68776b');base.addColorStop(.35,'#2b3c37');base.addColorStop(1,'#10211f');ctx.fillStyle=base;ctx.beginPath();ctx.roundRect(-50,12,100,35,8);ctx.fill();ctx.strokeStyle='#465448';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='#b6c980';for(let i=0;i<4;i++)ctx.fillRect(-35+i*18,34,9,3);
      const pivot=ctx.createRadialGradient(-5,8,2,0,13,25);pivot.addColorStop(0,'#8b9275');pivot.addColorStop(.3,'#4e6353');pivot.addColorStop(1,'#0c211e');ctx.fillStyle=pivot;ctx.beginPath();ctx.arc(0,13,24,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b5aa76';ctx.beginPath();ctx.arc(0,13,5,0,Math.PI*2);ctx.fill();
      ctx.rotate(angle*Math.PI/180);ctx.translate(-recoil,0);
      if(cannon.complete&&cannon.naturalWidth){ctx.drawImage(masked(cannon)??cannon,90,360,1100,480,-64,-40,140,70);}ctx.restore();
      if(!state||tick-state.lastLaunchTick>=ARENA.cooldownTicks)item(ctx,selected,x,y,47,angle*Math.PI/180);
    }
    if(playing)state?.projectiles.forEach(p=>{
      // A dark snack crossing the dark half of the room disappears at stream
      // bitrate, so it carries its own light.
      ctx.save();const glow=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,42);const tint=COLORS[p.ingredient];
      glow.addColorStop(0,`${tint}66`);glow.addColorStop(.45,`${tint}22`);glow.addColorStop(1,`${tint}00`);
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,42,0,Math.PI*2);ctx.fill();ctx.restore();if(active&&m.ingredient==='metal'&&p.assisted){ctx.save();ctx.strokeStyle='#d4f7b54a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+ARENA.mouth.x)/2,p.y-45,ARENA.mouth.x,ARENA.mouth.y);ctx.stroke();ctx.restore();}ctx.save();ctx.strokeStyle=COLORS[p.ingredient];ctx.globalAlpha=.55;ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-p.vx*3.2,p.y-p.vy*3.2);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.globalAlpha=.9;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(p.x-p.vx*1.6,p.y-p.vy*1.6);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();item(ctx,p.ingredient,p.x,p.y,48,reduced?0:p.age*.065);});
    // A missed snack stays on the floor for a moment. Without it, a miss and a
    // catch look the same on a stream: the creature reacts and nothing else
    // changes.
    for(const e of recent){if(e.type!=='miss')continue;const age=tick-e.tick;const rest=Math.min(ARENA.floor-4,e.y+age*1.6);
      ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(70-age)/26));
      ctx.fillStyle='#040908a0';ctx.beginPath();ctx.ellipse(e.x,rest+12,34,8,0,0,Math.PI*2);ctx.fill();
      ctx.translate(e.x,rest);ctx.rotate(.42);ctx.scale(1,.72);
      item(ctx,e.ingredient??selected,0,0,54);ctx.restore();
      if(!reduced&&age<22){ctx.save();ctx.globalAlpha=Math.max(0,(22-age)/44);ctx.fillStyle='#cbbfa855';
        for(let i=0;i<5;i++){const a=Math.PI+i*.6;const r=8+age*2.4;ctx.beginPath();ctx.arc(e.x+Math.cos(a)*r,rest-Math.abs(Math.sin(a))*r*.5,Math.max(0,5-age/5),0,Math.PI*2);ctx.fill();}ctx.restore();}
    }

    // Score pops are UI, so they read as UI: a pill above the action rather
    // than loose text composited over the creature's body.
    for(const e of recent){const age=tick-e.tick;if(e.type==='feed'||e.type==='miss'||e.type==='bounce'){
      const good=e.type==='feed';const y=good?Math.max(74,86-(reduced?0:age*.4)):Math.max(70,e.y-46-(reduced?0:age*.55));
      // Hold the pop at full strength for most of its life and fade only at the
      // end: a pill that spends its time half-transparent reads as a draw bug.
      ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(65-age)/9));ctx.font=`bold ${good?18:14}px 'Helvetica Neue',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      const w=ctx.measureText(e.label).width+22;const x=Math.max(w/2+16,Math.min(1184-w/2,e.x));
      ctx.fillStyle='#050d0cf2';ctx.strokeStyle=good?'#cfe89066':'#e5a97a55';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(x-w/2,y-13,w,26,13);ctx.fill();ctx.stroke();
      ctx.fillStyle=good?'#efffc3':'#ffc698';ctx.fillText(e.label,x,y+1);ctx.textBaseline='alphabetic';
      if(!reduced&&age<26){ctx.globalAlpha*=Math.max(0,1-age/26);for(let i=0;i<7;i++){const a=i*2.4+age*.02;const r=6+age*2.1;ctx.fillStyle=good?COLORS[selected]:'#cd9b73';ctx.beginPath();ctx.arc(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r*.7+age*.4,Math.max(0,2.2-age/13),0,Math.PI*2);ctx.fill();}}ctx.restore();
    }}
  }
  const ready=()=>[kitchen,items,cannon].every(image=>image.complete&&image.naturalWidth>0)&&(rig!==null||rigFailed);
  /** Development inspection only: hands back the built rig for review tooling. */
  const debugRig=()=>rig;
  /** Development only: advances the performance without drawing, so a capture
   *  harness can settle the springs at a frozen clock. */
  const warm=(state:ArcadeState|null,playing:boolean,reduced:boolean,time:number,delta:number)=>{animator.step(state,playing,reduced,time,delta,!(DEV_HOOKS&&devRender.holdBlink));};
  return {draw,ready,debugRig,warm};
}
