// games/dodge.js — Esquive & Garde (adresse)
// Des projectiles foncent sur toi. Les ROUGES sont à ESQUIVER (bouge la tête !),
// les VERTS sont à BLOQUER avec les mains (garde). Bien joué = points, raté = pénalité.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const HIT_R = 0.30;     // rayon "tête touchée"
const GUARD_R = 0.22;   // portée de la garde

let R=null;
function res(){
  if(R) return R;
  R={
    rock:new THREE.IcosahedronGeometry(0.13,0),
    orb:new THREE.SphereGeometry(0.11,16,12),
    bad:new THREE.MeshStandardMaterial({color:0x3a1420, emissive:0xff4d5e, emissiveIntensity:.75, roughness:.5, metalness:.3}),
    good:new THREE.MeshStandardMaterial({color:0x1a3a18, emissive:0xb8f34d, emissiveIntensity:.8, roughness:.4, metalness:.3}),
    gold:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.9, roughness:.35, metalness:.5}),
    trail:new THREE.MeshBasicMaterial({color:0xff4d5e, transparent:true, opacity:.25})
  };
  return R;
}

function makeProj(type){
  const r=res(); const g=new THREE.Group();
  if(type==='bad'){
    const m=new THREE.Mesh(r.rock, r.bad); g.add(m);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.17,0.008,8,24), new THREE.MeshBasicMaterial({color:0xff4d5e, transparent:true, opacity:.7}));
    g.add(ring); g.userData.ring=ring;
  } else {
    const m=new THREE.Mesh(r.orb, type==='gold'?r.gold:r.good); g.add(m);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.15,0.008,8,24), new THREE.MeshBasicMaterial({color:type==='gold'?0xffd54a:0xb8f34d, transparent:true, opacity:.8}));
    g.add(ring); g.userData.ring=ring;
  }
  return g;
}

export default {
  id:'dodge',
  name:{fr:'Esquive & Garde', en:'Dodge & Block'},
  color:'#b8f34d',
  usesSurfaces:false,
  theme:'carnival',

  _proj:[], _timer:0, _streak:0,

  init(engine){ res(); },
  buildLayout(engine, spots){},

  start(engine){
    engine.clearTool();
    for(const p of this._proj.slice()) engine.field.remove(p.group);
    this._proj.length=0; this._timer=0.8; this._streak=0;
  },

  _spawn(engine){
    const rnd=Math.random();
    const type = rnd<0.45 ? 'bad' : (rnd<0.90 ? 'good' : 'gold');
    const g=makeProj(type);
    const head=engine.headPos(new THREE.Vector3());
    // départ devant, décalé, il fonce vers le joueur
    const ang=(Math.random()-0.5)*1.5;
    const start=new THREE.Vector3(head.x+Math.sin(ang)*1.2, 0.9+Math.random()*1.1, head.z-2.6);
    g.position.copy(start); engine.field.add(g);
    const sp={easy:1.5,normal:2.1,hard:2.8}[engine.settings.diff]*(0.85+Math.random()*0.3);
    // vise un point proche de la tête (à esquiver) ou des mains (à bloquer)
    const target=new THREE.Vector3(head.x+(Math.random()-0.5)*(type==='bad'?0.35:0.7), head.y+(Math.random()-0.5)*0.3, head.z+0.15);
    const v=target.sub(start).normalize().multiplyScalar(sp);
    this._proj.push({group:g, pos:g.position, v, type, done:false, t:0});
  },
  _rm(engine,p){ engine.field.remove(p.group); const i=this._proj.indexOf(p); if(i>=0) this._proj.splice(i,1); },

  update(dt, engine){
    const fr=engine.lang!=='en';
    engine.hudExtra=(fr?'Série ':'Streak ')+this._streak;
    this._timer-=dt;
    const maxC={easy:3,normal:4,hard:6}[engine.settings.diff];
    if(this._timer<=0 && this._proj.length<maxC){
      this._spawn(engine);
      this._timer={easy:1.3,normal:1.0,hard:0.72}[engine.settings.diff]*(0.7+Math.random()*0.6);
    }
    const head=engine.headPos(new THREE.Vector3());
    const hands=[]; engine.eachMallet((mp)=>hands.push(mp.clone()));

    for(const p of this._proj.slice()){
      p.t+=dt; p.pos.addScaledVector(p.v,dt); p.group.position.copy(p.pos);
      p.group.rotation.x+=dt*2.4; p.group.rotation.y+=dt*1.7;
      if(p.group.userData.ring) p.group.userData.ring.quaternion.copy(engine._vq);
      if(p.done) continue;

      // garde : bloquer avec la main
      for(const hp of hands){
        if(hp.distanceTo(p.pos)<GUARD_R){
          p.done=true;
          if(p.type==='bad'){ engine.bad(p.pos.clone(),2); this._streak=0; }       // ne pas toucher les rouges !
          else { engine.good(p.pos.clone(), p.type==='gold'?5:2, p.type==='gold'?'#ffd54a':'#eaffd2'); this._streak++; }
          engine.burst(p.pos.clone(), p.type==='bad'?0xff4d5e:0xb8f34d);
          this._rm(engine,p); break;
        }
      }
      if(p.done) continue;

      // impact sur la tête
      if(p.pos.distanceTo(head)<HIT_R){
        p.done=true;
        if(p.type==='bad'){ engine.bad(p.pos.clone(),3); this._streak=0; engine.burst(p.pos.clone(),0xff4d5e); }
        else { engine.miss(); this._streak=0; }
        this._rm(engine,p); continue;
      }
      // passé derrière
      if(p.pos.z > head.z+0.6){
        if(p.type==='bad'){ this._streak++; engine.good(p.pos.clone(), 1+Math.floor(this._streak/5), '#8b6cff'); }  // esquive réussie
        else engine.miss();
        this._rm(engine,p);
      }
    }
  },

  cleanup(engine){
    for(const p of this._proj.slice()) engine.field.remove(p.group);
    this._proj.length=0;
  }
};