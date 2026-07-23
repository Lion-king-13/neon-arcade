// games/fishing.js — Pêche à la Ligne
// GÂCHETTE = lancer la ligne dans l'étang (devant toi). Un poisson vient mordre
// (le bouchon plonge + le poisson s'illumine) : ré-appuie sur la GÂCHETTE pendant
// qu'il mord pour ferrer. Poisson = +1, doré = +5, vieille botte = 0.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const POND = new THREE.Vector3(0, 0.5, -1.15);
const POND_R = 1.0;
const CAST_POWER = 2.4;
const BITE_T = 1.2;
const G = 4.0;

let R=null;
function res(){
  if(R) return R;
  R={ sphere:new THREE.SphereGeometry(1,12,10),
      water:new THREE.MeshStandardMaterial({color:0x0e5a6e, emissive:0x0a3040, emissiveIntensity:.5, roughness:.3, metalness:.2, transparent:true, opacity:.82, side:THREE.DoubleSide}),
      rim:new THREE.MeshStandardMaterial({color:0x2a2140, emissive:0x2ee6d6, emissiveIntensity:.4, roughness:.5}),
      boot:new THREE.MeshStandardMaterial({color:0x2a2420, roughness:.8}),
      eye:new THREE.MeshBasicMaterial({color:0x0b0e14}) };
  return R;
}
function makeRod(i){
  const color=[0x2ee6d6,0xff4d5e][i]; const g=new THREE.Group();
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.11,10), new THREE.MeshStandardMaterial({color:0x14161c,roughness:.6})); grip.rotation.x=Math.PI/2; grip.position.z=0.02; g.add(grip);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,0.02,12), new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.8, roughness:.4})); band.rotation.x=Math.PI/2; band.position.z=-0.04; g.add(band);
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.012,0.5,10), new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.6, roughness:.35, metalness:.3})); rod.rotation.x=Math.PI/2.2; rod.position.set(0,0.05,-0.24); g.add(rod);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(0.014,10,8), new THREE.MeshBasicMaterial({color})); glow.position.set(0,0.17,-0.45); g.add(glow);
  const tip=new THREE.Object3D(); tip.position.set(0,0.17,-0.45); g.add(tip); g.userData.tip=tip;
  return g;
}
function makeFish(type){
  const r=res(); const g=new THREE.Group();
  if(type==='boot'){ const b=new THREE.Mesh(r.sphere, r.boot); b.scale.set(0.03,0.045,0.05); g.add(b); const foot=new THREE.Mesh(r.sphere,r.boot); foot.scale.set(0.03,0.022,0.03); foot.position.set(0,-0.035,0.03); g.add(foot); g.userData.baseE=0; return g; }
  const col = type==='gold'? 0xffd54a : 0x9fd0e6;
  const emis= type==='gold'? 0xe0a915 : 0x1a3a4a;
  const baseE= type==='gold'? 0.6 : 0.3;
  const mat=new THREE.MeshStandardMaterial({color:col, emissive:emis, emissiveIntensity:baseE, roughness:.45, metalness:.25});
  const body=new THREE.Mesh(r.sphere, mat); body.scale.set(0.028,0.03,0.06); g.add(body);
  const tail=new THREE.Mesh(r.sphere, mat); tail.scale.set(0.004,0.03,0.025); tail.position.z=-0.07; g.add(tail);
  [-1,1].forEach(sx=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(0.006,6,6), r.eye); e.position.set(sx*0.016,0.006,0.045); g.add(e); });
  g.userData.mat=mat; g.userData.baseE=baseE;
  return g;
}

export default {
  id:'fishing',
  name:{fr:'Pêche à la Ligne', en:'Angling'},
  color:'#4db8ff',
  usesSurfaces:false,
  theme:'meadow',

  _rods:[], _hands:[], _fish:[], _spawnTimer:0,

  init(engine){ res(); },
  buildLayout(engine, spots){
    const r=res();
    const water=new THREE.Mesh(new THREE.CircleGeometry(POND_R,48), r.water); water.rotation.x=-Math.PI/2; water.position.copy(POND); engine.field.add(water);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(POND_R,0.04,12,56), r.rim); rim.rotation.x=-Math.PI/2; rim.position.copy(POND); engine.field.add(rim);
  },

  start(engine){
    this._rods=[]; this._hands=[]; this._fish=[];
    engine.setTool((i)=>{ const rd=makeRod(i); this._rods[i]=rd; return rd; });
    for(let i=0;i<2;i++){
      const hc=[0x2ee6d6,0xff4d5e][i];
      const bob=new THREE.Mesh(new THREE.SphereGeometry(0.026,12,10), new THREE.MeshStandardMaterial({color:hc, emissive:hc, emissiveIntensity:.6, roughness:.4}));
      const top=new THREE.Mesh(new THREE.SphereGeometry(0.014,8,8), new THREE.MeshBasicMaterial({color:0xf4f6fb})); top.position.y=0.024; bob.add(top);
      // asticot (appât) sous le bouchon
      const baitMat=new THREE.MeshStandardMaterial({color:0xf6e3c4, emissive:0x6a5236, emissiveIntensity:.3, roughness:.6});
      const bait=new THREE.Group();
      for(let k=0;k<3;k++){ const s=new THREE.Mesh(new THREE.SphereGeometry(0.009-k*0.001,8,6), baitMat); s.position.set(0,-k*0.011,0); bait.add(s); }
      bait.position.y=-0.030; bob.add(bait);
      engine.field.add(bob);
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]), new THREE.LineBasicMaterial({color:hc, transparent:true, opacity:.85}));
      line.frustumCulled=false; line.renderOrder=2;
      bob.frustumCulled=false;
      engine.field.add(line);
      this._hands[i]={state:'reeled', bob, line, vel:new THREE.Vector3(), pos:new THREE.Vector3(), biteFish:null, hc};
    }
    this._spawnTimer=0.4;
  },
  _tip(engine,i,out){ if(this._rods[i]) this._rods[i].userData.tip.getWorldPosition(out); else out.set(0,1,-0.4); return out; },

  onTrigger(i, engine){
    const h=this._hands[i]; if(!h) return;
    if(h.state==='reeled'){
      const o=new THREE.Vector3(), d=new THREE.Vector3(); engine.aimRay(i,o,d);
      const hv=new THREE.Vector3(); engine.controllerVel(i,hv);
      this._tip(engine,i,h.pos);
      // portée = petite base le long de la visée + geste de la main (flick vers l'avant)
      h.vel.copy(d).multiplyScalar(1.5).addScaledVector(hv, 1.1); h.vel.y+=0.8;
      h.state='cast'; engine.sfx.pick();
    } else if(h.state==='water' || h.state==='grass'){
      if(h.biteFish){ const f=h.biteFish; const pos=f.group.position.clone();
        engine.burst(pos, f.type==='gold'?0xffd54a:(f.type==='boot'?0x8b93a7:h.hc));
        if(f.type==='boot'){ engine.good(pos,0,'#8b93a7'); engine.combo=Math.max(0,engine.combo-1); }
        else engine.good(pos, f.type==='gold'?5:1, f.type==='gold'?'#ffd54a':'#d6f9ff');
        this._popFish(engine,f); h.biteFish=null;
      }
      h.state='reeled';   // on remonte
    }
  },

  _spawn(engine){
    let type='normal'; const rnd=Math.random();
    if(rnd<0.10) type='boot'; else if(rnd<0.22) type='gold';
    const g=makeFish(type); const a=Math.random()*Math.PI*2, rad=Math.random()*(POND_R-0.16);
    g.position.set(POND.x+Math.cos(a)*rad, POND.y-0.06, POND.z+Math.sin(a)*rad); engine.field.add(g);
    this._fish.push({group:g, type, ang:a, rad, w:(Math.random()<0.5?1:-1)*(0.2+Math.random()*0.3), ph:Math.random()*6, state:'swim', tt:0, hand:-1});
  },
  _popFish(engine,f){ engine.field.remove(f.group); const i=this._fish.indexOf(f); if(i>=0) this._fish.splice(i,1); },

  update(dt, engine){
    const time=engine.clock.elapsedTime; const tip=new THREE.Vector3();
    for(let i=0;i<2;i++){
      const h=this._hands[i]; if(!h) continue; this._tip(engine,i,tip);
      if(h.state==='reeled'){ h.pos.set(tip.x, tip.y-0.12, tip.z); if(h.biteFish) h.biteFish=null; }
      else if(h.state==='cast'){
        h.vel.y-=G*dt; h.pos.addScaledVector(h.vel,dt);
        const inPond=Math.hypot(h.pos.x-POND.x, h.pos.z-POND.z)<POND_R;
        if(h.pos.y<=POND.y && inPond){ h.pos.y=POND.y; h.state='water'; }
        else if(h.pos.y<=0.02){ h.pos.y=0.02; h.state='grass'; }   // raté : reste posé au sol, visible
      } else if(h.state==='water'){
        h.pos.y = POND.y + (h.biteFish? -0.035 : Math.sin(time*3+i)*0.005);
      }
      h.bob.position.copy(h.pos);
      h.bob.material.emissiveIntensity = h.biteFish? 1.0 : 0.5;
      h.line.geometry.setFromPoints([tip.clone(), h.pos.clone()]);
      h.line.geometry.attributes.position.needsUpdate=true;
    }
    this._spawnTimer-=dt; const maxFish={easy:3,normal:4,hard:5}[engine.settings.diff];
    if(this._spawnTimer<=0 && this._fish.length<maxFish){ this._spawn(engine); this._spawnTimer={easy:1.2,normal:0.9,hard:0.7}[engine.settings.diff]*(0.6+Math.random()*0.7); }
    for(const f of this._fish.slice()){
      f.tt+=dt;
      // reflet de base / éclat quand ça mord
      if(f.group.userData.mat){
        const biting=(f.state==='bite');
        f.group.userData.mat.emissiveIntensity = biting ? (0.9+0.5*Math.abs(Math.sin(time*10))) : f.group.userData.baseE;
        f.group.scale.setScalar(biting ? 1+0.15*Math.abs(Math.sin(time*10)) : 1);
      }
      if(f.state==='swim'){
        f.ang+=f.w*dt; const x=POND.x+Math.cos(f.ang)*f.rad, z=POND.z+Math.sin(f.ang)*f.rad;
        f.group.position.set(x, POND.y-0.06+Math.sin(time*2+f.ph)*0.01, z); f.group.rotation.y=-f.ang+Math.PI/2;
        if(f.tt>1.0){ for(let i=0;i<2;i++){ const h=this._hands[i]; if(h && h.state==='water' && !h.biteFish && Math.hypot(x-h.pos.x, z-h.pos.z)<0.6 && !this._fish.some(o=>o.hand===i)){ f.state='approach'; f.hand=i; f.tt=0; break; } } }
      } else if(f.state==='approach'){
        const h=this._hands[f.hand];
        if(!h || h.state!=='water'){ f.state='swim'; f.hand=-1; f.tt=0; }
        else { f.group.position.lerp(new THREE.Vector3(h.pos.x, POND.y-0.05, h.pos.z), Math.min(1,dt*3));
          if(f.group.position.distanceTo(new THREE.Vector3(h.pos.x,POND.y-0.05,h.pos.z))<0.07){ f.state='bite'; f.tt=0; h.biteFish=f; engine.sfx.miss(); } }
      } else if(f.state==='bite'){
        const h=this._hands[f.hand];
        if(!h || h.state!=='water'){ f.state='swim'; if(h) h.biteFish=null; f.hand=-1; f.tt=0; continue; }
        if(f.tt>BITE_T){ f.state='swim'; if(h) h.biteFish=null; f.hand=-1; f.tt=0; engine.miss(); }
      }
    }
  },

  cleanup(engine){
    for(const f of this._fish.slice()) engine.field.remove(f.group);
    for(const h of this._hands){ if(h){ engine.field.remove(h.bob); engine.field.remove(h.line); } }
    this._fish.length=0; this._hands.length=0; this._rods.length=0;
    engine.clearTool();
  }
};