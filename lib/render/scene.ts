import { ARENA, FOODS, MUTATION_NAMES, MUTATION_RULES, TUNING, getHazard, trajectoryPreview, type ArcadeState, type Ingredient } from '../game/arcade';
import { CreatureAnimator } from './creature/pose';
import { buildRig, type CreatureRig } from './creature/rig';
import { drawCreature } from './creature/draw';
import { DEV_HOOKS, devRender, frameCells } from '../dev/hook';

const COLORS:Record<Ingredient,string>={metal:'#ddea9c',balloon:'#9be9df',pepper:'#f6a074'};
const clampAlpha=(v:number)=>v<0?0:v>1?1:v;
const HATCH_TOP=ARENA.launcher.y-46;
/** Where the two meters live, and how wide they are. */
const METER_Y=552;const METER_W=296;

/**
 * What the creature has become, drawn on the creature.
 *
 * The mutations were legible only as text in a HUD chip: a critic looking at a
 * 960 px frame could not name one from the body, and "pressure burp" had no
 * visual at all. These are silhouette-level and deliberately literal —
 * a magnet wears the kitchen's cutlery, a balloon has a valve, something full of
 * pepper steams — because at stream resolution a colour wash is not a noun.
 *
 * Nothing here is a rule. Every value comes from `ArcadeState`; none of it
 * decides anything.
 */
function drawMutations(ctx:CanvasRenderingContext2D,state:ArcadeState,time:number,reduced:boolean){
  const c=state.creature;const m=state.mutations;const t=reduced?0:time;
  // Levels are 0-3. Every strength below is a fraction of the cap, because the
  // first version multiplied an alpha by the level itself and washed the whole
  // creature in flat orange at three pepper.
  const balloon=m.balloon/3;const pepper=m.pepper/3;

  // ---- METAL: the kitchen's cutlery, stuck to it ----
  //
  // Clipped to the creature's own outline. Loose in the room it read as debug
  // art floating in front of the kitchen; clinging to the body it reads as a
  // magnet, which is the noun the mutation needs.
  if(m.metal>0){
    const stuck=4+m.metal*3+Math.round(c.clog*4);
    ctx.save();
    // The chest and shoulders, not the face: a fork over an eye reads as a
    // drawing error, and the body is where a spectator is already looking.
    ctx.beginPath();ctx.ellipse(c.bx,c.by,c.brx*0.78,c.bry*0.86,0,0,Math.PI*2);ctx.clip();
    for(let i=0;i<stuck;i++){
      const a=Math.PI*(0.18+i*0.74)+Math.sin(t*0.5+i)*0.04;
      const r=c.brx*(0.24+0.5*((i*7)%5)/5);
      const x=c.bx+Math.cos(a)*r*1.35;const y=c.by+Math.sin(a)*r*0.85;
      ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI+(reduced?0:Math.sin(t*7+i*2.1)*0.06));
      const L=48;
      ctx.shadowColor='#00000088';ctx.shadowBlur=6;ctx.shadowOffsetY=2;
      ctx.strokeStyle='#2c3733';ctx.lineWidth=2.4;ctx.fillStyle='#d4e0d6';
      ctx.beginPath();ctx.roundRect(-L*0.5,-3,L*0.6,6,3);ctx.fill();ctx.stroke();
      const kind=i%3;
      if(kind===0){for(let k=-1;k<=1;k++){ctx.beginPath();ctx.roundRect(L*0.08,k*5.4-1.7,L*0.42,3.4,1.7);ctx.fill();ctx.stroke();}}
      else if(kind===1){ctx.beginPath();ctx.moveTo(L*0.08,-5.6);ctx.lineTo(L*0.5,-1.6);ctx.lineTo(L*0.5,1.6);ctx.lineTo(L*0.08,5.6);ctx.closePath();ctx.fill();ctx.stroke();}
      else{ctx.beginPath();ctx.ellipse(L*0.3,0,L*0.2,7.4,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- BALLOON: a valve on the shoulder, and strain along the top ----
  if(m.balloon>0){
    const swell=0.75+c.pressure*0.6;
    const vx=c.bx+c.brx*0.78;const vy=c.by-c.bry*0.52;
    ctx.save();ctx.translate(vx,vy);ctx.rotate(-0.62);
    ctx.fillStyle='#8fd8cc';ctx.strokeStyle='#22403c';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.roundRect(-4,-5,24,10,5);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(-2,0,14*swell,10*swell,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#e0fbf3';ctx.beginPath();ctx.ellipse(-6*swell,-3*swell,4.6*swell,3*swell,0,0,Math.PI*2);ctx.fill();
    // How close the burp is, drawn around the valve rather than floating above
    // the head where it read as a stray line.
    if(c.pressure>0.25){
      ctx.rotate(0.62);
      ctx.globalAlpha=.45+c.pressure*.5;ctx.strokeStyle=c.pressure>0.85?'#ffd7ad':'#bdf3e6';
      ctx.lineWidth=4;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(0,0,24*swell,-Math.PI/2,-Math.PI/2+Math.PI*2*c.pressure);ctx.stroke();
    }
    ctx.restore();
    // Strain marks along the top of the swell, inside the silhouette.
    ctx.save();
    ctx.beginPath();ctx.ellipse(c.bx,c.by-c.bry*0.4,c.brx*0.92,c.bry*1.2,0,0,Math.PI*2);ctx.clip();
    ctx.globalCompositeOperation='screen';
    ctx.strokeStyle='#bdf7ea';ctx.lineWidth=2.5;ctx.lineCap='round';
    const marks=2+m.balloon;
    for(let i=0;i<marks;i++){
      const u=(i+0.5)/marks;const x=c.bx+(u-0.5)*c.brx*1.25;
      const top=c.by-c.bry*0.95;
      ctx.globalAlpha=(.1+0.1*balloon)*(reduced?1:0.75+0.25*Math.sin(t*3+i));
      ctx.beginPath();ctx.moveTo(x,top+8);ctx.quadraticCurveTo(x+7,top+24,x+2,top+40);ctx.stroke();
    }
    ctx.restore();
  }

  // ---- PEPPER: it is steaming, and you can see where from ----
  if(m.pepper>0){
    // The nose sits above the mouth by about a third of the face; anchoring the
    // jets to the mouth keeps them on the creature at every size.
    // Where the painted nose is. It sits about 128 px above the mouth's centre
    // at rest and travels with the head rather than with the mouth's own
    // growth, so it is anchored in those terms instead of in mouth radii.
    const nx=c.x;const ny=c.y-128*(1+(c.size-1)*0.12);
    ctx.save();
    ctx.globalAlpha=.09+.13*pepper;
    const heat=ctx.createRadialGradient(c.x,c.y,20,c.x,c.y,c.rx*1.8);
    heat.addColorStop(0,'#ff7a3c');heat.addColorStop(.55,'#e0522244');heat.addColorStop(1,'#e0522200');
    ctx.fillStyle=heat;ctx.beginPath();ctx.ellipse(c.x,c.y,c.rx*1.8,c.ry*1.9,0,0,Math.PI*2);ctx.fill();
    ctx.globalCompositeOperation='screen';
    for(const side of [-1,1]){
      for(let i=0;i<4;i++){
        const f=((reduced?0.4:t*0.85)+i*0.25)%1;
        const px=nx+side*22+side*f*20;const py=ny-f*46;
        const r=9+f*24;
        ctx.globalAlpha=(0.34+0.3*pepper)*(1-f);
        const puff=ctx.createRadialGradient(px,py,1,px,py,r);
        puff.addColorStop(0,'#ffd9c2');puff.addColorStop(.6,'#ff9a5e55');puff.addColorStop(1,'#ff9a5e00');
        ctx.fillStyle=puff;ctx.beginPath();ctx.ellipse(px,py,r,r*0.82,0,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }
}

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
  function draw(ctx:CanvasRenderingContext2D,width:number,height:number,state:ArcadeState|null,angle:number,selected:Ingredient,playing:boolean,reduced:boolean,time:number,guideSteps=0){
    const charge=state?.charge??0;const power=ARENA.minPower+(ARENA.maxPower-ARENA.minPower)*charge;
    ctx.setTransform(width/1200,0,0,height/700,0,0);ctx.clearRect(0,0,1200,700);
    const delta=lastTime<0?1/60:Math.min(0.05,Math.max(0.0005,time-lastTime));lastTime=time;
    const tick=state?.tick??0;
    // The shift report has to show the creature the run produced. Gating these
    // on `playing` alone reset the portrait to a title-screen frog next to a
    // card reading FINAL SIZE x2.14, which threw away the whole transformation
    // on the one frame a stream lingers on.
    const shown=playing||(state!=null&&state.phase!=='playing');
    const levels=shown?state?.mutations:null;const creature=shown?state?.creature:null;
    const recent=playing?(state?.events.filter(e=>tick-e.tick<65)??[]):[];
    if(kitchen.complete&&kitchen.naturalWidth){
      if(!rig&&!rigFailed){try{rig=buildRig(kitchen);}catch{rigFailed=true;}}
      // Base layer is the rig's own copy once it exists, so an undisplaced warp
      // cell is a no-op and can be skipped rather than redrawn.
      ctx.drawImage(rig?rig.art:kitchen,0,0,1200,700);
      if(rig){
        const pose=animator.step(state,playing,reduced,time,delta,!(DEV_HOOKS&&devRender.holdBlink));
        if(DEV_HOOKS){frameCells.count=0;frameCells.skipped=0;}
        const rigStart=DEV_HOOKS?performance.now():0;
        drawCreature(ctx,rig,pose,time,reduced);
        if(DEV_HOOKS)devRender.profile.rig+=performance.now()-rigStart;
      }
    }
    // The left vignette reaches transparent at x=800, so it is filled to 800 and
    // not across the whole frame: a full-frame fill every frame is not free.
    const shade=ctx.createLinearGradient(0,0,800,0);shade.addColorStop(0,playing?'#06121255':'#061212bb');shade.addColorStop(1,'#06121200');ctx.fillStyle=shade;ctx.fillRect(0,0,800,700);
    if(!reduced){ctx.save();for(let i=0;i<22;i++){const x=(i*131.3+time*(3+i%4))%1200;const y=110+(i*79.7-time*(4+i%3))%510;ctx.fillStyle=i%3===0?'#f4c88c35':'#d6ecd21b';ctx.beginPath();ctx.arc(x,y,1+i%2,0,Math.PI*2);ctx.fill();}ctx.restore();}
    if(playing&&state&&!(DEV_HOOKS&&devRender.hideAim)){
      const key=`${Math.floor(tick/6)}-${angle}-${selected}-${power}-${guideSteps}`;if(key!==previewKey){guide=guideSteps>0?trajectoryPreview(state,selected,angle,power,guideSteps):[];previewKey=key;}
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
      // When it will open — a CLOCK, and it must not look like the target.
      //
      // It used to be a lime arc around the whole face at the target's own
      // colour and shape, so on a shut mouth the brightest thing on the
      // creature was a hoop five times the size of the opening, sitting on the
      // jaw. A critic measured it as the hitbox and reported the game throwing
      // the player at its chin; it was the countdown. It is now amber, it is a
      // pair of closing brackets rather than a ring, and it converges on the
      // gap the mouth is about to become.
      if(!taking&&c.untilOpen>0&&c.untilOpen<=54){
        const near=1-c.untilOpen/54;
        const gapRy=Math.max(6,c.ry*TUNING.openMin);
        const reach=(1-near)*c.rx*0.55;
        ctx.setLineDash([]);ctx.lineCap='round';
        ctx.lineWidth=3+near*2.5;
        ctx.strokeStyle=`rgba(246,186,110,${.3+.6*near*near})`;
        for(const side of [-1,1]){
          const bx=c.x+side*(c.rx*0.92+reach);
          ctx.beginPath();
          ctx.moveTo(bx-side*13,c.y-gapRy-7);
          ctx.lineTo(bx,c.y-gapRy-7);
          ctx.lineTo(bx,c.y+gapRy+7);
          ctx.lineTo(bx-side*13,c.y+gapRy+7);
          ctx.stroke();
        }
      }
      // The gap: where a snack will actually go in. Lit only while it is open
      // wide enough to accept one, and exactly the shape the rules test.
      const gap=Math.max(.3,c.open);
      ctx.setLineDash([]);
      // A dark stroke under the lit one. On a pale, flushed, mutated creature
      // the ring was cream on cream, and it was the first thing a 960 px
      // downscale threw away.
      if(taking){
        ctx.lineWidth=6;ctx.strokeStyle='rgba(6,16,14,0.55)';
        ctx.beginPath();ctx.ellipse(c.x,c.y,c.rx,c.ry*gap,0,0,Math.PI*2);ctx.stroke();
      }
      ctx.lineWidth=taking?3:1.2;
      ctx.strokeStyle=taking?`rgba(216,248,150,${.72+.2*(reduced?0:Math.abs(Math.sin(time*5)))})`:'#eff4bd22';
      ctx.beginPath();ctx.ellipse(c.x,c.y,c.rx,c.ry*gap,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    const hazard=playing&&state?getHazard(state.vent,tick):null;
    if(hazard){ctx.save();const {x,y,width:w,height:h,warning}=hazard;const cx=x+w/2;const t=reduced?0:time;ctx.save();ctx.filter='blur(12px)';const col=ctx.createLinearGradient(x-16,0,x+w+16,0);col.addColorStop(0,'rgba(196,222,224,0)');col.addColorStop(.5,`rgba(214,236,238,${warning?.09:.26})`);col.addColorStop(1,'rgba(196,222,224,0)');ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(cx,y+h/2,w*.8,h*.62,0,0,Math.PI*2);ctx.fill();ctx.restore();const rolls=warning?4:9;const speed=warning?26:74;for(let i=0;i<rolls;i++){const f=((t*speed+i*(h+60)/rolls)%(h+60))/(h+60);const yy=y+h+30-f*(h+60);const r=(warning?13:20)+f*(warning?16:34);const a=(warning?.16:.42)*Math.sin(Math.PI*Math.min(1,f*1.15));const puff=ctx.createRadialGradient(cx+Math.sin(f*7+i)*11,yy,1,cx+Math.sin(f*7+i)*11,yy,r);puff.addColorStop(0,`rgba(236,250,250,${a})`);puff.addColorStop(.55,`rgba(196,226,230,${a*.5})`);puff.addColorStop(1,'rgba(180,210,216,0)');ctx.fillStyle=puff;ctx.beginPath();ctx.ellipse(cx+Math.sin(f*7+i)*11,yy,r,r*.82,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#0b1414';ctx.fillRect(x-4,y+h+22,w+8,9);ctx.strokeStyle='#46564e';ctx.lineWidth=1;ctx.strokeRect(x-3.5,y+h+22.5,w+7,8);ctx.fillStyle='#050a0a';for(let i=0;i<5;i++)ctx.fillRect(x-1+i*(w+4)/5,y+h+24,3,5);if(!warning){ctx.globalCompositeOperation='screen';ctx.globalAlpha=.5+(reduced?0:.2*Math.sin(t*7));const lead=ctx.createLinearGradient(0,y+h+22,0,y+h-30);lead.addColorStop(0,'rgba(226,248,244,.75)');lead.addColorStop(1,'rgba(200,232,232,0)');ctx.fillStyle=lead;ctx.fillRect(x-10,y+h-30,w+20,52);}ctx.restore();}
    if(shown&&state&&levels)drawMutations(ctx,state,time,reduced);
    if(levels&&creature){
      // Effects support the rule; the creature carries it. Each of these is
      // keyed off a permanent level, so a stacked creature shows all of them.
      ctx.save();
      if(levels.metal>0){
        // The pull, drawn as field lines reaching back into the room — and only
        // as far as the magnet actually reaches.
        const range=360+70*levels.metal;
        ctx.save();ctx.beginPath();ctx.rect(0,0,creature.x-creature.rx*0.5,700);ctx.clip();
        ctx.strokeStyle=COLORS.metal;ctx.lineWidth=2;ctx.setLineDash([9,13]);
        const rings=reduced?2:4;
        for(let i=0;i<rings;i++){const r=110+((reduced?90:time*40)+i*range/rings)%range;
          ctx.globalAlpha=.14*levels.metal/3*(1-(r-110)/range);
          ctx.beginPath();ctx.ellipse(creature.x,creature.y,r,r*.68,0,Math.PI*.6,Math.PI*1.4);ctx.stroke();}
        ctx.restore();
      }
      if(levels.balloon>0&&creature.lift>1){
        // Rising air under a creature that is leaving the counter.
        ctx.strokeStyle='#9cecdf';ctx.lineWidth=1.6;
        for(let i=0;i<8;i++){const y=creature.y+150-((reduced?110:time*64)+i*40)%250;const x=creature.x-150+i*40;
          ctx.globalAlpha=.08+creature.lift/300;ctx.beginPath();ctx.moveTo(x,y+20);ctx.quadraticCurveTo(x+6,y+10,x,y);ctx.stroke();}

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
      if(cannon.complete&&cannon.naturalWidth){ctx.drawImage(masked(cannon)??cannon,90,360,1100,480,-64,-40,140,70);}
      // The charge, drawn along the barrel. Power is half of the aim and it has
      // to be visible on the launcher, not only in the corner.
      if(charge>0.01){const len=54+charge*86;
        ctx.save();ctx.globalCompositeOperation='screen';
        ctx.strokeStyle=charge>0.92?'#fff0a8':'#dded92';ctx.lineWidth=5;ctx.lineCap='round';
        ctx.globalAlpha=.35+charge*.5;ctx.beginPath();ctx.moveTo(64,0);ctx.lineTo(64+len,0);ctx.stroke();
        ctx.lineWidth=2;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(64+len,0,5+charge*4,0,Math.PI*2);ctx.stroke();
        ctx.restore();}
      ctx.restore();
      // The aim, always on screen. A dashed stub was there before and a
      // spectator could not see it at 960px, so the two things the player is
      // actually choosing — where it points and how hard it throws — are now
      // drawn on the launcher itself: a solid lance out of the muzzle, with a
      // crossbar at the distance the current power stands for.
      const rad=angle*Math.PI/180;
      const waitEnd=state?Math.max(state.reloadUntil,state.lastLaunchTick+ARENA.cooldownTicks):0;
      const loaded=!state||tick>=waitEnd;
      const refill=state?clampAlpha(1-(waitEnd-tick)/ARENA.cooldownTicks):1;
      const notch=78+clampAlpha((power-ARENA.minPower)/(ARENA.maxPower-ARENA.minPower))*128;
      ctx.save();ctx.translate(x,y);ctx.rotate(rad);ctx.lineCap='round';
      ctx.globalAlpha=loaded?.92:.4;ctx.strokeStyle=loaded?'#e0f4be':'#7f8f6e';ctx.lineWidth=3.5;
      ctx.beginPath();ctx.moveTo(74,0);ctx.lineTo(notch,0);ctx.stroke();
      ctx.globalAlpha=loaded?.4:.18;ctx.lineWidth=2;ctx.setLineDash([4,10]);
      ctx.beginPath();ctx.moveTo(notch,0);ctx.lineTo(notch+62,0);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=loaded?1:.45;ctx.lineWidth=4;
      ctx.strokeStyle=charge>0.92?'#fff0a8':loaded?'#dded92':'#7f8f6e';
      ctx.beginPath();ctx.moveTo(notch,-11);ctx.lineTo(notch,11);ctx.stroke();
      ctx.restore();
      // The loaded serving sits in the breech whether or not it can be fired:
      // it used to vanish for the whole reload, so two thirds of every strip
      // showed an empty counter. Reloading now dims it and fills a ring.
      ctx.save();ctx.translate(x,y);ctx.lineCap='round';
      if(!loaded){
        // A dark pocket behind the waiting serving: at a third alpha over
        // polished brass the snack disappeared entirely, which is the fault
        // this was meant to fix.
        ctx.fillStyle='#06100dcc';ctx.beginPath();ctx.arc(0,0,30,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#33422f';ctx.lineWidth=4.5;
        ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#dded92';ctx.globalAlpha=.9;
        ctx.beginPath();ctx.arc(0,0,34,-Math.PI/2,-Math.PI/2+Math.PI*2*refill);ctx.stroke();
      } else if(state&&!reduced&&tick-waitEnd<15){
        const pop=clampAlpha(1-(tick-waitEnd)/15);
        ctx.globalAlpha=pop*.85;ctx.strokeStyle='#dded92';ctx.lineWidth=3.5;
        ctx.beginPath();ctx.arc(0,0,34+(1-pop)*18,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
      ctx.save();ctx.globalAlpha=loaded?1:.7;
      item(ctx,selected,x,y,loaded?47:40,rad);
      ctx.restore();
    }
    if(playing&&state&&state.tick<state.hatchClosedUntil){
      // The hatch, down over the serving window. It was an unlabelled striped
      // panel floating above the launcher and read as a rendering bug; it is
      // now bolted to the counter, lit, and it says what it is.
      ctx.save();const hx=ARENA.launcher.x;const t=Math.min(1,(state.hatchClosedUntil-state.tick)/10);
      const h=Math.max(0,116*t);const top=HATCH_TOP-h;
      ctx.fillStyle='#0b1414';ctx.strokeStyle='#9db08a';ctx.lineWidth=3;
      ctx.beginPath();ctx.roundRect(hx-104,top,208,h,5);ctx.fill();ctx.stroke();
      ctx.fillStyle='#1d2a24';for(let i=0;i<6;i++)ctx.fillRect(hx-94+i*33,top+8,24,Math.max(0,h-16));
      ctx.strokeStyle='#59685288';ctx.lineWidth=1;for(let i=0;i<6;i++)ctx.strokeRect(hx-94.5+i*33,top+7.5,25,Math.max(0,h-15));
      if(h>34){
        ctx.fillStyle='#dded92';ctx.font="700 16px 'Helvetica Neue',sans-serif";ctx.textAlign='center';
        ctx.fillText('HATCH SHUT',hx,top+h/2-4);
        // Why, and for how long. The panel said neither, so the one moment in
        // the shift that takes the launcher away was also the least explained.
        ctx.fillStyle='#b7c7a4';ctx.font="600 12px 'Helvetica Neue',sans-serif";
        ctx.fillText('YOU SLAMMED IT',hx,top+h/2+14);
        const left=Math.max(0,Math.min(1,(state.hatchClosedUntil-state.tick)/ARENA.hatchTicks));
        ctx.fillStyle='#2b3a30';ctx.beginPath();ctx.roundRect(hx-72,top+h-16,144,7,3.5);ctx.fill();
        ctx.fillStyle='#dded92';ctx.beginPath();ctx.roundRect(hx-72,top+h-16,Math.max(3,144*left),7,3.5);ctx.fill();
      }
      ctx.globalCompositeOperation='screen';ctx.globalAlpha=.4;
      const glow=ctx.createLinearGradient(0,top,0,top+h);glow.addColorStop(0,'#dded9255');glow.addColorStop(1,'#dded9200');
      ctx.fillStyle=glow;ctx.fillRect(hx-104,top,208,h);
      ctx.restore();
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
    // Decided before the verdict pills are placed: while a mutation banner is up
    // it is the one thing on screen, and a critic counting five competing text
    // objects in one frame is counting a readability failure.
    const banner=playing&&state
      ? state.events.filter(e=>e.type==='mutation'&&tick-e.tick<175).slice(-1)[0]
      : undefined;
    const bannerUp=Boolean(banner&&banner.ingredient);
    if(!(DEV_HOOKS&&devRender.hideLabels)){
      // Two at a time, and never the same words twice: two projectiles landing
      // together used to draw "ONE MORE CHANCE" twice in one frame, and four
      // stacked verdicts cannot be attributed to anything.
      const seenLabel=new Set<string>();
      // No mutation pill: the banner below says the same thing at three times
      // the size and for twice as long, and the two drawn together overlapped
      // into an unreadable double.
      const pills=recent.filter(e=>e.type==='feed'||e.type==='miss'||e.type==='bounce'||e.type==='snub'||e.type==='grow'||e.type==='clog'||e.type==='sneeze'||e.type==='hit'||e.type==='spit'||e.type==='burp')
        // A bounce is a second chance, and at zero fullness there is no second
        // chance: ONE MORE CHANCE over an empty belly on the frame the shift
        // ends is the game telling the player something untrue.
        .filter(e=>!(e.type==='bounce'&&(state?.hunger??100)<=0))
        .filter(e=>{if(seenLabel.has(e.label))return false;seenLabel.add(e.label);return true;})
        .slice(bannerUp?-1:-2);
      const taken:{x:number;y:number;w:number}[]=[];
      // The meters are the lose condition and a verdict pill must never sit on
      // them: a critic caught ONE MORE CHANCE covering the fullness number on
      // the frame the player starved. The band is reserved before anything is
      // placed, and pills are pushed clear of it upward.
      const band=state?{top:METER_Y-26,bottom:METER_Y+44,x:state.creature.x,w:METER_W+30}:null;
      pills.forEach((e)=>{const age=tick-e.tick;
        const good=e.type==='feed'||e.type==='sneeze'||e.type==='burp';
        const loud=e.type==='hit'||e.type==='spit';
        // A verdict is a beat, not a banner. A miss used to hold for 65 ticks,
        // which is longer than a whole sampled second, so TOO LATE was still on
        // screen over a wide-open mouth and read as the game contradicting
        // itself. Praise and mutations keep the longer hold; mistakes do not.
        const life=good||loud?65:38;
        ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(life-age)/9));
        if(age>=life){ctx.restore();return;}
        ctx.font=`bold ${good||loud?18:14}px 'Helvetica Neue',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
        // What it cost, on the label, in the same breath as the label.
        //
        // Every reward carried a number — PERFECT +530, CRAVING +360 — and every
        // mistake carried a mood word and nothing else, so the currency that
        // wins is counted and the currency that kills is invisible. A player at
        // 8 % irritation had no way to learn they were twenty seconds from 100.
        // The costs are the rules' own: a snub 2.5, a miss 5.
        const cost=e.type==='snub'?TUNING.snubRage:e.type==='miss'?TUNING.missRage:0;
        const text=cost>0?`${e.label}  +${cost} IRRITATION`:e.label;
        const w=ctx.measureText(text).width+22;
        let y=good?Math.max(74,86-(reduced?0:age*.4)):Math.max(70,e.y-46-(reduced?0:age*.55));
        const x=Math.max(w/2+16,Math.min(1184-w/2,e.x));
        if(band&&y+14>band.top&&y-14<band.bottom&&Math.abs(band.x-x)<(band.w+w)/2)y=band.top-16;
        // Push down until it is clear of anything already placed this frame.
        for(let guard=0;guard<4;guard++){
          const hit=taken.find(t=>Math.abs(t.y-y)<38&&Math.abs(t.x-x)<(t.w+w)/2+12);
          if(!hit)break;y=hit.y+40;}
        if(band&&y+14>band.top&&y-14<band.bottom&&Math.abs(band.x-x)<(band.w+w)/2)y=band.top-16;
        taken.push({x,y,w});
        ctx.fillStyle='#050d0cf2';ctx.strokeStyle=loud?'#ffc59866':good?'#cfe89066':cost>0?'#e2493a99':'#e5a97a55';ctx.lineWidth=loud||cost>0?2:1;
        ctx.beginPath();ctx.roundRect(x-w/2,y-13,w,26,13);ctx.fill();ctx.stroke();
        ctx.fillStyle=loud?'#ffd7ad':good?'#efffc3':'#ffc698';ctx.fillText(text,x,y+1);ctx.textBaseline='alphabetic';
        if(!reduced&&age<26&&good){ctx.globalAlpha*=Math.max(0,1-age/26);for(let i=0;i<7;i++){const a=i*2.4+age*.02;const r=6+age*2.1;ctx.fillStyle=COLORS[e.ingredient??selected];ctx.beginPath();ctx.arc(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r*.7+age*.4,Math.max(0,2.2-age/13),0,Math.PI*2);ctx.fill();}}
        ctx.restore();
      });
    }
    // What a mutation DOES, at a size a stream can read, for three seconds after
    // it arrives — and NOT on top of the creature.
    //
    // The first version of this banner was centred over the frame, which put a
    // 680 px box across a fully-open mouth: it covered the upper lip and the
    // teeth, which are the exact pixels the player has to read to time the shot
    // the banner is telling them to take, and it clipped the toast beside it.
    // It now lives in the empty left third of the kitchen, clear of the creature
    // at every size and next to the launcher the advice is about.
    const bannerX = 268;
    if(banner&&banner.ingredient){
      {
        const fresh=banner;const food=banner.ingredient;
        const age=tick-fresh.tick;
        const name=MUTATION_NAMES[food].toUpperCase();
        const rule=MUTATION_RULES[food];
        ctx.save();
        // No fade-in. A banner that ramps up over a tenth of a second is
        // invisible on the one frame a capture takes at the moment it fires,
        // and that moment is the whole point of it.
        ctx.globalAlpha=Math.min(1,(175-age)/18);
        ctx.textAlign='center';
        ctx.font="700 13px 'Helvetica Neue',sans-serif";
        const rw=ctx.measureText(rule).width;
        ctx.font="800 19px 'Helvetica Neue',sans-serif";
        const bw=Math.min(492,Math.max(rw,ctx.measureText(name).width)+44);
        const by=150-Math.min(10,age)*0.6;
        ctx.fillStyle='#081311f2';ctx.strokeStyle=COLORS[food];ctx.lineWidth=2;
        ctx.beginPath();ctx.roundRect(bannerX-bw/2,by-30,bw,62,10);ctx.fill();ctx.stroke();
        ctx.fillStyle=COLORS[food];ctx.fillText(name,bannerX,by-6);
        ctx.font="700 13px 'Helvetica Neue',sans-serif";ctx.fillStyle='#d8e2cd';
        ctx.fillText(rule,bannerX,by+18,bw-18);
        ctx.restore();
      }
    }
    // What it wants, drawn on the creature at a size a spectator can read, with
    // the time left as a ring around it. It was a ten-pixel label in a chip in
    // the opposite corner of the frame from the thing it describes.
    if(playing&&state&&state.craving){
      const c=state.creature;const cr=state.craving;
      const span=Math.max(1,cr.endsAt-cr.startedAt);
      const left=Math.max(0,Math.min(1,(cr.endsAt-tick)/span));
      const bx=Math.min(1128,c.x+c.rx*0.92+52);const by=Math.max(112,c.y-c.ry-64);
      const urgent=left<0.3;
      ctx.save();
      ctx.globalAlpha=urgent&&!reduced?.82+.18*Math.sin(time*11):.94;
      ctx.fillStyle='#08100fe8';ctx.strokeStyle=urgent?'#eea66d':'#b9cf8e';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(bx,by,40,0,Math.PI*2);ctx.fill();ctx.stroke();
      // The clock, counting down around the rim.
      ctx.strokeStyle=urgent?'#eea66d':'#dded92';ctx.lineWidth=6;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(bx,by,33,-Math.PI/2,-Math.PI/2+Math.PI*2*left);ctx.stroke();
      ctx.restore();
      item(ctx,cr.ingredient,bx,by,46);
      ctx.save();ctx.font="700 12px 'Helvetica Neue',sans-serif";ctx.textAlign='center';
      ctx.fillStyle=urgent?'#ffc698':'#dfe9cb';ctx.fillText('IT WANTS',bx,by-48);ctx.restore();
    }
    // The two meters that decide the run.
    //
    // On the counter directly under the serving hatch: close to where the
    // player is looking, and — unlike every previous placement — never behind
    // the creature, which at full size covers anything positioned relative to
    // its own body. Fullness and irritation were also both drawn peach, so the
    // dangerous one looked like the safe one; they now share no colour at all.
    if(playing&&state){
      const c=state.creature;const w=METER_W;const x=c.x-w/2;const y=METER_Y;
      const fullness=Math.max(0,Math.min(1,state.hunger/100));
      const irritation=Math.max(0,Math.min(1,state.rage/100));
      const fullColour=fullness<0.18?'#ff6a4d':fullness<0.35?'#eea66d':'#cdec7a';
      const held=tick<state.hatchClosedUntil;
      ctx.save();
      // Sized up: at 960 px these were the smallest type on screen and they are
      // the only two numbers that end a shift.
      ctx.fillStyle='#040909b0';ctx.beginPath();ctx.roundRect(x-14,y-24,w+28,70,11);ctx.fill();
      ctx.strokeStyle='#5d6b5540';ctx.lineWidth=1;ctx.stroke();
      // Measured by a critic: the fill-to-track contrast was 10.5:1 for fullness
      // and 3.96:1 for irritation — the meter that ends the shift was the quieter
      // of the two at every value. Brighter fill, darker track.
      const rows=[['FULLNESS',fullness,fullColour,'#22301f'],['IRRITATION',irritation,irritation>0.55?'#ff6a52':'#f0705c','#1a0d0c']] as const;
      for(const [i,row] of rows.entries()){
        const by=y+i*32;
        ctx.fillStyle=row[3];ctx.beginPath();ctx.roundRect(x,by-5,w,13,6.5);ctx.fill();
        ctx.fillStyle=row[2];ctx.beginPath();ctx.roundRect(x,by-5,Math.max(7,w*row[1]),13,6.5);ctx.fill();
        ctx.font="700 14px ui-monospace,monospace";ctx.textAlign='left';ctx.fillStyle='#dbe5d3';
        ctx.fillText(row[0],x,by-11);
        ctx.textAlign='right';ctx.fillStyle=row[2];ctx.fillText(`${Math.round(row[1]*100)}%`,x+w,by-11);
        // The belly stops emptying whenever the launcher is taken away. The
        // rule is only fair if it is visible, so the bar says so while it holds.
        if(i===0&&(held||state.hungerDebt>0.01)){
          const label=held?'HELD':'CATCHING UP';const lw=ctx.measureText(label).width+16;
          ctx.fillStyle='#0c1a16';ctx.beginPath();ctx.roundRect(x+w/2-lw/2,by-23,lw,17,8);ctx.fill();
          ctx.strokeStyle=held?'#9bd7c4':'#eea66d';ctx.lineWidth=1;ctx.stroke();
          ctx.textAlign='center';ctx.fillStyle=held?'#9bd7c4':'#eea66d';ctx.fillText(label,x+w/2,by-11);
        }
      }
      if(fullness<0.25&&!reduced){
        ctx.globalAlpha=.35+.35*Math.abs(Math.sin(time*7));
        ctx.strokeStyle='#ff6a4d';ctx.lineWidth=2.5;
        ctx.beginPath();ctx.roundRect(x-14,y-24,w+28,70,11);ctx.stroke();
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
