// games/ducks.js — Pêche aux Canards
// Des canards flottent sur un petit bassin ; on les repêche au filet.
// Canard = +1, canard doré = +5, canard-bombe = à éviter (−3).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const CATCH_R = 0.13;
const POND = new THREE.Vector3(0, 0.92, -0.55); // centre du bassin (bas, à portée)
const POND_R = 0.55;

let R=null;
function res(){
  if(R) return R;
  R={
    sphere:new THREE.SphereGeometry(1,14,12),
    beakGeo:new THREE.ConeGeometry(0.02,0.05,8),
    water:new THREE.MeshStandardMaterial({color:0x0e5a6e, emissive:0x0a2e3a, emissiveIntensity:.5, roughness:.3, metalness:.2, transparent:true, opacity:.8}),
    rim:new THREE.MeshStandardMaterial({color:0x2a2140, emissive:0x8b6cff, emissiveIntensity:.5, roughness:.5}),
    duck:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0x5a3c00, emissiveIntensity:.25, roughness:.5}),
    duckW:new THREE.MeshStandardMaterial({color:0xf4f6fb, emissive:0x2a3550, emissiveIntensity:.2, roughness:.5}),
    gold:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.75, roughness:.35, metalness:.4}),
    bomb:new THREE.MeshStandardMaterial({color:0x1a1420, emissive:0x330a12, emissiveIntensity:.4, roughness:.6, metalness:.3}),
    beak:new THREE.MeshStandardMaterial({color:0xff8a3c, emissive:0x5a2400, roughness:.5}),
    eye:new THREE.MeshBasicMaterial({color:0x0b0e14}),
    fuse:new THREE.MeshBasicMaterial({color:0xffd54a}),
    spark:new THREE.MeshBasicMaterial({color:0xff7a3c})
  };
  return R;
}

function makeDuck(type){
  const r=res(); const g=new THREE.Group();
  if(type==='bad'){
    const body=new THREE.Mesh(r.sphere, r.bomb); body.scale.set(0.075,0.06,0.09); body.position.y=0.02; g.add(body);
    const fuse=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.05,6), r.fuse); fuse.position.set(0,0.09,-0.03); fuse.rotation.x=0.4; g.add(fuse);
    const spark=new THREE.Mesh(new THREE.SphereGeometry(0.012,8,6), r.spark); spark.position.set(0,0.115,-0.04); g.add(spark);
    g.userData.spark=spark;
    // yeux fâchés
    [-1,1].forEach(sx=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(0.008,8,6), r.eye); e.position.set(sx*0.03,0.045,0.075); g.add(e); });
    g.userData.float=0.02; return g;
  }
  const mat = type==='gold'? r.gold : (Math.random()<0.5? r.duck : r.duckW);
  const body=new THREE.Mesh(r.sphere, mat); body.scale.set(0.08,0.06,0.1); body.position.y=0.02; g.add(body);
  // queue relevée
  const tail=new THREE.Mesh(r.sphere, mat); tail.scale.set(0.03,0.035,0.045); tail.position.set(0,0.05,-0.09); g.add(tail);
  // tête + cou
  const head=new THREE.Mesh(r.sphere, mat); head.scale.setScalar(0.05); head.position.set(0,0.09,0.075); g.add(head);
  const neck=new THREE.Mesh(r.sphere, mat); neck.scale.set(0.03,0.05,0.03); neck.position.set(0,0.06,0.06); g.add(neck);
  const beak=new THREE.Mesh(r.beakGeo, r.beak); beak.rotation.x=Math.PI/2; beak.position.set(0,0.085,0.12); g.add(beak);
  [-1,1].forEach(sx=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(0.007,8,6), r.eye); e.position.set(sx*0.02,0.10,0.10); g.add(e); });
  g.userData.float=0.03;
  return g;
}

export default {
  id:'ducks',
  name:{fr:'Pêche aux Canards', en:'Duck Pond'},
  color:'#2ee6d6',
  usesSurfaces:false,

  _active:[], _spawnTimer:0, _nets:[], _pond:null,

  init(engine){ res(); },

  buildLayout(engine, spots){
    const r=res();
    // bassin
    const water=new THREE.Mesh(new THREE.CircleGeometry(POND_R,40), r.water);
    water.rotation.x=-Math.PI/2; water.position.copy(POND); engine.field.add(water);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(POND_R,0.03,12,48), r.rim);
    rim.rotation.x=-Math.PI/2; rim.position.copy(POND); engine.field.add(rim);
    this._pond=water;
  },

  start(engine){
    this._nets=[];
    engine.setTool((i)=>{ const n=engine.makeNet(i); this._nets[i]=n; return n; });
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0; this._spawnTimer=0.3;
  },

  _spawn(engine){
    let type='normal'; const rnd=Math.random();
    const badChance={easy:0.10,normal:0.15,hard:0.22}[engine.settings.diff];
    if(rnd<badChance) type='bad'; else if(rnd<badChance+0.10) type='gold';
    const g=makeDuck(type); engine.field.add(g);
    const ang=Math.random()*Math.PI*2, rad=Math.random()*(POND_R-0.12);
    const obj={ group:g, type, ang, rad, w:(Math.random()<0.5?1:-1)*(0.2+Math.random()*0.4),
      ph:Math.random()*6, caught:false };
    this._active.push(obj);
  },

  _pop(engine,o){ engine.field.remove(o.group); const i=this._active.indexOf(o); if(i>=0) this._active.splice(i,1); },

  update(dt, engine){
    // garder le bassin peuplé
    const maxConc={easy:4,normal:5,hard:7}[engine.settings.diff];
    this._spawnTimer-=dt;
    if(this._spawnTimer<=0 && this._active.length<maxConc){
      this._spawn(engine);
      this._spawnTimer={easy:0.9,normal:0.7,hard:0.5}[engine.settings.diff]*(0.6+Math.random()*0.6);
    }
    const time=engine.clock.elapsedTime;
    for(const o of this._active){
      o.ang += o.w*dt;
      const x=POND.x+Math.cos(o.ang)*o.rad, z=POND.z+Math.sin(o.ang)*o.rad;
      const y=POND.y + o.group.userData.float + Math.sin(time*2+o.ph)*0.006;
      o.group.position.set(x,y,z);
      o.group.rotation.y = -o.ang + (o.w>0?Math.PI/2:-Math.PI/2);
      if(o.type==='bad' && o.group.userData.spark){ const s=1+Math.sin(time*18+o.ph)*0.3; o.group.userData.spark.scale.setScalar(s); }
    }
    // repêche
    for(const net of this._nets){
      if(!net) continue;
      net.userData.cp.getWorldPosition(engine._tmp2);
      for(const o of this._active){
        if(o.caught) continue;
        if(engine._tmp2.distanceTo(o.group.position) < CATCH_R){
          o.caught=true; const pos=o.group.position.clone();
          if(o.type==='bad') engine.bad(pos,3);
          else engine.good(pos, o.type==='gold'?5:1, o.type==='gold'?'#ffd54a':'#d6f9ff');
          this._pop(engine,o);
        }
      }
    }
  },

  cleanup(engine){
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0; this._pond=null;
    engine.clearTool();
  }
};
