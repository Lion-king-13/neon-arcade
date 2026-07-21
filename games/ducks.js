// games/ducks.js — Pêche aux Canards
// Une rivière t'entoure ; des canards y flottent, chacun surmonté d'un anneau.
// Tu passes le crochet (au bout d'une canne, dans chaque main) dans l'anneau
// pour ferrer le canard, puis tu le déposes dans le panier pour marquer.
// Canard = +1, doré = +5, canard-bombe = à éviter (ne pas ferrer, sinon −3).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const HOOK_R = 0.11;      // tolérance pour passer le crochet dans l'anneau
const BASKET = new THREE.Vector3(0, 0.95, -0.28);
const BASKET_R = 0.20;
const IN_R = 0.60, OUT_R = 1.00, WATER_Y = 0.62;

let R=null;
function res(){
  if(R) return R;
  R={
    sphere:new THREE.SphereGeometry(1,14,12),
    beakGeo:new THREE.ConeGeometry(0.014,0.032,8),
    water:new THREE.MeshStandardMaterial({color:0x0e5a6e, emissive:0x0a3040, emissiveIntensity:.5, roughness:.3, metalness:.2, transparent:true, opacity:.82, side:THREE.DoubleSide}),
    rim:new THREE.MeshStandardMaterial({color:0x2a2140, emissive:0x2ee6d6, emissiveIntensity:.4, roughness:.5}),
    duckY:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0x5a3c00, emissiveIntensity:.25, roughness:.5}),
    duckW:new THREE.MeshStandardMaterial({color:0xf4f6fb, emissive:0x2a3550, emissiveIntensity:.2, roughness:.5}),
    gold:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.75, roughness:.35, metalness:.4}),
    bomb:new THREE.MeshStandardMaterial({color:0x1a1420, emissive:0x330a12, emissiveIntensity:.4, roughness:.6, metalness:.3}),
    beak:new THREE.MeshStandardMaterial({color:0xff8a3c, emissive:0x5a2400, roughness:.5}),
    eye:new THREE.MeshBasicMaterial({color:0x0b0e14}),
    fuse:new THREE.MeshBasicMaterial({color:0xffd54a}),
    spark:new THREE.MeshBasicMaterial({color:0xff7a3c}),
    basketMat:new THREE.MeshStandardMaterial({color:0x3a2a18, roughness:.9, side:THREE.DoubleSide}),
    basketRim:new THREE.MeshStandardMaterial({color:0x2a2140, emissive:0xb8f34d, emissiveIntensity:.45, roughness:.5})
  };
  return R;
}

function makeDuck(type){
  const r=res(); const g=new THREE.Group();
  const S=0.62; // plus petits
  if(type==='bad'){
    const body=new THREE.Mesh(r.sphere, r.bomb); body.scale.set(0.05,0.04,0.06); body.position.y=0.012; g.add(body);
    const fuse=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.035,6), r.fuse); fuse.position.set(0,0.055,-0.02); fuse.rotation.x=0.4; g.add(fuse);
    const spark=new THREE.Mesh(new THREE.SphereGeometry(0.009,8,6), r.spark); spark.position.set(0,0.072,-0.028); g.add(spark); g.userData.spark=spark;
    g.userData.float=0.012;
  } else {
    const mat = type==='gold'? r.gold : (Math.random()<0.5? r.duckY : r.duckW);
    const body=new THREE.Mesh(r.sphere, mat); body.scale.set(0.05,0.038,0.062); body.position.y=0.012; g.add(body);
    const tail=new THREE.Mesh(r.sphere, mat); tail.scale.set(0.018,0.022,0.028); tail.position.set(0,0.03,-0.056); g.add(tail);
    const head=new THREE.Mesh(r.sphere, mat); head.scale.setScalar(0.031); head.position.set(0,0.055,0.046); g.add(head);
    const neck=new THREE.Mesh(r.sphere, mat); neck.scale.set(0.018,0.03,0.018); neck.position.set(0,0.038,0.038); g.add(neck);
    const beak=new THREE.Mesh(r.beakGeo, r.beak); beak.rotation.x=Math.PI/2; beak.position.set(0,0.052,0.075); g.add(beak);
    [-1,1].forEach(sx=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(0.005,8,6), r.eye); e.position.set(sx*0.012,0.062,0.062); g.add(e); });
    g.userData.float=0.016;
  }
  // anneau flottant au-dessus (à ferrer)
  const color = type==='bad'?0xff4d5e:(type==='gold'?0xffd54a:0x2ee6d6);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.045,0.006,10,24), new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.7, roughness:.4}));
  ring.rotation.x=Math.PI/2; ring.position.y=0.16; g.add(ring); g.userData.ring=ring;
  return g;
}

export default {
  id:'ducks',
  name:{fr:'Pêche aux Canards', en:'Duck Pond'},
  color:'#2ee6d6',
  usesSurfaces:false,

  _active:[], _spawnTimer:0, _hooks:[], _hooked:[null,null], _basket:null,

  init(engine){ res(); },

  buildLayout(engine, spots){
    const r=res();
    const water=new THREE.Mesh(new THREE.RingGeometry(IN_R, OUT_R, 48), r.water);
    water.rotation.x=-Math.PI/2; water.position.set(0,WATER_Y,0); engine.field.add(water);
    [IN_R,OUT_R].forEach(rad=>{ const rim=new THREE.Mesh(new THREE.TorusGeometry(rad,0.02,10,64), r.rim); rim.rotation.x=-Math.PI/2; rim.position.set(0,WATER_Y,0); engine.field.add(rim); });
    // panier
    const b=new THREE.Group();
    const cyl=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.12,0.2,16,1,true), r.basketMat); cyl.position.y=0; b.add(cyl);
    const bottom=new THREE.Mesh(new THREE.CircleGeometry(0.12,16), r.basketMat); bottom.rotation.x=-Math.PI/2; bottom.position.y=-0.1; b.add(bottom);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.16,0.014,10,28), r.basketRim); rim.rotation.x=-Math.PI/2; rim.position.y=0.1; b.add(rim);
    b.position.copy(BASKET); engine.field.add(b); this._basket=b;
  },

  start(engine){
    this._hooks=[];
    engine.setTool((i)=>{ const h=engine.makeHook(i); this._hooks[i]=h; return h; });
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0; this._hooked=[null,null]; this._spawnTimer=0.2;
  },

  _bombCount(){ let n=0; for(const o of this._active) if(o.type==='bad') n++; return n; },

  _spawn(engine){
    let type='normal'; const rnd=Math.random();
    const badChance={easy:0.10,normal:0.15,hard:0.22}[engine.settings.diff];
    if(rnd<badChance && this._bombCount()<2) type='bad';
    else if(rnd<badChance+0.10) type='gold';
    const g=makeDuck(type); engine.field.add(g);
    const ang=Math.random()*Math.PI*2, rad=IN_R+0.1+Math.random()*(OUT_R-IN_R-0.2);
    const life=type==='bad'?5.5:(8+Math.random()*3);
    const obj={ group:g, type, ang, rad, w:(Math.random()<0.5?1:-1)*(0.12+Math.random()*0.28),
      ph:Math.random()*6, hooked:false, hand:-1, diving:false, tt:0, life };
    this._active.push(obj);
  },

  _pop(engine,o){ engine.field.remove(o.group); const i=this._active.indexOf(o); if(i>=0) this._active.splice(i,1); },

  update(dt, engine){
    const maxConc={easy:5,normal:6,hard:8}[engine.settings.diff];
    this._spawnTimer-=dt;
    if(this._spawnTimer<=0 && this._active.length<maxConc){
      this._spawn(engine);
      this._spawnTimer={easy:0.8,normal:0.6,hard:0.45}[engine.settings.diff]*(0.6+Math.random()*0.6);
    }
    const time=engine.clock.elapsedTime;

    // positions des pointes de crochet
    const tips=[];
    for(let i=0;i<2;i++){ if(this._hooks[i]){ const v=new THREE.Vector3(); this._hooks[i].userData.cp.getWorldPosition(v); tips[i]=v; } }

    for(const o of this._active.slice()){
      o.tt+=dt;
      if(o.hooked){
        // suit la pointe du crochet, pendouille dessous
        const tip=tips[o.hand];
        if(!tip){ o.hooked=false; o.hand=-1; }
        else {
          o.group.position.lerp(new THREE.Vector3(tip.x, tip.y-0.14, tip.z), Math.min(1,dt*14));
          o.group.rotation.y += dt*2;
          // dépôt dans le panier
          if(o.group.position.distanceTo(BASKET) < BASKET_R){
            const pos=o.group.position.clone();
            engine.good(pos, o.type==='gold'?5:1, o.type==='gold'?'#ffd54a':'#d6f9ff');
            this._hooked[o.hand]=null; this._pop(engine,o); continue;
          }
        }
      } else if(o.diving){
        o.group.position.y -= dt*0.5; o.group.scale.multiplyScalar(1-dt*2);
        if(o.tt>o.life+0.6){ this._pop(engine,o); continue; }
      } else {
        // dérive sur la rivière
        o.ang += o.w*dt;
        const x=Math.cos(o.ang)*o.rad, z=Math.sin(o.ang)*o.rad;
        const y=WATER_Y + o.group.userData.float + Math.sin(time*2+o.ph)*0.005;
        o.group.position.set(x,y,z);
        o.group.rotation.y = -o.ang + (o.w>0?Math.PI/2:-Math.PI/2);
        if(o.type==='bad' && o.group.userData.spark) o.group.userData.spark.scale.setScalar(1+Math.sin(time*18+o.ph)*0.3);
        if(o.tt>=o.life){ o.diving=true; o.tt=o.life; }
      }
      // pulsation de l'anneau
      if(o.group.userData.ring) o.group.userData.ring.rotation.z += dt*1.5;
    }

    // ferrage : passer le crochet dans l'anneau
    for(let i=0;i<2;i++){
      if(!tips[i] || this._hooked[i]) continue;                    // main occupée
      let best=null, bestD=HOOK_R;
      for(const o of this._active){
        if(o.hooked||o.diving) continue;
        const rx=o.group.position.x, ry=o.group.position.y+0.16, rz=o.group.position.z;
        const d=Math.hypot(tips[i].x-rx, tips[i].y-ry, tips[i].z-rz);
        if(d<bestD){ best=o; bestD=d; }
      }
      if(best){
        if(best.type==='bad'){ engine.bad(best.group.position.clone(),3); this._pop(engine,best); }
        else { best.hooked=true; best.hand=i; this._hooked[i]=best; engine.sfx.pick(); }
      }
    }
  },

  cleanup(engine){
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0; this._hooked=[null,null]; this._basket=null;
    engine.clearTool();
  }
};