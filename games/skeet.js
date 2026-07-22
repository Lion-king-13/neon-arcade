// games/skeet.js — Ball-Trap (mode spécial, DLC)
// Des plateaux (assiettes d'argile) sont lancés en cloche devant toi : tire-les au vol !
// Plateau = +1, plateau doré = +5. Un plateau qui s'échappe = combo perdu.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const Y_AXIS = new THREE.Vector3(0,1,0);
const HITR = 0.14;
const G = 4.6;

let R=null;
function res(){
  if(R) return R;
  R={ clayGeo:new THREE.CylinderGeometry(0.09,0.09,0.02,20),
      domeGeo:new THREE.SphereGeometry(0.06,12,8,0,Math.PI*2,0,Math.PI/2),
      tracerGeo:new THREE.CylinderGeometry(0.004,0.004,1,6),
      clay:new THREE.MeshStandardMaterial({color:0xff8a3c, emissive:0x5a2400, emissiveIntensity:.4, roughness:.6}),
      gold:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.6, roughness:.35, metalness:.5}) };
  return R;
}
function makeClay(gold){
  const r=res(); const g=new THREE.Group(); const mat=gold?r.gold:r.clay;
  const disk=new THREE.Mesh(r.clayGeo, mat); g.add(disk);
  const dome=new THREE.Mesh(r.domeGeo, mat); dome.scale.set(1,0.5,1); dome.position.y=0.01; g.add(dome);
  return g;
}

export default {
  id:'skeet',
  name:{fr:'Ball-Trap', en:'Clay Shooting'},
  color:'#ff8a3c',
  usesSurfaces:false,
  theme:'carnival',
  dlc:true,
  special:true,

  _clays:[], _guns:[], _flash:[0,0], _tracers:[], _spawnTimer:0,

  init(engine){ res(); },
  buildLayout(engine, spots){},

  start(engine){
    this._guns=[];
    engine.setTool((i)=>{ const gn=engine.makeGun(i); this._guns[i]=gn; return gn; }, 'ray');
    for(const c of this._clays.slice()) engine.field.remove(c.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._clays.length=0; this._tracers.length=0; this._flash=[0,0]; this._spawnTimer=0.6;
  },

  _launch(engine){
    const gold=Math.random()<0.12; const g=makeClay(gold); engine.field.add(g);
    const side=Math.random()<0.5?-1:1;
    const x=side*1.9, y=0.7, z=-1.7-Math.random()*0.7;
    g.position.set(x,y,z);
    const speed={easy:[1.6,2.1],normal:[2.0,2.6],hard:[2.4,3.1]}[engine.settings.diff];
    const vx=-side*(speed[0]+Math.random()*(speed[1]-speed[0]));
    const vy=3.0+Math.random()*1.0;
    this._clays.push({group:g, gold, vel:new THREE.Vector3(vx,vy,(Math.random()-.5)*0.3), spin:(Math.random()-.5)*10, dead:false});
  },
  _pop(engine,c){ engine.field.remove(c.group); const i=this._clays.indexOf(c); if(i>=0) this._clays.splice(i,1); },

  onTrigger(i, engine){
    engine.sfx.shot(); if(this._guns[i]) this._flash[i]=0.08;
    const o=new THREE.Vector3(), d=new THREE.Vector3(); engine.aimRay(i,o,d);
    let best=null, bestT=1e9;
    for(const c of this._clays){ if(c.dead) continue;
      const px=c.group.position.x-o.x, py=c.group.position.y-o.y, pz=c.group.position.z-o.z; const t=px*d.x+py*d.y+pz*d.z; if(t<0.2) continue;
      const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-t*t));
      if(dist<HITR && t<bestT){ best=c; bestT=t; }
    }
    let end;
    if(best){ end=best.group.position.clone(); best.dead=true; engine.good(end.clone(), best.gold?5:1, best.gold?'#ffd54a':'#ffcfa0'); engine.burst(end.clone(), best.gold?0xffd54a:0xff8a3c); this._pop(engine,best); }
    else { end=o.clone().addScaledVector(d,8); engine.miss(); }
    const mesh=new THREE.Mesh(res().tracerGeo, new THREE.MeshBasicMaterial({color:this._guns[i]?this._guns[i].userData.color:0x2ee6d6, transparent:true, opacity:.9}));
    const dir=new THREE.Vector3().subVectors(end,o), len=Math.max(0.01,dir.length());
    mesh.position.copy(o).addScaledVector(dir,0.5); mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize()); mesh.scale.set(1,len,1);
    engine.scene.add(mesh); this._tracers.push({mesh, life:0.12});
  },

  update(dt, engine){
    this._spawnTimer-=dt;
    const maxConc={easy:2,normal:3,hard:4}[engine.settings.diff];
    if(this._spawnTimer<=0 && this._clays.length<maxConc){
      this._launch(engine);
      if(engine.settings.diff==='hard' && Math.random()<0.4 && this._clays.length<maxConc) this._launch(engine);
      this._spawnTimer={easy:1.3,normal:1.0,hard:0.7}[engine.settings.diff]*(0.7+Math.random()*0.6);
    }
    for(const c of this._clays.slice()){
      c.vel.y-=G*dt; c.group.position.addScaledVector(c.vel,dt);
      c.group.rotation.y += c.spin*dt; c.group.rotation.z += c.spin*0.3*dt;
      if(c.group.position.y<0.25 || Math.abs(c.group.position.x)>2.7){ engine.miss(); this._pop(engine,c); }
    }
    for(let i=0;i<2;i++){
      if(this._flash[i]>0){ this._flash[i]-=dt; const gn=this._guns[i]; if(gn) gn.userData.tip.scale.setScalar(1+Math.max(0,this._flash[i])*40); }
      else if(this._guns[i]) this._guns[i].userData.tip.scale.setScalar(1);
    }
    for(let k=this._tracers.length-1;k>=0;k--){ const tr=this._tracers[k]; tr.life-=dt; tr.mesh.material.opacity=Math.max(0,tr.life/0.12); if(tr.life<=0){ engine.scene.remove(tr.mesh); this._tracers.splice(k,1); } }
  },

  cleanup(engine){
    for(const c of this._clays.slice()) engine.field.remove(c.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._clays.length=0; this._tracers.length=0;
    engine.clearTool();
  }
};