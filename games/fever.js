// games/fever.js — Tir FEVER (mode spécial)
// Plus tu enchaînes, plus la fièvre monte : cibles plus nombreuses et plus rapides.
// Des capsules de POUVOIR traversent l'écran : tire dessus pour changer d'arme
// (TRIPLE / PERÇANT / EXPLOSIF) pendant quelques secondes.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const Y_AXIS = new THREE.Vector3(0,1,0);
const POWER_T = 8;          // durée d'un pouvoir (s)
const BLAST_R = 0.55;       // rayon de l'explosif

let R=null;
function res(){
  if(R) return R;
  R={
    discGeo:new THREE.CircleGeometry(0.15,32),
    rimGeo:new THREE.TorusGeometry(0.15,0.013,10,36),
    sphere:new THREE.SphereGeometry(1,14,12),
    tracerGeo:new THREE.CylinderGeometry(0.005,0.005,1,6),
    capsGeo:new THREE.IcosahedronGeometry(0.075,0),
    tex:makeFace(),
    goldTex:makeFace(true),
    rimN:new THREE.MeshBasicMaterial({color:0x2ee6d6}),
    rimG:new THREE.MeshBasicMaterial({color:0xffd54a})
  };
  return R;
}
function makeFace(gold){
  const s=256, cv=document.createElement('canvas'); cv.width=cv.height=s; const c=cv.getContext('2d');
  const rings = gold ? ['#ffd54a','#3a2a00','#ffd54a','#fff2b0'] : ['#ff2d95','#f4f6fb','#8b6cff','#f4f6fb'];
  for(let i=0;i<rings.length;i++){ c.beginPath(); c.arc(s/2,s/2,s*0.48*(1-i/rings.length),0,Math.PI*2); c.fillStyle=rings[i]; c.fill(); }
  return new THREE.CanvasTexture(cv);
}

const POWERS=[
  {id:'triple',  fr:'TRIPLE',   en:'TRIPLE',   color:0xb8f34d},
  {id:'pierce',  fr:'PERÇANT',  en:'PIERCING', color:0x2ee6d6},
  {id:'blast',   fr:'EXPLOSIF', en:'BLAST',    color:0xff8a3c}
];

function makeTarget(gold){
  const r=res(); const g=new THREE.Group();
  const disc=new THREE.Mesh(r.discGeo, new THREE.MeshBasicMaterial({map: gold?r.goldTex:r.tex})); g.add(disc);
  const rim=new THREE.Mesh(r.rimGeo, gold?r.rimG:r.rimN); g.add(rim);
  return g;
}
function powerIcon(power){
  const s=128, cv=document.createElement('canvas'); cv.width=cv.height=s; const c=cv.getContext('2d');
  const col='#'+power.color.toString(16).padStart(6,'0');
  c.fillStyle='rgba(10,12,20,.9)'; c.beginPath(); c.arc(s/2,s/2,s*0.46,0,7); c.fill();
  c.strokeStyle=col; c.lineWidth=8; c.beginPath(); c.arc(s/2,s/2,s*0.42,0,7); c.stroke();
  c.strokeStyle=col; c.fillStyle=col; c.lineWidth=9; c.lineCap='round';
  if(power.id==='triple'){ for(const a of [-0.45,0,0.45]){ c.beginPath(); c.moveTo(s/2,s*0.78); c.lineTo(s/2+Math.sin(a)*s*0.34, s*0.78-Math.cos(a)*s*0.5); c.stroke(); } }
  else if(power.id==='pierce'){ c.beginPath(); c.moveTo(s*0.16,s/2); c.lineTo(s*0.84,s/2); c.stroke();
    c.beginPath(); c.moveTo(s*0.62,s*0.30); c.lineTo(s*0.84,s/2); c.lineTo(s*0.62,s*0.70); c.stroke(); }
  else { c.beginPath(); for(let k=0;k<10;k++){ const a=k/10*Math.PI*2, rr=k%2?s*0.16:s*0.34; const x=s/2+Math.cos(a)*rr, y=s/2+Math.sin(a)*rr; k?c.lineTo(x,y):c.moveTo(x,y);} c.closePath(); c.fill(); }
  return new THREE.CanvasTexture(cv);
}
function makeCapsule(power){
  const r=res(); const g=new THREE.Group();
  const core=new THREE.Mesh(r.capsGeo, new THREE.MeshStandardMaterial({color:power.color, emissive:power.color, emissiveIntensity:1.0, roughness:.3, metalness:.4}));
  g.add(core);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(0.115,14,12), new THREE.MeshBasicMaterial({color:power.color, transparent:true, opacity:.20}));
  g.add(halo);
  const ico=new THREE.Mesh(new THREE.PlaneGeometry(0.15,0.15), new THREE.MeshBasicMaterial({map:powerIcon(power), transparent:true, depthTest:false}));
  ico.position.z=0.09; ico.renderOrder=5; g.add(ico); g.userData.ico=ico;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.13,0.008,8,28), new THREE.MeshBasicMaterial({color:power.color}));
  g.add(ring); g.userData.ring=ring;
  g.userData.core=core;
  return g;
}

export default {
  id:'fever',
  name:{fr:'Tir — Fever', en:'Shooting — Fever'},
  color:'#ff2d95',
  usesSurfaces:false,
  theme:'carnival',
  dlc:true, special:true,

  _targets:[], _caps:[], _guns:[], _flash:[0,0], _tracers:[],
  _fever:0, _spawnTimer:0, _capTimer:0, _power:null, _powerT:0,

  init(engine){ res(); },
  buildLayout(engine, spots){},

  start(engine){
    this._guns=[];
    engine.setTool((i)=>{ const gn=engine.makeGun(i); this._guns[i]=gn; return gn; }, 'ray');
    for(const t of this._targets.slice()) engine.field.remove(t.group);
    for(const c of this._caps.slice()) engine.field.remove(c.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._targets.length=0; this._caps.length=0; this._tracers.length=0;
    this._fever=0; this._spawnTimer=0.3; this._capTimer=5; this._power=null; this._powerT=0; this._flash=[0,0];
  },

  _lvl(){ return Math.min(4, Math.floor(this._fever/6)); },   // 0..4

  _spawnTarget(engine){
    const gold=Math.random()<0.14;
    const g=makeTarget(gold); const dir=Math.random()<0.5?1:-1;
    const y=1.0+Math.random()*0.95, z=-1.7-Math.random()*0.6, x=-dir*1.7;
    const base={easy:0.7,normal:0.95,hard:1.25}[engine.settings.diff];
    const sp=base*(1+this._lvl()*0.30)*(0.85+Math.random()*0.35);
    g.position.set(x,y,z); engine.field.add(g);
    this._targets.push({group:g, pos:g.position, vx:dir*sp, gold, radius:0.15, dead:false});
  },
  _spawnCap(engine){
    const p=POWERS[(Math.random()*POWERS.length)|0];
    const g=makeCapsule(p); const dir=Math.random()<0.5?1:-1;
    g.position.set(-dir*1.7, 1.25+Math.random()*0.6, -1.5-Math.random()*0.4); engine.field.add(g);
    this._caps.push({group:g, pos:g.position, vx:dir*0.75, power:p, radius:0.11, dead:false});
  },
  _rm(engine,arr,o){ engine.field.remove(o.group); const i=arr.indexOf(o); if(i>=0) arr.splice(i,1); },

  _hud(engine){
    const fr=engine.lang!=='en';
    const names=POWERS.map(p=>{ const n=fr?p.fr:p.en; return (this._power&&this._power.id===p.id)?('['+n+']'):n; }).join('  ');
    const t=this._power? '  '+Math.ceil(this._powerT)+'s' : '';
    engine.hudExtra=(fr?'FIÈVRE ':'FEVER ')+this._lvl()+'/4   ·   '+names+t;
  },
  _powerEvent(engine){
    // rafale de cibles pour profiter du pouvoir
    const n = this._power && this._power.id==='pierce' ? 5 : 4;
    for(let k=0;k<n;k++){
      const gold=Math.random()<0.25;
      const g=makeTarget(gold); const dir=(this._power&&this._power.id==='pierce')?1:(Math.random()<0.5?1:-1);
      const y = (this._power&&this._power.id==='pierce') ? 1.35 : 1.0+Math.random()*0.9;
      const z = (this._power&&this._power.id==='blast') ? -1.75 : -1.7-Math.random()*0.5;
      const x = (this._power&&this._power.id==='blast') ? (-0.5+k*0.33) : -dir*(1.7+k*0.30);
      g.position.set(x,y,z); engine.field.add(g);
      const sp={easy:0.7,normal:0.95,hard:1.25}[engine.settings.diff]*(1+this._lvl()*0.3);
      this._targets.push({group:g, pos:g.position, vx:(this._power&&this._power.id==='blast')?dir*sp*0.35:dir*sp, gold, radius:0.15, dead:false});
    }
  },
  _setPower(engine,p){
    this._power=p; this._powerT=POWER_T;
    engine.popup(new THREE.Vector3(0,1.75,-1.2), (this.__lang==='en'?p.en:p.fr), '#'+p.color.toString(16).padStart(6,'0'));
    engine.sfx.gold();
    engine.burst(new THREE.Vector3(0,1.5,-1.3), p.color);
    this._powerEvent(engine);
  },

  _hitTarget(engine,t){
    if(t.dead) return; t.dead=true;
    const bonus=1+this._lvl()*0.5;
    engine.good(t.pos.clone(), Math.round((t.gold?5:1)*bonus), t.gold?'#ffd54a':'#ffb0dd');
    this._fever=Math.min(30, this._fever+1);
    this._rm(engine,this._targets,t);
  },

  onTrigger(i, engine){
    engine.sfx.shot(); if(this._guns[i]) this._flash[i]=0.08;
    const o=new THREE.Vector3(), d=new THREE.Vector3(); engine.aimRay(i,o,d);
    const pw=this._power?this._power.id:null;
    const dirs=[d.clone()];
    if(pw==='triple'){ const a=0.06;
      dirs.push(d.clone().applyAxisAngle(Y_AXIS, a)); dirs.push(d.clone().applyAxisAngle(Y_AXIS,-a)); }

    let any=false, endPoint=null;
    for(const dd of dirs){
      const hits=[];
      for(const t of this._targets){ if(t.dead) continue;
        const px=t.pos.x-o.x, py=t.pos.y-o.y, pz=t.pos.z-o.z; const tt=px*dd.x+py*dd.y+pz*dd.z; if(tt<0.2) continue;
        const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-tt*tt));
        if(dist<t.radius) hits.push({t, tt});
      }
      hits.sort((a,b)=>a.tt-b.tt);
      if(hits.length){
        any=true;
        if(pw==='pierce'){ for(const h of hits) this._hitTarget(engine,h.t); endPoint=o.clone().addScaledVector(dd,7); }
        else if(pw==='blast'){ const c=hits[0].t.pos.clone(); engine.burst(c,0xff7a3c);
          for(const t of this._targets.slice()) if(!t.dead && t.pos.distanceTo(c)<BLAST_R) this._hitTarget(engine,t);
          endPoint=c; }
        else { endPoint=hits[0].t.pos.clone(); this._hitTarget(engine,hits[0].t); }
      }
      // capsules de pouvoir
      for(const c of this._caps.slice()){ if(c.dead) continue;
        const px=c.pos.x-o.x, py=c.pos.y-o.y, pz=c.pos.z-o.z; const tt=px*dd.x+py*dd.y+pz*dd.z; if(tt<0.2) continue;
        const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-tt*tt));
        if(dist<c.radius){ c.dead=true; any=true; endPoint=c.pos.clone(); engine.burst(c.pos.clone(), c.power.color); this._setPower(engine,c.power); this._rm(engine,this._caps,c); }
      }
    }
    if(!any){ engine.miss(); this._fever=Math.max(0,this._fever-2); endPoint=o.clone().addScaledVector(d,7); }

    const col=this._power?this._power.color:(this._guns[i]?this._guns[i].userData.color:0x2ee6d6);
    const mesh=new THREE.Mesh(res().tracerGeo, new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:.9}));
    const vec=new THREE.Vector3().subVectors(endPoint,o), len=Math.max(0.01,vec.length());
    mesh.position.copy(o).addScaledVector(vec,0.5); mesh.quaternion.setFromUnitVectors(Y_AXIS, vec.normalize()); mesh.scale.set(1,len,1);
    engine.scene.add(mesh); this._tracers.push({mesh, life:0.12});
  },

  update(dt, engine){
    this.__lang=engine.lang; this._hud(engine);
    const time=engine.clock.elapsedTime, lvl=this._lvl();
    // pouvoir
    if(this._power){ this._powerT-=dt; if(this._powerT<=0) this._power=null; }
    // cibles
    this._spawnTimer-=dt;
    const maxC=3+lvl;
    if(this._spawnTimer<=0 && this._targets.length<maxC){
      this._spawnTarget(engine);
      this._spawnTimer={easy:1.0,normal:0.8,hard:0.6}[engine.settings.diff]*(1-lvl*0.13)*(0.7+Math.random()*0.5);
    }
    for(const t of this._targets.slice()){
      t.pos.x+=t.vx*dt; t.group.position.copy(t.pos);
      t.group.rotation.z+=dt*(0.6+lvl*0.4);
      if(Math.abs(t.pos.x)>1.85){ engine.miss(); this._fever=Math.max(0,this._fever-1); this._rm(engine,this._targets,t); }
    }
    // capsules
    this._capTimer-=dt;
    if(this._capTimer<=0 && this._caps.length<1){ this._spawnCap(engine); this._capTimer=7+Math.random()*5; }
    for(const c of this._caps.slice()){
      c.pos.x+=c.vx*dt; c.pos.y+=Math.sin(time*2)*dt*0.12; c.group.position.copy(c.pos);
      c.group.userData.core.rotation.y+=dt*2.2; c.group.userData.core.rotation.x+=dt*1.1;
      c.group.userData.core.scale.setScalar(1+Math.sin(time*8)*0.12);
      if(c.group.userData.ring) c.group.userData.ring.rotation.z+=dt*2.6;
      if(c.group.userData.ico) c.group.userData.ico.quaternion.copy(engine._vq);
      if(Math.abs(c.pos.x)>1.85) this._rm(engine,this._caps,c);
    }
    // flash + traçantes
    for(let i=0;i<2;i++){
      if(this._flash[i]>0){ this._flash[i]-=dt; const gn=this._guns[i]; if(gn) gn.userData.tip.scale.setScalar(1+Math.max(0,this._flash[i])*40); }
      else if(this._guns[i]) this._guns[i].userData.tip.scale.setScalar(1);
      // l'arme change d'aspect selon le pouvoir
      const gn=this._guns[i];
      if(gn){
        const col=this._power?this._power.color:gn.userData.color;
        gn.userData.tip.material.color.setHex(col);
        if(!gn.userData.aura){
          const aura=new THREE.Mesh(new THREE.SphereGeometry(0.055,14,12), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0}));
          aura.position.set(0,0.006,-0.20); gn.add(aura); gn.userData.aura=aura;
        }
        const au=gn.userData.aura; au.material.color.setHex(col);
        au.material.opacity = this._power? (0.30+0.20*Math.sin(time*10)) : 0;
        au.scale.setScalar(this._power? (1.1+0.25*Math.sin(time*7)) : 1);
        if(gn.userData.beam){ gn.userData.beam.material.color.setHex(col); gn.userData.beam.material.opacity=this._power?0.55:0.3;
          gn.userData.beam.scale.x=gn.userData.beam.scale.z=(this._power&&this._power.id==='pierce')?2.4:1; }
      }
    }
    for(let k=this._tracers.length-1;k>=0;k--){ const tr=this._tracers[k]; tr.life-=dt; tr.mesh.material.opacity=Math.max(0,tr.life/0.12); if(tr.life<=0){ engine.scene.remove(tr.mesh); this._tracers.splice(k,1); } }
  },

  cleanup(engine){
    for(const t of this._targets.slice()) engine.field.remove(t.group);
    for(const c of this._caps.slice()) engine.field.remove(c.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._targets.length=0; this._caps.length=0; this._tracers.length=0; this._power=null;
    engine.clearTool();
  }
};