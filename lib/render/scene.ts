import { ARENA, FOODS, getHazard, trajectoryPreview, type ArcadeState, type Ingredient } from '../game/arcade';
const COLORS:Record<Ingredient,string>={metal:'#ddea9c',balloon:'#9be9df',pepper:'#f6a074'};
export function createScene(){
  const kitchen=new Image();kitchen.src='/art/kitchen.png';
  const items=new Image();items.src='/art/ingredients.png';
  const cannon=new Image();cannon.src='/art/launcher.png';
  const masks=new Map<string,HTMLCanvasElement>();
  function masked(source:HTMLImageElement){if(!source.complete||!source.naturalWidth)return null;if(masks.has(source.src))return masks.get(source.src)!;const c=document.createElement('canvas');c.width=source.naturalWidth;c.height=source.naturalHeight;const x=c.getContext('2d')!;x.drawImage(source,0,0);const data=x.getImageData(0,0,c.width,c.height);for(let i=0;i<data.data.length;i+=4){const b=Math.max(data.data[i],data.data[i+1],data.data[i+2]);data.data[i+3]=Math.round(Math.min(1,Math.max(0,(b-34)/28))*255);}x.putImageData(data,0,0);masks.set(source.src,c);return c;}
  let creature:HTMLCanvasElement|null=null;
  function creatureLayer(){if(creature)return creature;const c=document.createElement('canvas');c.width=1200;c.height=700;const g=c.getContext('2d')!;g.drawImage(kitchen,0,0,1200,700);g.globalCompositeOperation='destination-in';g.filter='blur(2px)';g.beginPath();const outline=[[535,473],[551,400],[607,309],[642,236],[693,193],[746,141],[766,122],[820,112],[884,113],[936,124],[973,163],[1005,197],[1028,240],[1041,274],[1075,320],[1092,374],[1119,420],[1135,474]];outline.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();creature=c;return c;}
  let previewKey='';let guide:{x:number;y:number}[]=[];
  function item(ctx:CanvasRenderingContext2D,ingredient:Ingredient,x:number,y:number,size:number,rotation=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
    if(items.complete&&items.naturalWidth){const w=items.naturalWidth/3;ctx.shadowColor='#0008';ctx.shadowBlur=3;ctx.drawImage(masked(items)??items,w*FOODS.indexOf(ingredient),0,w,items.naturalHeight,-size/2,-size/2,size,size);}
    else{ctx.fillStyle=COLORS[ingredient];ctx.beginPath();ctx.arc(0,0,size*.2,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  function draw(ctx:CanvasRenderingContext2D,width:number,height:number,state:ArcadeState|null,angle:number,selected:Ingredient,playing:boolean,reduced:boolean,time:number){
    ctx.setTransform(width/1200,0,0,height/700,0,0);ctx.clearRect(0,0,1200,700);
    const tick=state?.tick??0;const m=playing?state?.mutation:null;const active=m?.phase==='active';
    const recent=playing?(state?.events.filter(e=>tick-e.tick<65)??[]):[];
    const feed=recent.filter(e=>e.type==='feed').at(-1);const chew=feed&&!reduced?Math.sin((tick-feed.tick)/65*Math.PI*4)*Math.exp(-(tick-feed.tick)/20)*15:0;
    if(kitchen.complete&&kitchen.naturalWidth){
      ctx.drawImage(kitchen,0,0,1200,700);
      // Localized mesh deformation gives the illustrated creature breath and chew.
      // Tile edges stay fixed, so kitchen geometry and authoritative hitbox stay put.
      if(!reduced||active){const cx=850,cy=355;const swell=active&&m.ingredient==='balloon'?.58:active&&m.ingredient==='pepper'&&m.gustWarning?.17:0;
        for(let y=110;y<490;y+=10){for(let x=450;x<1190;x+=20){const ny=(y-cy)/245;const wy=Math.max(0,1-ny*ny);const mapX=(v:number)=>{const nx=(v-cx)/400;const weight=Math.max(0,1-nx*nx)*wy;return cx+(v-cx)/(1+swell*weight);};const sx=mapX(x),sw=mapX(x+20)-sx;const weight=Math.max(0,1-((x-cx)/400)**2)*wy;const sy=y-(reduced?0:weight*(Math.sin(time*1.8)*1.7+chew*(y<285?-1:1)));ctx.drawImage(creatureLayer(),sx,sy,sw,10,x,y,20,10);}}
      }
    }
    const shade=ctx.createLinearGradient(0,0,800,0);shade.addColorStop(0,playing?'#06121255':'#061212bb');shade.addColorStop(1,'#06121200');ctx.fillStyle=shade;ctx.fillRect(0,0,1200,700);
    if(!reduced){ctx.save();for(let i=0;i<22;i++){const x=(i*131.3+time*(3+i%4))%1200;const y=110+(i*79.7-time*(4+i%3))%510;ctx.fillStyle=i%3===0?'#f4c88c35':'#d6ecd21b';ctx.beginPath();ctx.arc(x,y,1+i%2,0,Math.PI*2);ctx.fill();}ctx.restore();}
    if(playing&&state){
      const key=`${Math.floor(tick/6)}-${angle}-${selected}`;if(key!==previewKey){guide=trajectoryPreview(state,selected,angle);previewKey=key;}
      guide.forEach((p,i)=>{ctx.fillStyle=`rgba(224,244,190,${.85-i/guide.length*.55})`;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1.3,3-i*.12),0,Math.PI*2);ctx.fill();});
      // A calibrated target is subtle, and always agrees with collision geometry.
      ctx.save();ctx.strokeStyle='#eff4bd44';ctx.lineWidth=1;ctx.setLineDash([5,12]);ctx.beginPath();ctx.ellipse(ARENA.mouth.x,ARENA.mouth.y,ARENA.mouth.rx,ARENA.mouth.ry,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    const hazard=playing?getHazard(tick):null;
    if(hazard){ctx.save();const {x,y,width:w,height:h,warning}=hazard;ctx.strokeStyle='#86908066';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+w/2,35);ctx.lineTo(x+w/2,y);ctx.stroke();ctx.globalAlpha=warning?.35:1;const metal=ctx.createLinearGradient(x,0,x+w,0);metal.addColorStop(0,'#182827');metal.addColorStop(.35,'#7b8d77');metal.addColorStop(.55,'#354b43');metal.addColorStop(1,'#122723');ctx.fillStyle=metal;ctx.shadowColor='#000';ctx.shadowBlur=9;ctx.fillRect(x,y,w,h);ctx.shadowBlur=0;ctx.strokeStyle='#c0b67e';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);ctx.fillStyle='#d1b15e';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x,y+9+i*22);ctx.lineTo(x+w,y+i*22);ctx.lineTo(x+w,y+7+i*22);ctx.lineTo(x,y+16+i*22);ctx.fill();}ctx.fillStyle=warning?'#ffcf7a':'#deed93';ctx.beginPath();ctx.arc(x+w/2,y-9,3,0,Math.PI*2);ctx.fill();ctx.restore();}
    if(m){
      const color=COLORS[m.ingredient];const pulse=reduced?.55:.5+.5*Math.sin(time*6);
      ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=active?.6:.2+pulse*.3;
      if(m.ingredient==='metal'){
        // Six bright segmented tooth caps transform the mouth's silhouette.
        for(let i=0;i<6;i++){const a=Math.PI*1.12+i*Math.PI*.76/5;const x=ARENA.mouth.x+Math.cos(a)*113,y=ARENA.mouth.y+Math.sin(a)*83;const g=ctx.createLinearGradient(x,y,x+10,y+16);g.addColorStop(0,'#fff6c7');g.addColorStop(.5,'#a1babb');g.addColorStop(1,'#e4fdba');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-5,y-5);ctx.lineTo(x+8,y);ctx.lineTo(x+4,y+16);ctx.lineTo(x-2,y+13);ctx.closePath();ctx.fill();}
        if(active){for(let i=0;i<4;i++){const r=85+((time*35+i*35)%145);ctx.globalAlpha=.32*(1-(r-85)/145);ctx.beginPath();ctx.ellipse(ARENA.mouth.x,ARENA.mouth.y,r,r*.65,0,Math.PI*.63,Math.PI*1.37);ctx.stroke();}}
      }else if(m.ingredient==='balloon'){
        ctx.strokeStyle='#9cecdf';for(let i=0;i<8;i++){const y=460-((time*50+i*38)%200);const x=690+i*42;ctx.globalAlpha=.15+(460-y)/650;ctx.beginPath();ctx.moveTo(x,y+15);ctx.lineTo(x,y);ctx.lineTo(x-4,y+5);ctx.moveTo(x,y);ctx.lineTo(x+4,y+5);ctx.stroke();}
      }else{
        ctx.fillStyle='#ff8950';ctx.globalAlpha=m.gustWarning?.18+pulse*.1:.08;ctx.beginPath();ctx.ellipse(733,280,40,50,0,0,Math.PI*2);ctx.ellipse(977,280,40,50,0,0,Math.PI*2);ctx.fill();
        if(m.gustActive){for(let i=0;i<4;i++){const x=820-((time*450+i*83)%400);ctx.globalAlpha=.38;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,225+i*28);ctx.quadraticCurveTo(x-55,204+i*28,x-120,225+i*28);ctx.stroke();ctx.beginPath();ctx.moveTo(x-105,218+i*28);ctx.lineTo(x-120,225+i*28);ctx.lineTo(x-107,230+i*28);ctx.stroke();}}
      }ctx.restore();
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
    if(playing)state?.projectiles.forEach(p=>{if(active&&m.ingredient==='metal'&&p.assisted){ctx.save();ctx.strokeStyle='#d4f7b54a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+ARENA.mouth.x)/2,p.y-45,ARENA.mouth.x,ARENA.mouth.y);ctx.stroke();ctx.restore();}ctx.save();ctx.strokeStyle=COLORS[p.ingredient];ctx.globalAlpha=.3;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x-p.vx*2,p.y-p.vy*2);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();item(ctx,p.ingredient,p.x,p.y,48,reduced?0:p.age*.065);});
    for(const e of recent){const age=tick-e.tick;if(e.type==='feed'||e.type==='miss'||e.type==='bounce'){
      const good=e.type==='feed';ctx.save();ctx.globalAlpha=Math.max(0,1-age/65);ctx.fillStyle=good?'#efffc3':'#ffc698';ctx.font=`bold ${good?18:14}px 'Helvetica Neue',sans-serif`;ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=8;ctx.fillText(e.label,e.x,e.y-25-(reduced?0:age*.65));ctx.shadowBlur=0;
      if(!reduced){for(let i=0;i<10;i++){const a=i*2.4;const r=age*1.4;ctx.fillStyle=good?COLORS[selected]:'#cd9b73';ctx.beginPath();ctx.arc(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r+age*.25,Math.max(0,3-age/24),0,Math.PI*2);ctx.fill();}}ctx.restore();
    }}
  }
  return {draw};
}
