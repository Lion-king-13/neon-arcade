// games/whackamole.js — Tape-Chenille
// Des chenilles (et scarabées à éviter) jaillissent de terriers ; on les écrase
// avec les maillets. Se branche au moteur commun via buildLayout/start/update/cleanup.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const EMERGE = 0.19;
const HIT_R = 0.14;
const ZAXIS = new THREE.Vector3(0,0,1);
const YAXIS = new THREE.Vector3(0,1,0);

// --- ressources partagées (créées une fois) ---
let R = null;
function res(){
  if(R) return R;
  R = {
    ringMat:new THREE.MeshStandardMaterial({color:0x2a2140, emissive:0x8b6cff, emissiveIntensity:.5, roughness:.5}),
    discMat:new THREE.MeshBasicMaterial({color:0x04060b}),
    tubeMat:new THREE.MeshBasicMaterial({color:0x04060b, side:THREE.DoubleSide}),
    ringGeo:new THREE.TorusGeometry(0.1,0.02,12,28),
    discGeo:new THREE.CircleGeometry(0.098,24),
    tubeGeo:new THREE.CylinderGeometry(0.096,0.096,0.22,18,1,true),
    sphereGeo:new THREE.SphereGeometry(1,14,12),
    eyeGeo:new THREE.SphereGeometry(0.016,10,8),
    pupGeo:new THREE.SphereGeometry(0.008,8,6),
    antGeo:new THREE.CylinderGeometry(0.004,0.004,0.06,6),
    antTipGeo:new THREE.SphereGeometry(0.011,8,6),
    legGeo:new THREE.CylinderGeometry(0.004,0.004,0.06,6),
    M:{
      gLight:new THREE.MeshStandardMaterial({color:0xd6f56e, emissive:0x86c72f, emissiveIntensity:.45, roughness:.5}),
      gDark: new THREE.MeshStandardMaterial({color:0xa6dd42, emissive:0x5fa11e, emissiveIntensity:.4, roughness:.55}),
      gold:  new THREE.MeshStandardMaterial({color:0xffd54a, emissive:0xe0a915, emissiveIntensity:.75, roughness:.35, metalness:.35}),
      eye:   new THREE.MeshBasicMaterial({color:0xf7f9ff}),
      pupil: new THREE.MeshBasicMaterial({color:0x0b0e14}),
      ant:   new THREE.MeshStandardMaterial({color:0x2f4d16, emissive:0x18280b, roughness:.6}),
      antTip:new THREE.MeshStandardMaterial({color:0xff5a8a, emissive:0xff5a8a, emissiveIntensity:.85}),
      shell: new THREE.MeshStandardMaterial({color:0xff4d5e, emissive:0xb0202d, emissiveIntensity:.5, roughness:.4, metalness:.2}),
      spot:  new THREE.MeshStandardMaterial({color:0x2a0a0e, roughness:.6}),
      spike: new THREE.MeshStandardMaterial({color:0xffe08a, emissive:0x6a3a00, roughness:.5}),
      leg:   new THREE.MeshStandardMaterial({color:0x161018, roughness:.7}),
      nose:  new THREE.MeshStandardMaterial({color:0xff8fae, emissive:0xc2506e, emissiveIntensity:.5, roughness:.5})
    }
  };
  return R;
}

function makeGrub(gold){
  const r=res(), M=r.M;
  const g=new THREE.Group();
  const L=0.24, A=0.13, N=8, RAD=0.055;
  const wig=[]; let mid=null, base=null;
  for(let i=0;i<N-1;i++){
    const s=i/(N-1);
    const prof=0.62+0.5*Math.sin(Math.PI*Math.min(1,s*0.9+0.14));
    const seg=new THREE.Mesh(r.sphereGeo, gold?M.gold:(i%2?M.gDark:M.gLight));
    const yy=L*s, zz=A*s*s;
    seg.position.set(0,yy,zz); seg.scale.setScalar(RAD*prof);
    seg.userData={s,x0:0,y0:yy}; g.add(seg); wig.push(seg);
    if(i===0) base=seg;
    if(i===Math.floor((N-1)/2)) mid=seg;
  }
  const hr=new THREE.Group();
  const hR=RAD*1.15; hr.position.set(0,L,A); hr.userData={s:1,x0:0,y0:L};
  const hsphere=new THREE.Mesh(r.sphereGeo, gold?M.gold:M.gLight); hsphere.scale.setScalar(hR); hr.add(hsphere);
  [-1,1].forEach(sx=>{
    const e=new THREE.Mesh(r.eyeGeo,M.eye); e.position.set(sx*hR*0.42, hR*0.60, hR*0.30);
    const p=new THREE.Mesh(r.pupGeo,M.pupil); p.position.set(0,0.014,0); e.add(p); hr.add(e);
    const ant=new THREE.Mesh(r.antGeo,M.ant); ant.position.set(sx*hR*0.30, hR*0.34, hR*0.86);
    ant.rotation.set(-0.55,0,sx*0.40);
    const tip=new THREE.Mesh(r.antTipGeo,M.antTip); tip.position.set(0,0.035,0); ant.add(tip); hr.add(ant);
  });
  g.add(hr); wig.push(hr);
  const nose=new THREE.Mesh(r.sphereGeo, M.nose); nose.scale.setScalar(hR*0.24); nose.position.set(0, hR*0.88, hR*0.14); hr.add(nose);
  for(let i=1;i<N-1;i+=2){
    const s=i/(N-1), yy=L*s, zz=A*s*s;
    [-1,1].forEach(sx=>{ const leg=new THREE.Mesh(r.sphereGeo,M.leg); leg.scale.setScalar(RAD*0.28);
      leg.position.set(sx*RAD*0.95, yy-RAD*0.35, zz); g.add(leg); });
  }
  return {group:g, L, hitParts:[hr, mid||base, base], wig};
}

function makeBeetle(){
  const r=res(), M=r.M;
  const g=new THREE.Group(); const L=0.13;
  const shell=new THREE.Mesh(r.sphereGeo,M.shell); shell.scale.set(0.09,0.075,0.085); shell.position.set(0,L,0); g.add(shell);
  const line=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.15,0.002),M.spot); line.position.set(0,L,0.055); g.add(line);
  [[-0.05,0.04],[0.05,0.04],[-0.045,-0.02],[0.045,-0.02]].forEach(([x,y])=>{
    const sp=new THREE.Mesh(r.sphereGeo,M.spot); sp.scale.set(0.016,0.012,0.006); sp.position.set(x,L+y,0.05); g.add(sp);
  });
  const head=new THREE.Mesh(r.sphereGeo,M.shell); head.scale.setScalar(0.045); head.position.set(0,L+0.075,0); g.add(head);
  const bnose=new THREE.Mesh(r.sphereGeo,M.nose); bnose.scale.setScalar(0.013); bnose.position.set(0,L+0.052,0.041); g.add(bnose);
  [-1,1].forEach(sx=>{
    const e=new THREE.Mesh(r.eyeGeo,M.eye); e.position.set(sx*0.02,L+0.09,0.02);
    const p=new THREE.Mesh(r.pupGeo,M.pupil); p.position.set(0,0.012,0); e.add(p); g.add(e);
    const sp=new THREE.Mesh(new THREE.ConeGeometry(0.014,0.05,7),M.spike); sp.position.set(sx*0.03,L+0.04,0.06); sp.rotation.set(-0.5,0,sx*0.25); g.add(sp);
  });
  for(let k=0;k<3;k++){ const zf=(k-1)*0.05;
    [-1,1].forEach(sx=>{ const leg=new THREE.Mesh(r.legGeo,M.leg); leg.position.set(sx*0.075,L-0.01,zf); leg.rotation.z=sx*1.0; g.add(leg); });
  }
  return {group:g, L, hitParts:[shell, head], wig:[]};
}

export default {
  id:'whackamole',
  name:{fr:'Tape-Chenille', en:'Whack-a-Grub'},
  color:'#b8f34d',
  usesSurfaces:true,

  _burrows:[], _active:[], _spawnTimer:0,

  init(engine){ res(); },

  _addBurrow(engine, pos, normal, emerge){
    const r=res();
    const q=new THREE.Quaternion().setFromUnitVectors(ZAXIS, normal);
    const ring=new THREE.Mesh(r.ringGeo,r.ringMat); ring.position.copy(pos); ring.quaternion.copy(q); engine.field.add(ring);
    const disc=new THREE.Mesh(r.discGeo,r.discMat); disc.position.copy(pos).add(normal.clone().multiplyScalar(-0.02)); disc.quaternion.copy(q); engine.field.add(disc);
    const tube=new THREE.Mesh(r.tubeGeo,r.tubeMat); tube.quaternion.setFromUnitVectors(YAXIS, normal); tube.position.copy(pos).add(normal.clone().multiplyScalar(-0.11)); engine.field.add(tube);
    this._burrows.push({pos:pos.clone(), normal:normal.clone(), emerge, occupied:null});
  },

  // spots = emplacements sur surfaces réelles (passthrough) ou null (immersion → arc devant le joueur)
  buildLayout(engine, spots){
    this._burrows.length=0; this._active.length=0;
    if(spots && spots.length){
      spots.forEach(s=> this._addBurrow(engine, s.pos, s.normal, s.emerge));
    } else {
      const PLAYER=new THREE.Vector3(0,1.5,0);
      const yaws=[-68,-34,0,34,68].map(d=>d*Math.PI/180);
      const pitches=[-52,-14,26].map(d=>d*Math.PI/180);
      for(const pit of pitches) for(const yaw of yaws){
        const y=yaw+(Math.random()-.5)*0.12, p=pit+(Math.random()-.5)*0.10;
        const d=new THREE.Vector3(Math.sin(y)*Math.cos(p), Math.sin(p), -Math.cos(y)*Math.cos(p)).normalize();
        const pos=PLAYER.clone().add(d.clone().multiplyScalar(0.80+Math.random()*0.18));
        pos.y=Math.max(pos.y,0.25);
        this._addBurrow(engine, pos, d.clone().negate(), EMERGE);
      }
    }
  },

  start(engine){
    // retire d'éventuelles créatures restantes, garde les terriers
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0;
    for(const b of this._burrows) b.occupied=null;
    this._spawnTimer=0.6;
  },

  _spawn(engine){
    const free=this._burrows.filter(b=>!b.occupied);
    if(!free.length) return;
    const b=free[(Math.random()*free.length)|0];
    let type='normal'; const rnd=Math.random();
    const badChance={easy:0.10,normal:0.16,hard:0.24}[engine.settings.diff];
    if(rnd<badChance) type='bad'; else if(rnd<badChance+0.09) type='gold';

    const built=(type==='bad')?makeBeetle():makeGrub(type==='gold');
    const c=built.group;
    const up=b.normal.clone();
    let fwd=new THREE.Vector3(0,1,0); fwd.addScaledVector(up,-fwd.dot(up));
    if(fwd.lengthSq()<1e-4){ fwd.set(0,1.25,0).sub(b.pos); fwd.addScaledVector(up,-fwd.dot(up));
      if(fwd.lengthSq()<1e-4) fwd.set(0,0,1).addScaledVector(up,-up.z); }
    fwd.normalize();
    const right=new THREE.Vector3().crossVectors(up,fwd).normalize();
    fwd.crossVectors(right,up).normalize();
    c.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,fwd));
    c.position.copy(b.pos); engine.field.add(c);

    const up2={easy:[1.1,1.7],normal:[0.85,1.35],hard:[0.6,1.0]}[engine.settings.diff];
    const life=up2[0]+Math.random()*(up2[1]-up2[0]);
    const obj={group:c, burrow:b, type, phase:'rise', tt:0, riseT:0.24, holdT:life, sinkT:0.22,
               hit:false, wigParts:built.wig, L:built.L, hitParts:built.hitParts, gold:type==='gold', wigp:Math.random()*6};
    b.occupied=obj; this._active.push(obj);
  },

  _pop(engine, o){ engine.field.remove(o.group); o.burrow.occupied=null;
    const i=this._active.indexOf(o); if(i>=0) this._active.splice(i,1); },

  update(dt, engine){
    // apparition
    this._spawnTimer-=dt;
    if(this._spawnTimer<=0){
      this._spawn(engine);
      const maxConc={easy:2,normal:3,hard:4}[engine.settings.diff];
      if(this._active.length<maxConc && Math.random()<0.4) this._spawn(engine);
      const base={easy:1.15,normal:0.9,hard:0.62}[engine.settings.diff];
      const prog=1-(engine.timeLeft/engine.settings.dur)*0.45;
      this._spawnTimer=base*(1-0.35*prog+0.001);
    }
    // animation
    const time=engine.clock.elapsedTime, T=engine.THREE;
    for(const o of this._active.slice()){
      o.tt+=dt; const b=o.burrow; let rise=0;
      if(o.phase==='rise'){ rise=Math.min(1,o.tt/o.riseT); if(rise>=1){o.phase='hold';o.tt=0;} }
      else if(o.phase==='hold'){ rise=1; if(o.tt>=o.holdT){o.phase='sink';o.tt=0; if(!o.hit && o.type!=='bad') engine.miss();} }
      else { rise=Math.max(0,1-o.tt/o.sinkT); if(o.tt>=o.sinkT){ this._pop(engine,o); continue; } }
      const e=rise*rise*(3-2*rise);
      o.group.position.copy(b.pos).add(b.normal.clone().multiplyScalar(T.MathUtils.lerp(-(o.L+0.08),0.02,e)));
      for(const p of o.wigParts){
        const s=p.userData.s;
        p.position.x=p.userData.x0+0.014*Math.sin(s*6-time*6.5+o.wigp)*e;
        p.position.y=p.userData.y0+0.006*Math.cos(s*6-time*6.5+o.wigp)*e;
      }
      if(o.gold) o.group.scale.setScalar(1+0.05*Math.sin(time*9+o.wigp));
    }
    // coups
    engine.eachMallet((mp)=>{
      for(const o of this._active){
        if(o.hit || o.phase==='sink') continue;
        let touched=false;
        for(const part of o.hitParts){ part.getWorldPosition(engine._tmp2); if(mp.distanceTo(engine._tmp2)<HIT_R){ touched=true; break; } }
        if(touched){
          o.hit=true; o.hitParts[0].getWorldPosition(engine._tmp2); const hp=engine._tmp2.clone();
          if(o.type==='bad'){ engine.bad(hp,3); o.phase='sink'; o.tt=0; }
          else { engine.good(hp, o.type==='gold'?5:1, o.type==='gold'?'#ffd54a':'#eaffd2'); this._pop(engine,o); }
        }
      }
    });
  },

  cleanup(engine){
    for(const o of this._active.slice()) engine.field.remove(o.group);
    this._active.length=0; this._burrows.length=0;
  }
};