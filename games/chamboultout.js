// games/chamboultout.js — Chamboule-Tout au laser
// Des pyramides de boîtes sur des stands ; tu les fais tomber au tir laser.
// Boîte = +1, boîte dorée = +5, boîte TNT = à éviter (−3). Pyramide vidée = +5 bonus.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const Y_AXIS = new THREE.Vector3(0,1,0);
const CAN_R = 0.075;

let R=null;
function res(){
  if(R) return R;
  R={
    canGeo:new THREE.CylinderGeometry(0.05,0.05,0.12,16),
    ringGeo:new THREE.TorusGeometry(0.05,0.008,8,20),
    tracerGeo:new THREE.CylinderGeometry(0.004,0.004,1,6),
    metal:new THREE.MeshStandardMaterial({color:0xd7dce4, roughness:.35, metalness:.7}),
    red:new THREE.MeshStandardMaterial({color:0xff4d5e, emissive:0x5a0e16, emissiveIntensity:.3, roughness:.5}),
    gold:new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.6, roughness:.35, metalness:.5}),
    tnt:new THREE.MeshStandardMaterial({color:0x2a1418, emissive:0x5a0a0a, emissiveIntensity:.4, roughness:.6}),
    band:new THREE.MeshStandardMaterial({color:0x14161c, roughness:.6}),
    standMat:new THREE.MeshStandardMaterial({color:0x3a2a18, roughness:.9})
  };
  return R;
}

function makeCan(type){
  const r=res(); const g=new THREE.Group();
  const body = type==='gold'?r.gold : (type==='bad'?r.tnt : r.metal);
  const b=new THREE.Mesh(r.canGeo, body); g.add(b);
  if(type==='normal'){ const ring=new THREE.Mesh(r.ringGeo, r.red); ring.rotation.x=Math.PI/2; ring.position.y=0.02; g.add(ring);
    const ring2=new THREE.Mesh(r.ringGeo, r.red); ring2.rotation.x=Math.PI/2; ring2.position.y=-0.03; g.add(ring2); }
  if(type==='bad'){ for(let k=-1;k<=1;k++){ const bd=new THREE.Mesh(r.ringGeo, r.red); bd.rotation.x=Math.PI/2; bd.position.y=k*0.035; g.add(bd); } }
  return g;
}

export default {
  id:'chamboultout',
  name:{fr:'Chamboule-Tout', en:'Can Knockdown'},
  color:'#ffa23c',
  usesSurfaces:false,
  theme:'carnival',

  _cans:[], _pyramids:[], _guns:[], _flash:[0,0], _tracers:[],

  init(engine){ res(); },
  buildLayout(engine, spots){},

  start(engine){
    this._guns=[];
    engine.setTool((i)=>{ const gn=engine.makeGun(i); this._guns[i]=gn; return gn; }, 'ray');
    for(const c of this._cans.slice()) engine.field.remove(c.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._cans.length=0; this._pyramids.length=0; this._tracers.length=0; this._flash=[0,0];
    const r=res();
    // 3 stands
    [-1.0,0,1.0].forEach(x=>{
      const z=-1.95, y0=1.02;
      const stand=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.06,0.28), r.standMat); stand.position.set(x,y0-0.06,z); engine.field.add(stand);
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.06,y0-0.06,0.06), r.standMat); leg.position.set(x,(y0-0.06)/2,z); engine.field.add(leg);
      this._pyramids.push({x, z, y0, respawnT:0, cans:[]});
    });
    for(const p of this._pyramids) this._fillPyramid(engine,p);
  },

  _fillPyramid(engine,p){
    // rangées 3 / 2 / 1
    const rows=[3,2,1]; let y=p.y0+0.06;
    for(let rI=0;rI<rows.length;rI++){
      const n=rows[rI]; const startX=p.x-(n-1)*0.055;
      for(let k=0;k<n;k++){
        let type='normal'; const rnd=Math.random();
        if(rnd<0.08) type='bad'; else if(rnd<0.18) type='gold';
        const g=makeCan(type); const pos=new THREE.Vector3(startX+k*0.11, y, p.z);
        g.position.copy(pos); engine.field.add(g);
        const can={group:g, pos, radius:CAN_R, type, down:false, fallT:0, pyramid:p, vx:0, vr:0};
        this._cans.push(can); p.cans.push(can);
      }
      y+=0.13;
    }
  },

  _knock(engine, can, dir){
    can.down=true; can.fallT=0; can.vx=dir*(0.6+Math.random()*0.5); can.vr=dir*(4+Math.random()*3);
    if(can.type==='bad') engine.bad(can.pos.clone(),3);
    else engine.good(can.pos.clone(), can.type==='gold'?5:1, can.type==='gold'?'#ffd54a':'#eaffd2');
    // pyramide vidée ?
    const p=can.pyramid;
    if(p.cans.every(c=>c.down)){ engine.good(new THREE.Vector3(p.x,p.y0+0.3,p.z), 5, '#ffd54a'); p.respawnT=1.3; }
  },

  onTrigger(i, engine){
    engine.sfx.shot(); if(this._guns[i]) this._flash[i]=0.08;
    const o=new THREE.Vector3(), d=new THREE.Vector3(); engine.aimRay(i,o,d);
    let best=null, bestT=1e9;
    for(const c of this._cans){
      if(c.down) continue;
      const px=c.pos.x-o.x, py=c.pos.y-o.y, pz=c.pos.z-o.z; const t=px*d.x+py*d.y+pz*d.z; if(t<0.2) continue;
      const dist=Math.sqrt(Math.max(0,(px*px+py*py+pz*pz)-t*t));
      if(dist<c.radius && t<bestT){ best=c; bestT=t; }
    }
    let end;
    if(best){ end=best.pos.clone(); this._knock(engine,best, d.x>=0?1:-1); }
    else { end=o.clone().addScaledVector(d,7); engine.miss(); }
    const mesh=new THREE.Mesh(res().tracerGeo, new THREE.MeshBasicMaterial({color:this._guns[i]?this._guns[i].userData.color:0x2ee6d6, transparent:true, opacity:.9}));
    const dir=new THREE.Vector3().subVectors(end,o), len=Math.max(0.01,dir.length());
    mesh.position.copy(o).addScaledVector(dir,0.5); mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize()); mesh.scale.set(1,len,1);
    engine.scene.add(mesh); this._tracers.push({mesh, life:0.12});
  },

  update(dt, engine){
    // chutes
    for(const c of this._cans.slice()){
      if(!c.down) continue;
      c.fallT+=dt;
      c.pos.x += c.vx*dt; c.pos.y -= (0.6+c.fallT*1.5)*dt;
      c.group.position.copy(c.pos); c.group.rotation.z += c.vr*dt;
      if(c.fallT>0.8){
        engine.field.remove(c.group);
        const i=this._cans.indexOf(c); if(i>=0) this._cans.splice(i,1);
        const pi=c.pyramid.cans.indexOf(c); if(pi>=0) c.pyramid.cans.splice(pi,1);
      }
    }
    // respawn des pyramides vidées
    for(const p of this._pyramids){
      if(p.respawnT>0){ p.respawnT-=dt; if(p.respawnT<=0 && p.cans.length===0) this._fillPyramid(engine,p); }
    }
    // flash + traçantes
    for(let i=0;i<2;i++){
      if(this._flash[i]>0){ this._flash[i]-=dt; const gn=this._guns[i]; if(gn) gn.userData.tip.scale.setScalar(1+Math.max(0,this._flash[i])*40); }
      else if(this._guns[i]) this._guns[i].userData.tip.scale.setScalar(1);
    }
    for(let k=this._tracers.length-1;k>=0;k--){ const tr=this._tracers[k]; tr.life-=dt; tr.mesh.material.opacity=Math.max(0,tr.life/0.12); if(tr.life<=0){ engine.scene.remove(tr.mesh); this._tracers.splice(k,1); } }
  },

  cleanup(engine){
    for(const c of this._cans.slice()) engine.field.remove(c.group);
    for(const tr of this._tracers) engine.scene.remove(tr.mesh);
    this._cans.length=0; this._pyramids.length=0; this._tracers.length=0;
    engine.clearTool();
  }
};