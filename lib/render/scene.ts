import { ARENA, FOODS, getHazard, trajectoryPreview, type ArcadeState, type Ingredient } from '../game/arcade';
import { CreatureAnimator } from './creature/pose';
import { buildRig, type CreatureRig } from './creature/rig';
import { drawCreature } from './creature/draw';
import { DEV_HOOKS, devRender } from '../dev/hook';

const COLORS:Record<Ingredient,string>={metal:'#ddea9c',balloon:'#9be9df',pepper:'#f6a074'};
const clampAlpha=(v:number)=>v<0?0:v>1?1:v;

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
    const tick=state?.tick??0;const levels=playing?state?.mutations:null;const creature=playing?state?.creature:null;
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
    }
    // The target ring is the collision ellipse, drawn where it actually is: it
    // grows, leans and rises with the creature, and it is only lit while the
    // mouth is open far enough to accept a serving. This is the visual twin of
    // the timing rule, not a decoration.
    if(playing&&state&&!(DEV_HOOKS&&devRender.hideAim)){
      const c=state.creature;const taking=c.open>=0.5;
      ctx.save();
      // The face: where a snack will hit something. Always dim, always there.
      ctx.lineWidth=1;ctx.setLineDash([5,12]);ctx.strokeStyle='#eff4bd2e';
      ctx.beginPath();ctx.ellipse(c.x,c.y,c.rx,c.ry,0,0,Math.PI*2);ctx.stroke();
      // The gap: where a snack will actually go in. Lit only while it is open
      // wide enough to accept one, and exactly the shape the rules test.
      const gap=Math.max(.3,c.open);
      ctx.setLineDash([]);ctx.lineWidth=taking?2.4:1.2;
      ctx.strokeStyle=taking?`rgba(216,248,150,${.5+.22*(reduced?0:Math.abs(Math.sin(time*5)))})`:'#eff4bd22';
      ctx.beginPath();ctx.ellipse(c.x,c.y,c.rx,c.ry*gap,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    const hazard=playing?getHazard(tick):null;
    if(hazard){ctx.save();const {x,y,width:w,height:h,warning}=hazard;const cx=x+w/2;const t=reduced?0:time;ctx.save();ctx.filter='blur(12px)';const col=ctx.createLinearGradient(x-16,0,x+w+16,0);col.addColorStop(0,'rgba(196,222,224,0)');col.addColorStop(.5,`rgba(214,236,238,${warning?.09:.26})`);col.addColorStop(1,'rgba(196,222,224,0)');ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(cx,y+h/2,w*.8,h*.62,0,0,Math.PI*2);ctx.fill();ctx.restore();const rolls=warning?4:9;const speed=warning?26:74;for(let i=0;i<rolls;i++){const f=((t*speed+i*(h+60)/rolls)%(h+60))/(h+60);const yy=y+h+30-f*(h+60);const r=(warning?13:20)+f*(warning?16:34);const a=(warning?.16:.42)*Math.sin(Math.PI*Math.min(1,f*1.15));const puff=ctx.createRadialGradient(cx+Math.sin(f*7+i)*11,yy,1,cx+Math.sin(f*7+i)*11,yy,r);puff.addColorStop(0,`rgba(236,250,250,${a})`);puff.addColorStop(.55,`rgba(196,226,230,${a*.5})`);puff.addColorStop(1,'rgba(180,210,216,0)');ctx.fillStyle=puff;ctx.beginPath();ctx.ellipse(cx+Math.sin(f*7+i)*11,yy,r,r*.82,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#0b1414';ctx.fillRect(x-4,y+h+22,w+8,9);ctx.strokeStyle='#46564e';ctx.lineWidth=1;ctx.strokeRect(x-3.5,y+h+22.5,w+7,8);ctx.fillStyle='#050a0a';for(let i=0;i<5;i++)ctx.fillRect(x-1+i*(w+4)/5,y+h+24,3,5);if(!warning){ctx.globalCompositeOperation='screen';ctx.globalAlpha=.5+(reduced?0:.2*Math.sin(t*7));const lead=ctx.createLinearGradient(0,y+h+22,0,y+h-30);lead.addColorStop(0,'rgba(226,248,244,.75)');lead.addColorStop(1,'rgba(200,232,232,0)');ctx.fillStyle=lead;ctx.fillRect(x-10,y+h-30,w+20,52);}ctx.restore();}
    if(levels&&creature){
      // Effects support the rule; the creature carries it. Each of these is
      // keyed off a permanent level, so a stacked creature shows all of them.
      ctx.save();
      if(levels.metal>0){
        // The pull, drawn as field lines reaching back into the room — and only
        // as far as the magnet actually reaches.
        const range=360+70*levels.metal;
        ctx.save();ctx.beginPath();ctx.rect(0,0,creature.x-creature.rx*0.5,700);ctx.clip();
        ctx.strokeStyle=COLORS.metal;ctx.lineWidth=2;
        const rings=reduced?2:4;
        for(let i=0;i<rings;i++){const r=110+((reduced?90:time*40)+i*range/rings)%range;
          ctx.globalAlpha=.3*levels.metal/3*(1-(r-110)/range);
          ctx.beginPath();ctx.ellipse(creature.x,creature.y,r,r*.68,0,Math.PI*.6,Math.PI*1.4);ctx.stroke();}
        ctx.restore();
      }
      if(levels.balloon>0&&creature.lift>1){
        // Rising air under a creature that is leaving the counter.
        ctx.strokeStyle='#9cecdf';ctx.lineWidth=1.6;
        for(let i=0;i<8;i++){const y=creature.y+150-((reduced?110:time*64)+i*40)%250;const x=creature.x-150+i*40;
          ctx.globalAlpha=.08+creature.lift/300;ctx.beginPath();ctx.moveTo(x,y+20);ctx.quadraticCurveTo(x+6,y+10,x,y);ctx.stroke();}
        // How close the burp is. A shrinking arc above the head, so the drop is
        // something the player can see coming.
        if(creature.pressure>.35){ctx.globalAlpha=.25+creature.pressure*.5;ctx.strokeStyle='#bdf3e6';ctx.lineWidth=4;
          ctx.beginPath();ctx.arc(creature.x,creature.y-creature.ry-56,44,Math.PI*1.15,Math.PI*1.15+Math.PI*.7*creature.pressure);ctx.stroke();}
      }
      if(levels.pepper>0){
        ctx.globalAlpha=.1+.08*levels.pepper*(reduced?1:.6+.4*Math.sin(time*4));
        const heat=ctx.createRadialGradient(creature.x,creature.y,10,creature.x,creature.y,creature.rx*2.4);
        heat.addColorStop(0,'#f6a074');heat.addColorStop(1,'#f6a07400');ctx.fillStyle=heat;
        ctx.beginPath();ctx.arc(creature.x,creature.y,creature.rx*2.4,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
      // Cutlery in the teeth: the gap the player is aiming at, with a bite
      // taken out of it.
      if(creature.clog>0.02){
        ctx.save();ctx.globalAlpha=.55;ctx.fillStyle='#cfd8c4';
        const n=Math.round(creature.clog*9);
        for(let i=0;i<n;i++){const a=Math.PI*(0.15+i*0.78);const r=creature.rx*.72;
          ctx.save();ctx.translate(creature.x+Math.cos(a)*r,creature.y+Math.sin(a)*r*.55);ctx.rotate(a*1.7);
          ctx.fillRect(-13,-2,26,4);ctx.fillRect(-3,-7,6,14);ctx.restore();}
        ctx.restore();
      }
    }
    // A serving on its way back. It has to be unmistakable and it has to be
    // visible early, because the answer to it is a reaction.
    if(playing&&state){for(const p of state.projectiles){if(p.kind!=='spit')continue;
      ctx.save();ctx.globalAlpha=.8;ctx.strokeStyle='#ffb27a';ctx.lineWidth=3;ctx.setLineDash([9,7]);
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+p.vx*9,p.y+p.vy*9);ctx.stroke();ctx.restore();}}
    if(playing&&state?.threat){
      const t=state.threat;const near=clampAlpha((t.tick-tick)/60);
      ctx.save();ctx.globalAlpha=.35+.4*(reduced?.6:Math.abs(Math.sin(time*9)));
      ctx.strokeStyle='#ffb27a';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(ARENA.launcher.x,ARENA.launcher.y-6,50+near*22,0,Math.PI*2);ctx.stroke();ctx.restore();
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
      if(p.kind==='junk'){
        // Kitchen metal on its way into the teeth. Deliberately not a snack: a
        // spectator has to see that this is the room being eaten, not a shot.
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.age*.09);
        ctx.fillStyle='#c3cdb8';ctx.strokeStyle='#6f7a68';ctx.lineWidth=1;
        ctx.fillRect(-16,-2.5,32,5);ctx.strokeRect(-16,-2.5,32,5);
        ctx.beginPath();ctx.ellipse(14,0,8,6,0,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.restore();
        ctx.save();ctx.strokeStyle='#ddea9c66';ctx.lineWidth=1.4;ctx.setLineDash([4,6]);
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo((creature?.x??ARENA.mouth.x),(creature?.y??ARENA.mouth.y));ctx.stroke();ctx.restore();
        return;
      }
      // A dark snack crossing the dark half of the room disappears at stream
      // bitrate, so it carries its own light.
      ctx.save();const glow=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,42);const tint=COLORS[p.ingredient];
      glow.addColorStop(0,`${tint}66`);glow.addColorStop(.45,`${tint}22`);glow.addColorStop(1,`${tint}00`);
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,42,0,Math.PI*2);ctx.fill();ctx.restore();if(levels&&levels.metal>0&&p.ingredient==='metal'&&p.assisted&&p.kind!=='spit'){ctx.save();ctx.strokeStyle='#d4f7b54a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+(creature?.x??ARENA.mouth.x))/2,p.y-45,creature?.x??ARENA.mouth.x,creature?.y??ARENA.mouth.y);ctx.stroke();ctx.restore();}ctx.save();ctx.strokeStyle=COLORS[p.ingredient];ctx.globalAlpha=.55;ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-p.vx*3.2,p.y-p.vy*3.2);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.globalAlpha=.9;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(p.x-p.vx*1.6,p.y-p.vy*1.6);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();item(ctx,p.ingredient,p.x,p.y,48,reduced?0:p.age*.065);});
    // A missed snack stays on the floor for a moment. Without it, a miss and a
    // catch look the same on a stream: the creature reacts and nothing else
    // changes.
    for(const e of recent){if(e.type!=='miss')continue;const age=tick-e.tick;const rest=Math.min(ARENA.floor-4,e.y+age*1.6);
      // Only once it is actually on the floor. A snack that stopped against the
      // creature's chest used to be drawn where it stopped, which pinned a
      // decal on its face and left others hanging in mid-air.
      if(rest<ARENA.floor-30)continue;
      ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(70-age)/26));
      ctx.fillStyle='#040908a0';ctx.beginPath();ctx.ellipse(e.x,rest+12,34,8,0,0,Math.PI*2);ctx.fill();
      ctx.translate(e.x,rest);ctx.rotate(.42);ctx.scale(1,.72);
      item(ctx,e.ingredient??selected,0,0,54);ctx.restore();
      if(!reduced&&age<22){ctx.save();ctx.globalAlpha=Math.max(0,(22-age)/44);ctx.fillStyle='#cbbfa855';
        for(let i=0;i<5;i++){const a=Math.PI+i*.6;const r=8+age*2.4;ctx.beginPath();ctx.arc(e.x+Math.cos(a)*r,rest-Math.abs(Math.sin(a))*r*.5,Math.max(0,5-age/5),0,Math.PI*2);ctx.fill();}ctx.restore();}
    }

    // Score pops are UI, so they read as UI: a pill above the action rather
    // than loose text composited over the creature's body.
    // Score pops are UI, so they read as UI: a pill above the action rather
    // than loose text composited over the creature's body. At most three at a
    // time and never on top of each other — five of them landing together was
    // rendering as one unreadable smear.
    if(!(DEV_HOOKS&&devRender.hideLabels)){
      const pills=recent.filter(e=>e.type==='feed'||e.type==='miss'||e.type==='bounce'||e.type==='snub'||e.type==='grow'||e.type==='clog'||e.type==='sneeze'||e.type==='hit'||e.type==='spit'||e.type==='mutation'||e.type==='burp').slice(-3);
      const taken:{x:number;y:number;w:number}[]=[];
      pills.forEach((e)=>{const age=tick-e.tick;
        const good=e.type==='feed'||e.type==='sneeze'||e.type==='burp';
        const loud=e.type==='mutation'||e.type==='hit'||e.type==='spit';
        ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(65-age)/9));
        ctx.font=`bold ${good||loud?18:14}px 'Helvetica Neue',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
        const w=ctx.measureText(e.label).width+22;
        let y=good?Math.max(74,86-(reduced?0:age*.4)):Math.max(70,e.y-46-(reduced?0:age*.55));
        const x=Math.max(w/2+16,Math.min(1184-w/2,e.x));
        // Push down until it is clear of anything already placed this frame.
        for(let guard=0;guard<4;guard++){
          const hit=taken.find(t=>Math.abs(t.y-y)<30&&Math.abs(t.x-x)<(t.w+w)/2+8);
          if(!hit)break;y=hit.y+32;}
        taken.push({x,y,w});
        ctx.fillStyle='#050d0cf2';ctx.strokeStyle=loud?'#ffc59866':good?'#cfe89066':'#e5a97a55';ctx.lineWidth=loud?2:1;
        ctx.beginPath();ctx.roundRect(x-w/2,y-13,w,26,13);ctx.fill();ctx.stroke();
        ctx.fillStyle=loud?'#ffd7ad':good?'#efffc3':'#ffc698';ctx.fillText(e.label,x,y+1);ctx.textBaseline='alphabetic';
        if(!reduced&&age<26&&good){ctx.globalAlpha*=Math.max(0,1-age/26);for(let i=0;i<7;i++){const a=i*2.4+age*.02;const r=6+age*2.1;ctx.fillStyle=COLORS[e.ingredient??selected];ctx.beginPath();ctx.arc(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r*.7+age*.4,Math.max(0,2.2-age/13),0,Math.PI*2);ctx.fill();}}
        ctx.restore();
      });
    }
    // The two meters that decide the run, drawn where the player is looking.
    if(playing&&state){
      const c=state.creature;const w=210;const x=c.x-w/2;const y=Math.min(452,c.y+c.ry+34);
      ctx.save();
      for(const [i,bar] of ([['FULLNESS',state.hunger/100,state.hunger<25?'#eea66d':'#dded92'],['IRRITATION',state.rage/100,state.rage>=70?'#e4674f':'#de9770']] as const).entries()){
        const by=y+i*17;
        ctx.globalAlpha=.8;ctx.fillStyle='#050d0cc0';ctx.beginPath();ctx.roundRect(x-4,by-6,w+8,12,6);ctx.fill();
        ctx.globalAlpha=1;ctx.fillStyle='#2c382f';ctx.fillRect(x,by-2,w,4);
        ctx.fillStyle=bar[2];ctx.fillRect(x,by-2,Math.max(2,w*Math.min(1,Math.max(0,bar[1]))),4);
        ctx.font="600 9px ui-monospace,monospace";ctx.textAlign='left';ctx.fillStyle='#9daaa2';ctx.fillText(bar[0],x,by-8);
      }
      ctx.restore();
    }
  }
  const ready=()=>[kitchen,items,cannon].every(image=>image.complete&&image.naturalWidth>0)&&(rig!==null||rigFailed);
  /** Development inspection only: hands back the built rig for review tooling. */
  const debugRig=()=>rig;
  /** Development only: advances the performance without drawing, so a capture
   *  harness can settle the springs at a frozen clock. */
  const warm=(state:ArcadeState|null,playing:boolean,reduced:boolean,time:number,delta:number)=>{animator.step(state,playing,reduced,time,delta,!(DEV_HOOKS&&devRender.holdBlink));};
  return {draw,ready,debugRig,warm};
}
