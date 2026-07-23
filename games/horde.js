// games/horde.js — Tir HORDE / Survie (mode spécial)
// Pas de chrono : des vagues de cibles arrivent, de plus en plus vite.
// Tu as 3 vies : chaque cible qui traverse t'en coûte une. Tiens le plus longtemps !
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const Y_AXIS=new THREE.Vector3(0,1,0);

let R=null;
function res(){
  if(R) return R;
  R={
    discGeo:new THREE.CircleGeometry(0.15,32),
    rimGeo:new THREE.TorusGeometry(0.15,0.013,10,36),
    tracerGeo:new THREE.CylinderGeometry(0.004,0.004,1,6),
    heartGeo:(()=>{ const s=new THREE.Shape();
      s.moveTo(0,-0.030);
      s.bezierCurveTo(0.038,0.006, 0.030,0.040, 0.011,0.038);
      s.bezierCurveTo(0.004,0.037, 0.001,0.033, 0,0.028);
      s.bezierCurveTo(-0.001,0.033,-0.004,0.037,-0.011,0.038);
      s.bezierCurveTo(-0.030,0.040,-0.038,0.006, 0,-0.030);
      return new THREE.ExtrudeGeometry(s,{depth:0.012,bevelEnabled:false}); })(),
    bombMat:new THREE.MeshStandardMaterial({color:0x1a1420, emissive:0x330a12, emissiveIntensity:.5, roughness:.6, metalness:.3}),
    fuseMat:new THREE.MeshBasicMaterial({color:0xffd54a}),
    sparkMat:new THREE.MeshBasicMaterial({color:0xff7a3c}),
    tex:makeTex(false), goldTex:makeTex(true),
    rimN:new THREE.MeshBasicMaterial({color:0x2ee6d6}),
    rimG:new THREE.MeshBasicMaterial({color:0xffd54a}),
    life:new THREE.MeshStandardMaterial({color:0xff4d5e, emissive:0xff4d5e, emissiveIntensity:.8, roughness:.4}),
    lifeOff:new THREE.MeshStandardMaterial({color:0x2a2140, emissive:0x140a20, emissiveIntensity:.2, roughness:.7})
  };
  return R;
}
function makeTex(gold){
  const s=256, cv=document.createElement('canvas'); cv.width=cv.height=s; const c=cv.getContext('2d');
  const rings= gold? ['#ffd54a','#3a2a00','#ffd54a','#fff2b0'] : ['#8b6cff','#f4f6fb','#ff4d5e','#f4f6fb'];
  for(let i=0;i<rings.length;i++){ c.beginPath(); c.arc(s/2,s/2,s*0.48*(1-i/rings.length),0,Math.PI*2); c.fillStyle=rings[i]; c.fill(); }
  return new THREE.CanvasTexture(cv);
}
function makeBomb(){
  const r=res(); const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.13,16,12), r.bombMat); g.add(b);
  const f=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.07,6), r.fuseMat); f.position.set(0,0.16,0); f.rotation.z=0.3; g.add(f);
  const s=new THREE.Mesh(new THREE.SphereGeometry(0.018,8,6), r.sparkMat); s.position.set(0.025,0.20,0); g.add(s); g.userData.spark=s;
  return g;
}
function makeTarget(gold){
  const r=res(); const g=new THREE.Group();
  g.add(new THREE.Mesh(r.discGeo, new THREE.MeshBasicMaterial({map:gold?r.goldTex:r.tex})));
  g.add(new THREE.Mesh(r.rimGeo, gold?r.rimG:r.rimN));
  return g;
}

export default {
  id:'horde',
  name:{fr:'Tir — Horde', en:'Shooting — Horde'},
  color:'#ff4d5e',
  usesSurfaces:false,
  theme:'carnival',
  dlc:true, special:true,
  endless:true,

  _targets:[], _guns:[], _flash:[0,0], _tracers:[], _hearts:[],
  _wave:1, _left:0, _spawnTimer:0, _lives:3, _waveT:0,

  init(engine){ res(); },
  buildLayout(engine, spots){
    const r=res(); this._hearts=[];
    for(let k=0;k<3;k++){
      const h=new THREE.Mesh(r.heartGeo, r.life);
      h.position.set(-0.20+k*0.20, 2.06, -1.30); engine.field.add(h); this._hearts.push(h);
    }
  },

  start(engine){
    this._guns=[];
    engine.setTool((i)=>{ const gn=engine.makeGun(i); this._guns[i]=gn; return gn; }, 'ray');
    for(const t of this._targets.slice()) engine.field.remove(t.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._targets.length=0; this._tracers.length=0; this._flash=[0,0];
    this._wave=1; this._left=this._waveSize(); this._spawnTimer=0.6; this._lives=3; this._waveT=0;
    for(const h of this._hearts) h.material=res().life;
    engine.popup(new THREE.Vector3(0,1.7,-1.2), 'VAGUE 1', '#ffd54a');
  },

  _waveSize(){ return 4+this._wave*2; },
  _speed(engine){ return {easy:0.55,normal:0.8,hard:1.05}[engine.settings.diff]*(1+(this._wave-1)*0.16); },

  _spawn(engine){
    const bomb = this._wave>=2 && Math.random()<Math.min(0.26, 0.08+this._wave*0.02);
    const gold = !bomb && Math.random()<0.13;
    const g = bomb? makeBomb() : makeTarget(gold); const dir=Math.random()<0.5?1:-1;
    const y=0.95+Math.random()*1.0, z=-1.65-Math.random()*0.6;
    g.position.set(-dir*1.75, y, z); engine.field.add(g);
    const sp=this._speed(engine)*(0.85+Math.random()*0.4);
    this._targets.push({group:g, pos:g.position, vx:dir*sp, gold, bomb, radius:bomb?0.13:0.15, dead:false});
  },
  _rm(engine,o){ engine.field.remove(o.group); const i=this._targets.indexOf(o); if(i>=0) this._targets.splice(i,1); },

  _loseLife(engine){
    this._lives--; engine.sfx.bad(); engine.combo=0;
    const h=this._hearts[this._lives]; if(h) h.material=res().lifeOff;
    if(this._lives<=0){ engine.popup(new THREE.Vector3(0,1.6,-1.2), 'K.O.', '#ff4d5e'); engine.endNow(); }
  },

  onTrigger(i, engine){
    engine.sfx.shot(); if(this._guns[i]) this._flash[i]=0.08;
    const o=new THREE.Vector3(), d=new THREE.Vector3(); engine.aimRay(i,o,d);
    let best=null, bestT=1e9;
    for(const t of this._targets){ if(t.dead) continue;
      const px=t.pos.x-o.x, py=t.pos.y-o.y, pz=t.pos.z-o.z; const tt=px*d.x+py*d.y+pz*d.z; if(tt<0.2) continue;
      const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-tt*tt));
      if(dist<t.radius && tt<bestT){ best=t; bestT=tt; }
    }
    let end;
    if(best){ end=best.pos.clone(); best.dead=true;
      if(best.bomb){ engine.bad(best.pos.clone(), 3); engine.burst(best.pos.clone(), 0xff4d5e); this._loseLife(engine); }
      else engine.good(best.pos.clone(), (best.gold?5:1)+Math.floor(this._wave/3), best.gold?'#ffd54a':'#eaffd2');
      this._rm(engine,best);
    } else { end=o.clone().addScaledVector(d,8); engine.miss(); }
    const mesh=new THREE.Mesh(res().tracerGeo, new THREE.MeshBasicMaterial({color:this._guns[i]?this._guns[i].userData.color:0x2ee6d6, transparent:true, opacity:.9}));
    const vec=new THREE.Vector3().subVectors(end,o), len=Math.max(0.01,vec.length());
    mesh.position.copy(o).addScaledVector(vec,0.5); mesh.quaternion.setFromUnitVectors(Y_AXIS, vec.normalize()); mesh.scale.set(1,len,1);
    engine.scene.add(mesh); this._tracers.push({mesh, life:0.12});
  },

  update(dt, engine){
    engine.hudExtra = (engine.lang==='en'?'Wave ':'Vague ')+this._wave+'  ·  x'+(1+(this._wave-1)*0.16).toFixed(2)+'  ·  '+(engine.lang==='en'?'Lives ':'Vies ')+Math.max(0,this._lives);
    // vague suivante
    if(this._left<=0 && this._targets.length===0){
      this._waveT-=dt;
      if(this._waveT<=0){
        this._wave++; this._left=this._waveSize(); this._spawnTimer=0.4;
        engine.popup(new THREE.Vector3(0,1.7,-1.2), 'VAGUE '+this._wave, '#ffd54a'); engine.sfx.count();
      }
    }
    if(this._left>0){
      this._spawnTimer-=dt;
      if(this._spawnTimer<=0 && this._targets.length<3+this._wave){
        this._spawn(engine); this._left--;
        this._spawnTimer=Math.max(0.25, 0.95-this._wave*0.06)*(0.7+Math.random()*0.5);
        if(this._left===0) this._waveT=1.6;
      }
    }
    for(const t of this._targets.slice()){
      t.pos.x+=t.vx*dt; t.group.position.copy(t.pos); t.group.rotation.z+=dt*0.7;
      if(t.bomb && t.group.userData.spark) t.group.userData.spark.scale.setScalar(1+Math.sin(engine.clock.elapsedTime*16)*0.35);
      if(Math.abs(t.pos.x)>1.9){ const wasBomb=t.bomb; this._rm(engine,t); if(!wasBomb) this._loseLife(engine); }
    }
    for(let i=0;i<2;i++){
      if(this._flash[i]>0){ this._flash[i]-=dt; const gn=this._guns[i]; if(gn) gn.userData.tip.scale.setScalar(1+Math.max(0,this._flash[i])*40); }
      else if(this._guns[i]) this._guns[i].userData.tip.scale.setScalar(1);
    }
    for(let k=this._tracers.length-1;k>=0;k--){ const tr=this._tracers[k]; tr.life-=dt; tr.mesh.material.opacity=Math.max(0,tr.life/0.12); if(tr.life<=0){ engine.scene.remove(tr.mesh); this._tracers.splice(k,1); } }
  },

  cleanup(engine){
    for(const t of this._targets.slice()) engine.field.remove(t.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._targets.length=0; this._tracers.length=0; this._hearts.length=0;
    engine.clearTool();
  }
};