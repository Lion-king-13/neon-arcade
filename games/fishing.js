// games/fishing.js — Pêche à la Ligne
// Trempe le bouchon dans l'étang ; quand un poisson mord (le bouchon plonge),
// relève vite la canne pour le ferrer. Poisson = +1, doré = +5, vieille botte = 0.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const POND = new THREE.Vector3(0, 0.62, -0.72);
const POND_R = 0.6;
const LINE = 0.34;
const JERK = 1.1;      // vitesse verticale (m/s) pour ferrer
const BITE_T = 0.95;   // fenêtre de ferrage

let R=null;
function res(){
  if(R) return R;
  R={ sphere:new THREE.SphereGeometry(1,12,10),
      water:new THREE.MeshStandardMaterial({color:0x0e5a6e, emissive:0x0a3040, emissiveIntensity:.5, roughness:.3, metalness:.2, transparent:true, opacity:.82, side:THREE.DoubleSide}),
      rim:new THREE.MeshStandardMaterial({color:0x2a2140, emissive:0x2ee6d6, emissiveIntensity:.4, roughness:.5}),
      fishN:new THREE.MeshStandardMaterial({color:0x9fd0e6, emissive:0x1a3a4a, emissiveIntensity:.3, roughness:.5, metalness:.2}),
      fishG:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.6, roughness:.35, metalness:.4}),
      boot:new THREE.MeshStandardMaterial({color:0x2a2420, roughness:.8}),
      eye:new THREE.MeshBasicMaterial({color:0x0b0e14}) };
  return R;
}

function makeRod(i){
  const color=[0x2ee6d6,0xff4d5e][i]; const g=new THREE.Group();
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,0.10,10), new THREE.MeshStandardMaterial({color:0x14161c,roughness:.6})); grip.rotation.x=Math.PI/2; grip.position.z=0.02; g.add(grip);
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.010,0.5,8), new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.3, roughness:.4})); rod.rotation.x=Math.PI/2.3; rod.position.set(0,0.06,-0.24); g.add(rod);
  const tip=new THREE.Object3D(); tip.position.set(0,0.19,-0.46); g.add(tip); g.userData.tip=tip;
  return g;
}
function makeFish(type){
  const r=res(); const g=new THREE.Group();
  if(type==='boot'){ const b=new THREE.Mesh(r.sphere, r.boot); b.scale.set(0.03,0.045,0.05); g.add(b); const foot=new THREE.Mesh(r.sphere,r.boot); foot.scale.set(0.03,0.022,0.03); foot.position.set(0,-0.035,0.03); g.add(foot); return g; }
  const mat=type==='gold'?r.fishG:r.fishN;
  const body=new THREE.Mesh(r.sphere, mat); body.scale.set(0.028,0.03,0.06); g.add(body);
  const tail=new THREE.Mesh(r.sphere, mat); tail.scale.set(0.004,0.03,0.025); tail.position.z=-0.07; g.add(tail);
  [-1,1].forEach(sx=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(0.006,6,6), r.eye); e.position.set(sx*0.016,0.006,0.045); g.add(e); });
  return g;
}

export default {
  id:'fishing',
  name:{fr:'Pêche à la Ligne', en:'Angling'},
  color:'#4db8ff',
  usesSurfaces:false,
  theme:'meadow',

  _rods:[], _bobbers:[], _lines:[], _fish:[], _spawnTimer:0,

  init(engine){ res(); },
  buildLayout(engine, spots){
    const r=res();
    const water=new THREE.Mesh(new THREE.CircleGeometry(POND_R,40), r.water); water.rotation.x=-Math.PI/2; water.position.copy(POND); engine.field.add(water);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(POND_R,0.03,12,48), r.rim); rim.rotation.x=-Math.PI/2; rim.position.copy(POND); engine.field.add(rim);
  },

  start(engine){
    this._rods=[]; this._bobbers=[]; this._lines=[]; this._fish=[];
    engine.setTool((i)=>{ const rd=makeRod(i); this._rods[i]=rd; return rd; });
    // bouchons + lignes
    for(let i=0;i<2;i++){
      const bob=new THREE.Mesh(new THREE.SphereGeometry(0.022,12,10), new THREE.MeshStandardMaterial({color:0xff4d5e, emissive:0x5a0e16, emissiveIntensity:.5, roughness:.4}));
      const top=new THREE.Mesh(new THREE.SphereGeometry(0.012,8,8), new THREE.MeshBasicMaterial({color:0xf4f6fb})); top.position.y=0.02; bob.add(top);
      engine.field.add(bob); this._bobbers[i]=bob;
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]), new THREE.LineBasicMaterial({color:0xf4f6fb, transparent:true, opacity:.5}));
      engine.field.add(line); this._lines[i]=line;
    }
    this._spawnTimer=0.3;
  },

  _tip(engine,i,out){ if(this._rods[i]) this._rods[i].userData.tip.getWorldPosition(out); else out.set(0,1,0); return out; },
  _spawn(engine){
    let type='normal'; const rnd=Math.random();
    if(rnd<0.10) type='boot'; else if(rnd<0.22) type='gold';
    const g=makeFish(type); const a=Math.random()*Math.PI*2, rad=Math.random()*(POND_R-0.12);
    g.position.set(POND.x+Math.cos(a)*rad, POND.y-0.06, POND.z+Math.sin(a)*rad); engine.field.add(g);
    this._fish.push({group:g, type, ang:a, rad, w:(Math.random()<0.5?1:-1)*(0.2+Math.random()*0.3), ph:Math.random()*6, state:'swim', tt:0, hand:-1});
  },
  _pop(engine,f){ engine.field.remove(f.group); const i=this._fish.indexOf(f); if(i>=0) this._fish.splice(i,1); },

  update(dt, engine){
    const time=engine.clock.elapsedTime;
    // bouchons suivent la canne, pendent vers le bas, flottent sur l'eau si trempés
    const tip=new THREE.Vector3(); const dipped=[false,false]; const bobPos=[new THREE.Vector3(),new THREE.Vector3()];
    for(let i=0;i<2;i++){
      if(!this._bobbers[i]) continue;
      this._tip(engine,i,tip);
      let by=tip.y-LINE;
      const inPond=Math.hypot(tip.x-POND.x, tip.z-POND.z)<POND_R;
      if(inPond && by<POND.y){ by=POND.y + Math.sin(time*3+i)*0.004; dipped[i]=true; }
      bobPos[i].set(tip.x, by, tip.z); this._bobbers[i].position.copy(bobPos[i]);
      const pts=[tip.clone(), bobPos[i].clone()]; this._lines[i].geometry.setFromPoints(pts);
    }
    // spawn
    this._spawnTimer-=dt;
    const maxFish={easy:3,normal:4,hard:5}[engine.settings.diff];
    if(this._spawnTimer<=0 && this._fish.length<maxFish){ this._spawn(engine); this._spawnTimer={easy:1.2,normal:0.9,hard:0.7}[engine.settings.diff]*(0.6+Math.random()*0.7); }

    for(const f of this._fish.slice()){
      f.tt+=dt;
      if(f.state==='swim'){
        f.ang+=f.w*dt; const x=POND.x+Math.cos(f.ang)*f.rad, z=POND.z+Math.sin(f.ang)*f.rad;
        f.group.position.set(x, POND.y-0.06+Math.sin(time*2+f.ph)*0.01, z);
        f.group.rotation.y=-f.ang+Math.PI/2;
        // cherche un bouchon trempé
        if(f.tt>1.2){ for(let i=0;i<2;i++){ if(dipped[i] && Math.hypot(x-bobPos[i].x, z-bobPos[i].z)<0.5 && !this._fish.some(o=>o.hand===i)){ f.state='approach'; f.hand=i; f.tt=0; break; } } }
      } else if(f.state==='approach'){
        if(!dipped[f.hand]){ f.state='swim'; f.hand=-1; f.tt=0; }
        else { const target=bobPos[f.hand]; f.group.position.lerp(new THREE.Vector3(target.x, POND.y-0.05, target.z), Math.min(1,dt*3));
          if(f.group.position.distanceTo(new THREE.Vector3(target.x,POND.y-0.05,target.z))<0.05){ f.state='bite'; f.tt=0; engine.sfx.miss(); } }
      } else if(f.state==='bite'){
        // bouchon plonge
        const b=this._bobbers[f.hand]; if(b){ b.position.y -= 0.03; b.material.emissiveIntensity=1.0; }
        // ferrage : relève rapide de la canne
        const v=new THREE.Vector3(); engine.controllerVel(f.hand, v);
        if(v.y>JERK){
          const pos=f.group.position.clone();
          if(f.type==='boot'){ engine.good(pos,0,'#8b93a7'); engine.combo=Math.max(0,engine.combo-1); }
          else engine.good(pos, f.type==='gold'?5:1, f.type==='gold'?'#ffd54a':'#d6f9ff');
          this._pop(engine,f);
        } else if(f.tt>BITE_T){ f.state='swim'; f.hand=-1; f.tt=0; engine.miss(); }
      }
    }
    for(let i=0;i<2;i++){ if(this._bobbers[i] && !this._fish.some(o=>o.hand===i && o.state==='bite')) this._bobbers[i].material.emissiveIntensity=0.5; }
  },

  cleanup(engine){
    for(const f of this._fish.slice()) engine.field.remove(f.group);
    for(const b of this._bobbers) if(b) engine.field.remove(b);
    for(const l of this._lines) if(l) engine.field.remove(l);
    this._fish.length=0; this._bobbers.length=0; this._lines.length=0; this._rods.length=0;
    engine.clearTool();
  }
};