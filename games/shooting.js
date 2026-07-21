// games/shooting.js — Stand de Tir
// Le contrôleur devient un pistolet laser (gâchette = tir). On tire sur des
// cibles qui défilent. Cible = +1, cible dorée = +5, bombe = à éviter (−3).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const Y_AXIS = new THREE.Vector3(0,1,0);

let R=null;
function res(){
  if(R) return R;
  R={
    discGeo:new THREE.CircleGeometry(0.16,40),
    rimGeo:new THREE.TorusGeometry(0.16,0.014,10,40),
    sphere:new THREE.SphereGeometry(1,14,12),
    tracerGeo:new THREE.CylinderGeometry(0.004,0.004,1,6),
    normTex:makeBullseye(false),
    goldTex:makeBullseye(true),
    bomb:new THREE.MeshStandardMaterial({color:0x1a1420, emissive:0x330a12, emissiveIntensity:.45, roughness:.6, metalness:.3}),
    fuse:new THREE.MeshBasicMaterial({color:0xffd54a}),
    spark:new THREE.MeshBasicMaterial({color:0xff7a3c}),
    rimN:new THREE.MeshBasicMaterial({color:0x2ee6d6}),
    rimG:new THREE.MeshBasicMaterial({color:0xffd54a})
  };
  return R;
}
function makeBullseye(gold){
  const s=256, cv=document.createElement('canvas'); cv.width=cv.height=s; const c=cv.getContext('2d');
  const rings = gold ? ['#ffd54a','#3a2a00','#ffd54a','#3a2a00','#fff2b0'] : ['#ff4d5e','#f4f6fb','#ff4d5e','#f4f6fb','#ffd54a'];
  for(let i=0;i<rings.length;i++){ c.beginPath(); c.arc(s/2,s/2, s*0.48*(1-i/rings.length),0,Math.PI*2); c.fillStyle=rings[i]; c.fill(); }
  return new THREE.CanvasTexture(cv);
}

function makeTarget(type){
  const r=res(); const g=new THREE.Group(); let radius=0.16;
  if(type==='bad'){
    const body=new THREE.Mesh(r.sphere, r.bomb); body.scale.setScalar(0.12); g.add(body);
    const fuse=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.06,6), r.fuse); fuse.position.set(0,0.14,0); fuse.rotation.z=0.3; g.add(fuse);
    const spark=new THREE.Mesh(new THREE.SphereGeometry(0.016,8,6), r.spark); spark.position.set(0.02,0.18,0); g.add(spark); g.userData.spark=spark;
    radius=0.13;
  } else {
    const disc=new THREE.Mesh(r.discGeo, new THREE.MeshBasicMaterial({map: type==='gold'?r.goldTex:r.normTex}));
    g.add(disc);
    const rim=new THREE.Mesh(r.rimGeo, type==='gold'?r.rimG:r.rimN); g.add(rim);
    g.userData.rim=rim;
  }
  return {group:g, radius, type};
}

function makeGun(i){
  const color=[0x2ee6d6,0xff4d5e][i]; const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.06,0.12), new THREE.MeshStandardMaterial({color:0x1a2030,roughness:.5,metalness:.5}));
  body.position.set(0,-0.01,-0.04); g.add(body);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.014,0.14,12), new THREE.MeshStandardMaterial({color:0x2a3245,roughness:.4,metalness:.6}));
  barrel.rotation.x=Math.PI/2; barrel.position.set(0,0.006,-0.12); g.add(barrel);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(0.016,12,10), new THREE.MeshBasicMaterial({color})); tip.position.set(0,0.006,-0.19); g.add(tip);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.0016,0.0016,4,6), new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16}));
  beam.rotation.x=Math.PI/2; beam.position.set(0,0.006,-2.19); g.add(beam);
  g.userData.tip=tip; g.userData.color=color;
  return g;
}

export default {
  id:'shooting',
  name:{fr:'Stand de Tir', en:'Shooting Range'},
  color:'#ff2d95',
  usesSurfaces:false,

  _active:[], _spawnTimer:0, _guns:[], _flash:[0,0], _tracers:[],

  init(engine){ res(); },
  buildLayout(engine, spots){ /* rien de spatial */ },

  start(engine){
    this._guns=[];
    engine.setTool((i)=>{ const gun=makeGun(i); this._guns[i]=gun; return gun; });
    for(const o of this._active.slice()) engine.field.remove(o.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._active.length=0; this._tracers.length=0; this._flash=[0,0]; this._spawnTimer=0.4;
  },

  _spawn(engine){
    let type='normal'; const rnd=Math.random();
    const badChance={easy:0.10,normal:0.16,hard:0.24}[engine.settings.diff];
    if(rnd<badChance) type='bad'; else if(rnd<badChance+0.10) type='gold';
    const tg=makeTarget(type);
    const dir=Math.random()<0.5?1:-1;
    const y=1.0+Math.random()*0.9, z=-1.6-Math.random()*0.7;
    const x=-dir*1.55;
    const speed={easy:[0.5,0.8],normal:[0.8,1.2],hard:[1.2,1.7]}[engine.settings.diff];
    tg.pos=new THREE.Vector3(x,y,z); tg.vx=dir*(speed[0]+Math.random()*(speed[1]-speed[0]));
    tg.group.position.copy(tg.pos); tg.dead=false; tg.ph=Math.random()*6;
    engine.field.add(tg.group); this._active.push(tg);
  },
  _remove(engine,tg){ engine.field.remove(tg.group); const i=this._active.indexOf(tg); if(i>=0) this._active.splice(i,1); },

  _tracer(engine, a, b, color){
    const mesh=new THREE.Mesh(res().tracerGeo, new THREE.MeshBasicMaterial({color, transparent:true, opacity:.9}));
    const dir=new THREE.Vector3().subVectors(b,a), len=Math.max(0.01,dir.length());
    mesh.position.copy(a).addScaledVector(dir,0.5);
    mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize()); mesh.scale.set(1,len,1);
    engine.scene.add(mesh); this._tracers.push({mesh, life:0.12});
  },

  onTrigger(i, engine){
    engine.sfx.shot();
    if(this._guns[i]) this._flash[i]=0.08;
    const o=new THREE.Vector3(), d=new THREE.Vector3(); engine.aimRay(i,o,d);
    let best=null, bestT=1e9;
    for(const tg of this._active){
      if(tg.dead) continue;
      const px=tg.pos.x-o.x, py=tg.pos.y-o.y, pz=tg.pos.z-o.z;
      const t=px*d.x+py*d.y+pz*d.z; if(t<0.2) continue;
      const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-t*t));
      if(dist<tg.radius && t<bestT){ best=tg; bestT=t; }
    }
    let end;
    if(best){
      end=best.pos.clone(); best.dead=true;
      if(best.type==='bad') engine.bad(best.pos.clone(),3);
      else engine.good(best.pos.clone(), best.type==='gold'?5:1, best.type==='gold'?'#ffd54a':'#eaffd2');
      this._remove(engine,best);
    } else { end=o.clone().addScaledVector(d,6); engine.miss(); }
    this._tracer(engine, o, end, this._guns[i]?this._guns[i].userData.color:0x2ee6d6);
  },

  update(dt, engine){
    // apparition
    this._spawnTimer-=dt;
    const maxConc={easy:3,normal:4,hard:6}[engine.settings.diff];
    if(this._spawnTimer<=0 && this._active.length<maxConc){
      this._spawn(engine);
      this._spawnTimer={easy:1.0,normal:0.75,hard:0.5}[engine.settings.diff]*(0.7+Math.random()*0.6);
    }
    const time=engine.clock.elapsedTime;
    for(const tg of this._active.slice()){
      tg.pos.x += tg.vx*dt;
      tg.group.position.copy(tg.pos);
      if(tg.group.userData.rim) tg.group.userData.rim.rotation.z += dt*1.2;
      if(tg.group.userData.spark){ tg.group.userData.spark.scale.setScalar(1+Math.sin(time*18+tg.ph)*0.3); }
      if(Math.abs(tg.pos.x)>1.7) this._remove(engine,tg);
    }
    // éclat au canon
    for(let i=0;i<2;i++){
      if(this._flash[i]>0){ this._flash[i]-=dt; const gun=this._guns[i]; if(gun) gun.userData.tip.scale.setScalar(1+Math.max(0,this._flash[i])*40); }
      else if(this._guns[i]) this._guns[i].userData.tip.scale.setScalar(1);
    }
    // traçantes
    for(let k=this._tracers.length-1;k>=0;k--){
      const tr=this._tracers[k]; tr.life-=dt; tr.mesh.material.opacity=Math.max(0,tr.life/0.12);
      if(tr.life<=0){ engine.scene.remove(tr.mesh); this._tracers.splice(k,1); }
    }
  },

  cleanup(engine){
    for(const o of this._active.slice()) engine.field.remove(o.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._active.length=0; this._tracers.length=0;
    engine.clearTool();
  }
};
