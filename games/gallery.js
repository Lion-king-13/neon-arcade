// games/gallery.js — Stand Forain (mode spécial)
// Un vrai stand de fête foraine : plusieurs rangées défilent en sens inverse,
// avec des cibles différentes qui valent des points différents.
// Canard +1 · Boîte +2 · Peluche +3 · Étoile +5 · Cloche d'or +10 (petite et rapide !)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const Y_AXIS=new THREE.Vector3(0,1,0);
const ROWS=[
  {y:1.62, z:-2.25, dir: 1, sp:0.55},
  {y:1.28, z:-2.05, dir:-1, sp:0.75},
  {y:0.96, z:-1.85, dir: 1, sp:0.95}
];
const KINDS=[
  {id:'duck',  pts:1,  w:0.34, r:0.13, col:'#ffd54a'},
  {id:'can',   pts:2,  w:0.26, r:0.11, col:'#d7dce4'},
  {id:'teddy', pts:3,  w:0.20, r:0.12, col:'#c98a5a'},
  {id:'star',  pts:5,  w:0.14, r:0.10, col:'#b8f34d'},
  {id:'bell',  pts:10, w:0.06, r:0.075,col:'#ffd54a'}
];

let R=null;
function res(){
  if(R) return R;
  R={
    sphere:new THREE.SphereGeometry(1,14,12),
    tracerGeo:new THREE.CylinderGeometry(0.004,0.004,1,6),
    duckY:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0x5a3c00, emissiveIntensity:.3, roughness:.5}),
    beak:new THREE.MeshStandardMaterial({color:0xff8a3c, emissive:0x5a2400, roughness:.5}),
    eye:new THREE.MeshBasicMaterial({color:0x0b0e14}),
    metal:new THREE.MeshStandardMaterial({color:0xd7dce4, roughness:.35, metalness:.7}),
    red:new THREE.MeshStandardMaterial({color:0xff4d5e, emissive:0x5a0e16, emissiveIntensity:.3, roughness:.5}),
    fur:new THREE.MeshStandardMaterial({color:0xc98a5a, roughness:.9}),
    fur2:new THREE.MeshStandardMaterial({color:0xe8c49a, roughness:.9}),
    star:new THREE.MeshStandardMaterial({color:0xb8f34d, emissive:0x7bbf22, emissiveIntensity:.6, roughness:.4}),
    gold:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.8, roughness:.3, metalness:.6}),
    rail:new THREE.MeshStandardMaterial({color:0x3a2a18, roughness:.9}),
    postMat:new THREE.MeshStandardMaterial({color:0x2a2140, emissive:0xff2d95, emissiveIntensity:.3, roughness:.6})
  };
  return R;
}

function starShape(){
  const s=new THREE.Shape(); const N=5, ro=0.10, ri=0.045;
  for(let i=0;i<N*2;i++){ const a=(i/(N*2))*Math.PI*2 - Math.PI/2; const rr=i%2?ri:ro;
    const x=Math.cos(a)*rr, y=Math.sin(a)*rr; i?s.lineTo(x,y):s.moveTo(x,y); }
  s.closePath(); return s;
}

function makeProp(kind){
  const r=res(); const g=new THREE.Group();
  if(kind==='duck'){
    const b=new THREE.Mesh(r.sphere, r.duckY); b.scale.set(0.075,0.058,0.095); g.add(b);
    const h=new THREE.Mesh(r.sphere, r.duckY); h.scale.setScalar(0.046); h.position.set(0,0.075,0.062); g.add(h);
    const bk=new THREE.Mesh(new THREE.ConeGeometry(0.02,0.045,8), r.beak); bk.rotation.x=Math.PI/2; bk.position.set(0,0.07,0.105); g.add(bk);
    [-1,1].forEach(sx=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(0.008,8,6), r.eye); e.position.set(sx*0.018,0.088,0.088); g.add(e); });
  } else if(kind==='can'){
    const c=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.14,16), r.metal); g.add(c);
    for(const y of [0.03,-0.03]){ const bd=new THREE.Mesh(new THREE.TorusGeometry(0.055,0.008,8,20), r.red); bd.rotation.x=Math.PI/2; bd.position.y=y; g.add(bd); }
  } else if(kind==='teddy'){
    const b=new THREE.Mesh(r.sphere, r.fur); b.scale.set(0.06,0.07,0.05); g.add(b);
    const h=new THREE.Mesh(r.sphere, r.fur); h.scale.setScalar(0.05); h.position.y=0.10; g.add(h);
    const mu=new THREE.Mesh(r.sphere, r.fur2); mu.scale.set(0.026,0.022,0.02); mu.position.set(0,0.088,0.042); g.add(mu);
    [-1,1].forEach(sx=>{
      const ear=new THREE.Mesh(r.sphere, r.fur); ear.scale.setScalar(0.022); ear.position.set(sx*0.038,0.135,0); g.add(ear);
      const eye=new THREE.Mesh(new THREE.SphereGeometry(0.008,8,6), r.eye); eye.position.set(sx*0.02,0.108,0.042); g.add(eye);
      const arm=new THREE.Mesh(r.sphere, r.fur); arm.scale.set(0.022,0.038,0.022); arm.position.set(sx*0.068,0.01,0); arm.rotation.z=sx*0.5; g.add(arm);
      const leg=new THREE.Mesh(r.sphere, r.fur); leg.scale.set(0.024,0.032,0.024); leg.position.set(sx*0.032,-0.075,0); g.add(leg);
    });
  } else if(kind==='star'){
    const geo=new THREE.ExtrudeGeometry(starShape(), {depth:0.02, bevelEnabled:false});
    const m=new THREE.Mesh(geo, r.star); m.position.z=-0.01; g.add(m);
  } else { // bell
    const b=new THREE.Mesh(new THREE.SphereGeometry(0.06,16,12,0,Math.PI*2,0,Math.PI/2), r.gold); b.rotation.x=Math.PI; b.position.y=0.02; g.add(b);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.06,0.008,8,24), r.gold); rim.rotation.x=Math.PI/2; rim.position.y=-0.038; g.add(rim);
    const cl=new THREE.Mesh(new THREE.SphereGeometry(0.018,10,8), r.gold); cl.position.y=-0.05; g.add(cl);
    const hook=new THREE.Mesh(new THREE.TorusGeometry(0.014,0.005,8,16), r.gold); hook.position.y=0.055; g.add(hook);
  }
  return g;
}

export default {
  id:'gallery',
  name:{fr:'Stand Forain', en:'Fair Gallery'},
  color:'#ffa23c',
  usesSurfaces:false,
  theme:'carnival',
  dlc:true, special:true,

  _props:[], _guns:[], _flash:[0,0], _tracers:[], _timers:[],

  init(engine){ res(); },
  buildLayout(engine, spots){
    const r=res();
    // rails + montants
    for(const row of ROWS){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(3.6,0.05,0.16), r.rail);
      rail.position.set(0,row.y-0.12,row.z); engine.field.add(rail);
      const strip=new THREE.Mesh(new THREE.BoxGeometry(3.6,0.012,0.02), r.postMat);
      strip.position.set(0,row.y-0.093,row.z+0.08); engine.field.add(strip);
    }
    [-1.75,1.75].forEach(x=>{ const post=new THREE.Mesh(new THREE.BoxGeometry(0.1,2.1,0.1), r.postMat); post.position.set(x,1.05,-2.05); engine.field.add(post); });
  },

  start(engine){
    this._guns=[];
    engine.setTool((i)=>{ const gn=engine.makeGun(i); this._guns[i]=gn; return gn; }, 'ray');
    for(const p of this._props.slice()) engine.field.remove(p.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._props.length=0; this._tracers.length=0; this._flash=[0,0];
    this._timers=ROWS.map((_,i)=>0.4+i*0.5);
  },

  _pick(engine){
    // plus la cible vaut cher, plus elle est rare
    const w=[0.34,0.26,0.20,0.14,0.06]; const rnd=Math.random(); let acc=0;
    for(let i=0;i<KINDS.length;i++){ acc+=w[i]; if(rnd<acc) return KINDS[i]; }
    return KINDS[0];
  },
  _spawn(engine, rowIdx){
    const row=ROWS[rowIdx], kind=this._pick(engine);
    const g=makeProp(kind.id);
    const dir=row.dir;
    g.position.set(-dir*1.8, row.y, row.z);
    if(kind.id!=='star' && kind.id!=='bell') g.rotation.y = dir>0 ? Math.PI/2 : -Math.PI/2;
    engine.field.add(g);
    const mult={easy:0.85,normal:1,hard:1.25}[engine.settings.diff];
    const sp=row.sp*mult*(kind.id==='bell'?1.7:(kind.id==='star'?1.3:1));
    this._props.push({group:g, pos:g.position, vx:dir*sp, kind, radius:kind.r, dead:false, ph:Math.random()*6});
  },
  _rm(engine,o){ engine.field.remove(o.group); const i=this._props.indexOf(o); if(i>=0) this._props.splice(i,1); },

  onTrigger(i, engine){
    engine.sfx.shot(); if(this._guns[i]) this._flash[i]=0.08;
    const o=new THREE.Vector3(), d=new THREE.Vector3(); engine.aimRay(i,o,d);
    let best=null, bestT=1e9;
    for(const p of this._props){ if(p.dead) continue;
      const px=p.pos.x-o.x, py=p.pos.y-o.y, pz=p.pos.z-o.z; const t=px*d.x+py*d.y+pz*d.z; if(t<0.2) continue;
      const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-t*t));
      if(dist<p.radius && t<bestT){ best=p; bestT=t; }
    }
    let end;
    if(best){
      end=best.pos.clone(); best.dead=true;
      engine.good(best.pos.clone(), best.kind.pts, best.kind.col);
      engine.burst(best.pos.clone(), new THREE.Color(best.kind.col).getHex());
      if(best.kind.id==='bell') engine.sfx.gold();
      this._rm(engine,best);
    } else { end=o.clone().addScaledVector(d,8); engine.miss(); }
    const mesh=new THREE.Mesh(res().tracerGeo, new THREE.MeshBasicMaterial({color:this._guns[i]?this._guns[i].userData.color:0x2ee6d6, transparent:true, opacity:.9}));
    const vec=new THREE.Vector3().subVectors(end,o), len=Math.max(0.01,vec.length());
    mesh.position.copy(o).addScaledVector(vec,0.5); mesh.quaternion.setFromUnitVectors(Y_AXIS, vec.normalize()); mesh.scale.set(1,len,1);
    engine.scene.add(mesh); this._tracers.push({mesh, life:0.12});
  },

  update(dt, engine){
    const time=engine.clock.elapsedTime;
    for(let i=0;i<ROWS.length;i++){
      this._timers[i]-=dt;
      if(this._timers[i]<=0){
        this._spawn(engine,i);
        this._timers[i]={easy:2.2,normal:1.7,hard:1.25}[engine.settings.diff]*(0.7+Math.random()*0.7);
      }
    }
    for(const p of this._props.slice()){
      p.pos.x+=p.vx*dt;
      if(p.kind.id==='star'||p.kind.id==='bell'){ p.group.rotation.y+=dt*2; p.pos.y += Math.sin(time*3+p.ph)*dt*0.10; }
      else p.group.position.y = p.pos.y;
      p.group.position.copy(p.pos);
      if(Math.abs(p.pos.x)>1.95) this._rm(engine,p);
    }
    for(let i=0;i<2;i++){
      if(this._flash[i]>0){ this._flash[i]-=dt; const gn=this._guns[i]; if(gn) gn.userData.tip.scale.setScalar(1+Math.max(0,this._flash[i])*40); }
      else if(this._guns[i]) this._guns[i].userData.tip.scale.setScalar(1);
    }
    for(let k=this._tracers.length-1;k>=0;k--){ const tr=this._tracers[k]; tr.life-=dt; tr.mesh.material.opacity=Math.max(0,tr.life/0.12); if(tr.life<=0){ engine.scene.remove(tr.mesh); this._tracers.splice(k,1); } }
  },

  cleanup(engine){
    for(const p of this._props.slice()) engine.field.remove(p.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._props.length=0; this._tracers.length=0;
    engine.clearTool();
  }
};