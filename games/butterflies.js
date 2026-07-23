// games/butterflies.js — Attrape-Papillons (modèle retravaillé)
// De vrais papillons aux ailes texturées qui battent, à capturer au filet.
// Coloré = +1, doré = +5, abeille = à éviter (−3).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const CATCH_R = 0.10;
const CENTER = new THREE.Vector3(0, 1.4, -0.7);
const HALF = new THREE.Vector3(0.72, 0.42, 0.34);
const PALETTES = [
  ['#8b6cff','#c9a2ff'], ['#ff4d5e','#ff9db0'], ['#2ee6d6','#a6fff4'],
  ['#b8f34d','#e6ffb0'], ['#ff2d95','#ffa6d6'], ['#ffa23c','#ffd89a'], ['#4db8ff','#bfe6ff']
];

let R=null;
function res(){
  if(R) return R;
  R={
    body:new THREE.MeshStandardMaterial({color:0x14161c, roughness:.6}),
    bee: new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0x3a2a00, roughness:.5}),
    stripe:new THREE.MeshStandardMaterial({color:0x161018, roughness:.6}),
    ant:new THREE.MeshStandardMaterial({color:0x0b0e14}),
    seg:new THREE.SphereGeometry(1,10,8),
    antGeo:new THREE.CylinderGeometry(0.0022,0.0022,0.028,5),
    // plan d'aile : attaché au bord intérieur (x=0), s'étend vers +x
    wingGeo:(()=>{ const g=new THREE.PlaneGeometry(1,1); g.translate(0.5,0,0); return g; })(),
    beeWingTex:makeBeeWing()
  };
  return R;
}

function wingTexture(a,b){
  const s=128, cv=document.createElement('canvas'); cv.width=cv.height=s; const c=cv.getContext('2d');
  c.clearRect(0,0,s,s);
  const grad=c.createLinearGradient(0,0,s,s); grad.addColorStop(0,a); grad.addColorStop(1,b);
  c.fillStyle=grad;
  // lobe avant (haut) + lobe arrière (bas), base au bord gauche (u=0)
  c.beginPath(); c.ellipse(s*0.52,s*0.34,s*0.44,s*0.30,-0.15,0,Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(s*0.42,s*0.72,s*0.34,s*0.26,0.2,0,Math.PI*2); c.fill();
  c.lineWidth=7; c.strokeStyle='rgba(8,10,18,.65)';
  c.beginPath(); c.ellipse(s*0.52,s*0.34,s*0.44,s*0.30,-0.15,0,Math.PI*2); c.stroke();
  c.beginPath(); c.ellipse(s*0.42,s*0.72,s*0.34,s*0.26,0.2,0,Math.PI*2); c.stroke();
  // ocelles
  c.fillStyle='rgba(255,255,255,.85)'; c.beginPath(); c.arc(s*0.66,s*0.34,s*0.07,0,7); c.fill();
  c.fillStyle='rgba(8,10,18,.8)'; c.beginPath(); c.arc(s*0.66,s*0.34,s*0.033,0,7); c.fill();
  c.fillStyle='rgba(255,255,255,.7)'; c.beginPath(); c.arc(s*0.5,s*0.74,s*0.05,0,7); c.fill();
  const t=new THREE.CanvasTexture(cv); return t;
}
function makeBeeWing(){
  const s=128, cv=document.createElement('canvas'); cv.width=cv.height=s; const c=cv.getContext('2d');
  c.clearRect(0,0,s,s);
  c.fillStyle='rgba(223,230,255,.55)';
  c.beginPath(); c.ellipse(s*0.5,s*0.4,s*0.42,s*0.26,0,0,Math.PI*2); c.fill();
  c.strokeStyle='rgba(180,190,210,.7)'; c.lineWidth=4; c.stroke();
  return new THREE.CanvasTexture(cv);
}

function makeWing(tex, mirror){
  const r=res();
  const m=new THREE.Mesh(r.wingGeo, new THREE.MeshBasicMaterial({map:tex, transparent:true, side:THREE.DoubleSide, depthWrite:false}));
  m.rotation.x=-Math.PI/2;                 // aile à plat (normale vers le haut)
  return m;
}

function makeButterfly(type){
  const r=res(); const g=new THREE.Group();
  const isBee = type==='bad';
  // corps segmenté
  const bodyMat = isBee ? r.bee : r.body;
  for(let i=0;i<3;i++){ const s=new THREE.Mesh(r.seg, bodyMat); const sc=0.014-(i*0.002); s.scale.set(sc,sc,sc*1.4); s.position.z=0.02-i*0.02; g.add(s); }
  if(isBee){ for(let k=0;k<2;k++){ const st=new THREE.Mesh(r.seg, r.stripe); st.scale.set(0.0135,0.0135,0.004); st.position.z=0.0 - k*0.02; g.add(st); } }
  // antennes dressées (vers le haut/avant)
  [-1,1].forEach(sx=>{ const a=new THREE.Mesh(r.antGeo, r.ant); a.position.set(sx*0.006,0.012,0.05); a.rotation.set(0.55,0,sx*0.3); g.add(a);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(0.005,6,6), r.ant); tip.position.set(0,0.016,0); a.add(tip); });
  // dard des abeilles (à l'arrière)
  if(isBee){ const sting=new THREE.Mesh(new THREE.ConeGeometry(0.0045,0.020,7), r.ant); sting.rotation.x=-Math.PI/2; sting.position.set(0,0,-0.036); g.add(sting); }
  // ailes (bat en "livre" autour de l'axe avant-arrière)
  const span=isBee?0.05:0.075, len=isBee?0.05:0.085;
  const tex=isBee? r.beeWingTex : wingTexture(...PALETTES[(Math.random()*PALETTES.length)|0]);
  const gtex=type==='gold'? wingTexture('#ffd54a','#fff2b0') : tex;
  const useTex = type==='gold'? gtex : tex;
  const rH=new THREE.Group(); g.add(rH);
  const rw=makeWing(useTex,false); rw.scale.set(span,len,1); rH.add(rw);
  const lH=new THREE.Group(); g.add(lH);
  const lw=makeWing(useTex,true); lw.scale.set(-span,len,1); lH.add(lw);
  g.userData.wings={rH,lH, amp:isBee?1.1:0.85, base:0.05, sp:isBee?26:14};
  return g;
}

const butterflies = {
  id:'butterflies',
  name:{fr:'Attrape-Papillons', en:'Butterfly Catch'},
  color:'#8b6cff',
  usesSurfaces:false,
  theme:'meadow',
  swarm:false, hive:false,

  _active:[], _spawnTimer:0, _nets:[],

  init(engine){ res(); },
  buildLayout(engine, spots){},

  start(engine){
    this._nets=[];
    engine.setTool((i)=>{ const n=engine.makeNet(i); this._nets[i]=n; return n; });
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0; this._spawnTimer=0.5;
  },

  _spawn(engine){
    let type='normal'; const rnd=Math.random();
    if(this.hive){ type = rnd<0.72 ? 'bad' : (rnd<0.90 ? 'normal' : 'gold'); }
    else { const badChance={easy:0.10,normal:0.15,hard:0.22}[engine.settings.diff];
      if(rnd<badChance) type='bad'; else if(rnd<badChance+0.09) type='gold'; }
    const g=makeButterfly(type);
    const home=new THREE.Vector3(
      CENTER.x+(Math.random()-.5)*2*HALF.x, CENTER.y+(Math.random()-.5)*2*HALF.y, CENTER.z+(Math.random()-.5)*2*HALF.z);
    g.position.copy(home); g.position.y=home.y-0.4; engine.field.add(g);
    const speed={easy:[0.7,1.0],normal:[0.9,1.3],hard:[1.2,1.7]}[engine.settings.diff];
    const life={easy:6.5,normal:5.2,hard:4.2}[engine.settings.diff];
    this._active.push({ group:g, type, home, phase:'enter', tt:0, wig:Math.random()*6,
      rx:0.10+Math.random()*0.12, ry:0.06+Math.random()*0.08, rz:0.08+Math.random()*0.10,
      sx:speed[0]+Math.random()*(speed[1]-speed[0]), sy:0.6+Math.random()*0.8, sz:0.5+Math.random()*0.7,
      life, caught:false, prev:g.position.clone() });
  },
  _pop(engine,o){ engine.field.remove(o.group); const i=this._active.indexOf(o); if(i>=0) this._active.splice(i,1); },

  update(dt, engine){
    this._spawnTimer-=dt;
    if(this._spawnTimer<=0){
      this._spawn(engine);
      const base={easy:3,normal:4,hard:6}[engine.settings.diff];
      const maxConc=this.swarm?base*2+3:base;
      const extra=this.swarm?3:1;
      for(let k=0;k<extra;k++) if(this._active.length<maxConc && Math.random()<0.7) this._spawn(engine);
      this._spawnTimer={easy:1.05,normal:0.82,hard:0.58}[engine.settings.diff]*(this.swarm?0.45:1)*(0.7+Math.random()*0.6);
    }
    const time=engine.clock.elapsedTime;
    for(const o of this._active.slice()){
      o.tt+=dt;
      // battement d'ailes
      const w=o.group.userData.wings; const f=w.base + w.amp*(0.5+0.5*Math.sin(time*w.sp+o.wig));
      w.rH.rotation.z=-f; w.lH.rotation.z=f;
      // trajectoire
      if(o.phase==='enter'){
        o.group.position.y += (o.home.y-o.group.position.y)*Math.min(1,dt*3);
        if(Math.abs(o.group.position.y-o.home.y)<0.03){ o.phase='wander'; o.tt=0; }
      } else if(o.phase==='wander'){
        const p=time*1.0;
        o.group.position.set(
          o.home.x+Math.sin(p*o.sx+o.wig)*o.rx,
          o.home.y+Math.sin(p*o.sy+o.wig*1.3)*o.ry,
          o.home.z+Math.cos(p*o.sz+o.wig)*o.rz);
        o.home.x += Math.sin(time*0.5+o.wig)*dt*0.05;
        if(o.tt>=o.life){ o.phase='leave'; o.tt=0; }
      } else {
        o.group.position.y += dt*(0.7+o.tt*0.5);
        o.group.position.x += Math.sin(time*2+o.wig)*dt*0.3;
        if(o.group.position.y>2.3){ if(o.type!=='bad') engine.miss(); this._pop(engine,o); continue; }
      }
      // orientation vers le déplacement (les ailes s'étalent perpendiculairement)
      const dx=o.group.position.x-o.prev.x, dz=o.group.position.z-o.prev.z;
      if(dx*dx+dz*dz>1e-6){ const head=Math.atan2(dx,dz); let cur=o.group.rotation.y;
        let diff=head-cur; while(diff>Math.PI)diff-=2*Math.PI; while(diff<-Math.PI)diff+=2*Math.PI;
        o.group.rotation.y = cur + diff*Math.min(1,dt*4); }
      o.prev.copy(o.group.position);
    }
    // capture au filet
    for(const net of this._nets){
      if(!net) continue;
      engine.toolPos(net.userData.cp, engine._tmp2);
      for(const o of this._active){
        if(o.caught) continue;
        if(engine._tmp2.distanceTo(o.group.position) < CATCH_R){
          o.caught=true; const pos=o.group.position.clone();
          if(o.type==='bad') engine.bad(pos,3);
          else {
            let pts=o.type==='gold'?5:1;
            if(this.swarm){
              const now=engine.clock.elapsedTime;
              if(now - (this._lastCatch||-9) < 0.6){ this._chain=(this._chain||1)+1; } else this._chain=1;
              this._lastCatch=now;
              if(this._chain>1){ pts*=this._chain; engine.popup(pos, 'x'+this._chain, '#ff2d95'); }
            }
            engine.good(pos, pts, o.type==='gold'?'#ffd54a':'#eaffd2');
          }
          this._pop(engine,o);
        }
      }
    }
  },

  cleanup(engine){
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0; this._chain=1; this._lastCatch=-9;
    engine.clearTool();
  }
};

export default butterflies;
// Variantes DLC
export const swarm = Object.assign({}, butterflies, {
  id:'flyswarm', name:{fr:'Papillons — Nuée', en:'Butterflies — Swarm'}, color:'#ff2d95',
  swarm:true, dlc:true, special:true, _active:[], _nets:[]
});
export const hive = Object.assign({}, butterflies, {
  id:'flyhive', name:{fr:'Papillons — Ruche', en:'Butterflies — Hive'}, color:'#ffd54a',
  hive:true, dlc:true, special:true, _active:[], _nets:[]
});