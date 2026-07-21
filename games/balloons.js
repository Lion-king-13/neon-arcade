// games/balloons.js — Ballons à Éclater
// Des ballons montent ; tu les éclates au POING ou au FUSIL (choix avant la partie).
// Ballon coloré = +1, doré = +5, ballon-bombe = à éviter (−3).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const FIST_R = 0.14, GUN_R = 0.11;
const Y_AXIS = new THREE.Vector3(0,1,0);
const PALETTE = [0x8b6cff, 0xff4d5e, 0x2ee6d6, 0xb8f34d, 0xff2d95, 0xffa23c, 0x4db8ff];

let R=null;
function res(){
  if(R) return R;
  R={
    sphere:new THREE.SphereGeometry(1,18,14),
    knot:new THREE.ConeGeometry(0.02,0.03,8),
    stringGeo:new THREE.CylinderGeometry(0.0015,0.0015,0.16,4),
    stringMat:new THREE.MeshBasicMaterial({color:0xf4f6fb, transparent:true, opacity:.4}),
    bomb:new THREE.MeshStandardMaterial({color:0x1a1420, emissive:0x330a12, emissiveIntensity:.4, roughness:.6, metalness:.3}),
    gold:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.7, roughness:.3, metalness:.4}),
    fuse:new THREE.MeshBasicMaterial({color:0xffd54a}),
    spark:new THREE.MeshBasicMaterial({color:0xff7a3c}),
    tracerGeo:new THREE.CylinderGeometry(0.004,0.004,1,6)
  };
  return R;
}

function makeBalloon(type, color){
  const r=res(); const g=new THREE.Group();
  if(type==='bad'){
    const b=new THREE.Mesh(r.sphere, r.bomb); b.scale.set(0.09,0.10,0.09); g.add(b);
    const fuse=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.05,6), r.fuse); fuse.position.set(0,0.14,0); fuse.rotation.z=0.3; g.add(fuse);
    const spark=new THREE.Mesh(new THREE.SphereGeometry(0.014,8,6), r.spark); spark.position.set(0.02,0.18,0); g.add(spark); g.userData.spark=spark;
    return g;
  }
  const mat = type==='gold' ? r.gold : new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.35, roughness:.35, metalness:.1});
  const b=new THREE.Mesh(r.sphere, mat); b.scale.set(0.09,0.11,0.09); g.add(b);
  const knot=new THREE.Mesh(r.knot, mat); knot.position.y=-0.11; knot.rotation.x=Math.PI; g.add(knot);
  const str=new THREE.Mesh(r.stringGeo, r.stringMat); str.position.y=-0.20; g.add(str);
  // reflet
  const shine=new THREE.Mesh(new THREE.SphereGeometry(0.02,8,8), new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.5}));
  shine.position.set(-0.03,0.04,0.07); g.add(shine);
  return g;
}

export default {
  id:'balloons',
  name:{fr:'Ballons', en:'Balloon Pop'},
  color:'#ff2d95',
  usesSurfaces:false,
  chooseOptions:true,
  theme:'carnival',

  _active:[], _spawnTimer:0, _weapon:'fist', _guns:[], _flash:[0,0], _tracers:[],

  init(engine){ res(); },
  buildLayout(engine, spots){ /* rien de spatial */ },

  chooseOptions(engine){
    const fr = engine.lang==='fr';
    engine.drawBoard([{text:'Ballons', s:70, col:'#ff2d95', gap:10},{text: fr?'Choisis ton arme':'Choose your weapon', s:44, col:'#2ee6d6'}]);
    engine.setButtons([
      {label: fr?'POING':'FIST', color:'#b8f34d', pos:new THREE.Vector3(-0.2,1.1,-0.85), onTrigger:()=>{ this._weapon='fist'; engine._startCountdown(); }},
      {label: fr?'FUSIL':'GUN',  color:'#2ee6d6', pos:new THREE.Vector3( 0.2,1.1,-0.85), onTrigger:()=>{ this._weapon='gun';  engine._startCountdown(); }}
    ]);
  },

  start(engine){
    if(this._weapon==='gun'){ this._guns=[]; engine.setTool((i)=>{ const gn=engine.makeGun(i); this._guns[i]=gn; return gn; }, 'ray'); }
    else engine.clearTool();
    for(const o of this._active.slice()) engine.field.remove(o.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._active.length=0; this._tracers.length=0; this._flash=[0,0]; this._spawnTimer=0.4;
  },

  _spawn(engine){
    let type='normal', color=PALETTE[(Math.random()*PALETTE.length)|0]; const rnd=Math.random();
    const badChance={easy:0.10,normal:0.16,hard:0.24}[engine.settings.diff];
    if(rnd<badChance) type='bad'; else if(rnd<badChance+0.09){ type='gold'; color=0xffd54a; }
    const g=makeBalloon(type,color); engine.field.add(g);
    const x=(Math.random()-.5)*1.9, z=-0.5-Math.random()*0.7, y0=0.55;
    g.position.set(x,y0,z);
    const speed={easy:[0.28,0.45],normal:[0.4,0.62],hard:[0.6,0.85]}[engine.settings.diff];
    const obj={ group:g, type, pos:g.position, vy:speed[0]+Math.random()*(speed[1]-speed[0]),
      sway:0.1+Math.random()*0.18, sp:0.6+Math.random()*0.9, ph:Math.random()*6, x0:x, dead:false };
    this._active.push(obj);
  },
  _pop(engine,o){ engine.field.remove(o.group); const i=this._active.indexOf(o); if(i>=0) this._active.splice(i,1); },

  _hit(engine, o){
    o.dead=true; const pos=o.group.position.clone();
    if(o.type==='bad') engine.bad(pos,3);
    else engine.good(pos, o.type==='gold'?5:1, o.type==='gold'?'#ffd54a':'#eaffd2');
    this._pop(engine,o);
  },

  onTrigger(i, engine){
    if(this._weapon!=='gun') return;
    engine.sfx.shot(); if(this._guns[i]) this._flash[i]=0.08;
    const o=new THREE.Vector3(), d=new THREE.Vector3(); engine.aimRay(i,o,d);
    let best=null, bestT=1e9;
    for(const b of this._active){
      if(b.dead) continue;
      const px=b.pos.x-o.x, py=b.pos.y-o.y, pz=b.pos.z-o.z; const t=px*d.x+py*d.y+pz*d.z; if(t<0.2) continue;
      const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-t*t));
      if(dist<GUN_R && t<bestT){ best=b; bestT=t; }
    }
    let end;
    if(best){ end=best.pos.clone(); this._hit(engine,best); }
    else { end=o.clone().addScaledVector(d,6); engine.miss(); }
    const mesh=new THREE.Mesh(res().tracerGeo, new THREE.MeshBasicMaterial({color:this._guns[i]?this._guns[i].userData.color:0x2ee6d6, transparent:true, opacity:.9}));
    const dir=new THREE.Vector3().subVectors(end,o), len=Math.max(0.01,dir.length());
    mesh.position.copy(o).addScaledVector(dir,0.5); mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize()); mesh.scale.set(1,len,1);
    engine.scene.add(mesh); this._tracers.push({mesh, life:0.12});
  },

  update(dt, engine){
    this._spawnTimer-=dt;
    const maxConc={easy:4,normal:5,hard:7}[engine.settings.diff];
    if(this._spawnTimer<=0 && this._active.length<maxConc){
      this._spawn(engine);
      this._spawnTimer={easy:0.9,normal:0.7,hard:0.5}[engine.settings.diff]*(0.6+Math.random()*0.6);
    }
    const time=engine.clock.elapsedTime;
    for(const o of this._active.slice()){
      o.pos.y += o.vy*dt;
      o.pos.x = o.x0 + Math.sin(time*o.sp+o.ph)*o.sway;
      o.group.rotation.z = Math.sin(time*o.sp+o.ph)*0.15;
      if(o.type==='bad' && o.group.userData.spark) o.group.userData.spark.scale.setScalar(1+Math.sin(time*18+o.ph)*0.3);
      if(o.pos.y>2.3){ if(o.type!=='bad') engine.miss(); this._pop(engine,o); }
    }
    // poing
    if(this._weapon==='fist'){
      engine.eachMallet((mp)=>{
        for(const o of this._active){ if(o.dead) continue; if(mp.distanceTo(o.group.position)<FIST_R) this._hit(engine,o); }
      });
    }
    // traçantes + flash
    for(let i=0;i<2;i++){
      if(this._flash[i]>0){ this._flash[i]-=dt; const gn=this._guns[i]; if(gn) gn.userData.tip.scale.setScalar(1+Math.max(0,this._flash[i])*40); }
      else if(this._guns[i]) this._guns[i].userData.tip.scale.setScalar(1);
    }
    for(let k=this._tracers.length-1;k>=0;k--){ const tr=this._tracers[k]; tr.life-=dt; tr.mesh.material.opacity=Math.max(0,tr.life/0.12); if(tr.life<=0){ engine.scene.remove(tr.mesh); this._tracers.splice(k,1); } }
  },

  cleanup(engine){
    for(const o of this._active.slice()) engine.field.remove(o.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._active.length=0; this._tracers.length=0;
    engine.clearTool();
  }
};