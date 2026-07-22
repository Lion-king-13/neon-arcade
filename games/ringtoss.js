// games/ringtoss.js — Lancer d'Anneaux
// Tu tiens un anneau dans chaque main : appuie sur la gâchette et lâche (relâche)
// pour le lancer sur les quilles. Anneau posé sur une quille = +2, quille dorée = +5.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const G = 4.6;                 // gravité
const CAPTURE = 0.115;         // tolérance d'enfilage
const MIN_TRAVEL = 0.55;       // distance horizontale mini pour valider (anti-dépôt)
const RING_COL = [0x2ee6d6, 0xff4d5e];

let R=null;
function res(){
  if(R) return R;
  R={ ringGeo:new THREE.TorusGeometry(0.06,0.013,10,24),
      bottleMat:new THREE.MeshStandardMaterial({color:0x2ee6d6, emissive:0x0e3b3a, emissiveIntensity:.4, roughness:.4, metalness:.3}),
      goldMat:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.6, roughness:.35, metalness:.5}),
      tableMat:new THREE.MeshStandardMaterial({color:0x3a2a18, roughness:.9}) };
  return R;
}
function makeRing(color){ return new THREE.Mesh(res().ringGeo, new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.6, roughness:.4, metalness:.3})); }
function makeBottle(gold){
  const r=res(); const g=new THREE.Group(); const mat=gold?r.goldMat:r.bottleMat;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.05,0.16,14), mat); body.position.y=0.08; g.add(body);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.10,12), mat); neck.position.y=0.20; g.add(neck);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(0.022,0.006,8,16), mat); lip.rotation.x=Math.PI/2; lip.position.y=0.25; g.add(lip);
  return g;
}

export default {
  id:'ringtoss',
  name:{fr:"Lancer d'Anneaux", en:'Ring Toss'},
  color:'#2ee6d6',
  usesSurfaces:false,
  theme:'carnival',

  _pegs:[], _rings:[], _holders:[], _held:[null,null], _reload:[0,0],

  init(engine){ res(); },
  buildLayout(engine, spots){
    const r=res(); this._pegs.length=0;
    const table=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.08,0.8), r.tableMat); table.position.set(0,0.86,-1.85); engine.field.add(table);
    const rows=[{z:-1.7,y:0.9,n:3,dx:0.34},{z:-2.0,y:0.9,n:4,dx:0.30}];
    for(const row of rows){ const startX=-(row.n-1)/2*row.dx;
      for(let k=0;k<row.n;k++){ const gold=Math.random()<0.18; const b=makeBottle(gold); const x=startX+k*row.dx;
        b.position.set(x,row.y,row.z); engine.field.add(b);
        this._pegs.push({group:b, x, z:row.z, topY:row.y+0.25, baseY:row.y+0.02, gold, capture:CAPTURE}); } }
  },

  start(engine){
    this._rings=[]; this._holders=[]; this._held=[null,null]; this._reload=[0,0];
    engine.setTool((i)=>{ const h=new THREE.Group(); this._holders[i]=h; return h; }, 'grip');
    for(let i=0;i<2;i++) this._giveRing(i);
  },
  _giveRing(i){
    if(!this._holders[i]) return;
    const ring=makeRing(RING_COL[i]); ring.rotation.x=Math.PI/2; ring.position.set(0,0,-0.11);
    this._holders[i].add(ring); this._held[i]=ring;
  },

  onRelease(i, engine){
    const ring=this._held[i]; if(!ring) return;
    this._held[i]=null;
    // passe l'anneau en projectile avec la vitesse de la manette
    const wp=new THREE.Vector3(), wq=new THREE.Quaternion(); ring.getWorldPosition(wp); ring.getWorldQuaternion(wq);
    this._holders[i].remove(ring); ring.position.copy(wp); ring.quaternion.copy(wq); engine.field.add(ring);
    const vel=new THREE.Vector3(); engine.controllerVel(i, vel);
    // aide au lancer : plus généreux + composante avant du contrôleur
    const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(wq); vel.multiplyScalar(1.35); vel.addScaledVector(fwd, 1.1); vel.y+=0.7;
    this._rings.push({mesh:ring, vel, spin:(Math.random()-.5)*6, landed:false, start:wp.clone()});
    engine.sfx.pick();
    this._reload[i]=0.5;
  },

  update(dt, engine){
    for(let i=0;i<2;i++){ if(this._held[i]===null && this._reload[i]>0){ this._reload[i]-=dt; if(this._reload[i]<=0) this._giveRing(i); } }
    for(const ring of this._rings.slice()){
      if(ring.landed) continue;
      ring.vel.y -= G*dt;
      ring.mesh.position.addScaledVector(ring.vel, dt);
      ring.mesh.rotation.y += ring.spin*dt;
      // enfilage sur une quille (uniquement si l'anneau a été VRAIMENT lancé)
      const traveled=Math.hypot(ring.mesh.position.x-ring.start.x, ring.mesh.position.z-ring.start.z);
      if(traveled>MIN_TRAVEL) for(const p of this._pegs){
        const dx=ring.mesh.position.x-p.x, dz=ring.mesh.position.z-p.z;
        if(ring.vel.y<0 && ring.mesh.position.y < p.topY+0.03 && ring.mesh.position.y > p.baseY-0.02 && Math.hypot(dx,dz)<p.capture){
          ring.landed=true; ring.mesh.position.set(p.x, p.baseY+0.03, p.z); ring.mesh.rotation.set(Math.PI/2,0,0);
          engine.good(new THREE.Vector3(p.x,p.topY,p.z), p.gold?5:2, p.gold?'#ffd54a':'#d6f9ff');
          break;
        }
      }
      // sol : raté
      if(!ring.landed && ring.mesh.position.y<0.35){ engine.field.remove(ring.mesh); const idx=this._rings.indexOf(ring); if(idx>=0) this._rings.splice(idx,1); }
      // trop loin
      if(!ring.landed && ring.mesh.position.z<-3){ engine.field.remove(ring.mesh); const idx=this._rings.indexOf(ring); if(idx>=0) this._rings.splice(idx,1); }
    }
  },

  cleanup(engine){
    for(const ring of this._rings.slice()) engine.field.remove(ring.mesh);
    this._rings.length=0; this._pegs.length=0; this._holders=[]; this._held=[null,null];
    engine.clearTool();
  }
};